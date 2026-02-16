import { REQUIRED_STEP_IDS } from '@/lib/constants/interview-steps';
import type {
  InterviewParticipant,
  CompanyDetails,
  JobTask,
  PainPoint,
  ImprovementGoal,
} from '@/lib/schemas/interview';

// =============================================================================
// 타입
// =============================================================================

interface StepValidatorData {
  companyName: string;
  industry: string;
  companySize: string;
  interviewDate: string;
  participants: InterviewParticipant[];
  companyDetails: CompanyDetails;
  jobTasks: JobTask[];
  painPoints: PainPoint[];
  improvementGoals: ImprovementGoal[];
}

// =============================================================================
// 순수 함수 (재귀 호출 가능)
// =============================================================================

function validateStepFn(step: number, data: StepValidatorData): boolean {
  switch (step) {
    case 1:
      // 기업 기본정보 + 인터뷰 기본정보
      return (
        !!data.companyName.trim() &&
        !!data.industry &&
        !!data.companySize &&
        !!data.interviewDate &&
        data.participants.length > 0 &&
        data.participants.every((p) => p.name.trim() !== '')
      );
    case 2:
      // AI 도구 사용 경험은 필수
      return !!data.companyDetails.ai_experience?.trim();
    case 3:
      return (
        data.jobTasks.length > 0 &&
        data.jobTasks.every((t) => t.task_name && t.task_description)
      );
    case 4:
      return data.painPoints.length > 0 && data.painPoints.every((p) => p.description);
    case 5:
      return (
        data.improvementGoals.length > 0 &&
        data.improvementGoals.every((g) => g.goal_description)
      );
    case 6:
      // 확인 페이지: 이전 필수 스텝(1~5)이 모두 완료되었을 때만 완료
      return [1, 2, 3, 4, 5].every((s) => validateStepFn(s, data));
    default:
      return false;
  }
}

// =============================================================================
// 훅
// =============================================================================

export function useStepValidator({
  companyName,
  industry,
  companySize,
  interviewDate,
  participants,
  companyDetails,
  jobTasks,
  painPoints,
  improvementGoals,
}: StepValidatorData) {
  const validateStep = (step: number): boolean =>
    validateStepFn(step, {
      companyName,
      industry,
      companySize,
      interviewDate,
      participants,
      companyDetails,
      jobTasks,
      painPoints,
      improvementGoals,
    });

  // 필수 스텝 완료 여부 (생성 버튼 활성화 조건)
  const isAllRequiredStepsValid = REQUIRED_STEP_IDS.every((step) => validateStep(step));
  const incompleteRequiredSteps = REQUIRED_STEP_IDS.filter((step) => !validateStep(step));

  return {
    validateStep,
    isAllRequiredStepsValid,
    incompleteRequiredSteps,
  };
}
