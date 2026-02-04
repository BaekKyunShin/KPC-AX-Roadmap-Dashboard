'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { saveInterview, getInterview, processSttFile, deleteSttInsights } from './actions';
import { PageHeader } from '@/components/ui/page-header';
import { showErrorToast, showSuccessToast, scrollToPageTop } from '@/lib/utils';
import {
  type InterviewParticipant,
  type JobTask,
  type PainPoint,
  type Constraint,
  type ImprovementGoal,
  type CompanyDetails,
  type SttInsights,
  createEmptyParticipant,
  createEmptyJobTask,
  createEmptyPainPoint,
  createEmptyImprovementGoal,
} from '@/lib/schemas/interview';
import { INTERVIEW_STEPS, REQUIRED_STEP_IDS } from '@/lib/constants/interview-steps';

import InterviewStepper from './_components/InterviewStepper';
import StepBasicInfo from './_components/StepBasicInfo';
import StepCompanyDetails from './_components/StepCompanyDetails';
import StepJobTasks from './_components/StepJobTasks';
import StepPainPoints from './_components/StepPainPoints';
import StepConstraintsGoals from './_components/StepConstraintsGoals';
import StepSummary from './_components/StepSummary';

export default function InterviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);

  // Form state
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
  const [customerRequirements, setCustomerRequirements] = useState('');
  const [sttInsights, setSttInsights] = useState<SttInsights | null>(null);
  const [isProcessingStt, setIsProcessingStt] = useState(false);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFormDataRef = useRef<string>('');

  // 현재 폼 데이터를 JSON 문자열로 직렬화
  const serializeFormData = useCallback(() => {
    return JSON.stringify({
      interviewDate,
      participants,
      companyDetails,
      jobTasks,
      painPoints,
      constraints,
      improvementGoals,
      notes,
      customerRequirements,
    });
  }, [interviewDate, participants, companyDetails, jobTasks, painPoints, constraints, improvementGoals, notes, customerRequirements]);

  // 자동 저장 함수
  const autoSave = useCallback(async () => {
    const currentFormData = serializeFormData();

    // 데이터가 변경되지 않았으면 저장하지 않음
    if (currentFormData === lastFormDataRef.current) {
      return;
    }

    setIsAutoSaving(true);

    // 자동 저장 시에는 유효성 검사 건너뜀 (작성 중인 데이터 보존 목적)
    const result = await saveInterview(projectId, {
      interview_date: interviewDate,
      participants,
      company_details: companyDetails,
      job_tasks: jobTasks,
      pain_points: painPoints,
      constraints: constraints.length > 0 ? constraints : undefined,
      improvement_goals: improvementGoals,
      notes,
      customer_requirements: customerRequirements,
    }, { skipValidation: true });

    if (result.success) {
      lastFormDataRef.current = currentFormData;
      setLastSaved(new Date());
      setAutoSaveError(null);
    } else {
      // 실제 에러 메시지를 콘솔에 출력하고 사용자에게 표시
      console.error('[Auto-save Error]', result.error);
      setAutoSaveError(result.error || '자동 저장에 실패했습니다.');
      setTimeout(() => setAutoSaveError(null), 8000);
    }

    setIsAutoSaving(false);
  }, [projectId, interviewDate, participants, companyDetails, jobTasks, painPoints, constraints, improvementGoals, notes, customerRequirements, serializeFormData]);

  // 디바운스된 자동 저장 설정
  useEffect(() => {
    if (isFetching) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSave();
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [interviewDate, participants, companyDetails, jobTasks, painPoints, constraints, improvementGoals, notes, customerRequirements, isFetching, autoSave]);

  // 기존 인터뷰 데이터 로드
  useEffect(() => {
    async function loadInterview() {
      const data = await getInterview(projectId);
      if (data) {
        setInterviewDate(data.interview_date);
        // 빈 배열인 경우에도 기본 폼을 표시하도록 length 체크
        const loadedParticipants = data.participants as InterviewParticipant[];
        setParticipants(loadedParticipants?.length > 0 ? loadedParticipants : [createEmptyParticipant()]);
        setCompanyDetails(data.company_details as CompanyDetails || {
          systems_and_tools: [],
          ai_experience: '',
        });
        const loadedJobTasks = data.job_tasks as JobTask[];
        setJobTasks(loadedJobTasks?.length > 0 ? loadedJobTasks : [createEmptyJobTask()]);
        const loadedPainPoints = data.pain_points as PainPoint[];
        setPainPoints(loadedPainPoints?.length > 0 ? loadedPainPoints : [createEmptyPainPoint()]);
        setConstraints((data.constraints as Constraint[]) || []);
        const loadedGoals = data.improvement_goals as ImprovementGoal[];
        setImprovementGoals(loadedGoals?.length > 0 ? loadedGoals : [createEmptyImprovementGoal()]);
        setNotes(data.notes || '');
        setCustomerRequirements(data.customer_requirements || '');
        setSttInsights((data.stt_insights as SttInsights) || null);

        // 기존 데이터가 있으면 모든 스텝을 완료로 표시
        setCompletedSteps([1, 2, 3, 4, 5, 6]);

        lastFormDataRef.current = JSON.stringify({
          interviewDate: data.interview_date,
          participants: data.participants,
          companyDetails: data.company_details,
          jobTasks: data.job_tasks,
          painPoints: data.pain_points,
          constraints: data.constraints,
          improvementGoals: data.improvement_goals,
          notes: data.notes,
          customerRequirements: data.customer_requirements,
        });
      }
      setIsFetching(false);
    }
    loadInterview();
  }, [projectId]);

  // 스텝 유효성 검사
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!interviewDate && participants.length > 0 && participants.every(p => p.name.trim() !== '');
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
  };

  // 필수 스텝 완료 여부 (저장 버튼 활성화 조건)
  const isAllRequiredStepsValid = REQUIRED_STEP_IDS.every(step => validateStep(step));
  const incompleteRequiredSteps = REQUIRED_STEP_IDS.filter(step => !validateStep(step));

  // 다음 스텝으로 이동 (유효성 검사 없이 자유롭게 이동 가능)
  const goToNextStep = () => {
    if (currentStep < INTERVIEW_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 이전 스텝으로 이동
  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 스텝 클릭 핸들러
  const handleStepClick = (step: number) => {
    if (validateStep(currentStep) && !completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    setCurrentStep(step);
  };

  // 최종 제출
  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    // 필수 스텝 유효성 검사 (requiredSteps는 상단에서 정의됨)
    const firstIncompleteStep = incompleteRequiredSteps[0];
    if (firstIncompleteStep) {
      setCurrentStep(firstIncompleteStep);
      setError('필수 항목을 입력해주세요.');
      setIsLoading(false);

      // Toast 알림 + 스크롤
      showErrorToast('입력 확인 필요', `${incompleteRequiredSteps.length}개 필수 단계를 완료해주세요.`);
      scrollToPageTop(0);
      return;
    }

    const result = await saveInterview(projectId, {
      interview_date: interviewDate,
      participants,
      company_details: companyDetails,
      job_tasks: jobTasks,
      pain_points: painPoints,
      constraints: constraints.length > 0 ? constraints : undefined,
      improvement_goals: improvementGoals,
      notes,
      customer_requirements: customerRequirements,
    });

    if (result.success) {
      setSuccess('인터뷰가 저장되었습니다.');

      // 성공 Toast
      showSuccessToast('저장 완료', '인터뷰가 성공적으로 저장되었습니다.');

      setTimeout(() => {
        router.push(`/consultant/projects/${projectId}`);
        router.refresh();
      }, 1000);
    } else {
      const errorMessage = result.error || '저장에 실패했습니다.';
      setError(errorMessage);

      // 에러 Toast + 스크롤
      showErrorToast('저장 실패', errorMessage);
      scrollToPageTop(0);
    }

    setIsLoading(false);
  }

  // STT 파일 업로드 핸들러
  const handleSttFileUpload = async (text: string) => {
    setIsProcessingStt(true);
    try {
      const result = await processSttFile(projectId, text);
      if (result.success && result.insights) {
        setSttInsights(result.insights);
        showSuccessToast('STT 분석 완료', '음성 인식 결과가 성공적으로 처리되었습니다.');
      } else {
        throw new Error(result.error || 'STT 처리에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'STT 처리 중 오류가 발생했습니다.';
      setError(errorMessage);
      showErrorToast('STT 처리 실패', errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessingStt(false);
    }
  };

  // STT 인사이트 삭제 핸들러
  const handleSttInsightsDelete = async () => {
    try {
      const result = await deleteSttInsights(projectId);
      if (result.success) {
        setSttInsights(null);
        showSuccessToast('삭제 완료', 'STT 인사이트가 삭제되었습니다.');
      } else {
        throw new Error(result.error || '삭제에 실패했습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'STT 인사이트 삭제 중 오류가 발생했습니다.';
      setError(errorMessage);
      showErrorToast('삭제 실패', errorMessage);
      setTimeout(() => setError(null), 5000);
    }
  };

  // 현재 스텝 컨텐츠 렌더링
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepBasicInfo
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
          <StepSummary
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

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-2 text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* 헤더 */}
      <div className="mb-6">
        <PageHeader
          title="현장 인터뷰 입력"
          backLink={{ href: `/consultant/projects/${projectId}`, label: '프로젝트로 돌아가기' }}
          actions={
            <div className="text-sm flex items-center">
              {autoSaveError ? (
                <span className="text-red-500 flex items-center" title={autoSaveError}>
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  저장 실패
                </span>
              ) : isAutoSaving ? (
                <span className="text-gray-500 flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  저장 중...
                </span>
              ) : lastSaved ? (
                <span className="text-green-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 자동 저장됨
                </span>
              ) : null}
            </div>
          }
        />
      </div>

      {/* 알림 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}

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
              href={`/consultant/projects/${projectId}`}
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
                  disabled={isLoading || !isAllRequiredStepsValid}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      저장 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      저장
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
