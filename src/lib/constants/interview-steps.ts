/**
 * 인터뷰 스텝 정의
 * - 트랙별 스텝 목록은 `interview-steps-roadmap.ts` / `interview-steps-pbl.ts`(Step 8)
 * - 기존 레거시 상수(`INTERVIEW_STEPS`, `TOTAL_STEPS`, `REQUIRED_STEP_IDS`)는
 *   legacy `InterviewClient.tsx` 호환을 위해 유지. Step 12에서 일괄 제거 예정.
 */

import type { ProjectTrack } from './tracks';
import { ROADMAP_INTERVIEW_STEPS } from './interview-steps-roadmap';
import { PBL_INTERVIEW_STEPS } from './interview-steps-pbl';

export interface InterviewStep {
  id: number;
  name: string;
  shortName: string;
}

/**
 * 트랙별 인터뷰 스텝 디스패처
 */
export function getInterviewSteps(track: ProjectTrack): readonly InterviewStep[] {
  if (track === 'ROADMAP') return ROADMAP_INTERVIEW_STEPS;
  if (track === 'PBL') return PBL_INTERVIEW_STEPS;
  const _exhaustive: never = track;
  throw new Error(`Unknown project track: ${String(_exhaustive)}`);
}

/**
 * @deprecated OFA-05에서 트랙별 스텝 디스패처로 이전. 신규 코드는 `getInterviewSteps(track)` 사용.
 */
export const INTERVIEW_STEPS: readonly InterviewStep[] = [
  { id: 1, name: '기본 정보', shortName: '기본' },
  { id: 2, name: '시스템/AI 활용 경험', shortName: 'AI' },
  { id: 3, name: '세부업무', shortName: '업무' },
  { id: 4, name: '페인포인트', shortName: '페인' },
  { id: 5, name: '목표/제약', shortName: '목표' },
  { id: 6, name: '확인', shortName: '확인' },
] as const;

/** @deprecated OFA-05. 트랙별 스텝 배열의 length를 사용하세요. */
export const TOTAL_STEPS = INTERVIEW_STEPS.length;

/** @deprecated OFA-05. `ROADMAP_REQUIRED_STEP_IDS`를 사용하세요. */
export const REQUIRED_STEP_IDS = [1, 3, 4, 5] as const;
