import { useState, useCallback } from 'react';
import { createTestRoadmap, reviseTestRoadmap } from '../actions';
import { buildRoadmapMatrixFromCourses, validateCourseClient } from '@/lib/utils/roadmap-client';
import { COMPLETION_DELAY_MS } from '@/components/roadmap/RoadmapLoadingOverlay';
import type { TestInputData } from '@/lib/schemas/test-roadmap';
import type { RoadmapResult, ValidationResult, RoadmapCell } from '@/lib/services/roadmap';

// =============================================================================
// 타입
// =============================================================================

export interface TestRoadmapResultData {
  companyName: string;
  industry: string;
  roadmapResult: RoadmapResult;
  validation: ValidationResult;
}

export interface GenerationState {
  isSubmitting: boolean;
  isGenerating: boolean;
  isComplete: boolean;
}

interface UseTestRoadmapActionsParams {
  setError: (error: string | null) => void;
  buildInputData: () => TestInputData;
  incompleteRequiredSteps: number[];
  setCurrentStep: (step: number) => void;
}

// =============================================================================
// 상수
// =============================================================================

const INITIAL_GENERATION_STATE: GenerationState = {
  isSubmitting: false,
  isGenerating: false,
  isComplete: false,
};

// =============================================================================
// 유틸리티
// =============================================================================

function formatErrorMessage(err: unknown, defaultMessage: string): string {
  if (err instanceof Error) {
    return `오류가 발생했습니다: ${err.message}`;
  }
  return defaultMessage;
}

// =============================================================================
// 훅
// =============================================================================

export function useTestRoadmapActions({
  setError,
  buildInputData,
  incompleteRequiredSteps,
  setCurrentStep,
}: UseTestRoadmapActionsParams) {
  // ===== 결과 상태 =====
  const [generationState, setGenerationState] =
    useState<GenerationState>(INITIAL_GENERATION_STATE);
  const [result, setResult] = useState<TestRoadmapResultData | null>(null);

  // ===== 수정 기능 상태 =====
  const [originalInput, setOriginalInput] = useState<TestInputData | null>(null);
  const [isRevising, setIsRevising] = useState(false);
  const [isRevisionComplete, setIsRevisionComplete] = useState(false);

  // ===== 과정 편집 모달 상태 =====
  const [editingCourse, setEditingCourse] = useState<RoadmapCell | null>(null);
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(null);

  // ===== 로드맵 생성 =====
  const handleSubmit = useCallback(async () => {
    // 필수 스텝 유효성 검사
    const firstIncompleteStep = incompleteRequiredSteps[0];
    if (firstIncompleteStep) {
      setCurrentStep(firstIncompleteStep);
      setError('필수 항목을 입력해주세요.');
      return;
    }

    setGenerationState({ isSubmitting: true, isGenerating: true, isComplete: false });
    setError(null);

    try {
      const data = buildInputData();
      const response = await createTestRoadmap(data);

      if (response.success) {
        setResult({
          companyName: data.company_name,
          industry: data.industry,
          roadmapResult: response.data.result,
          validation: response.data.validation,
        });
        setOriginalInput(data);
        setGenerationState((prev) => ({ ...prev, isSubmitting: false, isComplete: true }));
        setTimeout(() => {
          setGenerationState(INITIAL_GENERATION_STATE);
        }, COMPLETION_DELAY_MS);
      } else {
        setError(response.error || '로드맵 생성에 실패했습니다.');
        setGenerationState(INITIAL_GENERATION_STATE);
      }
    } catch (err) {
      console.error('[TestRoadmap] 로드맵 생성 중 오류:', err);
      setError(formatErrorMessage(err, '로드맵 생성 중 예기치 않은 오류가 발생했습니다.'));
      setGenerationState(INITIAL_GENERATION_STATE);
    }
  }, [buildInputData, incompleteRequiredSteps, setError, setCurrentStep]);

  // ===== 수정 요청 (LLM 재호출) =====
  const handleRevisionRequest = useCallback(
    async (revisionPrompt: string) => {
      if (!originalInput || !result) return;

      setIsRevising(true);
      setIsRevisionComplete(false);
      setError(null);

      try {
        const response = await reviseTestRoadmap(
          originalInput,
          result.roadmapResult,
          revisionPrompt
        );

        if (response.success) {
          setResult({
            ...result,
            roadmapResult: response.data.result,
            validation: response.data.validation,
          });
          setIsRevisionComplete(true);
          setTimeout(() => {
            setIsRevising(false);
            setIsRevisionComplete(false);
          }, COMPLETION_DELAY_MS);
        } else {
          setError(response.error || '로드맵 수정에 실패했습니다.');
          setIsRevising(false);
        }
      } catch (err) {
        console.error('[TestRoadmap] 수정 요청 중 오류:', err);
        setError(formatErrorMessage(err, '로드맵 수정 중 예기치 않은 오류가 발생했습니다.'));
        setIsRevising(false);
      }
    },
    [originalInput, result, setError]
  );

  // ===== 과정 편집 =====
  const handleEditCourse = useCallback(
    (courseIndex: number) => {
      if (!result) return;
      const course = result.roadmapResult.courses[courseIndex];
      if (course) {
        setEditingCourse({ ...course });
        setEditingCourseIndex(courseIndex);
      }
    },
    [result]
  );

  const handleSaveCourse = useCallback(
    (updatedCourse: RoadmapCell) => {
      if (!result || editingCourseIndex === null) return;

      const validation = validateCourseClient(updatedCourse);
      if (!validation.isValid) {
        setError(validation.errors.join('\n'));
        return;
      }

      const newCourses = [...result.roadmapResult.courses];
      newCourses[editingCourseIndex] = updatedCourse;
      const newMatrix = buildRoadmapMatrixFromCourses(newCourses);

      setResult({
        ...result,
        roadmapResult: {
          ...result.roadmapResult,
          courses: newCourses,
          roadmap_matrix: newMatrix,
        },
      });

      setEditingCourse(null);
      setEditingCourseIndex(null);
      setError(null);
    },
    [result, editingCourseIndex, setError]
  );

  // ===== 초기화 =====
  const handleReset = useCallback(() => {
    setResult(null);
    setOriginalInput(null);
    setError(null);
    setEditingCourse(null);
    setEditingCourseIndex(null);
  }, [setError]);

  // ===== 생성 취소 =====
  const handleCancelGeneration = useCallback(() => {
    setGenerationState(INITIAL_GENERATION_STATE);
  }, []);

  return {
    // State
    generationState,
    result,
    isRevising,
    setIsRevising,
    isRevisionComplete,
    setIsRevisionComplete,
    editingCourse,
    setEditingCourse,
    editingCourseIndex,
    setEditingCourseIndex,
    // Actions
    handleSubmit,
    handleRevisionRequest,
    handleEditCourse,
    handleSaveCourse,
    handleReset,
    handleCancelGeneration,
  };
}
