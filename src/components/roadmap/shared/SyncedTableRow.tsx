'use client';

import { useRef, type ReactNode } from 'react';
import { useRowHeightSync } from '@/hooks/useRowHeightSync';
import { cn } from '@/lib/utils';

export interface SyncedTableRowProps {
  /** 행 내부 값이 변경될 때마다 높이 재동기화를 트리거. */
  deps: ReadonlyArray<unknown>;
  className?: string;
  children: ReactNode;
}

/**
 * 로드맵 표 공용 "행 높이 동기화 tr".
 * useRowHeightSync를 내장해 행 내 모든 textarea 높이를 가장 긴 것에 맞춘다.
 */
export function SyncedTableRow({ deps, className, children }: SyncedTableRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  useRowHeightSync(rowRef, deps);

  return (
    <tr ref={rowRef} className={cn('align-top', className)}>
      {children}
    </tr>
  );
}
