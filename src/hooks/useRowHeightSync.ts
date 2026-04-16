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
    const row = rowRef.current;
    if (!row) return;
    const textareas = Array.from(row.querySelectorAll<HTMLTextAreaElement>('textarea'));
    if (textareas.length === 0) return;

    // reset
    textareas.forEach((ta) => {
      ta.style.height = 'auto';
    });
    // 각자 scrollHeight, max 구하기
    let max = 0;
    textareas.forEach((ta) => {
      if (ta.scrollHeight > max) max = ta.scrollHeight;
    });
    // apply max
    textareas.forEach((ta) => {
      ta.style.height = `${max}px`;
    });

    // window resize 이벤트 리스너
    const handleResize = () => {
      const row2 = rowRef.current;
      if (!row2) return;
      const tas = Array.from(row2.querySelectorAll<HTMLTextAreaElement>('textarea'));
      if (tas.length === 0) return;
      tas.forEach((ta) => {
        ta.style.height = 'auto';
      });
      let maxH = 0;
      tas.forEach((ta) => {
        if (ta.scrollHeight > maxH) maxH = ta.scrollHeight;
      });
      tas.forEach((ta) => {
        ta.style.height = `${maxH}px`;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, deps);
}
