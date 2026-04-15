/**
 * 프로젝트 트랙 상수
 *
 * OFA(산인공 공식 양식 정렬) 개편으로 도입된 트랙 구분:
 * - ROADMAP: 기존 AI 훈련로드맵 산출물
 * - PBL: 문제해결형(Problem-Based Learning) AI+직무 훈련과정 산출물
 *
 * 한 기업이 여러 트랙의 프로젝트를 가질 수 있으며, projects.track 컬럼으로 구분된다.
 */

export const PROJECT_TRACKS = ['ROADMAP', 'PBL'] as const;
export type ProjectTrack = (typeof PROJECT_TRACKS)[number];

export const TRACK_LABELS: Record<ProjectTrack, string> = {
  ROADMAP: 'AI 훈련로드맵',
  PBL: '문제해결형(PBL) AI+직무 훈련과정',
};

/**
 * Tailwind 유틸 클래스 (PROJECT_STATUS_CONFIG 패턴과 동일).
 * 갤러리 카드·뱃지·페이지 헤더가 공통 참조한다.
 */
export const TRACK_BADGE_COLORS: Record<ProjectTrack, string> = {
  ROADMAP: 'bg-blue-100 text-blue-800',
  PBL: 'bg-purple-100 text-purple-800',
};
