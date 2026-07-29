import type { ProjectStatus, RoadmapVersionStatus, UserRole } from '@/types/database';
import type { ProjectTrack } from './tracks';

// =============================================================================
// 역할 기반 접근 제어 상수
// =============================================================================

/** 컨설턴트 관련 역할 (승인 대기 + 승인됨) */
export const CONSULTANT_ROLES: readonly UserRole[] = [
  'USER_PENDING',
  'CONSULTANT_APPROVED',
] as const;

/** 운영관리자 관련 역할 (승인 대기 + 승인됨) */
export const OPS_ADMIN_ROLES: readonly UserRole[] = ['OPS_ADMIN_PENDING', 'OPS_ADMIN'] as const;

/** 운영관리자가 관리할 수 있는 역할 (컨설턴트만) */
export const OPS_ADMIN_MANAGEABLE_ROLES: readonly UserRole[] = CONSULTANT_ROLES;

/** 시스템관리자가 관리할 수 있는 역할 (컨설턴트 + 운영관리자) */
export const SYSTEM_ADMIN_MANAGEABLE_ROLES: readonly UserRole[] = [
  ...CONSULTANT_ROLES,
  ...OPS_ADMIN_ROLES,
] as const;

/** OPS 관리 권한이 있는 역할 (운영관리자 + 시스템관리자) */
export const OPS_MANAGER_ROLES: readonly UserRole[] = ['OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

/**
 * OPS 관리 권한이 있는지 확인
 */
export function isOpsManager(role: UserRole): boolean {
  return OPS_MANAGER_ROLES.includes(role);
}

/**
 * 승인 대기 역할 (로그인은 되지만 운영자 승인 전)
 *
 * ⚠️ CONSULTANT_ROLES·OPS_ADMIN_ROLES 와 원소가 겹치지만 목적이 다르다.
 * 저 둘은 "누구를 관리할 수 있는가"(관리 대상 묶음)이고,
 * 이 상수는 "누구의 접근을 막는가"(라우트 차단 대상)이다.
 */
export const PENDING_ROLES: readonly UserRole[] = ['USER_PENDING', 'OPS_ADMIN_PENDING'] as const;

/**
 * 승인 대기 상태인지 확인
 *
 * true 면 승인 대기 카드(/dashboard)와 프로필 작성(/dashboard/profile) 외의
 * 대시보드 라우트 접근을 차단한다. 프로필은 승인 심사에 필요하므로 예외.
 */
export function isPendingApproval(role: UserRole): boolean {
  return PENDING_ROLES.includes(role);
}

/**
 * 컨설턴트 재배정이 가능한 프로젝트 상태
 *
 * ⚠️ RPC `assign_consultant` 의 허용 목록과 **반드시 일치**해야 한다
 * (supabase/migrations/058_reassign_return_previous.sql:31).
 * 화면이 더 넓으면 운영자가 후보를 다 고른 뒤에야 DB 에러로 거절당하고(#006),
 * 더 좁으면 가능한 재배정을 막게 된다. 한쪽만 바꾸지 말 것.
 *
 * ALLOWED_STATUS_TRANSITIONS 와는 별개다. 저쪽은 "어떤 상태로 갈 수 있는가"이고
 * 이 상수는 "재배정 조작을 허용하는가"다.
 */
export const REASSIGNABLE_STATUSES: readonly ProjectStatus[] = [
  'DIAGNOSED',
  'MATCH_RECOMMENDED',
  'ASSIGNED',
] as const;

/**
 * 현재 상태에서 컨설턴트 재배정이 가능한지 확인
 *
 * @param status 프로젝트 상태 (DB 값이 아닌 문자열이 들어와도 안전하게 false)
 */
export function canReassignConsultant(status: string): boolean {
  return REASSIGNABLE_STATUSES.includes(status as ProjectStatus);
}

/**
 * 재배정이 막힌 상태에서 사용자에게 보여줄 사유
 *
 * 키가 없는 상태(NEW)는 안내를 띄우지 않는다 — 아직 배정된 적 없어
 * "변경할 수 없습니다"가 성립하지 않기 때문이다.
 */
export const REASSIGN_BLOCKED_MESSAGE: Partial<Record<ProjectStatus, string>> = {
  INTERVIEWED: '인터뷰가 완료되어 담당 컨설턴트를 변경할 수 없습니다.',
  ROADMAP_DRAFTED: '인터뷰가 완료되어 담당 컨설턴트를 변경할 수 없습니다.',
  PBL_DRAFTED: '인터뷰가 완료되어 담당 컨설턴트를 변경할 수 없습니다.',
  FINALIZED: '최종 확정된 프로젝트는 담당 컨설턴트를 변경할 수 없습니다.',
};

/**
 * 현재 사용자 역할에 따라 관리 가능한 역할 목록 반환
 */
export function getManageableRoles(currentUserRole: UserRole): readonly UserRole[] {
  if (currentUserRole === 'SYSTEM_ADMIN') {
    return SYSTEM_ADMIN_MANAGEABLE_ROLES;
  }
  if (currentUserRole === 'OPS_ADMIN') {
    return OPS_ADMIN_MANAGEABLE_ROLES;
  }
  return [];
}

/**
 * 현재 사용자가 대상 사용자를 관리할 수 있는지 확인
 */
export function canManageUser(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
  const manageableRoles = getManageableRoles(currentUserRole);
  return manageableRoles.includes(targetUserRole);
}

// =============================================================================
// 프로젝트 상태 관련 상수
// =============================================================================

/** 로드맵 생성이 가능한 프로젝트 상태 (인터뷰 완료 이후) */
export const ROADMAP_ELIGIBLE_STATUSES: readonly ProjectStatus[] = [
  'INTERVIEWED',
  'ROADMAP_DRAFTED',
  'FINALIZED',
] as const;

/** 내보내기 가능한 프로젝트 상태 (로드맵·PBL 산출물이 존재하는 상태) */
export const EXPORT_ELIGIBLE_STATUSES: readonly ProjectStatus[] = [
  'ROADMAP_DRAFTED',
  'PBL_DRAFTED',
  'FINALIZED',
] as const;

/**
 * PBL 생성·편집이 가능한 프로젝트 상태 (ROADMAP_ELIGIBLE_STATUSES 평행 구조)
 */
export const PBL_ELIGIBLE_STATUSES: readonly ProjectStatus[] = [
  'INTERVIEWED',
  'PBL_DRAFTED',
  'FINALIZED',
] as const;

/**
 * 프로젝트 진행 상태 경고 기준 (일수)
 * - 대시보드 정체 프로젝트 표시 기준: 20일 이상
 */
export const PROJECT_STALL_THRESHOLDS = {
  /** 대시보드 정체 프로젝트 표시 최소 기준 */
  DASHBOARD_MIN: 20,
  /** 주의 기준 (주황색) - 20~29일 */
  WARNING: 20,
  /** 심각 기준 (빨간색) - 30일 이상 */
  SEVERE: 30,
} as const;

/**
 * 프로젝트 워크플로우 단계 설정
 * - 카드, 스테퍼 등에서 공통으로 사용
 * - DIAGNOSED와 MATCH_RECOMMENDED는 같은 단계로 취급
 */
export interface WorkflowStep {
  key: string;
  label: string;
  statuses: ProjectStatus[];
}

export const PROJECT_WORKFLOW_STEPS: WorkflowStep[] = [
  { key: 'new', label: '신규 등록 완료', statuses: ['NEW'] },
  { key: 'diagnosed', label: '진단결과 입력 완료', statuses: ['DIAGNOSED', 'MATCH_RECOMMENDED'] },
  { key: 'assigned', label: '컨설턴트 배정 완료', statuses: ['ASSIGNED'] },
  { key: 'interviewed', label: '현장 인터뷰 완료', statuses: ['INTERVIEWED'] },
  // 트랙 공통 라벨. 트랙별 라벨이 필요하면 getProjectWorkflowStepsByTrack 사용.
  { key: 'drafted', label: '초안 완료', statuses: ['ROADMAP_DRAFTED', 'PBL_DRAFTED'] },
  { key: 'finalized', label: '최종 확정', statuses: ['FINALIZED'] },
];

/**
 * 트랙별 워크플로우 단계 반환
 *
 * - 프로젝트 상세 페이지·스테퍼처럼 트랙 컨텍스트가 있는 UI에서 사용
 * - 운영 대시보드 통계처럼 트랙 혼합 UI는 PROJECT_WORKFLOW_STEPS 그대로 사용
 */
export function getProjectWorkflowStepsByTrack(track: ProjectTrack): WorkflowStep[] {
  return PROJECT_WORKFLOW_STEPS.map((step) => {
    if (step.key === 'drafted') {
      return track === 'PBL'
        ? { ...step, label: 'PBL 초안 완료', statuses: ['PBL_DRAFTED'] }
        : { ...step, label: '로드맵 초안 완료', statuses: ['ROADMAP_DRAFTED'] };
    }
    if (step.key === 'finalized') {
      return track === 'PBL'
        ? { ...step, label: 'PBL 최종 확정', statuses: ['FINALIZED'] }
        : { ...step, label: '로드맵 최종 확정', statuses: ['FINALIZED'] };
    }
    return step;
  });
}

/**
 * 프로젝트 상태로 워크플로우 단계 인덱스 찾기
 */
export function getWorkflowStepIndex(status: ProjectStatus): number {
  return PROJECT_WORKFLOW_STEPS.findIndex((step) => step.statuses.includes(status));
}

/**
 * 프로젝트 상태로 워크플로우 단계 라벨 가져오기
 */
export function getWorkflowStepLabel(status: ProjectStatus): string {
  const step = PROJECT_WORKFLOW_STEPS.find((s) => s.statuses.includes(status));
  return step?.label || status;
}

/**
 * 상태 필터 옵션 타입
 * - 드롭다운 필터에서 워크플로우 단계별로 상태를 그룹화하여 표시
 */
export interface StatusFilterOption {
  /** 워크플로우 단계 키 (e.g., 'new', 'diagnosed') */
  value: string;
  /** 표시 라벨 */
  label: string;
  /** 해당 단계에 포함된 프로젝트 상태 목록 */
  statuses: ProjectStatus[];
}

/**
 * 워크플로우 단계를 필터 옵션으로 변환
 * - 드롭다운에서 중복 라벨 없이 표시하기 위해 사용
 */
export function getStatusFilterOptions(): StatusFilterOption[] {
  return PROJECT_WORKFLOW_STEPS.map((step) => ({
    value: step.key,
    label: step.label,
    statuses: step.statuses,
  }));
}

/**
 * 워크플로 단계 키를 실제 프로젝트 상태 배열로 변환
 *
 * URL 쿼리(`?status=diagnosed`)에 담기는 값은 ProjectStatus 가 아니라
 * 워크플로 단계 키다. 서버에서 그대로 `.eq('status', ...)` 에 넘기면
 * 항상 0건이 되므로, 반드시 이 함수로 statuses 배열을 얻어 사용한다.
 *
 * @returns 단계 키에 해당하는 상태 배열. 알 수 없는 키면 undefined(필터 미적용).
 */
export function getStatusesByFilterKey(value: string): ProjectStatus[] | undefined {
  return PROJECT_WORKFLOW_STEPS.find((step) => step.key === value)?.statuses;
}

/**
 * 프로젝트 상태 설정 (OPS 관리자용 - 전체 상태)
 */
export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  NEW: { label: '신규 등록 완료', color: 'bg-gray-100 text-gray-800' },
  DIAGNOSED: { label: '진단결과 입력 완료', color: 'bg-blue-100 text-blue-800' },
  MATCH_RECOMMENDED: { label: '진단결과 입력 완료', color: 'bg-blue-100 text-blue-800' },
  ASSIGNED: { label: '컨설턴트 배정 완료', color: 'bg-green-100 text-green-800' },
  INTERVIEWED: { label: '현장 인터뷰 완료', color: 'bg-yellow-100 text-yellow-800' },
  ROADMAP_DRAFTED: { label: '로드맵 초안 완료', color: 'bg-orange-100 text-orange-800' },
  PBL_DRAFTED: { label: 'PBL 초안 완료', color: 'bg-purple-100 text-purple-800' },
  FINALIZED: { label: '최종 확정', color: 'bg-emerald-100 text-emerald-800' },
};

/**
 * 프로젝트 상태 설정 (컨설턴트용 - 배정 이후 상태)
 */
export const CONSULTANT_PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ASSIGNED: { label: '인터뷰 대기', color: 'bg-blue-100 text-blue-800' },
  INTERVIEWED: { label: '인터뷰 완료', color: 'bg-amber-100 text-amber-800' },
  ROADMAP_DRAFTED: { label: '로드맵 작성 중', color: 'bg-purple-100 text-purple-800' },
  FINALIZED: { label: '로드맵 완료', color: 'bg-green-100 text-green-800' },
};

/**
 * 로드맵 버전 상태 설정
 */
export const ROADMAP_VERSION_STATUS_CONFIG: Record<
  RoadmapVersionStatus,
  { label: string; color: string }
> = {
  DRAFT: { label: '초안', color: 'bg-yellow-100 text-yellow-800' },
  FINAL: { label: '확정본', color: 'bg-green-100 text-green-800' },
  ARCHIVED: { label: '이전 확정본', color: 'bg-gray-100 text-gray-800' },
};

/**
 * 정체 프로젝트 상태별 표시 문구
 * - 대시보드에서 정체 프로젝트 카드에 사용
 */
export const STALLED_STATUS_MESSAGES: Partial<Record<ProjectStatus, string>> = {
  NEW: '신규 등록 후',
  DIAGNOSED: '진단결과 입력 후',
  MATCH_RECOMMENDED: '진단결과 입력 후',
  ASSIGNED: '컨설턴트 배정 후',
  INTERVIEWED: '현장 인터뷰 후',
  ROADMAP_DRAFTED: '로드맵 초안 작성 후',
};

/**
 * 상태에 따른 배지 정보 반환
 */
export function getProjectStatusBadge(status: ProjectStatus): { label: string; color: string } {
  return PROJECT_STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
}

/**
 * 컨설턴트용 상태 배지 정보 반환 (인터뷰 여부 고려)
 */
export function getConsultantProjectStatusBadge(
  status: string,
  hasInterview?: boolean
): { label: string; color: string } {
  // ASSIGNED 상태에서 인터뷰 완료 시 INTERVIEWED 배지 표시
  if (status === 'ASSIGNED' && hasInterview) {
    return CONSULTANT_PROJECT_STATUS_CONFIG['INTERVIEWED'];
  }

  return (
    CONSULTANT_PROJECT_STATUS_CONFIG[status] || {
      label: status,
      color: 'bg-gray-100 text-gray-800',
    }
  );
}

// =============================================================================
// 프로젝트 상태 전이 검증
// =============================================================================

/**
 * 프로젝트 상태별 허용된 전이 맵
 *
 * 워크플로우: NEW → DIAGNOSED → MATCH_RECOMMENDED → ASSIGNED → INTERVIEWED → ROADMAP_DRAFTED → FINALIZED
 *
 * 스킵 전이:
 * - NEW → MATCH_RECOMMENDED (자가진단 없이 매칭 추천)
 * - DIAGNOSED → ASSIGNED (매칭 추천 없이 직접 배정)
 *
 * 동일 상태 전이:
 * - ASSIGNED → ASSIGNED (컨설턴트 재배정)
 * - ROADMAP_DRAFTED → ROADMAP_DRAFTED (로드맵 재생성)
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  NEW: ['DIAGNOSED', 'MATCH_RECOMMENDED'],
  DIAGNOSED: ['MATCH_RECOMMENDED', 'ASSIGNED'],
  MATCH_RECOMMENDED: ['ASSIGNED'],
  ASSIGNED: ['ASSIGNED', 'INTERVIEWED'],
  // PBL 트랙은 ROADMAP_DRAFTED 대신 PBL_DRAFTED로 분기.
  INTERVIEWED: ['ROADMAP_DRAFTED', 'PBL_DRAFTED'],
  ROADMAP_DRAFTED: ['ROADMAP_DRAFTED', 'FINALIZED'],
  PBL_DRAFTED: ['PBL_DRAFTED', 'FINALIZED'],
  FINALIZED: [],
};

/**
 * 프로젝트 상태 전이가 허용되는지 검증
 *
 * @param from 현재 상태
 * @param to 전이할 상태
 * @returns 전이 허용 여부
 */
export function validateStatusTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
