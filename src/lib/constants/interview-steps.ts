/**
 * 인터뷰 스텝 정의
 * - 실제 인터뷰와 테스트 로드맵에서 동일하게 사용
 */

export interface InterviewStep {
  id: number;
  name: string;
  shortName: string;
}

/**
 * 인터뷰 진행 단계 목록
 */
export const INTERVIEW_STEPS: readonly InterviewStep[] = [
  { id: 1, name: '기본 정보', shortName: '기본' },
  { id: 2, name: '시스템/AI 활용 경험', shortName: 'AI' },
  { id: 3, name: '세부업무', shortName: '업무' },
  { id: 4, name: '페인포인트', shortName: '페인' },
  { id: 5, name: '목표/제약', shortName: '목표' },
  { id: 6, name: '확인', shortName: '확인' },
] as const;

/**
 * 총 스텝 개수
 */
export const TOTAL_STEPS = INTERVIEW_STEPS.length;

/**
 * 필수 스텝 ID 목록 (로드맵 생성에 필요한 스텝)
 */
export const REQUIRED_STEP_IDS = [1, 3, 4, 5] as const;
