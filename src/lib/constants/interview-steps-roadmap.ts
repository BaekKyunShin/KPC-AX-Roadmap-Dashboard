import type { InterviewStep } from './interview-steps';

/**
 * 산인공 AI 훈련 로드맵 인터뷰 스텝 (산인공 양식 문서 1 기반)
 * 1. 기본 정보 · 참석자
 * 2. 기업 요구분석 (Ⅱ-2)
 * 3. 과업·워크플로우 분석 (Ⅱ-3)
 * 4. 훈련대상 과업 선정 (Ⅱ-4)
 * 5. 확인·제출
 */
export const ROADMAP_INTERVIEW_STEPS: readonly InterviewStep[] = [
  { id: 1, name: '기본 정보 · 참석자', shortName: '기본' },
  { id: 2, name: '기업 요구분석', shortName: '요구' },
  { id: 3, name: '과업·워크플로우 분석', shortName: '과업' },
  { id: 4, name: '훈련대상 과업 선정', shortName: '대상' },
  { id: 5, name: '확인·제출', shortName: '확인' },
] as const;

export const ROADMAP_REQUIRED_STEP_IDS = [1, 2, 3, 4] as const;
export const ROADMAP_TOTAL_STEPS = ROADMAP_INTERVIEW_STEPS.length;
