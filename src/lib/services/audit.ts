import { createAdminClient } from '@/lib/supabase/admin';
import type { AuditAction } from '@/types/database';

interface AuditLogParams {
  actorUserId: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
}

/**
 * 감사 로그 기록
 * 서버 사이드에서만 호출 (서비스 역할 키 사용)
 */
export async function createAuditLog({
  actorUserId,
  action,
  targetType,
  targetId,
  meta = {},
  success = true,
  errorMessage,
}: AuditLogParams): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from('audit_logs').insert({
      actor_user_id: actorUserId,
      action,
      target_type: targetType,
      target_id: targetId,
      meta,
      success,
      error_message: errorMessage,
    });

    if (error) {
      // 감사 로그 실패는 콘솔에만 기록 (사용자에게 영향 X)
      console.error('[AuditLog] 기록 실패:', error);
    }
  } catch (err) {
    console.error('[AuditLog] 예외 발생:', err);
  }
}

/**
 * 감사 로그 조회 (OPS_ADMIN 이상)
 */
export async function getAuditLogs(options: {
  page?: number;
  limit?: number;
  action?: AuditAction;
  targetType?: string;
  actorUserId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const supabase = createAdminClient();
  const { page = 1, limit = 50, action, targetType, actorUserId, startDate, endDate } = options;

  let query = supabase
    .from('audit_logs')
    .select('*, actor:users!actor_user_id(id, name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (action) {
    query = query.eq('action', action);
  }

  if (targetType) {
    query = query.eq('target_type', targetType);
  }

  if (actorUserId) {
    query = query.eq('actor_user_id', actorUserId);
  }

  if (startDate) {
    query = query.gte('created_at', startDate);
  }

  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`감사 로그 조회 실패: ${error.message}`);
  }

  return {
    logs: data,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}
