import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationButtonsProps {
  currentStep: number;
  totalSteps: number;
  isLastStep: boolean;
  isCurrentStepComplete: boolean;
  allQuestionsAnswered: boolean;
  isLoading: boolean;
  isPending: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onGoToStep: (step: number) => void;
}

export function NavigationButtons({
  currentStep,
  totalSteps,
  isLastStep,
  isCurrentStepComplete,
  allQuestionsAnswered,
  isLoading,
  isPending,
  onPrev,
  onNext,
  onSubmit,
  onGoToStep,
}: NavigationButtonsProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
      {/* 이전 버튼 */}
      <button
        type="button"
        onClick={onPrev}
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
        {Array.from({ length: totalSteps }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onGoToStep(index)}
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
          onClick={onSubmit}
          disabled={isLoading || isPending || !allQuestionsAnswered}
          className="flex items-center px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading || isPending ? (
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
          onClick={onNext}
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
  );
}
