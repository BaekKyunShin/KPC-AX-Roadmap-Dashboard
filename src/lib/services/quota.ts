/**
 * 쿼터 관리 서비스
 * LLM 호출 제한 및 사용량 추적
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getManageableRoles } from '@/lib/constants/status';
import type { UserRole } from '@/types/database';

// 기본 쿼터 설정
const DEFAULT_DAILY_LIMIT = 50;
const DEFAULT_MONTHLY_LIMIT = 500;

/**
 * user_quotas 행 존재 보장 (없으면 기본값으로 생성)
 * UNIQUE(user_id) + ON CONFLICT DO NOTHING으로 race condition 방지
 */
async function ensureUserQuotaExists(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string
) {
  await supabase
    .from('user_quotas')
    .upsert(
      {
        user_id: userId,
        daily_limit: DEFAULT_DAILY_LIMIT,
        monthly_limit: DEFAULT_MONTHLY_LIMIT,
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );
}

interface UsageMetrics {
  daily: number;
  monthly: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
}

/**
 * KST 기준 현재 날짜 및 월 조회
 */
export function getKSTDateTime() {
  const now = new Date();
  // KST = UTC + 9
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(now.getTime() + kstOffset);

  const date = kst.toISOString().split('T')[0]; // YYYY-MM-DD
  const month = date.slice(0, 7); // YYYY-MM

  return { date, month };
}

/**
 * 사용자 쿼터 조회 (없으면 기본값 생성)
 */
export async function fetchUserQuota(userId: string) {
  const supabase = createAdminClient();

  await ensureUserQuotaExists(supabase, userId);

  // 생성됐든 이미 있었든 조회
  const { data: quota, error } = await supabase
    .from('user_quotas')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !quota) {
    console.error('[fetchUserQuota Error]', error);
    return {
      daily_limit: DEFAULT_DAILY_LIMIT,
      monthly_limit: DEFAULT_MONTHLY_LIMIT,
    };
  }

  return quota;
}

/**
 * 사용자 사용량 조회
 */
export async function fetchUserUsage(userId: string): Promise<UsageMetrics> {
  const supabase = createAdminClient();
  const { date, month } = getKSTDateTime();

  // 쿼터 조회
  const quota = await fetchUserQuota(userId);

  // 일별 사용량 조회
  const { data: dailyUsage } = await supabase
    .from('usage_metrics')
    .select('llm_calls')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  // 월별 사용량 조회
  const { data: monthlyUsage } = await supabase
    .from('usage_metrics')
    .select('llm_calls')
    .eq('user_id', userId)
    .eq('month', month);

  const dailyCalls = dailyUsage?.llm_calls || 0;
  const monthlyCalls = monthlyUsage?.reduce((sum, m) => sum + m.llm_calls, 0) || 0;

  return {
    daily: dailyCalls,
    monthly: monthlyCalls,
    dailyLimit: quota.daily_limit,
    monthlyLimit: quota.monthly_limit,
    dailyRemaining: Math.max(0, quota.daily_limit - dailyCalls),
    monthlyRemaining: Math.max(0, quota.monthly_limit - monthlyCalls),
  };
}

/**
 * 원자적 쿼터 확인 + 사용량 기록 (동시 요청 시 한도 우회 방지)
 *
 * DB 함수 check_and_increment_llm_usage를 호출하여
 * 쿼터 확인과 사용량 증가를 단일 트랜잭션에서 수행합니다.
 */
export async function checkAndRecordLLMUsage(
  userId: string,
  tokensIn: number = 0,
  tokensOut: number = 0
): Promise<{
  exceeded: boolean;
  reason?: 'daily' | 'monthly';
  message?: string;
}> {
  const supabase = createAdminClient();
  const { date, month } = getKSTDateTime();

  const { data, error } = await supabase.rpc('check_and_increment_llm_usage', {
    p_user_id: userId,
    p_date: date,
    p_month: month,
    p_tokens_in: tokensIn,
    p_tokens_out: tokensOut,
  });

  if (error) {
    console.error('[checkAndRecordLLMUsage Error]', error);
    throw new Error('쿼터 확인/기록 실패: ' + error.message);
  }

  return {
    exceeded: data.exceeded,
    reason: data.reason,
    message: data.message,
  };
}

/**
 * 사용자 쿼터 업데이트 (OPS_ADMIN)
 */
export async function updateUserQuota(
  userId: string,
  dailyLimit?: number,
  monthlyLimit?: number
): Promise<void> {
  const supabase = createAdminClient();

  const updateData: { daily_limit?: number; monthly_limit?: number } = {};
  if (dailyLimit !== undefined) updateData.daily_limit = dailyLimit;
  if (monthlyLimit !== undefined) updateData.monthly_limit = monthlyLimit;

  if (Object.keys(updateData).length === 0) return;

  await ensureUserQuotaExists(supabase, userId);

  // 부분 업데이트
  await supabase
    .from('user_quotas')
    .update(updateData)
    .eq('user_id', userId);
}

/**
 * 전체 사용자 사용량 통계 조회 (OPS_ADMIN/SYSTEM_ADMIN)
 * - SYSTEM_ADMIN: 운영관리자 + 컨설턴트 조회 가능
 * - OPS_ADMIN: 컨설턴트만 조회 가능
 */
export async function fetchAllUsersUsage(options: {
  page?: number;
  limit?: number;
  month?: string;
  currentUserRole: UserRole;
}) {
  const supabase = createAdminClient();
  const { page = 1, limit = 20, month: targetMonth, currentUserRole } = options;
  const { month: currentMonth } = getKSTDateTime();
  const month = targetMonth || currentMonth;

  // 현재 사용자 역할에 따라 조회 가능한 역할 결정
  const manageableRoles = getManageableRoles(currentUserRole);
  // 승인 대기 역할은 제외하고 승인된 역할만 조회
  const targetRoles = manageableRoles.filter(role =>
    role === 'CONSULTANT_APPROVED' || role === 'OPS_ADMIN'
  );

  if (targetRoles.length === 0) {
    return {
      users: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      month,
    };
  }

  // 사용자 목록 조회
  const { data: users, count } = await supabase
    .from('users')
    .select('id, name, email, role, status', { count: 'exact' })
    .in('role', targetRoles)
    .order('name', { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (!users || users.length === 0) {
    return {
      users: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      month,
    };
  }

  const userIds = users.map(u => u.id);

  // 월별 사용량 조회
  const { data: monthlyUsage } = await supabase
    .from('usage_metrics')
    .select('user_id, llm_calls')
    .in('user_id', userIds)
    .eq('month', month);

  // 쿼터 조회
  const { data: quotas } = await supabase
    .from('user_quotas')
    .select('user_id, daily_limit, monthly_limit')
    .in('user_id', userIds);

  // 사용량 맵 생성
  const usageMap = new Map<string, number>();
  monthlyUsage?.forEach(m => {
    const existing = usageMap.get(m.user_id) || 0;
    usageMap.set(m.user_id, existing + m.llm_calls);
  });

  // 쿼터 맵 생성
  const quotaMap = new Map<string, { dailyLimit: number; monthlyLimit: number }>();
  quotas?.forEach(q => {
    quotaMap.set(q.user_id, {
      dailyLimit: q.daily_limit,
      monthlyLimit: q.monthly_limit,
    });
  });

  // 결과 조합
  const result = users.map(user => {
    const llmCalls = usageMap.get(user.id) || 0;
    const quota = quotaMap.get(user.id) || {
      dailyLimit: DEFAULT_DAILY_LIMIT,
      monthlyLimit: DEFAULT_MONTHLY_LIMIT,
    };

    return {
      ...user,
      monthlyUsage: llmCalls,
      dailyLimit: quota.dailyLimit,
      monthlyLimit: quota.monthlyLimit,
      usagePercent: Math.round((llmCalls / quota.monthlyLimit) * 100),
    };
  });

  return {
    users: result,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
    month,
  };
}
