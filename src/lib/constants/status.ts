import type { ProjectStatus, RoadmapVersionStatus, UserStatus } from '@/types/database';

/**
 * 프로젝트 진행 상태 경고 기준 (일수)
 */
export const PROJECT_STALL_THRESHOLDS = {
  WARNING: 7,   // 주의 (주황색)
  SEVERE: 14,   // 심각 (빨간색)
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
  { key: 'drafted', label: '로드맵 초안 완료', statuses: ['ROADMAP_DRAFTED'] },
  { key: 'finalized', label: '로드맵 최종 확정', statuses: ['FINALIZED'] },
];

/**
 * 모든 프로젝트 상태 목록 (워크플로우 순서대로)
 * - PROJECT_WORKFLOW_STEPS에서 파생
 */
export const ALL_PROJECT_STATUSES: ProjectStatus[] = PROJECT_WORKFLOW_STEPS.flatMap(
  step => step.statuses
);

/**
 * 프로젝트 상태로 워크플로우 단계 인덱스 찾기
 */
export function getWorkflowStepIndex(status: ProjectStatus): number {
  return PROJECT_WORKFLOW_STEPS.findIndex(step => step.statuses.includes(status));
}

/**
 * 프로젝트 상태로 워크플로우 단계 라벨 가져오기
 */
export function getWorkflowStepLabel(status: ProjectStatus): string {
  const step = PROJECT_WORKFLOW_STEPS.find(s => s.statuses.includes(status));
  return step?.label || status;
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
  FINALIZED: { label: '로드맵 최종 확정', color: 'bg-emerald-100 text-emerald-800' },
};

/**
 * 프로젝트 상태 설정 (컨설턴트용 - 배정 이후 상태)
 */
export const CONSULTANT_PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ASSIGNED: { label: '인터뷰 필요', color: 'bg-yellow-100 text-yellow-800' },
  INTERVIEWED: { label: '인터뷰 완료', color: 'bg-blue-100 text-blue-800' },
  ROADMAP_DRAFTED: { label: '로드맵 초안', color: 'bg-purple-100 text-purple-800' },
  FINALIZED: { label: '완료', color: 'bg-green-100 text-green-800' },
};

/**
 * 로드맵 버전 상태 설정
 */
export const ROADMAP_VERSION_STATUS_CONFIG: Record<RoadmapVersionStatus, { label: string; color: string }> = {
  DRAFT: { label: '초안', color: 'bg-yellow-100 text-yellow-800' },
  FINAL: { label: '확정', color: 'bg-green-100 text-green-800' },
  ARCHIVED: { label: '보관', color: 'bg-gray-100 text-gray-800' },
};

/**
 * 사용자 상태 설정
 */
export const USER_STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  ACTIVE: { label: '활성', color: 'bg-green-100 text-green-800' },
  SUSPENDED: { label: '정지', color: 'bg-red-100 text-red-800' },
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
  // ASSIGNED 상태에서 인터뷰 여부에 따른 분기
  if (status === 'ASSIGNED') {
    if (hasInterview) {
      return { label: '인터뷰 완료', color: 'bg-blue-100 text-blue-800' };
    }
    return { label: '인터뷰 필요', color: 'bg-yellow-100 text-yellow-800' };
  }

  return CONSULTANT_PROJECT_STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
}
