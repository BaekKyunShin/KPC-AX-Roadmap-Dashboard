import type { ProjectStatus, RoadmapVersionStatus, UserStatus } from '@/types/database';

/**
 * 프로젝트 상태 설정 (OPS 관리자용 - 전체 상태)
 */
export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  NEW: { label: '신규', color: 'bg-gray-100 text-gray-800' },
  DIAGNOSED: { label: '진단완료', color: 'bg-blue-100 text-blue-800' },
  MATCH_RECOMMENDED: { label: '매칭추천', color: 'bg-purple-100 text-purple-800' },
  ASSIGNED: { label: '배정완료', color: 'bg-green-100 text-green-800' },
  INTERVIEWED: { label: '인터뷰완료', color: 'bg-yellow-100 text-yellow-800' },
  ROADMAP_DRAFTED: { label: '로드맵초안', color: 'bg-orange-100 text-orange-800' },
  FINALIZED: { label: '최종확정', color: 'bg-emerald-100 text-emerald-800' },
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
