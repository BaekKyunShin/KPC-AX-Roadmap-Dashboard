import type { ProjectStatus } from '@/types/database';
import type { ProjectTrack } from '@/lib/constants/tracks';

/**
 * 공통 트랙 분기 헬퍼 — 역할·페이지 전반에서 하드코딩 제거 목적.
 *
 * Session 09에서 발견된 "PBL 프로젝트가 /roadmap으로만 연결되는" 이슈의 근본 해결.
 */

// =============================================================================
// 라우팅 헬퍼
// =============================================================================

/** 컨설턴트 프로젝트 상세 산출물 라우트 */
export function projectDetailHref(projectId: string, track: ProjectTrack): string {
  return track === 'PBL'
    ? `/consultant/projects/${projectId}/pbl`
    : `/consultant/projects/${projectId}/roadmap`;
}

/** 운영관리자 프로젝트 상세 산출물 라우트 */
export function opsProjectDetailHref(projectId: string, track: ProjectTrack): string {
  return track === 'PBL'
    ? `/ops/projects/${projectId}/pbl`
    : `/ops/projects/${projectId}/roadmap`;
}

// =============================================================================
// 라벨 매트릭스
// =============================================================================

/** 트랙 × 상태 조합의 한글 라벨 */
export function statusLabel(status: ProjectStatus | string, track: ProjectTrack): string {
  switch (status) {
    case 'NEW':
      return '신규 등록 완료';
    case 'DIAGNOSED':
    case 'MATCH_RECOMMENDED':
      return '진단결과 입력 완료';
    case 'ASSIGNED':
      return '컨설턴트 배정 완료';
    case 'INTERVIEWED':
      return '현장 인터뷰 완료';
    case 'ROADMAP_DRAFTED':
      return '로드맵 초안 완료';
    case 'PBL_DRAFTED':
      return 'PBL 초안 완료';
    case 'FINALIZED':
      return track === 'PBL' ? 'PBL 최종 확정' : '로드맵 최종 확정';
    default:
      return String(status);
  }
}

/** 컨설턴트 상세 페이지의 기본 액션 버튼 문구 (status·track 조합) */
export function primaryActionLabel(status: ProjectStatus | string, track: ProjectTrack): string {
  const isPBL = track === 'PBL';
  switch (status) {
    case 'INTERVIEWED':
      return isPBL ? 'PBL 보고서 생성' : '로드맵 생성';
    case 'ROADMAP_DRAFTED':
      return '로드맵 편집';
    case 'PBL_DRAFTED':
      return 'PBL 보고서 편집';
    case 'FINALIZED':
      return isPBL ? 'PBL 보고서 보기' : '로드맵 보기';
    default:
      return isPBL ? 'PBL 보고서 보기' : '로드맵 보기';
  }
}

/** 운영관리자 용 액션 버튼 문구 */
export function opsPrimaryActionLabel(
  status: ProjectStatus | string,
  track: ProjectTrack
): string {
  const isPBL = track === 'PBL';
  switch (status) {
    case 'ROADMAP_DRAFTED':
    case 'PBL_DRAFTED':
    case 'FINALIZED':
      return isPBL ? 'PBL 보고서 보기' : 'AI 교육 로드맵 보기';
    default:
      return isPBL ? 'PBL 보고서 보기' : 'AI 교육 로드맵 보기';
  }
}

/** 트랙별 산출물 단수 명칭 (대시보드 카드 등) */
export function trackArtifactLabel(track: ProjectTrack): string {
  return track === 'PBL' ? 'PBL 보고서' : 'AI 훈련로드맵';
}

/** 트랙별 축약 라벨 (뱃지·테이블 컬럼) */
export function trackShortLabel(track: ProjectTrack): string {
  return track === 'PBL' ? 'PBL' : '로드맵';
}

/** 트랙 추론 — track이 명시 안된 legacy 레코드 대비 */
export function inferTrack(raw: string | null | undefined): ProjectTrack {
  return raw === 'PBL' ? 'PBL' : 'ROADMAP';
}
