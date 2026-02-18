// =============================================================================
// 컨설턴트 홈 대시보드 유틸리티 함수
// =============================================================================

export interface ProjectStats {
  total: number;
  waitingInterview: number;   // ASSIGNED
  interviewDone: number;      // INTERVIEWED
  draftingRoadmap: number;    // ROADMAP_DRAFTED
  roadmapCompleted: number;   // FINALIZED
  byStatus: Record<string, number>;
}

/**
 * 프로젝트 목록에서 상태별 통계를 집계
 */
export function aggregateProjectStats(
  projects: { status: string }[]
): ProjectStats {
  const byStatus: Record<string, number> = {};
  for (const p of projects) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  }
  return {
    total: projects.length,
    waitingInterview: byStatus['ASSIGNED'] || 0,
    interviewDone: byStatus['INTERVIEWED'] || 0,
    draftingRoadmap: byStatus['ROADMAP_DRAFTED'] || 0,
    roadmapCompleted: byStatus['FINALIZED'] || 0,
    byStatus,
  };
}

/**
 * 날짜 문자열을 상대 시간으로 변환
 * - 오늘: "오늘 14:30"
 * - 어제: "어제 16:45"
 * - 2~6일: "N일 전"
 * - 7일+: "1월 30일"
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  // 날짜 비교를 위해 자정 기준으로 계산
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (diffDays === 0) {
    return `오늘 ${timeStr}`;
  }
  if (diffDays === 1) {
    return `어제 ${timeStr}`;
  }
  if (diffDays < 7) {
    return `${diffDays}일 전`;
  }
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
}

// =============================================================================
// 활동 메시지 포맷
// =============================================================================

/** 수동 타입별 멘트 템플릿 */
const MANUAL_MESSAGE_MAP: Record<string, string> = {
  pre_research: '사전조사 메모를 작성했습니다.',
  field_note: '현장메모를 작성했습니다.',
  follow_up: '후속조치를 기록했습니다.',
  client_feedback: '기업피드백을 기록했습니다.',
};

/** system_auto content → 능동형 멘트 변환 */
const SYSTEM_AUTO_TRANSFORMS: [RegExp, string][] = [
  [/^인터뷰가 저장되었습니다\.$/, '인터뷰를 저장했습니다.'],
  [/^인터뷰가 수정되었습니다\.$/, '인터뷰를 수정했습니다.'],
  [/^로드맵이 생성되었습니다\.$/, '로드맵을 생성했습니다.'],
  [/^새 로드맵 버전이 생성되었습니다\.$/, '새 로드맵 버전을 생성했습니다.'],
  [/^로드맵이 최종 확정되었습니다\.$/, '로드맵을 최종 확정했습니다.'],
];

/**
 * 활동 로그의 액션 부분만 반환 (기업명 제외)
 * UI에서 기업명을 볼드로 별도 렌더링할 때 사용
 * - 수동 타입: "의 사전조사 메모를 작성했습니다."
 * - system_auto: "의 인터뷰를 저장했습니다."
 * - 폴백: " — {content}"
 */
export function getActivityAction(
  logType: string,
  content?: string,
): string {
  const manualMsg = MANUAL_MESSAGE_MAP[logType];
  if (manualMsg) {
    return `의 ${manualMsg}`;
  }

  if (logType === 'system_auto' && content) {
    for (const [pattern, replacement] of SYSTEM_AUTO_TRANSFORMS) {
      if (pattern.test(content)) {
        return `의 ${replacement}`;
      }
    }
  }

  return ` — ${content || ''}`;
}

/**
 * 활동 로그를 홈 대시보드용 표시 멘트로 변환
 * getActivityAction을 내부적으로 활용하여 기업명과 결합
 */
export function formatActivityMessage(
  logType: string,
  companyName: string,
  content?: string,
): string {
  return `${companyName}${getActivityAction(logType, content)}`;
}

// =============================================================================
// 활동 태그 정보
// =============================================================================

export interface ActivityTagInfo {
  label: string;
  bgColor: string;
  textColor: string;
}

/** 수동 타입 4종 → 모두 "활동메모" 태그로 통합 (MANUAL_MESSAGE_MAP에서 파생) */
const MANUAL_TYPES = new Set(Object.keys(MANUAL_MESSAGE_MAP));
const MEMO_TAG: ActivityTagInfo = { label: '활동메모', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' };

const INTERVIEW_TAG: ActivityTagInfo = { label: '인터뷰', bgColor: 'bg-blue-50', textColor: 'text-blue-700' };
const ROADMAP_TAG: ActivityTagInfo = { label: '로드맵', bgColor: 'bg-purple-50', textColor: 'text-purple-700' };
const SYSTEM_FALLBACK_TAG: ActivityTagInfo = { label: '시스템', bgColor: 'bg-gray-50', textColor: 'text-gray-500' };

/**
 * 활동 로그의 태그 정보를 반환 (홈 대시보드용 3종 분류)
 * - 수동 타입 4종: "활동메모" (에메랄드)
 * - system_auto 인터뷰: "인터뷰" (파란색)
 * - system_auto 로드맵: "로드맵" (보라색)
 * - 폴백: "시스템" (회색)
 */
export function getActivityTagInfo(logType: string, content?: string): ActivityTagInfo {
  if (MANUAL_TYPES.has(logType)) return MEMO_TAG;

  if (logType === 'system_auto' && content) {
    if (/인터뷰/.test(content)) return INTERVIEW_TAG;
    if (/로드맵/.test(content)) return ROADMAP_TAG;
  }

  return SYSTEM_FALLBACK_TAG;
}
