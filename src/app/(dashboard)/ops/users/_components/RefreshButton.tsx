'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/**
 * "다시 시도" 버튼 — DB 에러 분기에서 사용.
 * router.refresh() 로 Server Component 만 재요청 (풀 페이지 리로드 방지).
 * 클라이언트 상태(스크롤·폼 입력·필터)가 유지된다.
 *
 * Server Component 페이지(ops/users/page.tsx) 가 에러 분기를 잡고 EmptyState 를
 * 반환할 때 action prop 으로 본 컴포넌트를 전달한다.
 */
export function RefreshButton() {
  const router = useRouter();
  return (
    <Button onClick={() => router.refresh()} variant="outline">
      <RefreshCw className="mr-2 h-4 w-4" />
      다시 시도
    </Button>
  );
}
