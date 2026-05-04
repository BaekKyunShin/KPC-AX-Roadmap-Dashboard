'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * App Router 의 root Error Boundary — 사이드바·헤더가 적용되지 않는 최후의 방어선.
 *
 * (dashboard)/error.tsx 또는 (auth)/error.tsx 가 잡지 못한 예외만 여기로 폴백한다.
 * 풀스크린 안내로 사용자가 흰 화면을 마주치는 상황을 차단한다.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Root Error]', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <AlertTriangle className="h-12 w-12 text-amber-500" aria-hidden />
      <h2 className="text-xl font-semibold text-gray-900">
        일시적인 오류가 발생했습니다
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        잠시 후 다시 시도해주세요. 계속되면 운영팀에 문의해주세요.
      </p>

      <Button onClick={reset} className="mt-4">
        다시 시도
      </Button>

      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground">
          오류 코드: <code className="font-mono">{error.digest}</code>
        </p>
      )}

      {isDev && (
        <details className="mt-6 max-w-2xl rounded-md border bg-gray-50 p-4 text-left">
          <summary className="cursor-pointer text-xs font-medium text-gray-600">
            개발 환경 — 상세 오류 정보
          </summary>
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-700">
              {error.name}: {error.message}
            </p>
            {error.stack && (
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] text-gray-600">
                {error.stack}
              </pre>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
