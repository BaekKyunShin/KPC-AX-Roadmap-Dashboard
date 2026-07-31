'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { assignConsultant } from '../../../actions';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { showErrorToast } from '@/lib/utils/toast';
import { AlertMessage, REASON_LENGTH, ASSIGN_BUTTON_STYLE } from './index';
import SelectableCard from './SelectableCard';
import type { ValidRecommendation } from './utils';

interface RecommendationResultsProps {
  recommendations: ValidRecommendation[];
  projectId: string;
  isGenerating: boolean;
  generateError: string | null;
  onDismissError: () => void;
  onRecalculate: () => void;
  hasAssignedConsultant: boolean;
}

export default function RecommendationResults({
  recommendations,
  projectId,
  isGenerating,
  generateError,
  onDismissError,
  onRecalculate,
  hasAssignedConsultant,
}: RecommendationResultsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recalculateConfirmOpen, setRecalculateConfirmOpen] = useState(false);
  const router = useRouter();

  const handleAssign = async () => {
    if (!selectedId || reason.length < REASON_LENGTH.MIN) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('project_id', projectId);
      formData.append('consultant_id', selectedId);
      formData.append('assignment_reason', reason);

      const result = await assignConsultant(formData);

      if (result.success) {
        router.refresh();
      } else {
        showErrorToast('배정 실패', result.error || '배정 요청이 거부되었습니다.');
        setIsSubmitting(false);
      }
    } catch {
      showErrorToast('배정 실패', '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setIsSubmitting(false);
    }
  };

  const handleRecalculateClick = () => {
    if (hasAssignedConsultant) {
      setRecalculateConfirmOpen(true);
    } else {
      onRecalculate();
    }
  };

  return (
    <div>
      {generateError && <AlertMessage message={generateError} onDismiss={onDismissError} />}

      {/* 3열 그리드 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {recommendations.map((rec) => (
          <SelectableCard
            key={rec.id}
            recommendation={rec}
            isSelected={selectedId === rec.candidate_user_id}
            onSelect={() => setSelectedId(rec.candidate_user_id)}
          />
        ))}
      </div>

      {/* 배정 사유 입력 (선택 시 표시) */}
      {selectedId && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            배정 사유{' '}
            <span className="text-gray-400 font-normal">({REASON_LENGTH.MIN}자 이상)</span>
          </label>
          <div className="relative">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="해당 컨설턴트를 배정하는 사유를 입력해주세요."
              maxLength={REASON_LENGTH.MAX}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              rows={2}
            />
            <div className="absolute right-2 bottom-2">
              <span
                className={cn(
                  'text-xs',
                  reason.length >= REASON_LENGTH.MIN ? 'text-gray-400' : 'text-orange-500'
                )}
              >
                {reason.length}/{REASON_LENGTH.MAX}
                {reason.length < REASON_LENGTH.MIN &&
                  ` (${REASON_LENGTH.MIN - reason.length}자 더)`}
              </span>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={handleAssign}
              disabled={isSubmitting || reason.length < REASON_LENGTH.MIN}
              className={ASSIGN_BUTTON_STYLE}
            >
              {isSubmitting ? '배정 중...' : '배정하기'}
            </button>
          </div>
        </div>
      )}

      {/* 재계산 버튼 */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <button
          onClick={handleRecalculateClick}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isGenerating && 'animate-spin')} />
          매칭 재계산
        </button>
        {hasAssignedConsultant && (
          <span className="text-xs text-gray-400">현재 배정은 변경되지 않습니다</span>
        )}
      </div>

      <ConfirmDialog
        open={recalculateConfirmOpen}
        onOpenChange={setRecalculateConfirmOpen}
        title="매칭 추천을 재계산하시겠습니까?"
        description={
          <>
            이미 컨설턴트가 배정된 프로젝트입니다.
            <br />
            매칭 추천만 다시 계산되며, 현재 배정은 그대로 유지됩니다.
          </>
        }
        actionLabel="재계산"
        variant="default"
        loading={isGenerating}
        onConfirm={() => {
          setRecalculateConfirmOpen(false);
          onRecalculate();
        }}
      />
    </div>
  );
}
