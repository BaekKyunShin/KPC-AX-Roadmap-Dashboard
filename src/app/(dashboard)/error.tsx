'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * (dashboard) 라우트 그룹의 segment-level Error Boundary.
 *
 * Next.js App Router 가 자동으로 적용 — children 에서 throw 된 예외를 잡아
 * 이 컴포넌트로 폴백한다. 사이드바·헤더 등 layout 은 그대로 유지된다.
 *
 * 사용자 가시 워딩: main agent 옵션 C 승인 (2026-05-01)
 * - 사용자에게는 항상 generic 한글 안내 + 다시 시도 버튼
 * - dev 환경에서만 error.message · stack 을 펼침 가능한 <details> 로 노출
 * - error.digest (Next.js 가 부여하는 server-side 추적 ID) 가 있을 때만 작게 노출
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 운영팀 모니터링용 — 추후 외부 로깅 SaaS 연동 가능 (Sentry 등)
    console.error('[Dashboard Error]', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-24 text-center">
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
