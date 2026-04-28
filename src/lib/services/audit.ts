import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AuditAction, UserRole } from '@/types/database';

/** 감사로그 기본 페이지 크기 */
const AUDIT_LOG_DEFAULT_PAGE_SIZE = 50;

interface AuditLogParams {
  actorUserId: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
}

/** 요청 헤더에서 클라이언트 IP 추출 (Server Action/Route Handler에서만 작동) */
async function getClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0].trim()
      ?? h.get('x-real-ip')
      ?? null;
  } catch {
    return null;
  }
}

/**
 * 감사로그 기록
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
    const ipAddress = await getClientIp();
    const enrichedMeta = { ...meta, ...(ipAddress ? { ip_address: ipAddress } : {}) };

    const { error } = await supabase.from('audit_logs').insert({
      actor_user_id: actorUserId ?? null,
      action,
      target_type: targetType,
      target_id: targetId,
      meta: enrichedMeta,
      success,
      error_message: errorMessage,
    });

    if (error) {
      // 감사로그 실패는 콘솔에만 기록 (사용자에게 영향 X)
      console.error('[createAuditLog Error]', error);
    }
  } catch (error) {
    console.error('[createAuditLog Error]', error);
  }
}

/**
 * 감사로그 조회 (OPS_ADMIN 이상)
 *
 * RLS 정책(`audit_logs SELECT: OPS_ADMIN 이상`) 의도에 맞춰
 * OPS_ADMIN·SYSTEM_ADMIN 모두 actor 화이트리스트 없이 전체 로그를 조회한다.
 * (이전 버전에서 OPS_ADMIN 가시 범위를 컨설턴트 actor 로그로만 좁혀
 *  본인이 수행한 PROJECT_CREATE 등이 모두 차단되는 결함 #001 이 있었음)
 *
 * `currentUserRole` 파라미터는 호출부 하위 호환을 위해 유지하지만 더 이상 사용하지 않는다.
 */
export async function fetchAuditLogs(options: {
  page?: number;
  limit?: number;
  action?: AuditAction;
  targetType?: string;
  actorUserId?: string;
  startDate?: string;
  endDate?: string;
  currentUserRole?: UserRole;
}) {
  const supabase = createAdminClient();
  const { page = 1, limit = AUDIT_LOG_DEFAULT_PAGE_SIZE, action, targetType, actorUserId, startDate, endDate } = options;

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
    console.error('[fetchAuditLogs]', error);
    return {
      logs: [] as NonNullable<typeof data>,
      total: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

  return {
    logs: data ?? [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}
