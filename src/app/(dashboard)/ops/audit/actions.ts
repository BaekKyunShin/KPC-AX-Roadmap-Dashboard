'use server';

import { fetchAuditLogs as fetchAuditLogsService } from '@/lib/services/audit';
import type { AuditAction } from '@/types/database';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { OPS_MANAGER_ROLES } from '@/lib/constants/status';

/** 전체 로그 내보내기 시 최대 건수 */
const AUDIT_LOG_EXPORT_MAX = 10000;

/** 내보내기 1회당 청크 크기 */
const AUDIT_LOG_CHUNK_SIZE = 1000;

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
 * 감사로그 조회 — OPS_ADMIN+ 모두 전체 로그 조회
 *
 * RLS 정책(`audit_logs SELECT: OPS_ADMIN 이상`) 의도와 일치.
 */
export async function fetchAuditLogs(filters: AuditLogFilters = {}) {
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES);
  if ('error' in auth) return { logs: [], total: 0, page: 1, limit: 50, totalPages: 0 };

  return await fetchAuditLogsService(filters);
}

/**
 * 액션 타입 목록
 */
export async function getActionTypes(): Promise<{ value: AuditAction; label: string }[]> {
  return [
    { value: 'USER_APPROVE', label: '사용자 승인' },
    { value: 'USER_SUSPEND', label: '사용자 정지' },
    { value: 'USER_REACTIVATE', label: '사용자 재활성화' },
    { value: 'PROJECT_CREATE', label: '프로젝트 생성' },
    { value: 'PROJECT_UPDATE', label: '프로젝트 수정' },
    { value: 'SELF_ASSESSMENT_CREATE', label: '자가진단 생성' },
    { value: 'SELF_ASSESSMENT_UPDATE', label: '자가진단 수정' },
    { value: 'MATCHING_EXECUTE', label: '매칭 실행' },
    { value: 'PROJECT_ASSIGN', label: '프로젝트 배정' },
    { value: 'PROJECT_REASSIGN', label: '프로젝트 재배정' },
    { value: 'INTERVIEW_CREATE', label: '인터뷰 생성' },
    { value: 'INTERVIEW_UPDATE', label: '인터뷰 수정' },
    { value: 'ROADMAP_CREATE', label: '로드맵 생성' },
    { value: 'ROADMAP_UPDATE', label: '로드맵 수정' },
    { value: 'ROADMAP_FINALIZE', label: '로드맵 최종 확정' },
    { value: 'ROADMAP_ARCHIVE', label: '로드맵 이전 확정본 처리' },
    { value: 'DOWNLOAD_PDF', label: 'PDF 다운로드' },
    { value: 'DOWNLOAD_XLSX', label: 'Excel 다운로드' },
    { value: 'TEMPLATE_CREATE', label: '템플릿 생성' },
    { value: 'TEMPLATE_UPDATE', label: '템플릿 수정' },
    { value: 'TEMPLATE_ACTIVATE', label: '템플릿 활성화' },
    { value: 'TEMPLATE_DELETE', label: '템플릿 삭제' },
    { value: 'TEST_PROJECT_CREATE', label: '테스트 프로젝트 생성' },
    { value: 'TEST_ROADMAP_CREATE', label: '로드맵 테스트 생성' },
    { value: 'TEST_ROADMAP_REVISE', label: '로드맵 테스트 수정' },
    { value: 'TEST_PROJECT_DELETE', label: '테스트 프로젝트 삭제' },
    { value: 'USER_WITHDRAW', label: '사용자 탈퇴' },
    { value: 'ROADMAP_COPY', label: '로드맵 복사' },
    { value: 'QUOTA_UPDATE', label: 'LLM 쿼터 변경' },
    { value: 'ASSESSMENT_TOKEN_CREATE', label: '진단 링크 생성' },
    { value: 'PUBLIC_SELF_ASSESSMENT_CREATE', label: '자가진단 제출' },
    // PBL 관련 액션 (마이그 061에서 enum 확장됨, OFA-11에서 라벨 추가)
    { value: 'PBL_REPORT_CREATED', label: 'PBL 보고서 생성' },
    { value: 'PBL_REPORT_FINALIZED', label: 'PBL 보고서 최종 확정' },
    { value: 'PBL_REPORT_SHARED', label: 'PBL 보고서 공유 토글' },
    { value: 'PBL_HWPX_EXPORTED', label: 'PBL HWPX 내보내기' },
    { value: 'ROADMAP_HWPX_EXPORTED', label: '로드맵 HWPX 내보내기' },
  ];
}

/**
 * 대상 타입 목록
 */
export async function getTargetTypes(): Promise<{ value: string; label: string }[]> {
  return [
    { value: 'user', label: '사용자' },
    { value: 'project', label: '프로젝트' },
    { value: 'self_assessment', label: '자가진단' },
    { value: 'matching', label: '매칭' },
    { value: 'interview', label: '인터뷰' },
    { value: 'roadmap', label: '로드맵' },
    { value: 'template', label: '템플릿' },
    { value: 'assessment_token', label: '진단 링크' },
    { value: 'roadmap_version', label: '로드맵 버전' },
    { value: 'pbl_report', label: 'PBL 보고서' },
    { value: 'user_quota', label: 'LLM 쿼터' },
  ];
}

/**
 * 전체 로그 내보내기용 조회 (최대 10000건) — OPS_ADMIN+ 모두 전체 로그 조회
 */
export async function fetchAllAuditLogs(filters: Omit<AuditLogFilters, 'page' | 'limit'> = {}) {
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES);
  if ('error' in auth) return { logs: [] as AuditLogEntry[] };

  try {
    const allLogs: AuditLogEntry[] = [];
    let page = 1;
    let total = 0;

    while (allLogs.length < AUDIT_LOG_EXPORT_MAX) {
      const result = await fetchAuditLogsService({
        ...filters,
        page,
        limit: AUDIT_LOG_CHUNK_SIZE,
      });

      if (page === 1) {
        total = result.total;
      }

      if (result.logs.length === 0) break;

      allLogs.push(...result.logs);
      page++;
    }

    return { logs: JSON.parse(JSON.stringify(allLogs)) as AuditLogEntry[], total };
  } catch (error) {
    console.error('[fetchAllAuditLogs]', error);
    return { logs: [] as AuditLogEntry[] };
  }
}

/**
 * 감사로그 actor 필터용 사용자 목록 조회 — OPS_ADMIN+ 모두 전체 사용자 조회
 *
 * 감사로그가 모든 actor 의 활동을 보여주므로 actor 드롭다운도 동일 범위.
 */
export async function fetchUsers(): Promise<{ id: string; name: string; email: string }[]> {
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES);
  if ('error' in auth) return [];

  const { data: users } = await auth.supabase.from('users').select('id, name, email').order('name');

  return users || [];
}
