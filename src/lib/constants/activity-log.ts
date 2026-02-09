// =============================================================================
// 컨설턴트 활동 일지 상수
// =============================================================================

/** 활동 일지 유형 */
export const ACTIVITY_LOG_TYPES = [
  'pre_research',
  'field_note',
  'follow_up',
  'client_feedback',
  'system_auto',
] as const;

export type ActivityLogType = (typeof ACTIVITY_LOG_TYPES)[number];

/** 컨설턴트가 직접 작성할 수 있는 유형 (시스템 자동 제외) */
export const MANUAL_ACTIVITY_LOG_TYPES = [
  'pre_research',
  'field_note',
  'follow_up',
  'client_feedback',
] as const;

export type ManualActivityLogType = (typeof MANUAL_ACTIVITY_LOG_TYPES)[number];

/** 유형별 설정 (라벨, 색상) */
export const ACTIVITY_LOG_TYPE_CONFIG: Record<
  ActivityLogType,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  pre_research: {
    label: '사전조사',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  field_note: {
    label: '현장메모',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
  },
  follow_up: {
    label: '후속조치',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  client_feedback: {
    label: '기업피드백',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
  },
  system_auto: {
    label: '시스템',
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500',
  },
};

/** 활동 일지 페이지네이션 */
export const ACTIVITY_LOG_PAGE_SIZE = 20;

/** 활동 일지 내용 최대 길이 */
export const ACTIVITY_LOG_MAX_LENGTH = 2000;

/** 활동 일지 미리보기 줄 수 */
export const ACTIVITY_LOG_PREVIEW_LENGTH = 150;
