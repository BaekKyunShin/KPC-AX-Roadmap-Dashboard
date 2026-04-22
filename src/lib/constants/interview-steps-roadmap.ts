import type { InterviewStep } from './interview-steps';

/**
 * 산인공 AI 훈련 로드맵 인터뷰 스텝 (산인공 양식 문서 1 기반)
 * 1. 개요 (Ⅰ-1 수립 필요성 · Ⅰ-3 수립 주요 결과)
 * 2. 기본 정보 · 참석자
 * 3. 기업 요구분석 (Ⅱ-2)
 * 4. 과업·워크플로우 분석 (Ⅱ-3)
 * 5. 훈련대상 과업 선정 (Ⅱ-4)
 * 6. 역량 모델링 (Ⅲ-1) — ISSUE-04 담당자 2026-04-21 확정안에 따라 신규 추가
 * 7. 확인·제출
 */
export const ROADMAP_INTERVIEW_STEPS: readonly InterviewStep[] = [
  { id: 1, name: '개요', shortName: '개요' },
  { id: 2, name: '기본 정보 · 참석자', shortName: '기본' },
  { id: 3, name: '기업 요구분석', shortName: '요구' },
  { id: 4, name: '과업·워크플로우 분석', shortName: '과업' },
  { id: 5, name: '훈련대상 과업 선정', shortName: '대상' },
  { id: 6, name: '역량 모델링', shortName: '역량' },
  { id: 7, name: '확인·제출', shortName: '확인' },
] as const;

export const ROADMAP_REQUIRED_STEP_IDS = [1, 2, 3, 4, 5, 6] as const;
export const ROADMAP_TOTAL_STEPS = ROADMAP_INTERVIEW_STEPS.length;
