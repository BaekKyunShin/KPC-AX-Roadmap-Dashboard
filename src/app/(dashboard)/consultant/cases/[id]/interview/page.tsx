'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { saveInterview, getInterview } from './actions';
import {
  type JobTask,
  type PainPoint,
  type Constraint,
  type ImprovementGoal,
  type CompanyDetails,
  createEmptyJobTask,
  createEmptyPainPoint,
  createEmptyImprovementGoal,
} from '@/lib/schemas/interview';

import InterviewStepper from './_components/InterviewStepper';
import StepBasicInfo from './_components/StepBasicInfo';
import StepCompanyDetails from './_components/StepCompanyDetails';
import StepJobTasks from './_components/StepJobTasks';
import StepPainPoints from './_components/StepPainPoints';
import StepConstraintsGoals from './_components/StepConstraintsGoals';
import StepAdditionalInfo from './_components/StepAdditionalInfo';

const STEPS = [
  { id: 1, name: '기본 정보', shortName: '기본' },
  { id: 2, name: '기업 세부 정보', shortName: '기업' },
  { id: 3, name: '세부업무', shortName: '업무' },
  { id: 4, name: '페인포인트', shortName: '페인' },
  { id: 5, name: '제약 및 목표', shortName: '목표' },
  { id: 6, name: '추가 정보', shortName: '추가' },
];

export default function InterviewPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

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
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    department: '',
    team_size: undefined,
    main_systems: [],
    data_sources: [],
    current_tools: [],
    ai_experience: '',
    training_history: '',
  });
  const [jobTasks, setJobTasks] = useState<JobTask[]>([createEmptyJobTask()]);
  const [painPoints, setPainPoints] = useState<PainPoint[]>([createEmptyPainPoint()]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [improvementGoals, setImprovementGoals] = useState<ImprovementGoal[]>([createEmptyImprovementGoal()]);
  const [notes, setNotes] = useState('');
  const [customerRequirements, setCustomerRequirements] = useState('');

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFormDataRef = useRef<string>('');

  // 현재 폼 데이터를 JSON 문자열로 직렬화
  const serializeFormData = useCallback(() => {
    return JSON.stringify({
      interviewDate,
      companyDetails,
      jobTasks,
      painPoints,
      constraints,
      improvementGoals,
      notes,
      customerRequirements,
    });
  }, [interviewDate, companyDetails, jobTasks, painPoints, constraints, improvementGoals, notes, customerRequirements]);

  // 자동 저장 함수
  const autoSave = useCallback(async () => {
    const currentFormData = serializeFormData();

    // 데이터가 변경되지 않았으면 저장하지 않음
    if (currentFormData === lastFormDataRef.current) {
      return;
    }

    setIsAutoSaving(true);

    const result = await saveInterview(caseId, {
      interview_date: interviewDate,
      company_details: companyDetails,
      job_tasks: jobTasks,
      pain_points: painPoints,
      constraints: constraints.length > 0 ? constraints : undefined,
      improvement_goals: improvementGoals,
      notes,
      customer_requirements: customerRequirements,
    });

    if (result.success) {
      lastFormDataRef.current = currentFormData;
      setLastSaved(new Date());
      setAutoSaveError(null);
    } else {
      setAutoSaveError('자동 저장에 실패했습니다. 인터넷 연결을 확인해주세요.');
      // 5초 후 에러 메시지 자동 제거
      setTimeout(() => setAutoSaveError(null), 5000);
    }

    setIsAutoSaving(false);
  }, [caseId, interviewDate, companyDetails, jobTasks, painPoints, constraints, improvementGoals, notes, customerRequirements, serializeFormData]);

  // 디바운스된 자동 저장 설정
  useEffect(() => {
    if (isFetching) return;

    // 이전 타이머 클리어
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 새로운 타이머 설정 (3초 후 자동 저장)
    autoSaveTimerRef.current = setTimeout(() => {
      autoSave();
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [interviewDate, companyDetails, jobTasks, painPoints, constraints, improvementGoals, notes, customerRequirements, isFetching, autoSave]);

  // 기존 인터뷰 데이터 로드
  useEffect(() => {
    async function loadInterview() {
      const data = await getInterview(caseId);
      if (data) {
        setInterviewDate(data.interview_date);
        setCompanyDetails(data.company_details as CompanyDetails || {
          department: '',
          team_size: undefined,
          main_systems: [],
          data_sources: [],
          current_tools: [],
          ai_experience: '',
          training_history: '',
        });
        setJobTasks((data.job_tasks as JobTask[]) || [createEmptyJobTask()]);
        setPainPoints((data.pain_points as PainPoint[]) || [createEmptyPainPoint()]);
        setConstraints((data.constraints as Constraint[]) || []);
        setImprovementGoals((data.improvement_goals as ImprovementGoal[]) || [createEmptyImprovementGoal()]);
        setNotes(data.notes || '');
        setCustomerRequirements(data.customer_requirements || '');

        // 기존 데이터가 있으면 모든 스텝을 완료로 표시
        setCompletedSteps([1, 2, 3, 4, 5, 6]);

        // 직렬화된 데이터 저장 (자동저장 비교용)
        lastFormDataRef.current = JSON.stringify({
          interviewDate: data.interview_date,
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
  }, [caseId]);

  // 스텝 유효성 검사
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!interviewDate;
      case 2:
        return true; // 기업 정보는 선택 사항
      case 3:
        return jobTasks.length > 0 && jobTasks.every(t => t.task_name && t.task_description);
      case 4:
        return painPoints.length > 0 && painPoints.every(p => p.description);
      case 5:
        return improvementGoals.length > 0 && improvementGoals.every(g => g.goal_description);
      case 6:
        return true; // 추가 정보는 선택 사항
      default:
        return false;
    }
  };

  // 다음 스텝으로 이동
  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      setError('필수 항목을 입력해주세요.');
      setTimeout(() => setError(null), 3000);
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
    // 현재 스텝이 유효하면 완료로 표시
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

    // 모든 스텝 유효성 검사
    for (let step = 1; step <= STEPS.length; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        setError('필수 항목을 입력해주세요.');
        setIsLoading(false);
        return;
      }
    }

    const result = await saveInterview(caseId, {
      interview_date: interviewDate,
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
      setTimeout(() => {
        router.push(`/consultant/cases/${caseId}`);
        router.refresh();
      }, 1000);
    } else {
      setError(result.error || '저장에 실패했습니다.');
    }

    setIsLoading(false);
  }

  // 현재 스텝 컨텐츠 렌더링
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepBasicInfo
            interviewDate={interviewDate}
            onInterviewDateChange={setInterviewDate}
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
            onConstraintsChange={setConstraints}
            onImprovementGoalsChange={setImprovementGoals}
          />
        );
      case 6:
        return (
          <StepAdditionalInfo
            customerRequirements={customerRequirements}
            notes={notes}
            onCustomerRequirementsChange={setCustomerRequirements}
            onNotesChange={setNotes}
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
        <Link
          href={`/consultant/cases/${caseId}`}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          케이스로 돌아가기
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-gray-900">현장 인터뷰 입력</h1>
          {/* 자동 저장 상태 */}
          <div className="text-sm flex items-center">
            {autoSaveError ? (
              <span className="text-red-500 flex items-center">
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
                {lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장됨
              </span>
            ) : null}
          </div>
        </div>
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
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          completedSteps={completedSteps}
        />
      </div>

      {/* 스텝 컨텐츠 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6 min-h-[400px]">
        {renderStepContent()}
      </div>

      {/* 네비게이션 버튼 - 고정 위치 (모바일 최적화) */}
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
              href={`/consultant/cases/${caseId}`}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hidden md:block"
            >
              취소
            </Link>

            {currentStep < STEPS.length ? (
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
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center"
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
