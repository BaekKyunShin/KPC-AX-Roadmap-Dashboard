'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showErrorToast } from '@/lib/utils';
import { triggerResultRegenerationFromReview } from '../actions';

/**
 * PR5 (R6 spec) §5.3 — 인터뷰 검토 페이지 / 결과 페이지 상단의 stale 배너.
 *
 * 노출 조건: `interviews.updated_at > result.created_at`.
 * 결과가 없거나 최신이면 노출되지 않는다.
 *
 * [재생성] 클릭 → `triggerResultRegenerationFromReview` 감사로그 + 결과 페이지로 navigate.
 * 실제 LLM 트리거는 결과 페이지가 담당.
 */
export interface StaleResultBannerProps {
  projectId: string;
  track: 'ROADMAP' | 'PBL';
  interviewUpdatedAt: string | null;
  resultCreatedAt: string | null;
}

export function StaleResultBanner({
  projectId,
  track,
  interviewUpdatedAt,
  resultCreatedAt,
}: StaleResultBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (dismissed) return null;
  if (!interviewUpdatedAt || !resultCreatedAt) return null;
  if (new Date(interviewUpdatedAt) <= new Date(resultCreatedAt)) return null;

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  function handleRegenerate() {
    startTransition(async () => {
      const result = await triggerResultRegenerationFromReview(projectId, track);
      if (!result.success) {
        showErrorToast('재생성 트리거 실패', result.error ?? '잠시 후 다시 시도해주세요.');
        return;
      }
      // #5 H2·H4·H7 — ?regenerate=open 쿼리로 결과 페이지가 진입 시 RegenerateAccordion 자동 펼침 + textarea 포커스.
      const targetPath =
        result.data?.resultPath ??
        `/consultant/projects/${projectId}/${track === 'PBL' ? 'pbl' : 'roadmap'}`;
      router.push(`${targetPath}?regenerate=open`);
    });
  }

  return (
    <div
      className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      data-testid="stale-result-banner"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4" aria-hidden />
          <div>
            <p className="font-semibold">
              인터뷰가 {track === 'PBL' ? 'PBL 결과' : '로드맵'} 생성 이후 변경되었습니다.
            </p>
            <p className="mt-0.5 text-xs">
              인터뷰 최종 수정: {formatDate(interviewUpdatedAt)} · 마지막 결과:{' '}
              {formatDate(resultCreatedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={handleRegenerate}
            disabled={isPending}
            data-testid="stale-result-banner-regenerate"
          >
            {isPending ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Plus className="mr-1 size-4" />
            )}
            새 버전 생성
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            data-testid="stale-result-banner-dismiss"
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
