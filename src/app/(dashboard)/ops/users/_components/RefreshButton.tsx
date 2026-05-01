'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/**
 * "다시 시도" 버튼 — DB 에러 분기에서 사용.
 * window.location.reload() 로 전체 페이지를 다시 로드 (사용자 명시 결정 2026-05-01).
 *
 * Server Component 페이지(ops/users/page.tsx) 가 에러 분기를 잡고 EmptyState 를
 * 반환할 때 action prop 으로 본 컴포넌트를 전달한다.
 */
export function RefreshButton() {
  return (
    <Button onClick={() => window.location.reload()} variant="outline">
      <RefreshCw className="mr-2 h-4 w-4" />
      다시 시도
    </Button>
  );
}
