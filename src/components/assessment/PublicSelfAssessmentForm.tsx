'use client';

import { useState, useRef } from 'react';
import { Check, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
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
import { cn, showErrorToast, showSuccessToast } from '@/lib/utils';
import { submitPublicAssessment } from '@/app/assessment/actions';

// ============================================================================
// 타입 정의
// ============================================================================

interface PublicSelfAssessmentFormProps {
  token: string;
  template: Template;
  onComplete: () => void;
}

const WRITER_INFO_STEP_LABEL = '작성자 정보';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function PublicSelfAssessmentForm({
  token,
  template,
  onComplete,
}: PublicSelfAssessmentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentStep, setCurrentStep] = useState(0); // 0 = 작성자 정보

  // 작성자 정보
  const [writerName, setWriterName] = useState('');
  const [writerTitle, setWriterTitle] = useState('');
  const [writerEmail, setWriterEmail] = useState('');
  const [writerErrors, setWriterErrors] = useState<Record<string, string>>({});

  // 질문을 차원별로 그룹화
  const questionsByDimension = groupQuestionsByDimension(template.questions);
  const dimensions = Object.keys(questionsByDimension);

  // Step 0 = 작성자 정보, Step 1~ = 차원별 질문
  const allStepLabels = [WRITER_INFO_STEP_LABEL, ...dimensions];
  const totalSteps = allStepLabels.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isWriterInfoStep = currentStep === 0;

  // 현재 스텝의 질문들 (차원 스텝일 때만)
  const currentDimensionIndex = currentStep - 1;
  const currentDimension = dimensions[currentDimensionIndex];
  const currentQuestions = isWriterInfoStep
    ? []
    : questionsByDimension[currentDimension] || [];

  // 질문 응답 여부 확인
  const isQuestionAnswered = (question: Question): boolean => {
    return answers[question.id] !== undefined;
  };

  // 작성자 정보 검증
  const validateWriterInfo = (): boolean => {
    const errors: Record<string, string> = {};
    if (writerName.trim().length < 2) errors.name = '이름을 2자 이상 입력하세요.';
    if (!writerTitle.trim()) errors.title = '직책을 입력하세요.';
    if (!writerEmail.trim() || !EMAIL_REGEX.test(writerEmail))
      errors.email = '유효한 이메일 주소를 입력하세요.';
    setWriterErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 작성자 정보 완료 여부
  const isWriterInfoComplete =
    writerName.trim().length >= 2 &&
    writerTitle.trim().length > 0 &&
    EMAIL_REGEX.test(writerEmail);

  // 완료된 스텝 계산
  const completedSteps = new Set<number>();
  if (isWriterInfoComplete) completedSteps.add(0);
  dimensions.forEach((dim, index) => {
    if (questionsByDimension[dim].every((q) => isQuestionAnswered(q))) {
      completedSteps.add(index + 1);
    }
  });

  // 현재 스텝 완료 여부
  const isCurrentStepComplete = isWriterInfoStep
    ? isWriterInfoComplete
    : currentQuestions.every((q) => isQuestionAnswered(q));

  // 전체 응답 수
  const answeredCount = template.questions.filter((q) =>
    isQuestionAnswered(q)
  ).length;
  const allQuestionsAnswered = answeredCount === template.questions.length;

  // 답변 변경 핸들러
  const handleAnswerChange = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // 스크롤 헬퍼
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
      scrollAfterPaint(
        () => formRef.current,
        { behavior: 'smooth', block: 'start' }
      );
    }
  };

  const goNext = () => {
    if (isWriterInfoStep) {
      if (!validateWriterInfo()) {
        setError('작성자 정보를 모두 입력해 주세요.');
        showErrorToast('입력 확인 필요', '작성자 정보를 모두 입력해 주세요.');
        return;
      }
    } else if (!isCurrentStepComplete) {
      setError('현재 단계의 모든 문항에 응답해 주세요.');
      showErrorToast('입력 확인 필요', '현재 단계의 모든 문항에 응답해 주세요.');
      scrollToFirstUnanswered(currentQuestions);
      return;
    }
    goToStep(currentStep + 1);
  };

  const goPrev = () => goToStep(currentStep - 1);

  // 폼 제출 방지
  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
  }

  // 실제 제출 핸들러
  async function handleSubmitClick() {
    if (isLoading) return;
    setError(null);

    // 작성자 정보 검증
    if (!validateWriterInfo()) {
      setCurrentStep(0);
      setError('작성자 정보를 모두 입력해 주세요.');
      showErrorToast('입력 확인 필요', '작성자 정보를 모두 입력해 주세요.');
      return;
    }

    // 모든 질문 응답 확인
    const unansweredQuestions = template.questions.filter(
      (q) => !isQuestionAnswered(q)
    );
    if (unansweredQuestions.length > 0) {
      const firstUnanswered = unansweredQuestions[0];
      const stepIndex =
        dimensions.indexOf(firstUnanswered.dimension) + 1;
      if (stepIndex > 0) setCurrentStep(stepIndex);
      const errorMessage = `${unansweredQuestions.length}개의 미응답 질문이 있습니다.`;
      setError(errorMessage);
      showErrorToast('입력 확인 필요', errorMessage);
      scrollToFirstUnanswered(unansweredQuestions, 100);
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.set('token', token);
      formData.set('submitted_by_name', writerName.trim());
      formData.set('submitted_by_title', writerTitle.trim());
      formData.set('submitted_by_email', writerEmail.trim());
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

      const result = await submitPublicAssessment(formData);

      if (result.success) {
        showSuccessToast('제출 완료', '자가진단이 성공적으로 제출되었습니다.');
        onComplete();
      } else {
        const errorMessage = result.error || '진단 제출에 실패했습니다.';
        setError(errorMessage);
        showErrorToast('제출 실패', errorMessage);
        setIsLoading(false);
      }
    } catch {
      setError('진단 제출에 실패했습니다.');
      showErrorToast('제출 실패', '서버와 통신 중 오류가 발생했습니다.');
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
          <svg
            className="w-5 h-5 mr-2 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
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
        steps={allStepLabels}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      {/* Step 0: 작성자 정보 */}
      {isWriterInfoStep ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              작성자 정보
            </h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            진단 결과 안내를 위해 작성자 정보를 입력해 주세요.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="writer-name">
                이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="writer-name"
                value={writerName}
                onChange={(e) => setWriterName(e.target.value)}
                placeholder="홍길동"
                aria-invalid={!!writerErrors.name}
              />
              <FieldError message={writerErrors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="writer-title">
                직책 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="writer-title"
                value={writerTitle}
                onChange={(e) => setWriterTitle(e.target.value)}
                placeholder="부장"
                aria-invalid={!!writerErrors.title}
              />
              <FieldError message={writerErrors.title} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="writer-email">
                이메일 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="writer-email"
                type="email"
                value={writerEmail}
                onChange={(e) => setWriterEmail(e.target.value)}
                placeholder="hong@company.com"
                aria-invalid={!!writerErrors.email}
              />
              <FieldError message={writerErrors.email} />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" onClick={goNext}>
              다음
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* 전체 진행률 */}
          <ProgressBar
            answeredCount={answeredCount}
            totalCount={template.questions.length}
          />

          {/* 현재 스텝 헤더 */}
          <DimensionHeader
            dimension={currentDimension}
            answeredCount={
              currentQuestions.filter((q) => isQuestionAnswered(q)).length
            }
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
            allQuestionsAnswered={allQuestionsAnswered && isWriterInfoComplete}
            isLoading={isLoading}
            isPending={false}
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
        </>
      )}
    </form>
  );
}
