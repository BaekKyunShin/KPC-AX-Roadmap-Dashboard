/**
 * 컨설턴트 배정 관련 상수
 */

// API 요청 타임아웃 (30초)
export const API_TIMEOUT_MS = 30000;

// 매칭 추천 개수
export const DEFAULT_TOP_N = 3;

// 배정 사유 글자수 제한
export const REASON_LENGTH = {
  MIN: 10,
  MAX: 500,
} as const;

// 배정 버튼 공통 스타일
export const ASSIGN_BUTTON_STYLE =
  'px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:bg-blue-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none';

// 강의 레벨 라벨 매핑
export const TEACHING_LEVEL_LABELS: Record<string, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
};

/**
 * 강의 레벨 코드를 한글 라벨로 변환
 */
export function getLevelLabel(level: string): string {
  return TEACHING_LEVEL_LABELS[level] || level;
}
