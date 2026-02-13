// 컴포넌트
export { default as AlertMessage } from './AlertMessage';
export { default as TabNavigation, TAB_DESCRIPTIONS } from './TabNavigation';
export { default as ReasonLengthHint } from './ReasonLengthHint';
export type { TabType } from './TabNavigation';

// 아이콘
export { SpinnerIcon, RefreshIcon, WarningIcon, CloseIcon, CheckIcon } from './Icons';

// 분리된 컴포넌트
export { default as SelectableCard } from './SelectableCard';
export { default as RecommendationResults } from './RecommendationResults';

// 커스텀 훅
export { default as useAssignmentMatching } from './useAssignmentMatching';

// 유틸리티 함수 및 타입
export {
  getScoreColorClass,
  getScoreGaugeColor,
  parseRationale,
  DISPLAY_COUNTS,
  SCORE_THRESHOLDS,
  ERROR_MESSAGES,
} from './utils';
export type {
  ConsultantInfo,
  ConsultantProfile,
  LLMRationaleData,
  RationaleData,
  Recommendation,
  ValidRecommendation,
  ParsedRationale,
} from './utils';

// 상수 및 유틸리티
export {
  API_TIMEOUT_MS,
  DEFAULT_TOP_N,
  TEACHING_LEVEL_LABELS,
  getLevelLabel,
  REASON_LENGTH,
  ASSIGN_BUTTON_STYLE,
} from './constants';
