import type { RefObject } from 'react';

/**
 * 페이지 상단으로 부드럽게 스크롤
 * @param delay - 스크롤 지연 시간 (ms, 기본값: 100)
 */
export function scrollToPageTop(delay = 100) {
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, delay);
}

/**
 * 특정 요소로 부드럽게 스크롤
 * @param ref - 스크롤 대상 요소의 ref
 * @param options - scrollIntoView 옵션
 * @param delay - 스크롤 지연 시간 (ms, 기본값: 100)
 */
export function scrollToElement(
  ref: RefObject<HTMLElement | null>,
  options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'start' },
  delay = 100
) {
  setTimeout(() => {
    ref.current?.scrollIntoView(options);
  }, delay);
}

/**
 * 첫 번째 에러 필드로 스크롤 및 포커스
 * @param containerRef - 폼 컨테이너 ref
 * @param errorSelector - 에러 요소 선택자 (기본값: '[data-error="true"]')
 * @param delay - 스크롤 지연 시간 (ms, 기본값: 100)
 */
export function scrollToFirstError(
  containerRef: RefObject<HTMLElement | null>,
  errorSelector = '[data-error="true"]',
  delay = 100
) {
  setTimeout(() => {
    const firstErrorElement = containerRef.current?.querySelector(errorSelector);
    if (firstErrorElement) {
      firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = firstErrorElement.querySelector('input, textarea');
      if (input) {
        (input as HTMLElement).focus();
      }
    }
  }, delay);
}
