import Link from 'next/link';
import { FlaskConical } from 'lucide-react';
import { INTERVIEW_STEPS } from '@/lib/constants/interview-steps';
import type { GenerationState } from '../_hooks/useTestRoadmapActions';

// =============================================================================
// 타입
// =============================================================================

interface TestRoadmapNavigationProps {
  currentStep: number;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  handleSubmit: () => void;
  generationState: GenerationState;
  isAllRequiredStepsValid: boolean;
  incompleteRequiredSteps: number[];
  isOpsAdmin: boolean;
}

// =============================================================================
// 컴포넌트
// =============================================================================

export default function TestRoadmapNavigation({
  currentStep,
  goToNextStep,
  goToPrevStep,
  handleSubmit,
  generationState,
  isAllRequiredStepsValid,
  incompleteRequiredSteps,
  isOpsAdmin,
}: TestRoadmapNavigationProps) {
  return (
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
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
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
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
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
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
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
  );
}
