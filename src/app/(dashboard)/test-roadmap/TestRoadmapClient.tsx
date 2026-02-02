'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { FlaskConical, Info, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import PendingApprovalCard from '@/components/PendingApprovalCard';
import RoadmapLoadingOverlay, { COMPLETION_DELAY_MS } from '@/components/roadmap/RoadmapLoadingOverlay';
import TestRoadmapResult from './_components/TestRoadmapResult';
import CourseEditModal from '@/app/(dashboard)/consultant/projects/[id]/roadmap/_components/CourseEditModal';
import { createTestRoadmap, reviseTestRoadmap } from './actions';
import { buildRoadmapMatrixFromCourses, validateCourseClient } from '@/lib/utils/roadmap-client';
import { INTERVIEW_STEPS, REQUIRED_STEP_IDS } from '@/lib/constants/interview-steps';
import type { TestInputData } from '@/lib/schemas/test-roadmap';
import type { RoadmapResult, ValidationResult, RoadmapCell } from '@/lib/services/roadmap';
import type { SttInsights } from '@/lib/schemas/interview';
import {
  createEmptyParticipant,
  createEmptyJobTask,
  createEmptyPainPoint,
  createEmptyImprovementGoal,
  type InterviewParticipant,
  type JobTask,
  type PainPoint,
  type Constraint,
  type ImprovementGoal,
  type CompanyDetails,
} from '@/lib/schemas/interview';

// Step 컴포넌트들 - InterviewStepper는 공통 컴포넌트 사용
import InterviewStepper from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/InterviewStepper';
import TestStepBasicInfo from './_components/TestStepBasicInfo';
import StepCompanyDetails from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/StepCompanyDetails';
import StepJobTasks from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/StepJobTasks';
import StepPainPoints from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/StepPainPoints';
import StepConstraintsGoals from '@/app/(dashboard)/consultant/projects/[id]/interview/_components/StepConstraintsGoals';
import TestStepSummary from './_components/TestStepSummary';

// =============================================================================
// 타입 정의
// =============================================================================

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

interface TestRoadmapResultData {
  companyName: string;
  industry: string;
  roadmapResult: RoadmapResult;
  validation: ValidationResult;
}

interface GenerationState {
  isSubmitting: boolean;
  isGenerating: boolean;
  isComplete: boolean;
}

// =============================================================================
// 상수
// =============================================================================

const INITIAL_GENERATION_STATE: GenerationState = {
  isSubmitting: false,
  isGenerating: false,
  isComplete: false,
};

const ADMIN_ROLES = ['OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

// =============================================================================
// 유틸리티 함수
// =============================================================================

function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

function formatErrorMessage(err: unknown, defaultMessage: string): string {
  if (err instanceof Error) {
    return `오류가 발생했습니다: ${err.message}`;
  }
  return defaultMessage;
}

function getProjectsLink(isOpsAdmin: boolean): { href: string; label: string } {
  return isOpsAdmin
    ? { href: '/ops/projects', label: '프로젝트 관리로 돌아가기' }
    : { href: '/consultant/projects', label: '담당 프로젝트로 돌아가기' };
}

// =============================================================================
// 하위 컴포넌트
// =============================================================================

interface PageHeaderProps {
  isOpsAdmin: boolean;
}

function PageHeader({ isOpsAdmin }: PageHeaderProps) {
  const { href, label } = getProjectsLink(isOpsAdmin);

  return (
    <div className="mb-6">
      <Link
        href={href}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {label}
      </Link>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <FlaskConical className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">테스트 로드맵</h1>
          <p className="text-gray-500">시스템 사용법 연습을 위한 테스트 로드맵을 생성합니다.</p>
        </div>
      </div>
    </div>
  );
}

function TestModeNotice() {
  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertTitle>테스트 모드 안내</AlertTitle>
      <AlertDescription>
        이 화면의 UI/UX는 실제 현장 인터뷰 화면과 동일합니다. 테스트를 통해 인터뷰 진행 방법을 연습하세요.
        <strong className="block mt-2 text-amber-700">
          테스트 결과는 저장되지 않으며, 페이지를 떠나면 사라집니다.
        </strong>
      </AlertDescription>
    </Alert>
  );
}

function ProfileWarning() {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTitle>컨설턴트 프로필 미등록</AlertTitle>
      <AlertDescription>
        컨설턴트 프로필이 등록되지 않았습니다. 프로필 정보가 로드맵 생성에 활용되므로 먼저
        프로필을 등록해주세요.
        <Link href="/consultant/profile" className="ml-2 underline">
          프로필 등록하기
        </Link>
      </AlertDescription>
    </Alert>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

export default function TestRoadmapClient({
  user,
  canAccess,
  hasProfile,
}: TestRoadmapClientProps) {
  const isOpsAdmin = isAdminRole(user.role);

  // ===== 스테퍼 상태 =====
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // ===== 기업 기본정보 상태 (테스트 전용) =====
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [subIndustries, setSubIndustries] = useState<string[]>([]);
  const [companySize, setCompanySize] = useState('');

  // ===== 인터뷰 폼 상태 =====
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [participants, setParticipants] = useState<InterviewParticipant[]>([createEmptyParticipant()]);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    systems_and_tools: [],
    ai_experience: '',
  });
  const [jobTasks, setJobTasks] = useState<JobTask[]>([createEmptyJobTask()]);
  const [painPoints, setPainPoints] = useState<PainPoint[]>([createEmptyPainPoint()]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [improvementGoals, setImprovementGoals] = useState<ImprovementGoal[]>([createEmptyImprovementGoal()]);
  const [notes, setNotes] = useState('');
  const [customerRequirements] = useState('');
  const [sttInsights, setSttInsights] = useState<SttInsights | null>(null);
  const [isProcessingStt, setIsProcessingStt] = useState(false);
  const [sttText, setSttText] = useState<string | null>(null);

  // ===== 결과/에러 상태 =====
  const [error, setError] = useState<string | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>(INITIAL_GENERATION_STATE);
  const [result, setResult] = useState<TestRoadmapResultData | null>(null);

  // ===== 수정 기능 상태 =====
  const [originalInput, setOriginalInput] = useState<TestInputData | null>(null);
  const [isRevising, setIsRevising] = useState(false);

  // ===== 과정 편집 모달 상태 =====
  const [editingCourse, setEditingCourse] = useState<RoadmapCell | null>(null);
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null);

  // ===== Ref =====
  const sttFileRef = useRef<string | null>(null);

  // ===== 스텝 유효성 검사 =====
  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        // 기업 기본정보 + 인터뷰 기본정보
        return (
          !!companyName.trim() &&
          !!industry &&
          !!companySize &&
          !!interviewDate &&
          participants.length > 0 &&
          participants.every(p => p.name.trim() !== '')
        );
      case 2:
        // AI 도구 사용 경험은 필수
        return !!companyDetails.ai_experience?.trim();
      case 3:
        return jobTasks.length > 0 && jobTasks.every(t => t.task_name && t.task_description);
      case 4:
        return painPoints.length > 0 && painPoints.every(p => p.description);
      case 5:
        return improvementGoals.length > 0 && improvementGoals.every(g => g.goal_description);
      case 6:
        // 확인 페이지: 이전 필수 스텝(1~5)이 모두 완료되었을 때만 완료
        return [1, 2, 3, 4, 5].every(s => validateStep(s));
      default:
        return false;
    }
  }, [companyName, industry, companySize, interviewDate, participants, companyDetails, jobTasks, painPoints, improvementGoals]);

  // 필수 스텝 완료 여부 (생성 버튼 활성화 조건)
  const isAllRequiredStepsValid = REQUIRED_STEP_IDS.every(step => validateStep(step));
  const incompleteRequiredSteps = REQUIRED_STEP_IDS.filter(step => !validateStep(step));

  // ===== 스텝 네비게이션 =====
  const goToNextStep = () => {
    if (currentStep < INTERVIEW_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step: number) => {
    if (validateStep(currentStep) && !completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    setCurrentStep(step);
  };

  // ===== STT 파일 업로드 핸들러 =====
  const handleSttFileUpload = async (text: string) => {
    setIsProcessingStt(true);
    setSttText(text);
    sttFileRef.current = text;
    try {
      // 테스트 모드에서는 STT 인사이트 추출을 로드맵 생성 시 수행
      // 여기서는 텍스트만 저장하고 UI에 표시
      setSttInsights({
        추가_업무: [],
        추가_페인포인트: [],
        숨은_니즈: [],
        조직_맥락: '',
        AI_태도: '',
        주요_인용: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'STT 처리 중 오류가 발생했습니다.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessingStt(false);
    }
  };

  // STT 인사이트 삭제 핸들러
  const handleSttInsightsDelete = async () => {
    setSttInsights(null);
    setSttText(null);
    sttFileRef.current = null;
  };

  // ===== 폼 데이터 구성 =====
  const buildInputData = useCallback((): TestInputData => {
    return {
      company_name: companyName.trim(),
      industry: industry as TestInputData['industry'],
      sub_industries: subIndustries.length > 0 ? subIndustries : undefined,
      company_size: companySize as TestInputData['company_size'],
      interview_date: interviewDate,
      participants,
      company_details: companyDetails,
      job_tasks: jobTasks.filter(t => t.task_name && t.task_description),
      pain_points: painPoints.filter(p => p.description),
      constraints: constraints.length > 0 ? constraints : undefined,
      improvement_goals: improvementGoals.filter(g => g.goal_description),
      notes: notes || undefined,
      customer_requirements: customerRequirements || undefined,
      stt_text: sttText || undefined,
    };
  }, [companyName, industry, subIndustries, companySize, interviewDate, participants, companyDetails, jobTasks, painPoints, constraints, improvementGoals, notes, customerRequirements, sttText]);

  // ===== 로드맵 생성 =====
  const handleSubmit = useCallback(async () => {
    // 필수 스텝 유효성 검사
    const firstIncompleteStep = incompleteRequiredSteps[0];
    if (firstIncompleteStep) {
      setCurrentStep(firstIncompleteStep);
      setError('필수 항목을 입력해주세요.');
      return;
    }

    setGenerationState({ isSubmitting: true, isGenerating: true, isComplete: false });
    setError(null);

    try {
      const data = buildInputData();
      const response = await createTestRoadmap(data);

      if (response.success && response.data) {
        setResult({
          companyName: data.company_name,
          industry: data.industry,
          roadmapResult: response.data.result,
          validation: response.data.validation,
        });
        setOriginalInput(data);
        setGenerationState((prev) => ({ ...prev, isSubmitting: false, isComplete: true }));
        setTimeout(() => {
          setGenerationState(INITIAL_GENERATION_STATE);
        }, COMPLETION_DELAY_MS);
      } else {
        setError(response.error || '로드맵 생성에 실패했습니다.');
        setGenerationState(INITIAL_GENERATION_STATE);
      }
    } catch (err) {
      console.error('[TestRoadmap] 로드맵 생성 중 오류:', err);
      setError(formatErrorMessage(err, '로드맵 생성 중 예기치 않은 오류가 발생했습니다.'));
      setGenerationState(INITIAL_GENERATION_STATE);
    }
  }, [buildInputData, incompleteRequiredSteps]);

  // ===== 수정 요청 (LLM 재호출) =====
  const handleRevisionRequest = useCallback(async (revisionPrompt: string) => {
    if (!originalInput || !result) return;

    setIsRevising(true);
    setError(null);

    try {
      const response = await reviseTestRoadmap(
        originalInput,
        result.roadmapResult,
        revisionPrompt
      );

      if (response.success && response.data) {
        setResult({
          ...result,
          roadmapResult: response.data.result,
          validation: response.data.validation,
        });
      } else {
        setError(response.error || '로드맵 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error('[TestRoadmap] 수정 요청 중 오류:', err);
      setError(formatErrorMessage(err, '로드맵 수정 중 예기치 않은 오류가 발생했습니다.'));
    } finally {
      setIsRevising(false);
    }
  }, [originalInput, result]);

  // ===== 과정 편집 =====
  const handleEditCourse = useCallback((courseIndex: number) => {
    if (!result) return;
    const course = result.roadmapResult.courses[courseIndex];
    if (course) {
      setEditingCourse({ ...course });
      setEditingCourseIndex(courseIndex);
    }
  }, [result]);

  const handleSaveCourse = useCallback((updatedCourse: RoadmapCell) => {
    if (!result || editingCourseIndex === null) return;

    const validation = validateCourseClient(updatedCourse);
    if (!validation.isValid) {
      setError(validation.errors.join('\n'));
      return;
    }

    const newCourses = [...result.roadmapResult.courses];
    newCourses[editingCourseIndex] = updatedCourse;
    const newMatrix = buildRoadmapMatrixFromCourses(newCourses);

    setResult({
      ...result,
      roadmapResult: {
        ...result.roadmapResult,
        courses: newCourses,
        roadmap_matrix: newMatrix,
      },
    });

    setEditingCourse(null);
    setEditingCourseIndex(null);
    setError(null);
  }, [result, editingCourseIndex]);

  // ===== 초기화 =====
  const handleReset = useCallback(() => {
    setResult(null);
    setOriginalInput(null);
    setError(null);
    setEditingCourse(null);
    setEditingCourseIndex(null);
  }, []);

  // ===== 생성 취소 =====
  const handleCancelGeneration = useCallback(() => {
    setGenerationState(INITIAL_GENERATION_STATE);
  }, []);

  // ===== 스텝 렌더링 =====
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <TestStepBasicInfo
            companyName={companyName}
            industry={industry}
            subIndustries={subIndustries}
            companySize={companySize}
            onCompanyNameChange={setCompanyName}
            onIndustryChange={setIndustry}
            onSubIndustriesChange={setSubIndustries}
            onCompanySizeChange={setCompanySize}
            interviewDate={interviewDate}
            participants={participants}
            onInterviewDateChange={setInterviewDate}
            onParticipantsChange={setParticipants}
          />
        );
      case 2:
        return (
          <StepCompanyDetails
            companyDetails={companyDetails}
            onCompanyDetailsChange={setCompanyDetails}
          />
        );
      case 3:
        return (
          <StepJobTasks
            jobTasks={jobTasks}
            onJobTasksChange={setJobTasks}
          />
        );
      case 4:
        return (
          <StepPainPoints
            painPoints={painPoints}
            onPainPointsChange={setPainPoints}
          />
        );
      case 5:
        return (
          <StepConstraintsGoals
            constraints={constraints}
            improvementGoals={improvementGoals}
            notes={notes}
            sttInsights={sttInsights}
            onConstraintsChange={setConstraints}
            onImprovementGoalsChange={setImprovementGoals}
            onNotesChange={setNotes}
            onSttFileUpload={handleSttFileUpload}
            onSttInsightsDelete={handleSttInsightsDelete}
            isProcessingStt={isProcessingStt}
          />
        );
      case 6:
        return (
          <TestStepSummary
            companyName={companyName}
            industry={industry}
            subIndustries={subIndustries}
            companySize={companySize}
            interviewDate={interviewDate}
            participants={participants}
            companyDetails={companyDetails}
            jobTasks={jobTasks}
            painPoints={painPoints}
            constraints={constraints}
            improvementGoals={improvementGoals}
            notes={notes}
            sttInsights={sttInsights}
            onEditStep={handleStepClick}
          />
        );
      default:
        return null;
    }
  };

  // ===== 미승인 사용자 화면 =====
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

  // ===== 결과 화면 =====
  if (result) {
    return (
      <>
        <div className="max-w-5xl mx-auto py-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <TestRoadmapResult
            result={result.roadmapResult}
            validation={result.validation}
            companyName={result.companyName}
            industry={result.industry}
            onReset={handleReset}
            onRevisionRequest={handleRevisionRequest}
            onEditCourse={handleEditCourse}
            isRevising={isRevising}
          />
        </div>

        <CourseEditModal
          isOpen={!!editingCourse}
          course={editingCourse}
          onClose={() => {
            setEditingCourse(null);
            setEditingCourseIndex(null);
          }}
          onSave={handleSaveCourse}
        />

        {isRevising && (
          <RoadmapLoadingOverlay
            isTestMode={true}
            profileHref="/consultant/profile"
            onCancel={() => setIsRevising(false)}
            isCompleted={false}
          />
        )}
      </>
    );
  }

  // ===== 메인 폼 화면 =====
  return (
    <>
      <div className="max-w-4xl mx-auto py-6 pb-24">
        <PageHeader isOpsAdmin={isOpsAdmin} />
        <TestModeNotice />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!hasProfile && <ProfileWarning />}

        {/* 스테퍼 */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <InterviewStepper
            steps={[...INTERVIEW_STEPS]}
            currentStep={currentStep}
            onStepClick={handleStepClick}
            completedSteps={completedSteps}
            validateStep={validateStep}
          />
        </div>

        {/* 스텝 컨텐츠 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6 min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:relative md:border-0 md:p-0 md:bg-transparent">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <button
              type="button"
              onClick={goToPrevStep}
              disabled={currentStep === 1}
              className={`px-4 py-2 border rounded-lg text-sm font-medium flex items-center ${
                currentStep === 1
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              이전
            </button>

            <div className="flex items-center space-x-3">
              <Link
                href={isOpsAdmin ? '/ops/projects' : '/consultant/projects'}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hidden md:block"
              >
                취소
              </Link>

              {currentStep < INTERVIEW_STEPS.length ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center"
                >
                  다음
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  {!isAllRequiredStepsValid && (
                    <span className="text-sm text-amber-600">
                      {incompleteRequiredSteps.length}개 필수 단계 미완료
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={generationState.isSubmitting || !isAllRequiredStepsValid}
                    className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                  >
                    {generationState.isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        생성 중...
                      </>
                    ) : (
                      <>
                        <FlaskConical className="w-4 h-4 mr-1" />
                        테스트 로드맵 생성
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {generationState.isGenerating && (
        <RoadmapLoadingOverlay
          isTestMode={true}
          profileHref="/consultant/profile"
          onCancel={handleCancelGeneration}
          isCompleted={generationState.isComplete}
        />
      )}
    </>
  );
}
