/**
 * 로드맵 관련 공통 유틸리티
 */

/** 과정 레벨 타입 */
export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/**
 * 과정 레벨을 한글 라벨로 변환
 */
export function getLevelLabel(level: CourseLevel | string): string {
  switch (level) {
    case 'BEGINNER':
      return '초급';
    case 'INTERMEDIATE':
      return '중급';
    case 'ADVANCED':
      return '고급';
    default:
      return level;
  }
}

/**
 * 과정 레벨을 영문 라벨로 변환 (PDF 내보내기용)
 */
export function getLevelLabelEn(level: CourseLevel | string): string {
  switch (level) {
    case 'BEGINNER':
      return 'Beginner';
    case 'INTERMEDIATE':
      return 'Intermediate';
    case 'ADVANCED':
      return 'Advanced';
    default:
      return level;
  }
}

/**
 * 과정 레벨에 따른 색상 클래스 반환
 */
export function getLevelColorClass(level: CourseLevel | string): string {
  switch (level) {
    case 'BEGINNER':
      return 'text-green-600 border-green-200';
    case 'INTERMEDIATE':
      return 'text-blue-600 border-blue-200';
    case 'ADVANCED':
      return 'text-purple-600 border-purple-200';
    default:
      return 'text-gray-600 border-gray-200';
  }
}

/** 유료 도구 감지 키워드 */
export const PAID_TOOL_KEYWORDS = [
  '구독 필요',
  '유료',
  '결제',
  'paid',
  'premium',
  'pro 버전',
] as const;

/** 최대 과정 시간 제한 */
export const MAX_COURSE_HOURS = 40;
