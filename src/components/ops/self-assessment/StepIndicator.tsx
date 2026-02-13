import { Check } from 'lucide-react';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
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
