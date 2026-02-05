'use client';

import { useState, useCallback } from 'react';
import { assignConsultant } from '@/app/(dashboard)/ops/projects/actions';
import ConsultantSelector from './ConsultantSelector';
import { AlertMessage, REASON_LENGTH, ASSIGN_BUTTON_STYLE } from './assignment';
import { cn } from '@/lib/utils';
import type { ConsultantCandidate } from '@/app/(dashboard)/ops/projects/actions';

// ============================================================================
// 타입 정의
// ============================================================================

interface ManualAssignmentFormProps {
  projectId: string;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ManualAssignmentForm({ projectId }: ManualAssignmentFormProps) {
  const [selectedConsultant, setSelectedConsultant] = useState<ConsultantCandidate | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 제출
  const handleSubmit = useCallback(async () => {
    setError(null);

    // 유효성 검사
    if (!selectedConsultant) {
      setError('배정할 컨설턴트를 선택하세요.');
      return;
    }

    if (reason.length < REASON_LENGTH.MIN) {
      setError(`배정 사유를 ${REASON_LENGTH.MIN}자 이상 입력하세요.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('project_id', projectId);
      formData.set('consultant_id', selectedConsultant.id);
      formData.set('assignment_reason', reason);

      const result = await assignConsultant(formData);

      if (result.success) {
        window.location.reload();
      } else {
        setError(result.error || '배정에 실패했습니다.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('컨설턴트 배정 오류:', err);
      setError('배정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setIsSubmitting(false);
    }
  }, [selectedConsultant, reason, projectId]);

  // 컨설턴트 선택
  const handleSelectConsultant = useCallback((consultant: ConsultantCandidate | null) => {
    setSelectedConsultant(consultant);
    setError(null);
  }, []);

  const isValid = selectedConsultant && reason.length >= REASON_LENGTH.MIN;

  return (
    <div>
      {/* 에러 메시지 */}
      {error && <AlertMessage message={error} onDismiss={() => setError(null)} variant="error" />}

      {/* 컨설턴트 선택 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">배정할 컨설턴트 선택 *</label>
        <ConsultantSelector
          selectedConsultantId={selectedConsultant?.id || null}
          onSelect={handleSelectConsultant}
        />
      </div>

      {/* 배정 사유 입력 (선택 시 표시) */}
      {selectedConsultant && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            배정 사유 <span className="text-gray-400 font-normal">({REASON_LENGTH.MIN}자 이상)</span>
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
                {reason.length < REASON_LENGTH.MIN && ` (${REASON_LENGTH.MIN - reason.length}자 더)`}
              </span>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isValid}
              className={ASSIGN_BUTTON_STYLE}
            >
              {isSubmitting ? '배정 중...' : '배정하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
