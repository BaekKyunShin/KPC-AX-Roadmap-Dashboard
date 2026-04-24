import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * PageContainer — 4개 화면 (로드맵·PBL × 인터뷰·결과) 공용 페이지 래퍼.
 *
 * - 최대 폭: `max-w-5xl` (64rem), 수평 중앙 정렬 (`mx-auto`)
 * - 반응형 좌우 패딩: `px-4 sm:px-6 lg:px-8`
 * - 세로 섹션 간격: `space-y-8`
 *
 * 관련 디자인 토큰 (`globals.css` `@theme inline`):
 * `--page-max-w`, `--container-pad-x`, `--section-gap`
 */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8', className)}>
      {children}
    </div>
  );
}
