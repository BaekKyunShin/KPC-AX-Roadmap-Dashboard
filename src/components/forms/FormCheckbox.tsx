'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface FormCheckboxOption<V extends string> {
  value: V;
  label: string;
}

export interface FormCheckboxProps<V extends string> {
  /** 단일 선택(radio-like) 또는 복수 선택(checkbox). */
  mode: 'single' | 'multi';
  /** 옵션 목록 */
  options: FormCheckboxOption<V>[];
  /** 단일 선택 모드: V | undefined / 복수 선택 모드: V[] */
  value: V | V[] | undefined;
  /** 값 변경 핸들러 */
  onChange: (next: V | V[]) => void;
  /** 읽기 전용 (체크 상태 유지, 클릭 비활성) */
  readOnly?: boolean;
  className?: string;
}

/**
 * FormCheckbox
 *
 * 양식의 체크박스(`□` → `☑`)를 렌더한다.
 * - mode="single": 택1 (radio 와 동일 UX)
 * - mode="multi" : 복수 선택 (checkbox)
 * 선택 상태에 따라 앞에 `☑` 또는 `□` 심볼을 표시한다.
 */
export function FormCheckbox<V extends string>({
  mode,
  options,
  value,
  onChange,
  readOnly = false,
  className,
}: FormCheckboxProps<V>) {
  const groupId = React.useId();

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {options.map((opt) => {
        const isSelected =
          mode === 'single'
            ? value === opt.value
            : Array.isArray(value) && value.includes(opt.value);

        const handleClick = () => {
          if (readOnly) return;
          if (mode === 'single') {
            onChange(opt.value);
          } else {
            const current = Array.isArray(value) ? value : [];
            onChange(
              isSelected
                ? current.filter((v) => v !== opt.value)
                : [...current, opt.value],
            );
          }
        };

        return (
          <label
            key={opt.value}
            className={cn(
              'flex cursor-pointer items-center gap-2',
              readOnly && 'cursor-default',
            )}
          >
            <input
              type={mode === 'single' ? 'radio' : 'checkbox'}
              name={groupId}
              checked={isSelected}
              disabled={readOnly}
              onChange={handleClick}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-5 items-center justify-center rounded border font-bold',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input bg-background text-muted-foreground',
              )}
            >
              {isSelected ? '☑' : '□'}
            </span>
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
