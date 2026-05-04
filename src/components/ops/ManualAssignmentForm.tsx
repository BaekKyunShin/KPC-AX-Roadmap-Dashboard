'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignConsultant } from '@/app/(dashboard)/ops/projects/actions';
import { cn } from '@/lib/utils';
import { showSuccessToast } from '@/lib/utils/toast';
import type { ConsultantCandidate } from '@/app/(dashboard)/ops/projects/actions';
import ConsultantSelector from './ConsultantSelector';
import { AlertMessage, REASON_LENGTH, ASSIGN_BUTTON_STYLE } from './assignment';
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
import type { ConsultantInfo } from './assignment/utils';

// ============================================================================
// 타입 정의
// ============================================================================

interface ManualAssignmentFormProps {
  projectId: string;
  /**
   * 현재 배정된 컨설턴트 — 재배정 시 비가역성을 사용자에게 사전 안내한다.
   * null·undefined 면 신규 배정으로 간주.
   */
  currentAssignment?: ConsultantInfo | null;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ManualAssignmentForm({
  projectId,
  currentAssignment = null,
}: ManualAssignmentFormProps) {
  const router = useRouter();
  const [selectedConsultant, setSelectedConsultant] = useState<ConsultantCandidate | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const isReassignment = !!currentAssignment;

  // 폼 검증 후 다이얼로그 노출 — 실제 서버 호출은 confirmAssign() 에서 수행.
  const requestAssign = () => {
    setError(null);

    if (!selectedConsultant) {
      setError('배정할 컨설턴트를 선택하세요.');
      return;
    }

    if (reason.length < REASON_LENGTH.MIN) {
      setError(`배정 사유를 ${REASON_LENGTH.MIN}자 이상 입력하세요.`);
      return;
    }

    setIsConfirmOpen(true);
  };

  const confirmAssign = async () => {
    if (!selectedConsultant) return;
    setIsConfirmOpen(false);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('project_id', projectId);
      formData.set('consultant_id', selectedConsultant.id);
      formData.set('assignment_reason', reason);

      const result = await assignConsultant(formData);

      if (result.success) {
        // window.location.reload() 대신 부드러운 갱신 — 사이드바·헤더가 깜빡이지 않는다.
        if (isReassignment && currentAssignment) {
          showSuccessToast(
            '재배정 완료',
            `${selectedConsultant.name}으로 재배정되었습니다 (이전: ${currentAssignment.name})`,
          );
        } else {
          showSuccessToast('배정 완료', `${selectedConsultant.name}컨설턴트가 배정되었습니다`);
        }
        router.refresh();
      } else {
        setError(result.error || '배정에 실패했습니다.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('컨설턴트 배정 오류:', err);
      setError('배정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setIsSubmitting(false);
    }
  };

  // 컨설턴트 선택
  const handleSelectConsultant = (consultant: ConsultantCandidate | null) => {
    setSelectedConsultant(consultant);
    setError(null);
  };

  const isValid = selectedConsultant && reason.length >= REASON_LENGTH.MIN;

  return (
    <div>
      {/* 에러 메시지 */}
      {error && <AlertMessage message={error} onDismiss={() => setError(null)} variant="error" />}

      {/* 재배정 안내 띠 — 현재 배정자가 있을 때만 노출 */}
      {currentAssignment && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3">
          <p className="text-sm text-amber-800">
            현재 배정: <span className="font-semibold">{currentAssignment.name}</span> — 다른 컨설턴트를 선택하면 재배정됩니다.
          </p>
        </div>
      )}

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
              onClick={requestAssign}
              disabled={isSubmitting || !isValid}
              className={ASSIGN_BUTTON_STYLE}
            >
              {isSubmitting ? '배정 중...' : '배정하기'}
            </button>
          </div>
        </div>
      )}

      {/* 비가역 액션 사전 차단 — 재배정 시 destructive variant 로 강조 */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isReassignment && currentAssignment
                ? `${currentAssignment.name} → ${selectedConsultant?.name}로 변경하시겠습니까?`
                : `${selectedConsultant?.name}컨설턴트를 이 프로젝트에 배정하시겠습니까?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isReassignment && currentAssignment
                ? `기존 배정은 이력으로 남으며 ${currentAssignment.name}컨설턴트의 접근 권한은 즉시 해제됩니다.`
                : '확인을 누르면 이 컨설턴트가 즉시 프로젝트에 배정됩니다.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant={isReassignment ? 'destructive' : 'default'}
              onClick={confirmAssign}
            >
              배정 확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
