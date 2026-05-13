'use client';

/**
 * HWPX 다운로드 훅.
 *
 * Server Action 이 반환한 base64 문자열을 atob → Uint8Array → Blob → a.download 로
 * 복원하여 파일을 저장한다. Next.js Server Action 은 Buffer/Blob 직접 반환이 불가능하므로
 * 문자열 직렬화가 필수.
 *
 * HWPX 다운로드는 Vercel Python Function (`/api/hwpx/generate`) 호출로 수~수십 초가 걸리므로
 * `showProgressToast` 로 단계 라벨·점 애니메이션·취소 버튼을 제공한다.
 * 외부 시그니처(`download / isLoading / error`)는 PDF/XLSX 훅과 일관성을 위해 유지.
 *
 * 알려진 한계: 취소 버튼은 UI 측 결과 무시만 수행한다. Vercel Python Function 호출은 백엔드에서
 * 계속 진행되며, 본 프로젝트의 다운로드는 멱등하고 부수효과가 없으므로 안전하다.
 */
import { useCallback, useRef, useState } from 'react';

import type { ActionResult } from '@/lib/types/action-result';
import { type ProgressStage, showProgressToast } from '@/lib/utils/toast';

export interface HwpxDownloadPayload {
  fileName: string;
  contentBase64: string;
  mimeType: string;
}

export interface UseHwpxDownloadOptions {
  action: () => Promise<ActionResult<HwpxDownloadPayload>>;
  successMessage?: string;
  errorTitle?: string;
}

export interface UseHwpxDownloadResult {
  download: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const PROGRESS_TITLE = 'HWPX 문서를 만들고 있어요';
const PROGRESS_STAGES: ProgressStage[] = [
  { label: '정보 취합 중', durationMs: 20_000 },
  { label: '문서 작성 중', durationMs: 20_000 },
  { label: 'HWPX 생성 중' }, // 마지막 stage — 완료/실패/취소까지 유지
];

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function useHwpxDownload({
  action,
  successMessage = 'HWPX 다운로드 완료',
  errorTitle = 'HWPX 다운로드 실패',
}: UseHwpxDownloadOptions): UseHwpxDownloadResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 실패 토스트의 "다시 시도" 액션이 동일 download 함수를 재호출할 수 있도록 self-ref 유지.
  const downloadRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const download = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let cancelled = false;
    const progress = showProgressToast({
      title: PROGRESS_TITLE,
      stages: PROGRESS_STAGES,
      onCancel: () => {
        cancelled = true;
        progress.dismiss();
      },
    });

    try {
      const result = await action();
      if (cancelled) return;

      if (!result.success) {
        setError(result.error);
        progress.error(errorTitle, result.error, {
          label: '다시 시도',
          onClick: () => {
            void downloadRef.current();
          },
        });
        return;
      }

      const { fileName, contentBase64, mimeType } = result.data;
      const blob = base64ToBlob(contentBase64, mimeType);
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(url);
      }
      progress.success(successMessage);
    } catch (err) {
      if (cancelled) return;
      const message = err instanceof Error ? err.message : 'HWPX 다운로드 중 오류가 발생했습니다.';
      setError(message);
      progress.error(errorTitle, message, {
        label: '다시 시도',
        onClick: () => {
          void downloadRef.current();
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [action, errorTitle, successMessage]);

  // 매 렌더마다 최신 download 를 ref 에 저장 — 자기 참조 시 무한 루프 없음.
  downloadRef.current = download;

  return { download, isLoading, error };
}
