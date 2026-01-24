'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignConsultant } from '@/app/(dashboard)/ops/projects/actions';

interface Recommendation {
  id: string;
  candidate_user_id: string;
  total_score: number;
  rank: number;
  candidate: {
    id: string;
    name: string;
    email: string;
  };
}

interface AssignmentFormProps {
  caseId: string;
  recommendations: Recommendation[];
}

export default function AssignmentForm({ caseId, recommendations }: AssignmentFormProps) {
  const router = useRouter();
  const [selectedConsultant, setSelectedConsultant] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedConsultant) {
      setError('배정할 컨설턴트를 선택하세요.');
      return;
    }

    if (reason.length < 10) {
      setError('배정 사유를 10자 이상 입력하세요.');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.set('project_id', caseId);
    formData.set('consultant_id', selectedConsultant);
    formData.set('assignment_reason', reason);

    const result = await assignConsultant(formData);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || '배정에 실패했습니다.');
    }

    setIsLoading(false);
  }

  const selectedRec = recommendations.find((r) => r.candidate_user_id === selectedConsultant);

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          배정할 컨설턴트 선택 *
        </label>
        <div className="space-y-2">
          {recommendations.map((rec) => (
            <label
              key={rec.candidate_user_id}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedConsultant === rec.candidate_user_id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="consultant"
                value={rec.candidate_user_id}
                checked={selectedConsultant === rec.candidate_user_id}
                onChange={(e) => setSelectedConsultant(e.target.value)}
                className="h-4 w-4 text-blue-600 border-gray-300"
              />
              <span className="ml-3 flex-1">
                <span className="font-medium text-gray-900">{rec.candidate.name}</span>
                <span className="ml-2 text-sm text-gray-500">({rec.candidate.email})</span>
              </span>
              <span className="text-sm font-medium text-purple-600">
                {Math.round(rec.total_score * 100)}점
              </span>
              {rec.rank === 1 && (
                <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                  추천
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="assignment_reason" className="block text-sm font-medium text-gray-700 mb-2">
          배정 사유 *
        </label>
        <textarea
          id="assignment_reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="배정 사유를 10자 이상 입력하세요. (예: 해당 업종 경험이 풍부하고 일정 조율이 가능함)"
        />
        <p className="mt-1 text-xs text-gray-500">{reason.length}/500자</p>
      </div>

      {selectedRec && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <p className="font-medium text-gray-700">선택한 컨설턴트:</p>
          <p className="text-gray-900 mt-1">
            {selectedRec.candidate.name} (매칭 점수: {Math.round(selectedRec.total_score * 100)}점)
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || !selectedConsultant}
          className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '배정 중...' : '컨설턴트 배정'}
        </button>
      </div>
    </form>
  );
}
