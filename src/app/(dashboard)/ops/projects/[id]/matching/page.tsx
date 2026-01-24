'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function MatchingPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topN, setTopN] = useState(3);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/matching/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId, topN }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/ops/projects/${caseId}`);
        router.refresh();
      } else {
        setError(result.error || '매칭 추천 생성에 실패했습니다.');
      }
    } catch {
      setError('서버 오류가 발생했습니다.');
    }

    setIsLoading(false);
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="mb-6">
        <Link
          href={`/ops/projects/${caseId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 프로젝트로 돌아가기
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">매칭 추천 생성</h1>

        <p className="text-sm text-gray-600 mb-6">
          기업 정보와 자가진단 결과를 바탕으로 적합한 컨설턴트 후보를 추천합니다.
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="topN" className="block text-sm font-medium text-gray-700 mb-2">
            추천 후보 수
          </label>
          <select
            id="topN"
            value={topN}
            onChange={(e) => setTopN(parseInt(e.target.value, 10))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          >
            <option value={3}>Top 3</option>
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full px-4 py-2 border border-transparent rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
        >
          {isLoading ? '추천 생성 중...' : '매칭 추천 생성'}
        </button>
      </div>
    </div>
  );
}
