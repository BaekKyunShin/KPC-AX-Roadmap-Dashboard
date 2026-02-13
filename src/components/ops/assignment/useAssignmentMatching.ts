'use client';

import { useState, useCallback, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_TOP_N } from './constants';
import { ERROR_MESSAGES } from './utils';
import type { ValidRecommendation } from './utils';

interface UseAssignmentMatchingOptions {
  projectId: string;
  validRecommendations: ValidRecommendation[];
  hasAssignedConsultant: boolean;
}

export default function useAssignmentMatching({
  projectId,
  validRecommendations,
  hasAssignedConsultant,
}: UseAssignmentMatchingOptions) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // 카드 상단으로 스크롤하기 위한 ref
  const cardRef = useRef<HTMLDivElement>(null);
  // API 호출 성공 여부를 추적하여 recommendations 변화 시 로딩 해제
  const isWaitingForDataRef = useRef(false);
  // 이전 recommendations의 첫 번째 ID를 저장 (재계산 시 변화 감지용)
  const prevRecommendationIdRef = useRef<string | null>(null);
  // API 호출 취소를 위한 AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  const hasRecommendations = validRecommendations.length > 0;
  const currentFirstId = validRecommendations[0]?.id ?? null;

  // recommendations가 업데이트되면 로딩 상태 해제
  useEffect(() => {
    if (isWaitingForDataRef.current) {
      // 첫 생성: recommendations가 생김
      // 재계산: 첫 번째 ID가 변경됨
      const isNewData = hasRecommendations && currentFirstId !== prevRecommendationIdRef.current;

      if (isNewData) {
        isWaitingForDataRef.current = false;
        prevRecommendationIdRef.current = currentFirstId;
        // startTransition으로 감싸서 캐스케이딩 렌더링 방지
        startTransition(() => {
          setIsGenerating(false);
        });
      }
    } else {
      // 대기 상태가 아닐 때는 현재 ID만 업데이트
      prevRecommendationIdRef.current = currentFirstId;
    }
  }, [hasRecommendations, currentFirstId]);

  // API 호출 (타임아웃 없음, AbortController로 취소 가능)
  const callMatchingAPI = useCallback(
    async (preserveStatus: boolean): Promise<{ success: boolean; error?: string; cancelled?: boolean }> => {
      // 새 AbortController 생성
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/matching/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, topN: DEFAULT_TOP_N, preserveStatus }),
          signal: abortControllerRef.current.signal,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          return { success: false, error: result.error || ERROR_MESSAGES.MATCHING_FAILED };
        }

        return { success: true };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { success: false, cancelled: true };
        }

        return { success: false, error: ERROR_MESSAGES.NETWORK };
      } finally {
        abortControllerRef.current = null;
      }
    },
    [projectId]
  );

  // 카드 상단으로 스크롤
  const scrollToCard = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // 매칭 실행 공통 로직
  const executeMatching = useCallback(
    async (preserveStatus: boolean) => {
      setIsGenerating(true);
      setGenerateError(null);

      // 로딩 시작 시 카드 상단으로 스크롤
      scrollToCard();

      const result = await callMatchingAPI(preserveStatus);

      if (result.success) {
        // 데이터 새로고침 대기 상태로 설정
        isWaitingForDataRef.current = true;
        router.refresh();
        // recommendations가 업데이트될 때 useEffect에서 isGenerating을 false로 설정
      } else if (result.cancelled) {
        // 사용자가 취소한 경우 - 에러 메시지 없이 종료
        setIsGenerating(false);
      } else {
        setGenerateError(result.error || ERROR_MESSAGES.DEFAULT);
        setIsGenerating(false);
      }
    },
    [callMatchingAPI, router, scrollToCard]
  );

  // 매칭 취소
  const handleCancelMatching = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      isWaitingForDataRef.current = false;
    }
  }, []);

  // 매칭 추천 생성
  const handleGenerateMatching = useCallback(() => {
    executeMatching(!!hasAssignedConsultant);
  }, [executeMatching, hasAssignedConsultant]);

  // 매칭 재계산
  const handleRecalculate = useCallback(() => {
    if (
      hasAssignedConsultant &&
      !confirm(
        '이미 컨설턴트가 배정되어 있습니다.\n매칭 추천만 재계산되며, 현재 배정은 변경되지 않습니다.\n계속하시겠습니까?'
      )
    ) {
      return;
    }

    executeMatching(true);
  }, [executeMatching, hasAssignedConsultant]);

  const handleDismissError = useCallback(() => setGenerateError(null), []);

  return {
    cardRef,
    isGenerating,
    generateError,
    handleGenerateMatching,
    handleRecalculate,
    handleCancelMatching,
    handleDismissError,
  };
}
