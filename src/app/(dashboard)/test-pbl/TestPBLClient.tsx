'use client';

/**
 * PBL 테스트 클라이언트 (ISSUE-02·03 Step E 재작성).
 *
 * 산인공 양식 2번 기준 PBL 인터뷰 폼을 그대로 재사용해 실제 인터뷰 화면과 **완전 동일**하게
 * 구성한다. 입력 폼은 빈 상태로 시작하며, 사용자는 PageHeader 우측의 "샘플 데이터 채우기"
 * 버튼을 눌러 `PBL_INTERVIEW_SAMPLE` fixture 를 일괄 주입할 수 있다. 제출 시 `generateTestPBL`
 * 액션이 테스트 프로젝트를 생성하고 LLM으로 PBL 보고서 초안을 만든다.
 */

import { useState, Suspense, lazy } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Check, Loader2, Info, CheckCircle2, Wand2 } from 'lucide-react';
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
import { PBL_INTERVIEW_SAMPLE } from '@/lib/fixtures/pbl-interview-sample';

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

// ─── 빈 폼 초기값 헬퍼 (ISSUE-02·03 Step E) ─────────────────────────────────
// PBL 스키마에는 createEmpty 헬퍼가 없어서 컴포넌트 안에서 직접 정의한다.
function createEmptyCourseOverview(): PBLCourseOverview {
  return {
    company_name: '',
    business_registration_no: '',
    industry_code: '',
    industry_main: '',
    address: '',
    training_address: '',
    jurisdiction_office: '',
    contact: { position: '', name: '', phone: '', email: '' },
    course_name: '',
    ncs_code: '',
    training_hours: 0,
    trainee_count: 0,
    training_job: '',
    ai_level: 'AI기초형',
    training_goals: [],
  };
}

function createEmptyCompanyStatus(): PBLCompanyStatus {
  return { business_issues: '', organization: [] };
}

function createEmptyTrainingEnvironment(): PBLTrainingEnvironment {
  return {
    proper_training_hours: 0,
    training_place: { types: [], location: '', special_notes: '' },
    internal_instructor: { used: false, name: '', position: '' },
    target_count: 0,
    target_characteristics: { career: '', level: '' },
    ai_infrastructure: { ai_tools: '제한적', network: '보통', pc_count: 0, etc_equipment: '' },
    training_needs_analysis: '',
    expectation: { as_is: '', to_be: '' },
  };
}

function createEmptyHrdNecessity(): PBLHrdNecessity {
  return {
    training_history: [],
    support_history: [],
    recommendations: [],
    course_development_necessity: '',
  };
}

function createEmptyPerformanceActivities(): PBLPerformanceActivities {
  return { performance_activities: [] };
}

function createEmptyProblemDefinition(): PBLProblemDefinition {
  // sample fixture 와 동일하게 legacy current_issues/root_causes/gap_analysis 키 형태로 두면
  // validateStep 의 fallback 분기와 자연스럽게 호환된다.
  return {
    problem_definition: { background: '', core_problem: '', scope: '', constraints: '' },
    problem_priorities: [],
  } as unknown as PBLProblemDefinition;
}

function createEmptyTargetTasks(): PBLTargetTasks {
  return {
    target_tasks: [],
    selection_reason: '',
    target_task_details: [],
  };
}

function createEmptyAILevelDiagnosis(): PBLAILevelDiagnosis {
  return {
    current_ai_level: 'AI기초형',
    expected_ai_level: 'AI탐구형',
    improvement_reason: '',
  };
}

export default function TestPBLClient({ user, canAccess }: TestPBLClientProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestPBLResult | null>(null);

  // ISSUE-02·03 Step E: 빈 폼으로 시작. 샘플 채우기 버튼으로 일괄 주입.
  const [courseOverview, setCourseOverview] = useState<PBLCourseOverview>(
    () => createEmptyCourseOverview(),
  );
  const [companyStatus, setCompanyStatus] = useState<PBLCompanyStatus>(
    () => createEmptyCompanyStatus(),
  );
  const [trainingEnvironment, setTrainingEnvironment] = useState<PBLTrainingEnvironment>(
    () => createEmptyTrainingEnvironment(),
  );
  const [hrdNecessity, setHrdNecessity] = useState<PBLHrdNecessity>(
    () => createEmptyHrdNecessity(),
  );
  const [performanceActivities, setPerformanceActivities] = useState<PBLPerformanceActivities>(
    () => createEmptyPerformanceActivities(),
  );
  const [problemDefinition, setProblemDefinition] = useState<PBLProblemDefinition>(
    () => createEmptyProblemDefinition(),
  );
  const [targetTasks, setTargetTasks] = useState<PBLTargetTasks>(
    () => createEmptyTargetTasks(),
  );
  const [aiLevelDiagnosis, setAILevelDiagnosis] = useState<PBLAILevelDiagnosis>(
    () => createEmptyAILevelDiagnosis(),
  );

  /**
   * 샘플 fixture(`PBL_INTERVIEW_SAMPLE`) 값을 모든 state 에 일괄 주입.
   * 사용자가 이미 입력한 값이 있으면 confirm 으로 덮어쓰기 여부 확인.
   */
  const fillSample = () => {
    const hasInput =
      courseOverview.course_name.trim() !== '' ||
      courseOverview.company_name.trim() !== '' ||
      companyStatus.business_issues.trim() !== '' ||
      trainingEnvironment.training_needs_analysis.trim() !== '' ||
      hrdNecessity.course_development_necessity.trim() !== '' ||
      performanceActivities.performance_activities.length > 0 ||
      targetTasks.target_task_details.length > 0 ||
      aiLevelDiagnosis.improvement_reason.trim() !== '';
    if (
      hasInput &&
      typeof window !== 'undefined' &&
      !window.confirm('기존 입력값이 모두 덮어써집니다. 계속하시겠습니까?')
    ) {
      return;
    }
    // readonly `as const` fixture → 깊은 복사 후 mutable 로 주입.
    // sample 객체는 schema (current_issues / root_causes 등 legacy 키 포함) 와
    // 100% 일치하지 않으므로 unknown 경유 캐스트로 mutable state 에 안전하게 매핑한다.
    const sample = JSON.parse(JSON.stringify(PBL_INTERVIEW_SAMPLE)) as typeof PBL_INTERVIEW_SAMPLE;
    setCourseOverview(sample.courseOverview as unknown as PBLCourseOverview);
    setCompanyStatus(sample.companyStatus as unknown as PBLCompanyStatus);
    setTrainingEnvironment(sample.trainingEnvironment as unknown as PBLTrainingEnvironment);
    setHrdNecessity(sample.hrdNecessity as unknown as PBLHrdNecessity);
    setPerformanceActivities({
      performance_activities:
        sample.performanceActivities.activities as unknown as PBLPerformanceActivities['performance_activities'],
    });
    setProblemDefinition(sample.problemDefinition as unknown as PBLProblemDefinition);
    setTargetTasks(sample.targetTasks as unknown as PBLTargetTasks);
    setAILevelDiagnosis(sample.aiLevelDiagnosis as unknown as PBLAILevelDiagnosis);
    setCurrentStep(1);
    setCompletedSteps([]);
  };

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
            // ISSUE-16 테스트 페이지 — STT 인사이트 컴포넌트 노출만 하고 LLM 호출은 막아둔다.
            sttInsights={undefined}
            onSttInsightsChange={() => {}}
            onExtractSttInsights={async () => ({
              success: false,
              error: '테스트 페이지에서는 STT 추출이 비활성화되어 있습니다.',
            })}
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
          description="산인공 양식 2번 기준 PBL 인터뷰 연습 — 입력 내용은 저장되지 않습니다."
          backLink={{ href: '/consultant/projects', label: '담당 프로젝트로 돌아가기', useBack: true }}
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillSample}
              data-testid="test-pbl-fill-sample"
            >
              <Wand2 className="w-4 h-4 mr-1.5" />
              샘플 데이터 채우기
            </Button>
          }
        />
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>테스트 모드 안내</AlertTitle>
        <AlertDescription>
          이 화면의 UI/UX는 실제 현장 인터뷰(PBL)와 동일합니다. 테스트를 통해 인터뷰 진행 방법을 연습하세요.
          <strong className="block mt-2 text-amber-700">
            입력값은 DB에 저장되지 않으며, 페이지를 떠나면 사라집니다.
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
