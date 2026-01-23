/**
 * 쿼터 관리 서비스
 * LLM 호출 제한 및 사용량 추적
 */

import { createAdminClient } from '@/lib/supabase/admin';

// 기본 쿼터 설정
const DEFAULT_DAILY_LIMIT = 100;
const DEFAULT_MONTHLY_LIMIT = 2000;

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
function getKSTDateTime() {
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
export async function getUserQuota(userId: string) {
  const supabase = createAdminClient();

  // 쿼터 조회
  let { data: quota } = await supabase
    .from('user_quotas')
    .select('*')
    .eq('user_id', userId)
    .single();

  // 쿼터가 없으면 기본값으로 생성
  if (!quota) {
    const { data: newQuota, error } = await supabase
      .from('user_quotas')
      .insert({
        user_id: userId,
        daily_limit: DEFAULT_DAILY_LIMIT,
        monthly_limit: DEFAULT_MONTHLY_LIMIT,
      })
      .select()
      .single();

    if (error) {
      console.error('[getUserQuota] Insert error:', error);
      return {
        daily_limit: DEFAULT_DAILY_LIMIT,
        monthly_limit: DEFAULT_MONTHLY_LIMIT,
      };
    }

    quota = newQuota;
  }

  return quota;
}

/**
 * 사용자 사용량 조회
 */
export async function getUserUsage(userId: string): Promise<UsageMetrics> {
  const supabase = createAdminClient();
  const { date, month } = getKSTDateTime();

  // 쿼터 조회
  const quota = await getUserQuota(userId);

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
 * 쿼터 초과 여부 확인
 */
export async function checkQuotaExceeded(userId: string): Promise<{
  exceeded: boolean;
  reason?: 'daily' | 'monthly';
  message?: string;
}> {
  const usage = await getUserUsage(userId);

  if (usage.daily >= usage.dailyLimit) {
    return {
      exceeded: true,
      reason: 'daily',
      message: `일일 사용량(${usage.dailyLimit}회)을 초과했습니다. 내일 다시 시도해주세요.`,
    };
  }

  if (usage.monthly >= usage.monthlyLimit) {
    return {
      exceeded: true,
      reason: 'monthly',
      message: `월간 사용량(${usage.monthlyLimit}회)을 초과했습니다. 관리자에게 문의하세요.`,
    };
  }

  return { exceeded: false };
}

/**
 * LLM 호출 사용량 기록
 */
export async function recordLLMUsage(
  userId: string,
  tokensIn: number = 0,
  tokensOut: number = 0
): Promise<void> {
  const supabase = createAdminClient();
  const { date, month } = getKSTDateTime();

  // upsert: 없으면 생성, 있으면 업데이트
  const { data: existing } = await supabase
    .from('usage_metrics')
    .select('id, llm_calls, tokens_in, tokens_out')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (existing) {
    // 기존 레코드 업데이트
    await supabase
      .from('usage_metrics')
      .update({
        llm_calls: existing.llm_calls + 1,
        tokens_in: existing.tokens_in + tokensIn,
        tokens_out: existing.tokens_out + tokensOut,
      })
      .eq('id', existing.id);
  } else {
    // 새 레코드 생성
    await supabase.from('usage_metrics').insert({
      user_id: userId,
      date,
      month,
      llm_calls: 1,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
    });
  }
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

  // 쿼터가 없으면 생성
  const { data: existing } = await supabase
    .from('user_quotas')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existing) {
    await supabase
      .from('user_quotas')
      .update(updateData)
      .eq('user_id', userId);
  } else {
    await supabase.from('user_quotas').insert({
      user_id: userId,
      daily_limit: dailyLimit ?? DEFAULT_DAILY_LIMIT,
      monthly_limit: monthlyLimit ?? DEFAULT_MONTHLY_LIMIT,
    });
  }
}

/**
 * 전체 사용자 사용량 통계 조회 (OPS_ADMIN)
 */
export async function getAllUsersUsage(options: {
  page?: number;
  limit?: number;
  month?: string;
}) {
  const supabase = createAdminClient();
  const { page = 1, limit = 20, month: targetMonth } = options;
  const { month: currentMonth } = getKSTDateTime();
  const month = targetMonth || currentMonth;

  // 사용자 목록 조회
  const { data: users, count } = await supabase
    .from('users')
    .select('id, name, email, role, status', { count: 'exact' })
    .in('role', ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'])
    .order('name', { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (!users || users.length === 0) {
    return {
      users: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  const userIds = users.map(u => u.id);

  // 월별 사용량 조회
  const { data: monthlyUsage } = await supabase
    .from('usage_metrics')
    .select('user_id, llm_calls, tokens_in, tokens_out')
    .in('user_id', userIds)
    .eq('month', month);

  // 쿼터 조회
  const { data: quotas } = await supabase
    .from('user_quotas')
    .select('user_id, daily_limit, monthly_limit')
    .in('user_id', userIds);

  // 사용량 맵 생성
  const usageMap = new Map<string, { llmCalls: number; tokensIn: number; tokensOut: number }>();
  monthlyUsage?.forEach(m => {
    const existing = usageMap.get(m.user_id) || { llmCalls: 0, tokensIn: 0, tokensOut: 0 };
    usageMap.set(m.user_id, {
      llmCalls: existing.llmCalls + m.llm_calls,
      tokensIn: existing.tokensIn + m.tokens_in,
      tokensOut: existing.tokensOut + m.tokens_out,
    });
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
    const usage = usageMap.get(user.id) || { llmCalls: 0, tokensIn: 0, tokensOut: 0 };
    const quota = quotaMap.get(user.id) || {
      dailyLimit: DEFAULT_DAILY_LIMIT,
      monthlyLimit: DEFAULT_MONTHLY_LIMIT,
    };

    return {
      ...user,
      monthlyUsage: usage.llmCalls,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      dailyLimit: quota.dailyLimit,
      monthlyLimit: quota.monthlyLimit,
      usagePercent: Math.round((usage.llmCalls / quota.monthlyLimit) * 100),
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
