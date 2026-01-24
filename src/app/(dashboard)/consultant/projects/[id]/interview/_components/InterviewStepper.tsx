'use client';

interface Step {
  id: number;
  name: string;
  shortName: string; // 모바일용 짧은 이름
}

interface InterviewStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: number[];
}

export default function InterviewStepper({
  steps,
  currentStep,
  onStepClick,
  completedSteps,
}: InterviewStepperProps) {
  return (
    <nav aria-label="Progress">
      {/* 데스크톱: 가로 스테퍼 */}
      <ol className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isClickable = isCompleted || isCurrent || completedSteps.includes(step.id - 1);

          return (
            <li key={step.id} className="flex-1 relative">
              {/* 연결선 */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-0.5 ${
                    isCompleted ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  style={{ transform: 'translateY(-50%)' }}
                />
              )}

              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={`relative flex flex-col items-center group ${
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                {/* 원형 스텝 표시 */}
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium z-10 transition-colors ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : isCompleted
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step.id
                  )}
                </span>

                {/* 스텝 이름 */}
                <span
                  className={`mt-2 text-xs font-medium ${
                    isCurrent
                      ? 'text-blue-600'
                      : isCompleted
                      ? 'text-gray-900'
                      : 'text-gray-500'
                  }`}
                >
                  {step.name}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* 모바일: 현재 단계 표시 + 작은 진행 표시 */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-600">
            {currentStep}/{steps.length}단계
          </span>
          <span className="text-sm font-medium text-gray-900">
            {steps.find((s) => s.id === currentStep)?.name}
          </span>
        </div>

        {/* 모바일 진행 바 */}
        <div className="flex items-center space-x-1">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = currentStep === step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => (isCompleted || isCurrent) && onStepClick(step.id)}
                disabled={!isCompleted && !isCurrent && !completedSteps.includes(step.id - 1)}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  isCurrent
                    ? 'bg-blue-600'
                    : isCompleted
                    ? 'bg-blue-400'
                    : 'bg-gray-200'
                }`}
                title={step.shortName}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}
