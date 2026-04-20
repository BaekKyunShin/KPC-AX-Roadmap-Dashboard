'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { showErrorToast, showSuccessToast, scrollToPageTop } from '@/lib/utils';
import {
  ROADMAP_INTERVIEW_STEPS,
  ROADMAP_REQUIRED_STEP_IDS,
  ROADMAP_TOTAL_STEPS,
} from '@/lib/constants/interview-steps-roadmap';
import {
  type RoadmapInterview,
  type RoadmapParticipant,
  type CompanyRequirements,
  type TaskWorkflowItem,
  type TrainingTarget,
  type AnalysisNotes,
  type InterviewMethod,
  type Overview,
  createEmptyOverview,
  createEmptyRoadmapParticipant,
  createEmptyTaskWorkflowItem,
  createEmptyTrainingTarget,
} from '@/lib/schemas/interview-roadmap';
import {
  saveRoadmapInterview,
  uploadHrdReportAttachment,
  removeHrdReportAttachment,
  createHrdReportSignedUrl,
} from '../actions';
import InterviewStepper from './InterviewStepper';
import StepOverview from './roadmap/StepOverview';
import StepBasicInfoRoadmap from './roadmap/StepBasicInfoRoadmap';
import StepCompanyRequirements from './roadmap/StepCompanyRequirements';
import StepTaskWorkflowAnalysis from './roadmap/StepTaskWorkflowAnalysis';
import StepTrainingTargets from './roadmap/StepTrainingTargets';
import StepSummaryRoadmap from './roadmap/StepSummaryRoadmap';
import { useInterviewAutoSave } from '../_hooks/useInterviewAutoSave';

const REDIRECT_DELAY_MS = 800;

interface RoadmapInterviewClientProps {
  projectId: string;
  initialData: Partial<RoadmapInterview>;
}

function emptyCompanyRequirements(): CompanyRequirements {
  return { company_status: '', main_problems: '', push_willingness: '', expected_outcomes: '' };
}

function emptyAnalysisNotes(): AnalysisNotes {
  return { text: '', attachment_urls: [] };
}

export default function RoadmapInterviewClient({
  projectId,
  initialData,
}: RoadmapInterviewClientProps) {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [overview, setOverview] = useState<Overview>(
    () => initialData.overview ?? createEmptyOverview(),
  );
  const [interviewDate, setInterviewDate] = useState(
    initialData.interview_date || new Date().toISOString().split('T')[0],
  );
  const [interviewRound, setInterviewRound] = useState<number>(initialData.interview_round ?? 1);
  const [interviewTime, setInterviewTime] = useState(initialData.interview_time ?? '');
  const [interviewMethod, setInterviewMethod] = useState<InterviewMethod>(
    initialData.interview_method ?? 'ONSITE',
  );
  const [participants, setParticipants] = useState<RoadmapParticipant[]>(
    () => initialData.participants?.length
      ? (initialData.participants as RoadmapParticipant[])
      : [createEmptyRoadmapParticipant()],
  );
  const [companyRequirements, setCompanyRequirements] = useState<CompanyRequirements>(
    () => initialData.company_requirements ?? emptyCompanyRequirements(),
  );
  const [taskWorkflowItems, setTaskWorkflowItems] = useState<TaskWorkflowItem[]>(
    () => initialData.task_workflow_items?.length
      ? initialData.task_workflow_items
      : [createEmptyTaskWorkflowItem()],
  );
  const [trainingTargets, setTrainingTargets] = useState<TrainingTarget[]>(
    () => initialData.training_targets?.length
      ? initialData.training_targets
      : [createEmptyTrainingTarget()],
  );
  const [analysisNotes, setAnalysisNotes] = useState<AnalysisNotes>(
    () => initialData.analysis_notes ?? emptyAnalysisNotes(),
  );
  const [notes, setNotes] = useState(initialData.notes ?? '');
  const [sttInsights] = useState<RoadmapInterview['stt_insights']>(initialData.stt_insights);

  const formData = useMemo(
    () => ({
      overview,
      interview_date: interviewDate,
      interview_round: interviewRound,
      interview_time: interviewTime,
      interview_method: interviewMethod,
      participants,
      company_requirements: companyRequirements,
      task_workflow_items: taskWorkflowItems,
      training_targets: trainingTargets,
      analysis_notes: analysisNotes,
      notes,
      stt_insights: sttInsights,
    }),
    [
      overview,
      interviewDate,
      interviewRound,
      interviewTime,
      interviewMethod,
      participants,
      companyRequirements,
      taskWorkflowItems,
      trainingTargets,
      analysisNotes,
      notes,
      sttInsights,
    ],
  );

  const { isAutoSaving, lastSaved, autoSaveError } = useInterviewAutoSave({
    data: formData,
    save: async (data) => saveRoadmapInterview(projectId, data, { autoSave: true }),
  });

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return (
          overview.establishment_necessity.trim() !== '' &&
          overview.selected_tasks_summary.trim() !== '' &&
          overview.roadmap_summary.trim() !== ''
        );
      case 2:
        return (
          Boolean(interviewDate) &&
          Boolean(interviewTime) &&
          Boolean(interviewMethod) &&
          participants.length > 0 &&
          participants.every((p) => p.name.trim() !== '')
        );
      case 3:
        return (
          companyRequirements.company_status.trim() !== '' &&
          companyRequirements.main_problems.trim() !== '' &&
          companyRequirements.push_willingness.trim() !== '' &&
          companyRequirements.expected_outcomes.trim() !== ''
        );
      case 4:
        return (
          taskWorkflowItems.length > 0 &&
          taskWorkflowItems.every(
            (t) => t.job && t.task_name && t.as_is && t.problems && t.data_availability,
          )
        );
      case 5:
        return (
          trainingTargets.length > 0 &&
          trainingTargets.every(
            (t) => t.task_name && t.selection_reason && t.as_is && t.to_be,
          )
        );
      case 6:
        return ROADMAP_REQUIRED_STEP_IDS.every((s) => validateStep(s));
      default:
        return false;
    }
  };

  const incompleteRequiredSteps = ROADMAP_REQUIRED_STEP_IDS.filter((s) => !validateStep(s));
  const isAllRequiredStepsValid = incompleteRequiredSteps.length === 0;

  const goToStep = (step: number) => {
    if (validateStep(currentStep) && !completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    setCurrentStep(step);
  };

  const goToNextStep = () => {
    if (currentStep < ROADMAP_TOTAL_STEPS) goToStep(currentStep + 1);
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
      const result = await saveRoadmapInterview(projectId, formData);
      if (result.success) {
        showSuccessToast('저장 완료', '인터뷰가 성공적으로 저장되었습니다.');
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
        return (
          <StepOverview
            value={overview}
            onChange={setOverview}
            onUploadHrdReport={async (file) => {
              const fd = new FormData();
              fd.append('file', file);
              return uploadHrdReportAttachment(projectId, fd);
            }}
            onRemoveHrdReport={(storagePath) =>
              removeHrdReportAttachment(projectId, storagePath)
            }
            onDownloadHrdReport={async (storagePath) => {
              const r = await createHrdReportSignedUrl(projectId, storagePath);
              return r.success ? r.data : null;
            }}
          />
        );
      case 2:
        return (
          <StepBasicInfoRoadmap
            interviewDate={interviewDate}
            interviewRound={interviewRound}
            interviewTime={interviewTime}
            interviewMethod={interviewMethod}
            participants={participants}
            onInterviewDateChange={setInterviewDate}
            onInterviewRoundChange={setInterviewRound}
            onInterviewTimeChange={setInterviewTime}
            onInterviewMethodChange={setInterviewMethod}
            onParticipantsChange={setParticipants}
          />
        );
      case 3:
        return <StepCompanyRequirements value={companyRequirements} onChange={setCompanyRequirements} />;
      case 4:
        return (
          <StepTaskWorkflowAnalysis
            items={taskWorkflowItems}
            onChange={setTaskWorkflowItems}
            analysisNotes={analysisNotes}
            onAnalysisNotesChange={setAnalysisNotes}
          />
        );
      case 5:
        return <StepTrainingTargets items={trainingTargets} onChange={setTrainingTargets} />;
      case 6:
        return (
          <StepSummaryRoadmap
            overview={overview}
            interviewDate={interviewDate}
            interviewRound={interviewRound}
            interviewTime={interviewTime}
            interviewMethod={interviewMethod}
            participants={participants}
            companyRequirements={companyRequirements}
            taskWorkflowItems={taskWorkflowItems}
            analysisNotes={analysisNotes}
            trainingTargets={trainingTargets}
            notes={notes}
            onEditStep={goToStep}
            onNotesChange={setNotes}
            sttInsights={sttInsights}
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
          title="현장 인터뷰 (로드맵)"
          backLink={{ href: `/consultant/projects/${projectId}`, label: '프로젝트로 돌아가기', useBack: true }}
          actions={
            <div className="text-sm flex items-center">
              {autoSaveError ? (
                <span className="text-destructive" title={autoSaveError}>저장 실패</span>
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
          steps={[...ROADMAP_INTERVIEW_STEPS]}
          currentStep={currentStep}
          onStepClick={goToStep}
          completedSteps={completedSteps}
          validateStep={validateStep}
        />
      </div>

      <div className="bg-card shadow rounded-lg p-4 sm:p-6 mb-6 min-h-[400px]">
        {renderStepContent()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-background border-t border-border px-3 pb-3 pt-4 sm:p-4 md:relative md:z-auto md:border-0 md:p-0 md:bg-transparent">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Button type="button" variant="outline" size="sm" onClick={goToPrevStep} disabled={currentStep === 1}>
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
            {currentStep < ROADMAP_TOTAL_STEPS ? (
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
