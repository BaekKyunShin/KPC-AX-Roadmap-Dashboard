'use client';

/**
 * PBL 테스트 클라이언트 (OFA-11 재작성).
 *
 * 산인공 양식 2번 기준 PBL 인터뷰 폼을 그대로 재사용해 실제 인터뷰 화면과 **완전 동일**하게
 * 구성한다. 샘플 fixture(`PBL_INTERVIEW_SAMPLE`)를 초기값으로 채우되 사용자가 모든 필드를
 * 편집 가능하다. 제출 시 `generateTestPBL` 액션이 테스트 프로젝트를 생성하고 LLM으로
 * PBL 보고서 초안을 만든다.
 */

import { useState, Suspense, lazy } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Check, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/Skeleton';
import PendingApprovalCard from '@/components/PendingApprovalCard';
import { showErrorToast, scrollToPageTop } from '@/lib/utils';
import {
  PBL_INTERVIEW_STEPS,
  PBL_REQUIRED_STEP_IDS,
  PBL_TOTAL_STEPS,
} from '@/lib/constants/interview-steps-pbl';
import {
  type PBLCourseOverview,
  type PBLCompanyStatus,
  type PBLTrainingEnvironment,
  type PBLHrdNecessity,
  type PBLPerformanceActivities,
  type PBLProblemDefinition,
  type PBLTargetTasks,
  type PBLAILevelDiagnosis,
  type PBLInterviewInput,
} from '@/lib/schemas/interview-pbl';
import InterviewStepper from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/InterviewStepper';
import { generateTestPBL, cancelTestPBLGeneration, type TestPBLResult } from './actions';
import type { PBLInterviewSample } from '../../../../e2e/fixtures/pbl-interview-sample';

const StepPBLCourseOverview = lazy(
  () => import('@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLCourseOverview'),
);
const StepPBLCompanyStatus = lazy(
  () => import('@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLCompanyStatus'),
);
const StepPBLTrainingEnvironment = lazy(
  () => import('@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLTrainingEnvironment'),
);
const StepPBLHrdNecessity = lazy(
  () => import('@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLHrdNecessity'),
);
const StepPBLPerformanceActivities = lazy(
  () => import('@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLPerformanceActivities'),
);
const StepPBLProblemDefinition = lazy(
  () => import('@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLProblemDefinition'),
);
const StepPBLTargetTasks = lazy(
  () => import('@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLTargetTasks'),
);
const StepPBLAILevel = lazy(
  () => import('@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLAILevel'),
);
const StepPBLSummary = lazy(
  () => import('@/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepPBLSummary'),
);

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface TestPBLClientProps {
  user: UserInfo;
  canAccess: boolean;
  sampleData: PBLInterviewSample;
}

function StepSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export default function TestPBLClient({ user, canAccess, sampleData }: TestPBLClientProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestPBLResult | null>(null);

  // 샘플 fixture를 초기값으로 (편집 가능) — readonly fixture → mutable copy
  const [courseOverview, setCourseOverview] = useState<PBLCourseOverview>(
    () => JSON.parse(JSON.stringify(sampleData.courseOverview)) as PBLCourseOverview,
  );
  const [companyStatus, setCompanyStatus] = useState<PBLCompanyStatus>(
    () => JSON.parse(JSON.stringify(sampleData.companyStatus)) as PBLCompanyStatus,
  );
  const [trainingEnvironment, setTrainingEnvironment] = useState<PBLTrainingEnvironment>(
    () => JSON.parse(JSON.stringify(sampleData.trainingEnvironment)) as PBLTrainingEnvironment,
  );
  const [hrdNecessity, setHrdNecessity] = useState<PBLHrdNecessity>(
    () => JSON.parse(JSON.stringify(sampleData.hrdNecessity)) as PBLHrdNecessity,
  );
  const [performanceActivities, setPerformanceActivities] = useState<PBLPerformanceActivities>(
    () => ({
      performance_activities: JSON.parse(
        JSON.stringify(sampleData.performanceActivities.activities ?? []),
      ) as PBLPerformanceActivities['performance_activities'],
    }),
  );
  const [problemDefinition, setProblemDefinition] = useState<PBLProblemDefinition>(
    () => JSON.parse(JSON.stringify(sampleData.problemDefinition)) as PBLProblemDefinition,
  );
  const [targetTasks, setTargetTasks] = useState<PBLTargetTasks>(
    () => JSON.parse(JSON.stringify(sampleData.targetTasks)) as PBLTargetTasks,
  );
  const [aiLevelDiagnosis, setAILevelDiagnosis] = useState<PBLAILevelDiagnosis>(
    () => JSON.parse(JSON.stringify(sampleData.aiLevelDiagnosis)) as PBLAILevelDiagnosis,
  );

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return (
          (courseOverview.course_name ?? '').trim() !== '' &&
          (courseOverview.training_hours ?? 0) > 0 &&
          (courseOverview.trainee_count ?? 0) > 0 &&
          (courseOverview.training_job ?? '').trim() !== '' &&
          (courseOverview.training_goals ?? []).length > 0
        );
      case 2:
        return (
          (companyStatus.business_issues ?? '').trim() !== '' &&
          (companyStatus.organization ?? []).length > 0
        );
      case 3:
        return (
          (trainingEnvironment.proper_training_hours ?? 0) > 0 &&
          (trainingEnvironment.target_count ?? 0) > 0 &&
          (trainingEnvironment.training_needs_analysis ?? '').trim() !== '' &&
          (trainingEnvironment.expectation?.as_is ?? '').trim() !== '' &&
          (trainingEnvironment.expectation?.to_be ?? '').trim() !== ''
        );
      case 4:
        // PBLHrdNecessity 스키마는 `course_development_necessity` OR `development_need`를 가질 수 있음
        return (
          ((hrdNecessity as unknown as { course_development_necessity?: string })
            .course_development_necessity ??
            (hrdNecessity as unknown as { development_need?: string }).development_need ??
            '').trim() !== ''
        );
      case 5:
        return performanceActivities.performance_activities.length > 0;
      case 6:
        return (
          ((problemDefinition as unknown as { problem_definition?: { background?: string } })
            .problem_definition?.background ??
            (problemDefinition as unknown as { current_issues?: string }).current_issues ??
            '').trim() !== ''
        );
      case 7:
        return (
          (targetTasks.target_task_details ?? []).length > 0 &&
          (targetTasks.target_task_details ?? []).every(
            (d) =>
              d.task_name?.trim() !== '' &&
              d.as_is?.trim() !== '' &&
              d.to_be?.trim() !== '',
          )
        );
      case 8:
        return (aiLevelDiagnosis.improvement_reason ?? '').trim() !== '';
      case 9:
        return PBL_REQUIRED_STEP_IDS.every((s) => validateStep(s));
      default:
        return false;
    }
  };

  const incompleteRequiredSteps = PBL_REQUIRED_STEP_IDS.filter((s) => !validateStep(s));
  const isAllRequiredStepsValid = incompleteRequiredSteps.length === 0;

  const goToStep = (step: number) => {
    if (step === currentStep) return;
    if (validateStep(currentStep) && !completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    setCurrentStep(step);
    scrollToPageTop();
  };
  const goToNextStep = () => {
    if (currentStep < PBL_TOTAL_STEPS) goToStep(currentStep + 1);
  };
  const goToPrevStep = () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!isAllRequiredStepsValid) {
      showErrorToast(
        '입력 확인 필요',
        `${incompleteRequiredSteps.length}개 필수 단계를 완료해주세요.`,
      );
      if (incompleteRequiredSteps[0]) setCurrentStep(incompleteRequiredSteps[0]);
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const input: PBLInterviewInput = {
        courseOverview,
        companyStatus,
        trainingEnvironment,
        hrdNecessity,
        performanceActivities,
        problemDefinition,
        targetTasks,
        aiLevelDiagnosis,
      };
      const res = await generateTestPBL(input);
      if (res.success) {
        setResult(res.data);
      } else {
        setError(res.error);
        showErrorToast('PBL 생성 실패', res.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PBL 생성 중 오류가 발생했습니다.';
      setError(message);
      showErrorToast('PBL 생성 실패', message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = async () => {
    await cancelTestPBLGeneration();
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setCurrentStep(1);
  };

  if (!canAccess) {
    const userRole = user.role === 'USER_PENDING' ? 'CONSULTANT' : 'OPS_ADMIN';
    return (
      <div className="max-w-2xl mx-auto py-8">
        <PendingApprovalCard
          userName={user.name}
          userEmail={user.email}
          userRole={userRole}
          hasProfile={true}
        />
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-4xl mx-auto py-6 space-y-6">
        <PageHeader title="PBL 테스트" />
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <AlertTitle className="text-emerald-800">PBL 보고서 초안 생성 완료</AlertTitle>
          <AlertDescription className="text-emerald-700 space-y-3">
            <p>테스트 프로젝트에 PBL DRAFT 버전이 저장되었습니다.</p>
            <div className="flex gap-2 flex-wrap">
              <Link
                href={`/consultant/projects/${result.projectId}/pbl`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
              >
                생성된 PBL 보고서 보기
              </Link>
              <Button variant="outline" size="sm" onClick={handleReset}>
                다시 테스트
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StepPBLCourseOverview value={courseOverview} onChange={setCourseOverview} />;
      case 2:
        return <StepPBLCompanyStatus value={companyStatus} onChange={setCompanyStatus} />;
      case 3:
        return (
          <StepPBLTrainingEnvironment value={trainingEnvironment} onChange={setTrainingEnvironment} />
        );
      case 4:
        return <StepPBLHrdNecessity value={hrdNecessity} onChange={setHrdNecessity} />;
      case 5:
        return (
          <StepPBLPerformanceActivities
            value={performanceActivities}
            onChange={setPerformanceActivities}
          />
        );
      case 6:
        return <StepPBLProblemDefinition value={problemDefinition} onChange={setProblemDefinition} />;
      case 7:
        return <StepPBLTargetTasks value={targetTasks} onChange={setTargetTasks} />;
      case 8:
        return <StepPBLAILevel value={aiLevelDiagnosis} onChange={setAILevelDiagnosis} />;
      case 9:
        return (
          <StepPBLSummary
            courseOverview={courseOverview}
            companyStatus={companyStatus}
            trainingEnvironment={trainingEnvironment}
            hrdNecessity={hrdNecessity}
            performanceActivities={performanceActivities}
            problemDefinition={problemDefinition}
            targetTasks={targetTasks}
            aiLevelDiagnosis={aiLevelDiagnosis}
            onEditStep={goToStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 py-6">
      <div className="mb-6">
        <PageHeader
          title="PBL 테스트"
          description="산인공 양식 2번 기준 PBL 인터뷰 연습 — 샘플 데이터가 미리 채워져 있습니다."
          backLink={{ href: '/consultant/projects', label: '담당 프로젝트로 돌아가기', useBack: true }}
        />
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>테스트 모드 안내</AlertTitle>
        <AlertDescription>
          이 화면의 UI/UX는 실제 PBL 인터뷰 화면과 동일합니다. 샘플 데이터를 편집하거나 그대로 두고
          <strong> &quot;PBL 보고서 생성&quot; </strong>을 누르면 LLM이 PBL 보고서 초안을 생성합니다.
          <strong className="block mt-2 text-amber-700">
            결과는 is_test_mode=true 로 표시된 테스트 프로젝트에 저장되어 실제 프로젝트와 격리됩니다.
          </strong>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-card shadow rounded-lg p-4 mb-6">
        <InterviewStepper
          steps={[...PBL_INTERVIEW_STEPS]}
          currentStep={currentStep}
          onStepClick={goToStep}
          completedSteps={completedSteps}
          validateStep={validateStep}
        />
      </div>

      <div className="bg-card shadow rounded-lg p-4 sm:p-6 mb-6 min-h-[400px]">
        <Suspense fallback={<StepSkeleton />}>{renderStepContent()}</Suspense>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-background border-t border-border px-3 pb-3 pt-4 sm:p-4 md:relative md:z-auto md:border-0 md:p-0 md:bg-transparent">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={goToPrevStep}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            이전
          </Button>

          <div className="flex items-center gap-3">
            {currentStep < PBL_TOTAL_STEPS ? (
              <Button type="button" size="sm" onClick={goToNextStep}>
                다음
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                {!isAllRequiredStepsValid && (
                  <span className="text-xs sm:text-sm text-amber-600">
                    {incompleteRequiredSteps.length}개 필수 단계 미완료
                  </span>
                )}
                {isGenerating ? (
                  <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                    취소
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isGenerating || !isAllRequiredStepsValid}
                  data-testid="test-pbl-generate-button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      생성 중…
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      PBL 보고서 생성
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
