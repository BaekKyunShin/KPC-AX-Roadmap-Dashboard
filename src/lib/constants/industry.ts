/**
 * 프로젝트 및 로드맵 테스트에서 사용하는 업종 옵션
 */

/** 업종 목록 (profile-options.ts의 INDUSTRIES와 동기화) */
export const PROJECT_INDUSTRIES = [
  '제조업',
  '서비스업',
  '유통/물류',
  'IT/소프트웨어',
  '금융/보험',
  '건설/부동산',
  '의료/헬스케어',
  '에너지/환경',
  '농업/식품',
  '교육',
  '공공/정부',
  '기타',
] as const;

/** 업종 타입 */

/** 세부 업종 입력 제한 */
export const SUB_INDUSTRY_CONSTRAINTS = {
  maxTags: 10,
  maxLength: 50,
} as const;
