'use client';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Align = 'left' | 'center' | 'right';

const TEXT_ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export interface TableInlineCellProps {
  canEdit: boolean;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  align?: Align;
  tdClassName?: string;
  inputClassName?: string;
  readOnlyClassName?: string;
  emptyFallback?: string;
}

/**
 * 로드맵 표 공용 "한줄 셀".
 * 줄바꿈 금지(입력 시 자동 제거) + 박스 stretch + 기본 가운데 정렬.
 * <tr>의 직계 자식으로 사용한다.
 */
export function TableInlineCell({
  canEdit,
  value,
  onChange,
  ariaLabel,
  placeholder,
  align = 'center',
  tdClassName,
  inputClassName,
  readOnlyClassName,
  emptyFallback = '-',
}: TableInlineCellProps) {
  const alignClass = TEXT_ALIGN_CLASS[align];
  const tdFinalClass = cn(
    'h-0 px-3 py-3 align-top',
    alignClass,
    tdClassName,
  );

  return (
    <td className={tdFinalClass}>
      {canEdit ? (
        <Textarea
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\n/g, ''))}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn(
            'h-full w-full resize-none overflow-hidden',
            alignClass,
            inputClassName,
          )}
        />
      ) : (
        <span className={cn('text-foreground', readOnlyClassName)}>
          {value || emptyFallback}
        </span>
      )}
    </td>
  );
}
