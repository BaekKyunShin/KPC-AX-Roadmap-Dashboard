import { useEffect } from 'react';

/**
 * 더티(dirty) 상태에서 탭 닫기·새로고침·뒤로가기 시도 시 브라우저 기본 경고를 띄운다.
 *
 * #003 (Nielsen H3 사용자 통제와 자유) — 인터뷰 자동저장(500ms 디바운싱) 중에 사용자가
 * 탭을 닫으면 마지막 변경분이 손실될 수 있다. dirty 일 때만 경고를 띄워, 깨끗한 상태에서는
 * 사용자를 방해하지 않는다.
 *
 * @param isDirty 변경사항이 저장 대기 중인지 여부 (saveState === 'saving' || serialized 불일치)
 *
 * 사용 예:
 * ```tsx
 * const isDirty = saveState === 'saving' || saveState === 'error' ||
 *                 JSON.stringify(data) !== lastSerializedRef.current;
 * useBeforeUnloadGuard(isDirty);
 * ```
 */
export function useBeforeUnloadGuard(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // 일부 구버전 Chrome 호환 — returnValue 설정이 필요했음
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
