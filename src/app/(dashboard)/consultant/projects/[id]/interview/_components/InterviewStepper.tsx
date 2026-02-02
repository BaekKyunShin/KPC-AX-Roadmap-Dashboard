'use client';

interface Step {
  id: number;
  name: string;
  shortName: string;
}

interface InterviewStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: number[];
  /** 각 스텝의 유효성 검사 함수 (동적 완료 상태 표시용) */
  validateStep?: (step: number) => boolean;
}

type StepState = 'current' | 'completed' | 'pending';

/** 스텝 상태 결정 */
function getStepState(stepId: number, currentStep: number, isCompleted: boolean): StepState {
  if (currentStep === stepId) return 'current';
  if (isCompleted) return 'completed';
  return 'pending';
}

/** 데스크톱 원형 스텝 스타일 */
const CIRCLE_STYLES: Record<StepState, string> = {
  current: 'bg-blue-600 text-white ring-4 ring-blue-100',
  completed: 'bg-blue-100 text-blue-600',
  pending: 'bg-white border-2 border-blue-300 text-blue-400',
};

/** 데스크톱 텍스트 스타일 */
const TEXT_STYLES: Record<StepState, string> = {
  current: 'text-blue-600 font-semibold',
  completed: 'text-gray-700',
  pending: 'text-blue-400',
};

/** 모바일 바 스타일 */
const BAR_STYLES: Record<StepState, string> = {
  current: 'bg-blue-600',
  completed: 'bg-blue-300',
  pending: 'bg-blue-100',
};

/** 체크 아이콘 컴포넌트 */
function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function InterviewStepper({
  steps,
  currentStep,
  onStepClick,
  completedSteps,
  validateStep,
}: InterviewStepperProps) {
  const isStepCompleted = (stepId: number): boolean => {
    if (validateStep) {
      return validateStep(stepId);
    }
    return completedSteps.includes(stepId);
  };

  return (
    <nav aria-label="Progress">
      {/* 데스크톱: 가로 스테퍼 */}
      <div className="hidden md:block relative">
        {/* 연결선 */}
        <div
          className="absolute top-4 h-0.5 bg-blue-200"
          style={{ left: '1rem', right: '1rem' }}
        />

        <ol className="flex justify-between relative">
          {steps.map((step) => {
            const state = getStepState(step.id, currentStep, isStepCompleted(step.id));
            const showCheckIcon = state === 'completed';

            return (
              <li key={step.id} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onStepClick(step.id)}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all relative z-10 ${CIRCLE_STYLES[state]} ${
                      state !== 'current' ? 'group-hover:ring-2 group-hover:ring-blue-100' : ''
                    }`}
                  >
                    {showCheckIcon ? <CheckIcon /> : step.id}
                  </span>
                  <span className={`mt-2 text-xs whitespace-nowrap ${TEXT_STYLES[state]}`}>
                    {step.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* 모바일: 현재 단계 표시 + 진행 바 */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-600">
            {currentStep}/{steps.length}단계
          </span>
          <span className="text-sm font-medium text-gray-900">
            {steps.find((s) => s.id === currentStep)?.name}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {steps.map((step) => {
            const state = getStepState(step.id, currentStep, isStepCompleted(step.id));

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepClick(step.id)}
                className={`flex-1 h-2 rounded-full transition-colors ${BAR_STYLES[state]} ${
                  state !== 'current' ? 'hover:bg-blue-400' : ''
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
