'use client';

import { useState, useMemo, Suspense, lazy } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/Skeleton';
import { showErrorToast, showSuccessToast, scrollToPageTop } from '@/lib/utils';
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
  createEmptyPBLInterviewDraft,
  createEmptyPerformanceActivity,
  createEmptyProblemPriority,
  createEmptyTargetTask,
  createEmptyTargetTaskDetail,
} from '@/lib/schemas/interview-pbl';
import type { SttInsights } from '@/lib/schemas/interview-roadmap';
import {
  savePBLInterview,
  extractSttInsights,
  uploadInterviewAttachment,
  removeInterviewAttachment,
  createHrdReportSignedUrl,
} from '../actions';
import InterviewStepper from './InterviewStepper';

const StepPBLCourseOverview = lazy(() => import('./pbl/StepPBLCourseOverview'));
const StepPBLCompanyStatus = lazy(() => import('./pbl/StepPBLCompanyStatus'));
const StepPBLTrainingEnvironment = lazy(() => import('./pbl/StepPBLTrainingEnvironment'));
const StepPBLHrdNecessity = lazy(() => import('./pbl/StepPBLHrdNecessity'));
const StepPBLPerformanceActivities = lazy(() => import('./pbl/StepPBLPerformanceActivities'));
const StepPBLProblemDefinition = lazy(() => import('./pbl/StepPBLProblemDefinition'));
const StepPBLTargetTasks = lazy(() => import('./pbl/StepPBLTargetTasks'));
const StepPBLAILevel = lazy(() => import('./pbl/StepPBLAILevel'));
const StepPBLSummary = lazy(() => import('./pbl/StepPBLSummary'));

import { useInterviewAutoSave } from '../_hooks/useInterviewAutoSave';

const REDIRECT_DELAY_MS = 800;

interface PBLInterviewClientProps {
  projectId: string;
  initialData: Record<string, unknown>;
}

function StepSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export default function PBLInterviewClient({
  projectId,
  initialData,
}: PBLInterviewClientProps) {
  const router = useRouter();

  const defaults = useMemo(() => createEmptyPBLInterviewDraft(), []);

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [courseOverview, setCourseOverview] = useState<PBLCourseOverview>(
    () => (initialData.courseOverview as PBLCourseOverview) ?? (defaults.courseOverview as PBLCourseOverview)
  );
  const [companyStatus, setCompanyStatus] = useState<PBLCompanyStatus>(
    () => (initialData.companyStatus as PBLCompanyStatus) ?? (defaults.companyStatus as PBLCompanyStatus)
  );
  const [trainingEnvironment, setTrainingEnvironment] = useState<PBLTrainingEnvironment>(
    () => (initialData.trainingEnvironment as PBLTrainingEnvironment) ?? (defaults.trainingEnvironment as PBLTrainingEnvironment)
  );
  const [hrdNecessity, setHrdNecessity] = useState<PBLHrdNecessity>(
    () => (initialData.hrdNecessity as PBLHrdNecessity) ?? (defaults.hrdNecessity as PBLHrdNecessity)
  );
  const [performanceActivities, setPerformanceActivities] = useState<PBLPerformanceActivities>(
    () => {
      const saved = initialData.performanceActivities as PBLPerformanceActivities | undefined;
      if (saved?.performance_activities.length) return saved;
      return { performance_activities: [createEmptyPerformanceActivity()] };
    }
  );
  const [problemDefinition, setProblemDefinition] = useState<PBLProblemDefinition>(
    () => {
      const saved = initialData.problemDefinition as PBLProblemDefinition | undefined;
      if (saved?.problem_priorities.length) return saved;
      return {
        problem_definition: saved?.problem_definition ?? (defaults.problemDefinition as PBLProblemDefinition).problem_definition,
        problem_priorities: [createEmptyProblemPriority()],
      };
    }
  );
  const [targetTasks, setTargetTasks] = useState<PBLTargetTasks>(
    () => {
      const saved = initialData.targetTasks as PBLTargetTasks | undefined;
      if (saved?.target_tasks.length) return saved;
      return {
        target_tasks: [createEmptyTargetTask()],
        selection_reason: saved?.selection_reason ?? '',
        target_task_details: saved?.target_task_details?.length
          ? saved.target_task_details
          : [createEmptyTargetTaskDetail()],
      };
    }
  );
  const [aiLevelDiagnosis, setAILevelDiagnosis] = useState<PBLAILevelDiagnosis>(
    () => (initialData.aiLevelDiagnosis as PBLAILevelDiagnosis) ?? (defaults.aiLevelDiagnosis as PBLAILevelDiagnosis)
  );
  // ISSUE-16 Step C-4: PBL 트랙도 STT 인사이트 입력을 폼 state 로 관리. 자동저장이 영속화한다.
  const [sttInsights, setSttInsights] = useState<SttInsights | undefined>(
    () => initialData.sttInsights as SttInsights | undefined,
  );

  const formData = useMemo(
    () => ({
      courseOverview,
      companyStatus,
      trainingEnvironment,
      hrdNecessity,
      performanceActivities,
      problemDefinition,
      targetTasks,
      aiLevelDiagnosis,
      sttInsights,
    }),
    [
      courseOverview,
      companyStatus,
      trainingEnvironment,
      hrdNecessity,
      performanceActivities,
      problemDefinition,
      targetTasks,
      aiLevelDiagnosis,
      sttInsights,
    ],
  );

  const { isAutoSaving, lastSaved, autoSaveError } = useInterviewAutoSave({
    data: formData,
    save: async (data) => savePBLInterview(projectId, data, { autoSave: true }),
  });

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return (
          courseOverview.course_name.trim() !== '' &&
          courseOverview.training_hours > 0 &&
          courseOverview.trainee_count > 0 &&
          courseOverview.training_job.trim() !== '' &&
          courseOverview.training_goals.length > 0
        );
      case 2:
        return (
          companyStatus.business_issues.trim() !== '' &&
          companyStatus.organization.length > 0 &&
          companyStatus.organization.every((u) => u.department_name.trim() !== '')
        );
      case 3:
        return (
          trainingEnvironment.proper_training_hours > 0 &&
          trainingEnvironment.target_count > 0 &&
          trainingEnvironment.training_needs_analysis.trim() !== '' &&
          trainingEnvironment.expectation.as_is.trim() !== '' &&
          trainingEnvironment.expectation.to_be.trim() !== ''
        );
      case 4:
        return hrdNecessity.course_development_necessity.trim() !== '';
      case 5:
        return (
          performanceActivities.performance_activities.length > 0 &&
          performanceActivities.performance_activities.every(
            (a) => a.date && a.content && a.method,
          )
        );
      case 6:
        return (
          problemDefinition.problem_definition.background.trim() !== '' &&
          problemDefinition.problem_definition.core_problem.trim() !== '' &&
          problemDefinition.problem_definition.scope.trim() !== '' &&
          problemDefinition.problem_definition.constraints.trim() !== '' &&
          problemDefinition.problem_priorities.length > 0 &&
          problemDefinition.problem_priorities.every((p) => p.problem_name.trim() !== '')
        );
      case 7:
        return (
          targetTasks.target_tasks.length > 0 &&
          targetTasks.target_tasks.every((t) => t.task_name.trim() !== '') &&
          targetTasks.selection_reason.trim() !== '' &&
          targetTasks.target_task_details.length > 0 &&
          targetTasks.target_task_details.every(
            (d) =>
              d.task_name.trim() !== '' &&
              d.as_is.trim() !== '' &&
              d.to_be.trim() !== '' &&
              d.required_knowledge.trim() !== '' &&
              d.required_skill.trim() !== '',
          )
        );
      case 8:
        return aiLevelDiagnosis.improvement_reason.trim() !== '';
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

  async function handleSubmit() {
    if (!isAllRequiredStepsValid) {
      const first = incompleteRequiredSteps[0];
      if (first) setCurrentStep(first);
      showErrorToast('입력 확인 필요', `${incompleteRequiredSteps.length}개 필수 단계를 완료해주세요.`);
      scrollToPageTop(0);
      return;
    }

    setIsLoading(true);
    try {
      const result = await savePBLInterview(projectId, formData);
      if (result.success) {
        showSuccessToast('저장 완료', 'PBL 인터뷰가 성공적으로 저장되었습니다.');
        setTimeout(() => {
          router.push(`/consultant/projects/${projectId}`);
          router.refresh();
        }, REDIRECT_DELAY_MS);
      } else {
        showErrorToast('저장 실패', result.error || '저장에 실패했습니다.');
        scrollToPageTop(0);
      }
    } catch {
      showErrorToast('저장 실패', '서버와 통신 중 오류가 발생했습니다.');
      scrollToPageTop(0);
    } finally {
      setIsLoading(false);
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StepPBLCourseOverview value={courseOverview} onChange={setCourseOverview} />;
      case 2:
        return <StepPBLCompanyStatus value={companyStatus} onChange={setCompanyStatus} />;
      case 3:
        return <StepPBLTrainingEnvironment value={trainingEnvironment} onChange={setTrainingEnvironment} />;
      case 4:
        return (
          <StepPBLHrdNecessity
            value={hrdNecessity}
            onChange={setHrdNecessity}
            onUploadHrdReport={async (file) => {
              const fd = new FormData();
              fd.append('file', file);
              return uploadInterviewAttachment(projectId, fd);
            }}
            onRemoveHrdReport={(storagePath) =>
              removeInterviewAttachment(projectId, storagePath)
            }
            onDownloadHrdReport={async (storagePath) => {
              const r = await createHrdReportSignedUrl(projectId, storagePath);
              return r.success ? r.data : null;
            }}
          />
        );
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
            sttInsights={sttInsights}
            onSttInsightsChange={setSttInsights}
            onExtractSttInsights={(text: string) => extractSttInsights(projectId, text)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="mb-6">
        <PageHeader
          title="현장 인터뷰 (PBL)"
          backLink={{
            href: `/consultant/projects/${projectId}`,
            label: '프로젝트로 돌아가기',
            useBack: true,
          }}
          actions={
            <div className="text-sm flex items-center">
              {autoSaveError ? (
                <span className="text-destructive" title={autoSaveError}>
                  저장 실패
                </span>
              ) : isAutoSaving ? (
                <span className="text-muted-foreground flex items-center">
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  저장 중…
                </span>
              ) : lastSaved ? (
                <span className="text-emerald-600 flex items-center">
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 자동 저장됨
                </span>
              ) : null}
            </div>
          }
        />
      </div>

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
            <Link
              href={`/consultant/projects/${projectId}`}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hidden md:block"
            >
              취소
            </Link>
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
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      저장 중…
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      저장
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
