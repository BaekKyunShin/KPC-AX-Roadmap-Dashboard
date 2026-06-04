/**
 * 인터뷰 스텝 정의
 * - 트랙별 스텝 목록은 `interview-steps-roadmap.ts` / `interview-steps-pbl.ts`(Step 8)
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
