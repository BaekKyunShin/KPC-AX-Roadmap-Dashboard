'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuditLogs } from '@/lib/services/audit';
import type { AuditAction } from '@/types/database';

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  action?: AuditAction;
  targetType?: string;
  actorUserId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogEntry {
  id: string;
  actor_user_id: string;
  action: AuditAction;
  target_type: string;
  target_id: string;
  meta: Record<string, unknown>;
  success: boolean;
  error_message?: string;
  created_at: string;
  actor?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * 감사 로그 조회
 */
export async function fetchAuditLogs(filters: AuditLogFilters = {}) {
  const supabase = await createClient();

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { logs: [], total: 0, page: 1, limit: 50, totalPages: 0 };
  }

  // OPS_ADMIN/SYSTEM_ADMIN 권한 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
    return { logs: [], total: 0, page: 1, limit: 50, totalPages: 0 };
  }

  return await getAuditLogs(filters);
}

/**
 * 액션 타입 목록
 */
export async function getActionTypes(): Promise<{ value: AuditAction; label: string }[]> {
  return [
    { value: 'USER_APPROVE', label: '사용자 승인' },
    { value: 'USER_SUSPEND', label: '사용자 정지' },
    { value: 'USER_REACTIVATE', label: '사용자 재활성화' },
    { value: 'CASE_CREATE', label: '케이스 생성' },
    { value: 'CASE_UPDATE', label: '케이스 수정' },
    { value: 'SELF_ASSESSMENT_CREATE', label: '자가진단 생성' },
    { value: 'SELF_ASSESSMENT_UPDATE', label: '자가진단 수정' },
    { value: 'MATCHING_EXECUTE', label: '매칭 실행' },
    { value: 'CASE_ASSIGN', label: '케이스 배정' },
    { value: 'CASE_REASSIGN', label: '케이스 재배정' },
    { value: 'INTERVIEW_CREATE', label: '인터뷰 생성' },
    { value: 'INTERVIEW_UPDATE', label: '인터뷰 수정' },
    { value: 'ROADMAP_CREATE', label: '로드맵 생성' },
    { value: 'ROADMAP_UPDATE', label: '로드맵 수정' },
    { value: 'ROADMAP_FINALIZE', label: '로드맵 확정' },
    { value: 'ROADMAP_ARCHIVE', label: '로드맵 보관' },
    { value: 'DOWNLOAD_PDF', label: 'PDF 다운로드' },
    { value: 'DOWNLOAD_XLSX', label: 'Excel 다운로드' },
    { value: 'TEMPLATE_CREATE', label: '템플릿 생성' },
    { value: 'TEMPLATE_UPDATE', label: '템플릿 수정' },
    { value: 'TEMPLATE_ACTIVATE', label: '템플릿 활성화' },
  ];
}

/**
 * 대상 타입 목록
 */
export async function getTargetTypes(): Promise<{ value: string; label: string }[]> {
  return [
    { value: 'user', label: '사용자' },
    { value: 'case', label: '케이스' },
    { value: 'self_assessment', label: '자가진단' },
    { value: 'matching', label: '매칭' },
    { value: 'interview', label: '인터뷰' },
    { value: 'roadmap', label: '로드맵' },
    { value: 'template', label: '템플릿' },
  ];
}

/**
 * 전체 로그 내보내기용 조회 (최대 10000건)
 */
export async function fetchAllAuditLogs(filters: Omit<AuditLogFilters, 'page' | 'limit'> = {}) {
  const supabase = await createClient();

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { logs: [] };
  }

  // OPS_ADMIN/SYSTEM_ADMIN 권한 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
    return { logs: [] };
  }

  // 전체 로그 조회 (최대 10000건)
  const result = await getAuditLogs({ ...filters, page: 1, limit: 10000 });
  return { logs: result.logs, total: result.total };
}

/**
 * 사용자 목록 조회 (필터용)
 */
export async function getUsers(): Promise<{ id: string; name: string; email: string }[]> {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .order('name');

  return users || [];
}
