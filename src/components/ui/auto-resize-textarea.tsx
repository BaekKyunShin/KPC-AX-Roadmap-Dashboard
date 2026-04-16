'use client';

import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

type TextareaProps = React.ComponentProps<typeof Textarea>;

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

    // 초기 렌더 동기화 (CSS fonts 로딩 등)
    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      const id = window.requestAnimationFrame(() => {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      });
      return () => window.cancelAnimationFrame(id);
    }, []);

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
