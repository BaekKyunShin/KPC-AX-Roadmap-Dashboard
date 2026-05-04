'use client';

/**
 * HWPX 다운로드 훅 (Step 7 Task 9).
 *
 * Server Action이 반환한 base64 문자열을 atob → Uint8Array → Blob → a.download로
 * 복원하여 파일을 저장한다. Next.js Server Action은 Buffer/Blob 직접 반환이 불가능하므로
 * 문자열 직렬화가 필수.
 *
 * Step 10에서 PBL DownloadButton이 동일 훅을 재사용한다 (신규 작성 금지).
 */
import { useCallback, useRef, useState } from 'react';

import type { ActionResult } from '@/lib/types/action-result';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';

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
  // useCallback 본문에서 자기 자신을 참조하기 위해 ref 패턴 사용.
  const downloadRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const download = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await action();
      if (!result.success) {
        setError(result.error);
        showErrorToast(errorTitle, result.error, {
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
      showSuccessToast(successMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'HWPX 다운로드 중 오류가 발생했습니다.';
      setError(message);
      showErrorToast(errorTitle, message, {
        label: '다시 시도',
        onClick: () => {
          void downloadRef.current();
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [action, errorTitle, successMessage]);

  // 매 렌더마다 최신 download 를 ref 에 저장 — 자기 참조 시 무한 루프 없음
  downloadRef.current = download;

  return { download, isLoading, error };
}
