'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { createSelfAssessment } from '../../actions';
import { cn, showErrorToast, showSuccessToast } from '@/lib/utils';
import {
  type Question,
  type Template,
  StepIndicator,
  ProgressBar,
  DimensionHeader,
  QuestionInput,
  NavigationButtons,
  groupQuestionsByDimension,
  toCircledNumber,
} from '@/components/ops/self-assessment';

// ============================================================================
// 타입 정의
// ============================================================================

interface SelfAssessmentFormProps {
  projectId: string;
  template: Template;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function SelfAssessmentForm({ projectId, template }: SelfAssessmentFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentStep, setCurrentStep] = useState(0);

  // 질문을 차원별로 그룹화
  const questionsByDimension = groupQuestionsByDimension(template.questions);

  // 차원 목록 (순서 유지) - 스텝으로 사용
  const dimensions = Object.keys(questionsByDimension);

  const totalSteps = dimensions.length;
  const isLastStep = currentStep === totalSteps - 1;

  // 현재 스텝의 질문들
  const currentDimension = dimensions[currentStep];
  const currentQuestions = questionsByDimension[currentDimension] || [];

  // 질문 응답 여부 확인
  const isQuestionAnswered = (question: Question): boolean => {
    return answers[question.id] !== undefined;
  };

  // 완료된 스텝 계산
  const completedSteps = new Set(
    dimensions
      .map((dim, index) => ({ dim, index }))
      .filter(({ dim }) => questionsByDimension[dim].every((q) => isQuestionAnswered(q)))
      .map(({ index }) => index)
  );

  // 현재 스텝 완료 여부
  const isCurrentStepComplete = currentQuestions.every((q) => isQuestionAnswered(q));

  // 전체 응답 수
  const answeredCount = template.questions.filter((q) => isQuestionAnswered(q)).length;
  const allQuestionsAnswered = answeredCount === template.questions.length;

  // 답변 변경 핸들러
  const handleAnswerChange = (questionId: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // DOM 업데이트 및 페인팅 완료 후 스크롤 실행
  const scrollAfterPaint = (
    getElement: () => HTMLElement | null | undefined,
    options: ScrollIntoViewOptions,
    delay = 0
  ) => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        getElement()?.scrollIntoView(options);
      });
    }, delay);
  };

  // 미응답 문항으로 스크롤
  const scrollToFirstUnanswered = (questions: Question[], delay = 0) => {
    const firstUnanswered = questions.find((q) => !isQuestionAnswered(q));
    if (firstUnanswered) {
      scrollAfterPaint(
        () => document.getElementById(`question-${firstUnanswered.id}`),
        { behavior: 'smooth', block: 'center' },
        delay
      );
    }
  };

  // 스텝 이동
  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
      setError(null);
      scrollAfterPaint(() => formRef.current, { behavior: 'smooth', block: 'start' });
    }
  };

  const goNext = () => {
    if (!isCurrentStepComplete) {
      setError('현재 단계의 모든 문항에 응답해 주세요.');
      showErrorToast('입력 확인 필요', '현재 단계의 모든 문항에 응답해 주세요.');
      scrollToFirstUnanswered(currentQuestions);
      return;
    }
    goToStep(currentStep + 1);
  };

  const goPrev = () => goToStep(currentStep - 1);

  // 폼 제출 방지 (모든 제출은 버튼 클릭으로만 처리)
  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  // 실제 제출 핸들러 (버튼 클릭 시에만 호출)
  async function handleSubmitClick() {
    if (isLoading) return;

    setError(null);

    // 모든 질문에 응답했는지 확인
    const unansweredQuestions = template.questions.filter((q) => !isQuestionAnswered(q));
    if (unansweredQuestions.length > 0) {
      const firstUnanswered = unansweredQuestions[0];
      const firstUnansweredDim = firstUnanswered.dimension;
      const stepIndex = dimensions.indexOf(firstUnansweredDim);
      if (stepIndex !== -1) {
        setCurrentStep(stepIndex);
      }
      const errorMessage = `${unansweredQuestions.length}개의 미응답 질문이 있습니다.`;
      setError(errorMessage);
      showErrorToast('입력 확인 필요', errorMessage);
      // 스텝 변경 후 렌더링 완료를 기다린 뒤 미응답 문항으로 스크롤
      scrollToFirstUnanswered(unansweredQuestions, 100);
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.set('project_id', projectId);
      formData.set('template_id', template.id);
      formData.set(
        'answers',
        JSON.stringify(
          Object.entries(answers).map(([question_id, answer_value]) => ({
            question_id,
            answer_value,
          }))
        )
      );

      const result = await createSelfAssessment(formData);

      if (result.success) {
        showSuccessToast('자가진단 완료', '자가진단이 성공적으로 저장되었습니다.');
        setIsLoading(false);
        startTransition(() => {
          router.refresh();
        });
      } else {
        const errorMessage = result.error || '자가진단 저장에 실패했습니다.';
        setError(errorMessage);
        showErrorToast('저장 실패', errorMessage);
        setIsLoading(false);
      }
    } catch {
      setError('자가진단 저장에 실패했습니다.');
      showErrorToast('저장 실패', '서버와 통신 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  }

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <form ref={formRef} onSubmit={handleFormSubmit}>
      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}

      {/* 스텝 인디케이터 */}
      <StepIndicator
        steps={dimensions}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      {/* 전체 진행률 */}
      <ProgressBar answeredCount={answeredCount} totalCount={template.questions.length} />

      {/* 현재 스텝 헤더 */}
      <DimensionHeader
        dimension={currentDimension}
        answeredCount={currentQuestions.filter((q) => isQuestionAnswered(q)).length}
        totalCount={currentQuestions.length}
      />

      {/* 질문 목록 */}
      <div className="space-y-3 sm:space-y-4 mb-6">
        {currentQuestions
          .sort((a, b) => a.order - b.order)
          .map((question) => (
            <div
              key={question.id}
              id={`question-${question.id}`}
              className={cn(
                'p-3 sm:p-4 rounded-lg transition-colors',
                isQuestionAnswered(question)
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-white border border-gray-200'
              )}
            >
              <div className="flex gap-3 mb-3">
                <span className="text-xl text-blue-600 flex-shrink-0 mt-[-2px]">
                  {toCircledNumber(question.order)}
                </span>
                <span className="text-sm text-gray-700 font-medium leading-6 break-keep">
                  {question.question_text}
                </span>
              </div>
              <QuestionInput
                question={question}
                value={answers[question.id]}
                onChange={handleAnswerChange}
              />
            </div>
          ))}
      </div>

      {/* 네비게이션 버튼 */}
      <NavigationButtons
        currentStep={currentStep}
        totalSteps={totalSteps}
        isLastStep={isLastStep}
        isCurrentStepComplete={isCurrentStepComplete}
        allQuestionsAnswered={allQuestionsAnswered}
        isLoading={isLoading}
        isPending={isPending}
        onPrev={goPrev}
        onNext={goNext}
        onSubmit={handleSubmitClick}
        onGoToStep={goToStep}
      />

      {/* 전체 상태 요약 */}
      <div className="mt-4 text-center">
        {allQuestionsAnswered ? (
          <span className="text-sm text-green-600 flex items-center justify-center">
            <Check className="w-4 h-4 mr-1" />
            모든 문항 응답 완료
          </span>
        ) : (
          <span className="text-sm text-gray-500">
            {template.questions.length - answeredCount}개 문항 미응답
          </span>
        )}
      </div>
    </form>
  );
}
