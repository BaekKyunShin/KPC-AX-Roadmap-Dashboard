'use client';

import { useState, useCallback } from 'react';
import { assignConsultant } from '@/app/(dashboard)/ops/projects/actions';
import ConsultantSelector from './ConsultantSelector';
import { AlertMessage, CloseIcon, ReasonLengthHint, REASON_LENGTH } from './assignment';
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
  const [isLoading, setIsLoading] = useState(false);

  // 폼 제출
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
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

      setIsLoading(true);

      try {
        const formData = new FormData();
        formData.set('project_id', projectId);
        formData.set('consultant_id', selectedConsultant.id);
        formData.set('assignment_reason', reason);

        const result = await assignConsultant(formData);

        if (result.success) {
          // 성공 시 페이지 새로고침으로 업데이트된 데이터 표시
          window.location.reload();
        } else {
          setError(result.error || '배정에 실패했습니다.');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('컨설턴트 배정 오류:', err);
        setError('배정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        setIsLoading(false);
      }
    },
    [selectedConsultant, reason, projectId]
  );

  // 컨설턴트 선택
  const handleSelectConsultant = useCallback((consultant: ConsultantCandidate | null) => {
    setSelectedConsultant(consultant);
    setError(null);
  }, []);

  // 선택 해제
  const handleClearSelection = useCallback(() => {
    setSelectedConsultant(null);
  }, []);

  return (
    <form onSubmit={handleSubmit}>
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

      {/* 선택된 컨설턴트 요약 */}
      {selectedConsultant && (
        <SelectedConsultantSummary consultant={selectedConsultant} onClear={handleClearSelection} />
      )}

      {/* 배정 사유 */}
      <div className="mb-4">
        <label htmlFor="manual_assignment_reason" className="block text-sm font-medium text-gray-700 mb-2">
          배정 사유 *
        </label>
        <textarea
          id="manual_assignment_reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={REASON_LENGTH.MAX}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder={`배정 사유를 ${REASON_LENGTH.MIN}자 이상 입력하세요. (예: 해당 업종 전문가로 기업 요청에 의한 수동 배정)`}
        />
        <ReasonLengthHint currentLength={reason.length} />
      </div>

      {/* 제출 버튼 */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || !selectedConsultant || reason.length < REASON_LENGTH.MIN}
          className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '배정 중...' : '컨설턴트 배정'}
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// 하위 컴포넌트
// ============================================================================

interface SelectedConsultantSummaryProps {
  consultant: ConsultantCandidate;
  onClear: () => void;
}

function SelectedConsultantSummary({ consultant, onClear }: SelectedConsultantSummaryProps) {
  const profile = consultant.consultant_profile;

  return (
    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-blue-900">선택된 컨설턴트: {consultant.name}</p>
          <p className="text-sm text-blue-700">{consultant.email}</p>
          {profile && (
            <div className="mt-2 text-sm text-blue-600">
              {profile.available_industries.length > 0 && (
                <p>업종: {profile.available_industries.join(', ')}</p>
              )}
              {profile.years_of_experience > 0 && <p>경력: {profile.years_of_experience}년</p>}
            </div>
          )}
        </div>
        <button type="button" onClick={onClear} className="text-blue-600 hover:text-blue-800">
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
