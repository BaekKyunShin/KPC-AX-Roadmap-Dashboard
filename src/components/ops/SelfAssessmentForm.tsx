'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSelfAssessment } from '@/app/(dashboard)/ops/projects/actions';
import { showErrorToast, showSuccessToast } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

// ============================================================================
// 타입 정의
// ============================================================================

interface Question {
  id: string;
  order: number;
  dimension: string;
  question_text: string;
  question_type: 'SCALE_5' | 'SCALE_10' | 'MULTIPLE_CHOICE' | 'TEXT';
  options?: string[];
  weight: number;
}

interface Template {
  id: string;
  version: number;
  name: string;
  questions: Question[];
}

interface SelfAssessmentFormProps {
  projectId: string;
  template: Template;
}

// ============================================================================
// 상수 정의
// ============================================================================

const CIRCLED_NUMBERS = [
  '①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩',
  '⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳',
  '㉑','㉒','㉓','㉔','㉕','㉖','㉗','㉘','㉙','㉚'
];

const SCALE_5_LABELS = ['매우 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];
const SCALE_5_VALUES = [1, 2, 3, 4, 5] as const;
const SCALE_10_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// ============================================================================
// 유틸리티 함수
// ============================================================================

const toCircledNumber = (n: number): string => CIRCLED_NUMBERS[n - 1] || n.toString();

const groupQuestionsByDimension = (questions: Question[]): Record<string, Question[]> => {
  return questions.reduce((acc, q) => {
    if (!acc[q.dimension]) {
      acc[q.dimension] = [];
    }
    acc[q.dimension].push(q);
    return acc;
  }, {} as Record<string, Question[]>);
};

// ============================================================================
// 하위 컴포넌트
// ============================================================================

/** 스텝 인디케이터 - 탭/세그먼트 스타일 */
function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: {
  steps: string[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="mb-6">
      {/* 데스크톱: 탭 스타일 */}
      <div className="hidden sm:block">
        <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
          {steps.map((stepName, index) => {
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === currentStep;

            return (
              <button
                key={stepName}
                type="button"
                onClick={() => onStepClick(index)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-sm font-medium transition-all
                  ${isCurrent
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : isCompleted
                      ? 'text-indigo-600 hover:bg-white/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white/30'
                  }
                `}
              >
                {/* 완료 표시 또는 번호 */}
                <span className={`
                  flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold flex-shrink-0
                  ${isCompleted
                    ? 'bg-indigo-500 text-white'
                    : isCurrent
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-200 text-gray-500'
                  }
                `}>
                  {isCompleted ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="truncate text-xs">{stepName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 모바일: 컴팩트 스타일 */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between bg-indigo-50 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-bold">
              {currentStep + 1}
            </span>
            <span className="font-medium text-indigo-900">{steps[currentStep]}</span>
          </div>
          <span className="text-sm text-indigo-600">
            {currentStep + 1} / {steps.length}
          </span>
        </div>
        {/* 모바일 진행 바 */}
        <div className="mt-2 flex gap-1">
          {steps.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onStepClick(index)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-indigo-500'
                  : completedSteps.has(index)
                    ? 'bg-indigo-300'
                    : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** 진행률 바 */
function ProgressBar({
  answeredCount,
  totalCount,
}: {
  answeredCount: number;
  totalCount: number;
}) {
  // totalCount가 0인 edge case 방어
  const percentage = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <div className="mb-4 bg-gray-50 rounded-lg p-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-gray-600">전체 진행률</span>
        <span className="text-xs text-gray-500">
          {answeredCount} / {totalCount} 문항 ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/** 현재 평가 영역 헤더 */
function DimensionHeader({
  dimension,
  answeredCount,
  totalCount,
}: {
  dimension: string;
  answeredCount: number;
  totalCount: number;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500 font-medium">평가 영역</span>
        <span className="text-xs text-gray-500">
          {answeredCount} / {totalCount} 완료
        </span>
      </div>
      <div className="inline-flex items-center px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
        <span className="text-sm font-medium text-indigo-700">{dimension}</span>
      </div>
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function SelfAssessmentForm({ projectId, template }: SelfAssessmentFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [currentStep, setCurrentStep] = useState(0);

  // 질문을 차원별로 그룹화
  const questionsByDimension = useMemo(
    () => groupQuestionsByDimension(template.questions),
    [template.questions]
  );

  // 차원 목록 (순서 유지) - 스텝으로 사용
  const dimensions = useMemo(
    () => Object.keys(questionsByDimension),
    [questionsByDimension]
  );

  const totalSteps = dimensions.length;
  const isLastStep = currentStep === totalSteps - 1;

  // 현재 스텝의 질문들
  const currentDimension = dimensions[currentStep];
  const currentQuestions = questionsByDimension[currentDimension] || [];

  // 질문 응답 여부 확인
  const isQuestionAnswered = useCallback((question: Question): boolean => {
    const answer = answers[question.id];
    if (answer === undefined) return false;
    if (question.question_type === 'TEXT') {
      return typeof answer === 'string' && answer.trim().length > 0;
    }
    return true;
  }, [answers]);

  // 완료된 스텝 계산
  const completedSteps = useMemo(() => {
    const completed = new Set<number>();
    dimensions.forEach((dim, index) => {
      const questions = questionsByDimension[dim];
      if (questions.every((q) => isQuestionAnswered(q))) {
        completed.add(index);
      }
    });
    return completed;
  }, [dimensions, questionsByDimension, isQuestionAnswered]);

  // 현재 스텝 완료 여부
  const isCurrentStepComplete = currentQuestions.every((q) => isQuestionAnswered(q));

  // 전체 응답 수
  const answeredCount = template.questions.filter((q) => isQuestionAnswered(q)).length;
  const allQuestionsAnswered = answeredCount === template.questions.length;

  // 답변 변경 핸들러
  const handleAnswerChange = (questionId: string, value: number | string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // 스텝 이동
  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
      setError(null);
      // DOM 업데이트 및 렌더링 완료 후 스크롤 실행
      // setTimeout(0)으로 이벤트 루프의 다음 틱으로 미루고,
      // requestAnimationFrame으로 브라우저 페인트 후 실행
      setTimeout(() => {
        requestAnimationFrame(() => {
          formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }, 0);
    }
  };

  const goNext = () => {
    if (!isCurrentStepComplete) {
      setError('현재 단계의 모든 문항에 응답해 주세요.');
      showErrorToast('입력 확인 필요', '현재 단계의 모든 문항에 응답해 주세요.');
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
      const firstUnansweredDim = unansweredQuestions[0].dimension;
      const stepIndex = dimensions.indexOf(firstUnansweredDim);
      if (stepIndex !== -1) {
        setCurrentStep(stepIndex);
      }
      const errorMessage = `${unansweredQuestions.length}개의 미응답 질문이 있습니다.`;
      setError(errorMessage);
      showErrorToast('입력 확인 필요', errorMessage);
      return;
    }

    setIsLoading(true);

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
      router.refresh();
    } else {
      const errorMessage = result.error || '자가진단 저장에 실패했습니다.';
      setError(errorMessage);
      showErrorToast('저장 실패', errorMessage);
    }

    setIsLoading(false);
  }

  // ============================================================================
  // 질문 타입별 렌더링
  // ============================================================================

  const renderScale5 = (question: Question) => (
    <div className="w-full">
      <div className="grid grid-cols-5 gap-2">
        {SCALE_5_VALUES.map((value) => {
          const isSelected = answers[question.id] === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleAnswerChange(question.id, value)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <span className={`text-sm font-semibold ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                {value}
              </span>
              <span className="text-xs">{SCALE_5_LABELS[value - 1]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderScale10 = (question: Question) => (
    <div>
      <div className="flex flex-wrap gap-2">
        {SCALE_10_VALUES.map((value) => {
          const isSelected = answers[question.id] === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleAnswerChange(question.id, value)}
              className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {value}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
        <span>매우 낮음</span>
        <span>보통</span>
        <span>매우 높음</span>
      </div>
    </div>
  );

  const renderMultipleChoice = (question: Question) => (
    <div className="space-y-2">
      {question.options?.map((option, index) => {
        const value = index + 1;
        const isSelected = answers[question.id] === value;
        return (
          <label
            key={index}
            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
              isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={value}
              checked={isSelected}
              onChange={() => handleAnswerChange(question.id, value)}
              className="h-4 w-4 text-blue-600 border-gray-300"
            />
            <span className="ml-3 text-sm text-gray-700">{option}</span>
          </label>
        );
      })}
    </div>
  );

  const renderText = (question: Question) => (
    <div>
      <textarea
        value={(answers[question.id] as string) || ''}
        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
        rows={3}
        placeholder="답변을 입력하세요..."
        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm break-keep"
      />
      <p className="mt-1 text-xs text-gray-400">
        {((answers[question.id] as string) || '').length}자
      </p>
    </div>
  );

  const renderQuestionInput = (question: Question) => {
    switch (question.question_type) {
      case 'SCALE_5':
        return renderScale5(question);
      case 'SCALE_10':
        return renderScale10(question);
      case 'MULTIPLE_CHOICE':
        return renderMultipleChoice(question);
      case 'TEXT':
        return renderText(question);
      default:
        return renderScale5(question);
    }
  };

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <form ref={formRef} onSubmit={handleFormSubmit}>
      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
      <div className="space-y-4 mb-6">
        {currentQuestions
          .sort((a, b) => a.order - b.order)
          .map((question) => (
            <div
              key={question.id}
              id={`question-${question.id}`}
              className={`p-4 rounded-lg transition-colors ${
                isQuestionAnswered(question)
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className="flex gap-3 mb-3">
                <span className="text-xl text-blue-600 flex-shrink-0 mt-[-2px]">
                  {toCircledNumber(question.order)}
                </span>
                <span className="text-sm text-gray-700 font-medium leading-6 break-keep">
                  {question.question_text}
                </span>
              </div>
              {renderQuestionInput(question)}
            </div>
          ))}
      </div>

      {/* 네비게이션 버튼 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        {/* 이전 버튼 */}
        <button
          type="button"
          onClick={goPrev}
          disabled={currentStep === 0}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            currentStep === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          이전
        </button>

        {/* 현재 위치 표시 */}
        <div className="flex items-center gap-1">
          {dimensions.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToStep(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? 'bg-indigo-600' : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* 다음/제출 버튼 */}
        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={isLoading || !allQuestionsAnswered}
            className="flex items-center px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              '자가진단 저장'
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isCurrentStepComplete
                ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
            }`}
          >
            다음
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>

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
