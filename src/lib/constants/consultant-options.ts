/**
 * 컨설턴트 프로필 관련 옵션 상수
 * - 회원가입, 프로필 수정 등에서 공통으로 사용
 */

// 전문분야 옵션
export const EXPERTISE_DOMAINS = [
  '제조/생산',
  '품질관리',
  '영업/마케팅',
  '인사/총무',
  '재무/회계',
  '연구개발',
  'IT/시스템',
  '물류/유통',
  '고객서비스',
] as const;

// 업종 옵션
export const INDUSTRIES = [
  '제조업',
  '서비스업',
  '유통/물류',
  'IT/소프트웨어',
  '금융/보험',
  '건설/부동산',
  '의료/헬스케어',
  '교육',
  '공공/정부',
] as const;

// 역량 태그 옵션
export const SKILL_TAGS = [
  '데이터 전처리',
  '업무자동화',
  '문서/보고',
  '품질/통계',
  '보안/컴플라이언스',
  '프로젝트 관리',
  '교육/코칭',
  'AI 도구 활용',
  '프로세스 개선',
] as const;

// 강의 가능 레벨
export const TEACHING_LEVELS = [
  { value: 'BEGINNER', label: '초급' },
  { value: 'INTERMEDIATE', label: '중급' },
  { value: 'ADVANCED', label: '고급' },
] as const;

// 코칭 방식
export const COACHING_METHODS = [
  { value: 'PBL', label: 'PBL' },
  { value: 'WORKSHOP', label: '워크숍' },
  { value: 'MENTORING', label: '멘토링' },
  { value: 'LECTURE', label: '강의' },
  { value: 'HYBRID', label: '혼합형' },
] as const;

// 타입 추출
export type ExpertiseDomain = (typeof EXPERTISE_DOMAINS)[number];
export type Industry = (typeof INDUSTRIES)[number];
export type SkillTag = (typeof SKILL_TAGS)[number];
export type TeachingLevel = (typeof TEACHING_LEVELS)[number]['value'];
export type CoachingMethod = (typeof COACHING_METHODS)[number]['value'];
