'use client';

import { useLayoutEffect, type RefObject } from 'react';

/**
 * 동일 행(<tr>) 내 textarea들의 visible height을 가장 큰 scrollHeight에 맞춰 동기화.
 * AutoResizeTextarea가 이미 개별 content-based auto-grow를 수행하지만, 같은 행 내
 * textarea들 시각 균형을 위해 한 번 더 max로 맞춤.
 *
 * @param rowRef 대상 tr element의 ref
 * @param deps 값이 변경될 때마다 재동기화 (보통 해당 row의 모든 입력값)
 */
export function useRowHeightSync(
  rowRef: RefObject<HTMLTableRowElement | null>,
  deps: ReadonlyArray<unknown>,
): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const sync = () => {
      const row = rowRef.current;
      if (!row) return;
      const textareas = Array.from(row.querySelectorAll<HTMLTextAreaElement>('textarea'));
      if (textareas.length === 0) return;

      textareas.forEach((ta) => {
        ta.style.height = 'auto';
      });
      let max = 0;
      textareas.forEach((ta) => {
        if (ta.scrollHeight > max) max = ta.scrollHeight;
      });
      textareas.forEach((ta) => {
        ta.style.height = `${max}px`;
      });
    };

    sync();
    // 폰트 로딩 지연 · 첫 paint 이후 추가 재동기화 (자식 rAF 제거 후 여기서 1회 더)
    const rafId = window.requestAnimationFrame(sync);

    const handleResize = () => sync();
    window.addEventListener('resize', handleResize);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, deps);
}
