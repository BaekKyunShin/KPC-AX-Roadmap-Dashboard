'use client';

/**
 * 로드맵 테스트 클라이언트 (OFA-11 재작성).
 *
 * 산인공 양식 1번 기준 인터뷰 폼을 그대로 재사용해 실제 인터뷰 화면과 **완전 동일**하게
 * 구성한다. DB 저장은 하지 않고, 최종 "생성" 버튼 클릭 시 `createTestRoadmap` 액션을
 * 호출해 LLM 결과만 받아온다.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Check, Loader2, Info, FlaskConical } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import PendingApprovalCard from '@/components/PendingApprovalCard';
import RoadmapLoadingOverlay, { COMPLETION_DELAY_MS } from '@/components/roadmap/RoadmapLoadingOverlay';
import {
  ROADMAP_INTERVIEW_STEPS,
  ROADMAP_REQUIRED_STEP_IDS,
  ROADMAP_TOTAL_STEPS,
} from '@/lib/constants/interview-steps-roadmap';
import {
  createEmptyOverview,
  createEmptyRoadmapParticipant,
  createEmptyTaskWorkflowItem,
  createEmptyTrainingTarget,
  type Overview,
  type RoadmapParticipant,
  type CompanyRequirements,
  type TaskWorkflowItem,
  type TrainingTarget,
  type AnalysisNotes,
  type InterviewMethod,
  type CompetencyModel,
  type NcsUsage,
  createEmptyCompetencyModel,
  createEmptyNcsUsage,
} from '@/lib/schemas/interview-roadmap';
import InterviewStepper from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/InterviewStepper';
import StepOverview from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepOverview';
import StepBasicInfoRoadmap from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepBasicInfoRoadmap';
import StepCompanyRequirements from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepCompanyRequirements';
import StepTaskWorkflowAnalysis from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTaskWorkflowAnalysis';
import StepTrainingTargets from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTrainingTargets';
import StepCompetencyModeling from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepCompetencyModeling';
import StepSummaryRoadmap from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepSummaryRoadmap';
import { formatTimeRange } from '@/lib/utils/time';
import TestRoadmapResult from './_components/TestRoadmapResult';
import {
  createTestRoadmap,
  cancelTestRoadmapGeneration,
  reviseTestRoadmap,
} from './actions';
import { isCancelledError } from '@/lib/services/llm';
import { showErrorToast, showSuccessToast, scrollToPageTop } from '@/lib/utils';
import type { RoadmapResult, ValidationResult, TestRoadmapInput } from '@/lib/services/roadmap';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface TestRoadmapClientProps {
  user: UserInfo;
  canAccess: boolean;
  hasProfile: boolean;
}

const ADMIN_ROLES = ['OPS_ADMIN', 'SYSTEM_ADMIN'] as const;
function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

function getBackLink(isOpsAdmin: boolean) {
  return isOpsAdmin
    ? { href: '/ops/projects', label: '프로젝트 관리로 돌아가기' }
    : { href: '/consultant/projects', label: '담당 프로젝트로 돌아가기' };
}

function emptyCompanyRequirements(): CompanyRequirements {
  return { company_status: '', main_problems: '', push_willingness: '', expected_outcomes: '' };
}

function emptyAnalysisNotes(): AnalysisNotes {
  // ISSUE-14: attachment_urls(string[]) → attachment_files(HrdReportAttachment[])
  return { text: '', attachment_files: [] };
}

interface TestResult {
  result: RoadmapResult;
  validation: ValidationResult;
  companyName: string;
  industry: string;
}

export default function TestRoadmapClient({ user, canAccess, hasProfile }: TestRoadmapClientProps) {
  const isOpsAdmin = isAdminRole(user.role);
  const backLink = getBackLink(isOpsAdmin);

  // ─── 인터뷰 상태 (production RoadmapInterviewClient와 동일 구조) ───
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const [overview, setOverview] = useState<Overview>(() => createEmptyOverview());
  const [interviewDate, setInterviewDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [interviewRound, setInterviewRound] = useState<number>(1);
  // ISSUE-10 Step C-2: 단일 시간 → 시작/종료 두 입력
  const [interviewStartTime, setInterviewStartTime] = useState('');
  const [interviewEndTime, setInterviewEndTime] = useState('');
  const [interviewMethod, setInterviewMethod] = useState<InterviewMethod>('ONSITE');
  const [participants, setParticipants] = useState<RoadmapParticipant[]>([
    createEmptyRoadmapParticipant(),
  ]);
  const [companyRequirements, setCompanyRequirements] = useState<CompanyRequirements>(
    emptyCompanyRequirements(),
  );
  const [taskWorkflowItems, setTaskWorkflowItems] = useState<TaskWorkflowItem[]>([
    createEmptyTaskWorkflowItem(),
  ]);
  const [trainingTargets, setTrainingTargets] = useState<TrainingTarget[]>([
    createEmptyTrainingTarget(),
  ]);
  const [analysisNotes, setAnalysisNotes] = useState<AnalysisNotes>(emptyAnalysisNotes());
  const [competencyModels, setCompetencyModels] = useState<CompetencyModel[]>([
    createEmptyCompetencyModel(),
  ]);
  const [ncsUsage, setNcsUsage] = useState<NcsUsage>(createEmptyNcsUsage());
  const [notes, setNotes] = useState('');

  // 테스트 전용: 기업 기본정보 (프로젝트 DB 없이 수동 입력)
  const [companyName, setCompanyName] = useState('테스트 기업');
  const [industry, setIndustry] = useState('제조/생산');
  const [companySize, setCompanySize] = useState('small');

  // Ⅰ-3 선정 과업 자동 prefill — Ⅱ-4 훈련대상 입력 시 요약란이 비어 있으면 채움 (ISSUE-04).
  useEffect(() => {
    const summary = overview.selected_tasks_summary.trim();
    const taskNames = trainingTargets
      .map((t) => t.task_name.trim())
      .filter(Boolean);
    if (summary === '' && taskNames.length > 0) {
      setOverview((prev) => ({
        ...prev,
        selected_tasks_summary: taskNames.join(', '),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingTargets.map((t) => t.task_name).join('')]);

  // ─── 생성 상태 ───
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRevising, setIsRevising] = useState(false);
  const [isRevisionComplete, setIsRevisionComplete] = useState(false);

  // ─── 검증 ───
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        // roadmap_summary 는 LLM 자동 생성 예정(ISSUE-04)이라 Step 1 검증 대상 아님
        return (
          overview.establishment_necessity.trim() !== '' &&
          overview.selected_tasks_summary.trim() !== ''
        );
      case 2:
        return (
          Boolean(interviewDate) &&
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
          taskWorkflowItems.every((t) => t.job && t.task_name && t.as_is)
        );
      case 5:
        return (
          trainingTargets.length > 0 &&
          trainingTargets.every((t) => t.task_name && t.selection_reason && t.as_is && t.to_be)
        );
      case 6: {
        const competenciesValid =
          competencyModels.length > 0 &&
          competencyModels.every(
            (c) =>
              c.competency_name.trim() !== '' &&
              c.competency_definition.trim() !== '' &&
              c.knowledge.trim() !== '' &&
              c.skill.trim() !== '' &&
              c.attitude.trim() !== '',
          );
        const ncsValid = ncsUsage.uses_ncs
          ? (ncsUsage.ncs_usage_method ?? '').trim() !== ''
          : (ncsUsage.competency_derivation_method ?? '').trim() !== '';
        return competenciesValid && ncsValid;
      }
      case 7:
        return ROADMAP_REQUIRED_STEP_IDS.every((s) => validateStep(s));
      default:
        return false;
    }
  };

  const incompleteRequiredSteps = ROADMAP_REQUIRED_STEP_IDS.filter((s) => !validateStep(s));
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
    if (currentStep < ROADMAP_TOTAL_STEPS) goToStep(currentStep + 1);
  };
  const goToPrevStep = () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  };

  // ─── generateTestRoadmap 입력 빌더 ───
  const buildInputData = (): TestRoadmapInput => ({
    company_name: companyName,
    industry,
    company_size: companySize,
    customer_requirements: '',
    overview: overview as TestRoadmapInput['overview'],
    interview_date: interviewDate,
    interview_round: interviewRound,
    interview_time: formatTimeRange(interviewStartTime, interviewEndTime),
    interview_method: interviewMethod,
    participants: participants.map((p, i) => ({
      id: p.id || `test-p-${i}`,
      name: p.name,
      position: p.position,
    })),
    company_requirements: companyRequirements,
    task_workflow_items: taskWorkflowItems,
    training_targets: trainingTargets,
    analysis_notes: analysisNotes,
    // 인터뷰 단계의 Ⅲ-1 역량 모델링 + NCS 활용을 테스트 입력에 포함 (Step C 에서 프롬프트에 반영)
    competency_models: competencyModels,
    ncs_usage: ncsUsage,
    notes,
  } as TestRoadmapInput);

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
    setIsComplete(false);
    try {
      const result = await createTestRoadmap(
        buildInputData() as unknown as Parameters<typeof createTestRoadmap>[0],
      );
      if (result.success) {
        setIsComplete(true);
        setTimeout(() => {
          setTestResult({
            result: result.data.result,
            validation: result.data.validation,
            companyName,
            industry,
          });
          setIsGenerating(false);
          setIsComplete(false);
        }, COMPLETION_DELAY_MS);
      } else if (!isCancelledError(result.error)) {
        setError(result.error);
        showErrorToast('로드맵 생성 실패', result.error);
        setIsGenerating(false);
      } else {
        setIsGenerating(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '로드맵 생성 중 오류가 발생했습니다.';
      setError(message);
      showErrorToast('로드맵 생성 실패', message);
      setIsGenerating(false);
    }
  };

  const handleCancelGeneration = async () => {
    setIsGenerating(false);
    setIsComplete(false);
    await cancelTestRoadmapGeneration();
  };

  const handleRevisionRequest = async (revisionPrompt: string) => {
    if (!testResult) return;
    setIsRevising(true);
    setIsRevisionComplete(false);
    try {
      const result = await reviseTestRoadmap(
        buildInputData() as unknown as Parameters<typeof reviseTestRoadmap>[0],
        testResult.result,
        revisionPrompt,
      );
      if (result.success) {
        setIsRevisionComplete(true);
        setTimeout(() => {
          setTestResult({
            result: result.data.result,
            validation: result.data.validation,
            companyName,
            industry,
          });
          setIsRevising(false);
          setIsRevisionComplete(false);
          showSuccessToast('로드맵 수정 완료', '요청 내용이 반영되었습니다.');
        }, COMPLETION_DELAY_MS);
      } else if (!isCancelledError(result.error)) {
        showErrorToast('로드맵 수정 실패', result.error);
        setIsRevising(false);
      } else {
        setIsRevising(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '로드맵 수정 중 오류가 발생했습니다.';
      showErrorToast('로드맵 수정 실패', message);
      setIsRevising(false);
    }
  };

  const handleReset = () => {
    setTestResult(null);
    setError(null);
    setCurrentStep(1);
  };

  // ─── 미승인 사용자 ───
  if (!canAccess) {
    const userRole = user.role === 'USER_PENDING' ? 'CONSULTANT' : 'OPS_ADMIN';
    return (
      <div className="max-w-2xl mx-auto py-8">
        <PendingApprovalCard
          userName={user.name}
          userEmail={user.email}
          userRole={userRole}
          hasProfile={hasProfile}
        />
      </div>
    );
  }

  // ─── 결과 화면 ───
  if (testResult) {
    return (
      <>
        <div className="max-w-5xl mx-auto py-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <TestRoadmapResult
            result={testResult.result}
            validation={testResult.validation}
            companyName={testResult.companyName}
            industry={testResult.industry}
            onReset={handleReset}
            onRevisionRequest={handleRevisionRequest}
            isRevising={isRevising}
          />
        </div>
        {isRevising && (
          <RoadmapLoadingOverlay
            isTestMode={true}
            profileHref="/consultant/profile"
            onCancel={async () => {
              setIsRevising(false);
              setIsRevisionComplete(false);
              await cancelTestRoadmapGeneration();
            }}
            isCompleted={isRevisionComplete}
          />
        )}
      </>
    );
  }

  // ─── 인터뷰 폼 ───
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StepOverview value={overview} onChange={setOverview} />;
      case 2:
        return (
          <StepBasicInfoRoadmap
            interviewDate={interviewDate}
            interviewRound={interviewRound}
            interviewStartTime={interviewStartTime}
            interviewEndTime={interviewEndTime}
            interviewMethod={interviewMethod}
            participants={participants}
            onInterviewDateChange={setInterviewDate}
            onInterviewRoundChange={setInterviewRound}
            onInterviewStartTimeChange={setInterviewStartTime}
            onInterviewEndTimeChange={setInterviewEndTime}
            onInterviewMethodChange={setInterviewMethod}
            onParticipantsChange={setParticipants}
          />
        );
      case 3:
        return (
          <StepCompanyRequirements value={companyRequirements} onChange={setCompanyRequirements} />
        );
      case 4:
        return (
          <StepTaskWorkflowAnalysis
            items={taskWorkflowItems}
            onChange={setTaskWorkflowItems}
            analysisNotes={analysisNotes}
            onAnalysisNotesChange={setAnalysisNotes}
            // 테스트 페이지에서는 실제 Storage 업로드 없이 안내만 노출 (ISSUE-14 Step C-5)
            onUploadAttachment={async () => ({
              success: false,
              error: '테스트 페이지에서는 첨부 파일 업로드를 사용할 수 없습니다. 실제 프로젝트의 인터뷰 페이지에서 업로드하세요.',
            })}
            onRemoveAttachment={async () => ({ success: true })}
          />
        );
      case 5:
        return <StepTrainingTargets items={trainingTargets} onChange={setTrainingTargets} />;
      case 6:
        return (
          <StepCompetencyModeling
            competencies={competencyModels}
            ncsUsage={ncsUsage}
            onCompetenciesChange={setCompetencyModels}
            onNcsUsageChange={setNcsUsage}
          />
        );
      case 7:
        return (
          <StepSummaryRoadmap
            overview={overview}
            interviewDate={interviewDate}
            interviewRound={interviewRound}
            interviewStartTime={interviewStartTime}
            interviewEndTime={interviewEndTime}
            interviewMethod={interviewMethod}
            participants={participants}
            companyRequirements={companyRequirements}
            taskWorkflowItems={taskWorkflowItems}
            analysisNotes={analysisNotes}
            trainingTargets={trainingTargets}
            competencyModels={competencyModels}
            ncsUsage={ncsUsage}
            notes={notes}
            onEditStep={goToStep}
            onNotesChange={setNotes}
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
    <>
      <div className="max-w-4xl mx-auto pb-24 py-6">
        <div className="mb-6">
          <PageHeader
            title="로드맵 테스트"
            description="산인공 양식 1번 기준 인터뷰 연습 — 입력 내용은 저장되지 않습니다."
            backLink={{ ...backLink, useBack: true }}
          />
        </div>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>테스트 모드 안내</AlertTitle>
          <AlertDescription>
            이 화면의 UI/UX는 실제 현장 인터뷰(로드맵)와 동일합니다. 테스트를 통해 인터뷰 진행 방법을 연습하세요.
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

        {!hasProfile && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>컨설턴트 프로필 미등록</AlertTitle>
            <AlertDescription>
              컨설턴트 프로필 정보가 로드맵 생성에 활용됩니다. 먼저 프로필을 등록해주세요.
              <Link href="/consultant/profile" className="ml-2 underline">
                프로필 등록하기
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6 bg-muted/30 border border-border rounded-lg p-4 flex items-center gap-3 flex-wrap text-sm">
          <FlaskConical className="h-4 w-4 text-amber-600" />
          <strong className="text-foreground">테스트 대상 기업</strong>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
            aria-label="기업명"
          />
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
            aria-label="업종"
          >
            <option>제조/생산</option>
            <option>IT/소프트웨어</option>
            <option>유통/물류</option>
            <option>금융/보험</option>
            <option>의료/헬스케어</option>
            <option>건설/플랜트</option>
            <option>서비스업</option>
            <option>교육</option>
          </select>
          <select
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
            className="px-2 py-1 border rounded text-sm"
            aria-label="규모"
          >
            <option value="micro">소상공인</option>
            <option value="small">소기업</option>
            <option value="medium">중기업</option>
            <option value="large">중견/대기업</option>
          </select>
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
                    disabled={isGenerating || !isAllRequiredStepsValid}
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
                        로드맵 생성
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isGenerating && (
        <RoadmapLoadingOverlay
          isTestMode={true}
          profileHref="/consultant/profile"
          onCancel={handleCancelGeneration}
          isCompleted={isComplete}
        />
      )}
    </>
  );
}
