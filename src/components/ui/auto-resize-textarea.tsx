'use client';

import { forwardRef, useLayoutEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

type TextareaProps = React.ComponentProps<typeof Textarea>;

/**
 * content 기반 auto-grow Textarea 래퍼.
 *
 * 단독 사용 시: value 변경 시 scrollHeight에 맞춰 자기 height을 조정.
 * 같은 행(tr) 내 여러 인스턴스가 있을 때는 부모의 useRowHeightSync가
 * max height으로 다시 덮어씀. (rAF 기반 재조정은 부모 sync와 충돌해 제거)
 */
export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ value, className, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const setRefs = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof forwardedRef === 'function') forwardedRef(el);
      else if (forwardedRef)
        (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

    useLayoutEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }, [value]);

    return (
      <Textarea
        ref={setRefs}
        value={value}
        className={['resize-none overflow-hidden', className ?? ''].join(' ').trim()}
        {...props}
      />
    );
  },
);
AutoResizeTextarea.displayName = 'AutoResizeTextarea';
