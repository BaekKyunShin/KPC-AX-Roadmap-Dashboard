'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RecalculateMatchingButtonProps {
  projectId: string;
  hasAssignment: boolean;
}

export default function RecalculateMatchingButton({
  projectId,
  hasAssignment,
}: RecalculateMatchingButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRecalculate() {
    if (
      hasAssignment &&
      !confirm(
        '이미 컨설턴트가 배정되어 있습니다.\n매칭 추천만 재계산되며, 현재 배정은 변경되지 않습니다.\n계속하시겠습니까?'
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/matching/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          topN: 3,
          preserveStatus: true, // 기존 상태 유지
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '매칭 재계산에 실패했습니다.');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>
      )}
      <button
        onClick={handleRecalculate}
        disabled={isLoading}
        className="inline-flex items-center px-3 py-1.5 text-sm border border-purple-300 text-purple-700 rounded hover:bg-purple-50 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-700"
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
            재계산 중...
          </>
        ) : (
          <>
            <svg
              className="-ml-0.5 mr-1.5 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            매칭 재계산
          </>
        )}
      </button>
      {hasAssignment && (
        <p className="mt-2 text-xs text-gray-500">
          * 자가진단 수정 시 매칭 추천을 재계산할 수 있습니다. 현재 배정은 변경되지 않습니다.
        </p>
      )}
    </div>
  );
}
