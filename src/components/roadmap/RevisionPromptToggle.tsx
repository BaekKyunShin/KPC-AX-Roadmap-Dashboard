'use client';

import { useState } from 'react';

interface RevisionPromptToggleProps {
  prompt: string;
}

/**
 * 수정 요청 사항 토글 컴포넌트
 * - 로드맵 생성 시 입력된 수정 요청 내용을 접기/펼치기로 표시
 */
export function RevisionPromptToggle({ prompt }: RevisionPromptToggleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-4 border border-yellow-200 bg-yellow-50 rounded-lg">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-yellow-800">수정 요청 사항</span>
        <svg
          className={`h-4 w-4 text-yellow-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-4 pb-3">
          <p className="text-sm text-yellow-700">{prompt}</p>
        </div>
      )}
    </div>
  );
}
