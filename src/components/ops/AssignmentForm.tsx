'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignConsultant } from '@/app/(dashboard)/ops/projects/actions';
import { showSuccessToast } from '@/lib/utils/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ReasonLengthHint, REASON_LENGTH } from './assignment';

// ============================================================================
// 타입 정의
// ============================================================================

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
  projectId: string;
  recommendations: Recommendation[];
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AssignmentForm({ projectId, recommendations }: AssignmentFormProps) {
  const router = useRouter();
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const selectedRecommendation = recommendations.find((r) => r.candidate_user_id === selectedConsultantId);

  // 폼 제출 — 유효성 검사 후 AlertDialog 노출.
  function requestAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedConsultantId) {
      setError('배정할 컨설턴트를 선택하세요.');
      return;
    }

    if (reason.length < REASON_LENGTH.MIN) {
      setError(`배정 사유를 ${REASON_LENGTH.MIN}자 이상 입력하세요.`);
      return;
    }

    setIsConfirmOpen(true);
  }

  // AlertDialog "배정 확인" 클릭 — 실제 Server Action 호출 + router.refresh + 토스트.
  // ManualAssignmentForm 의 검증된 패턴(PR #58) 그대로 차용.
  async function confirmAssign() {
    setIsConfirmOpen(false);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.set('project_id', projectId);
      formData.set('consultant_id', selectedConsultantId);
      formData.set('assignment_reason', reason);

      const result = await assignConsultant(formData);

      if (result.success) {
        // window.location.reload() 대신 부드러운 갱신 — 사이드바·헤더가 깜빡이지 않는다.
        showSuccessToast(
          '배정 완료',
          `${selectedRecommendation?.candidate.name ?? ''}컨설턴트가 배정되었습니다`,
        );
        router.refresh();
      } else {
        setError(result.error || '배정에 실패했습니다.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('컨설턴트 배정 오류:', err);
      setError('배정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setIsLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={requestAssign}>
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* 컨설턴트 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">배정할 컨설턴트 선택 *</label>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <RecommendationItem
                key={rec.candidate_user_id}
                recommendation={rec}
                isSelected={selectedConsultantId === rec.candidate_user_id}
                onSelect={setSelectedConsultantId}
              />
            ))}
          </div>
        </div>

        {/* 배정 사유 */}
        <div className="mb-4">
          <label htmlFor="assignment_reason" className="block text-sm font-medium text-gray-700 mb-2">
            배정 사유 *
          </label>
          <textarea
            id="assignment_reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={REASON_LENGTH.MAX}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 break-keep"
            placeholder={`배정 사유를 ${REASON_LENGTH.MIN}자 이상 입력하세요. (예: 해당 업종 경험이 풍부하고 일정 조율이 가능함)`}
          />
          <ReasonLengthHint currentLength={reason.length} />
        </div>

        {/* 선택한 컨설턴트 요약 */}
        {selectedRecommendation && (
          <SelectedRecommendationSummary recommendation={selectedRecommendation} />
        )}

        {/* 제출 버튼 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !selectedConsultantId || reason.length < REASON_LENGTH.MIN}
            className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '배정 중...' : '컨설턴트 배정'}
          </button>
        </div>
      </form>

      {/* 비가역 액션 사전 차단 — ManualAssignmentForm 패턴(PR #58) 차용 */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedRecommendation?.candidate.name ?? ''}컨설턴트를 이 프로젝트에 배정하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              확인을 누르면 이 컨설턴트가 즉시 프로젝트에 배정됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAssign}>배정 확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// 하위 컴포넌트
// ============================================================================

interface RecommendationItemProps {
  recommendation: Recommendation;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function RecommendationItem({ recommendation, isSelected, onSelect }: RecommendationItemProps) {
  const scorePercent = Math.round(recommendation.total_score * 100);

  return (
    <label
      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <input
        type="radio"
        name="consultant"
        value={recommendation.candidate_user_id}
        checked={isSelected}
        onChange={(e) => onSelect(e.target.value)}
        className="h-4 w-4 text-blue-600 border-gray-300"
      />
      <span className="ml-3 flex-1">
        <span className="font-medium text-gray-900">{recommendation.candidate.name}</span>
        <span className="ml-2 text-sm text-gray-500">({recommendation.candidate.email})</span>
      </span>
      <span className="text-sm font-medium text-purple-600">{scorePercent}점</span>
      {recommendation.rank === 1 && (
        <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">추천</span>
      )}
    </label>
  );
}

interface SelectedRecommendationSummaryProps {
  recommendation: Recommendation;
}

function SelectedRecommendationSummary({ recommendation }: SelectedRecommendationSummaryProps) {
  const scorePercent = Math.round(recommendation.total_score * 100);

  return (
    <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
      <p className="font-medium text-gray-700">선택한 컨설턴트:</p>
      <p className="text-gray-900 mt-1">
        {recommendation.candidate.name} (매칭 점수: {scorePercent}점)
      </p>
    </div>
  );
}
