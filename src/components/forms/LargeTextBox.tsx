import * as React from 'react';

import { cn } from '@/lib/utils';

export interface LargeTextBoxProps
  extends Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    'className' | 'ref'
  > {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** 최소 높이 (기본 "min-h-[160px]", 양식 6~7줄 기준) */
  minHeightClassName?: string;
  className?: string;
}

/**
 * LargeTextBox
 *
 * 양식의 자유서술 박스를 위한 장문 입력란.
 * 기본 최소 높이 160px (한글 6~7줄) · 세로 리사이즈 허용.
 */
export const LargeTextBox = React.forwardRef<
  HTMLTextAreaElement,
  LargeTextBoxProps
>(function LargeTextBox(
  { value, onChange, minHeightClassName, className, ...rest },
  ref,
) {
  return (
    <textarea
      {...rest}
      ref={ref}
      value={value}
      onChange={onChange}
      className={cn(
        'w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm',
        minHeightClassName ?? 'min-h-[160px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  );
});
