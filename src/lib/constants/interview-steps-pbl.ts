import type { InterviewStep } from './interview-steps';

/**
 * 산인공 PBL 인터뷰 스텝 (docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf 3~11p)
 * 1. 훈련과정 개요 (Ⅰ장)
 * 2. 기업 현황 분석 (Ⅱ-1)
 * 3. 훈련환경 분석 (Ⅱ-2)
 * 4. HRD 제안·과정개발 필요성 (Ⅱ-3)
 * 5. 훈련과제 도출 수행활동 (Ⅲ-1)
 * 6. 문제 도출·우선순위 (Ⅲ-2)
 * 7. 훈련대상 업무 (Ⅲ-3)
 * 8. AI 수준 진단 (Ⅲ-4)
 * 9. 확인·제출
 */
export const PBL_INTERVIEW_STEPS: readonly InterviewStep[] = [
  { id: 1, name: '훈련과정 개요', shortName: '개요' },
  { id: 2, name: '기업 현황 분석', shortName: '기업' },
  { id: 3, name: '기업 훈련환경 분석', shortName: '환경' },
  { id: 4, name: 'AI 과정개발의 필요성', shortName: '필요성' },
  { id: 5, name: '훈련과제 도출 수행활동', shortName: '수행활동' },
  { id: 6, name: '문제 도출·우선순위', shortName: '문제' },
  { id: 7, name: '훈련대상 업무', shortName: '업무' },
  { id: 8, name: 'AI 수준 진단', shortName: 'AI수준' },
  { id: 9, name: '확인·제출', shortName: '확인' },
] as const;

export const PBL_REQUIRED_STEP_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const PBL_TOTAL_STEPS = PBL_INTERVIEW_STEPS.length;
