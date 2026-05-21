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
 * 스크롤 컨테이너가 하단 근처에 있는지 확인.
 * 채팅·로그 같은 무한 스크롤 컨테이너의 자동 하단 스크롤 가드에 사용.
 *
 * @param el - 스크롤 컨테이너 요소
 * @param threshold - 하단으로 간주할 임계값 (px, 기본 150)
 */
export function isNearBottom(el: HTMLElement, threshold = 150): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
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
