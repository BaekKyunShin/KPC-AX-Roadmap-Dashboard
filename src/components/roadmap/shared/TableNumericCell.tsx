'use client';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Align = 'left' | 'center' | 'right';

const TEXT_ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export interface TableNumericCellProps {
  canEdit: boolean;
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  placeholder?: string;
  /** 기본 'center'. */
  align?: Align;
  /** 읽기 모드 접미사. 기본 'H' (시간). */
  unit?: string;
  /** 읽기 모드에서 이 값 이하일 때 fallback을 표시. 기본 0. */
  min?: number;
  tdClassName?: string;
  inputClassName?: string;
  readOnlyClassName?: string;
  emptyFallback?: string;
}

/**
 * 로드맵 표 공용 "숫자 셀".
 * 숫자 이외 입력 자동 제거 + 단위 접미사 + 박스 stretch.
 * <tr>의 직계 자식으로 사용한다.
 */
export function TableNumericCell({
  canEdit,
  value,
  onChange,
  ariaLabel,
  placeholder,
  align = 'center',
  unit = 'H',
  min = 0,
  tdClassName,
  inputClassName,
  readOnlyClassName,
  emptyFallback = '-',
}: TableNumericCellProps) {
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
          value={value || ''}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, '');
            onChange(v === '' ? 0 : Number(v));
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn(
            'h-full w-full resize-none overflow-hidden',
            alignClass,
            inputClassName,
          )}
        />
      ) : (
        <span className={cn('font-medium text-foreground', readOnlyClassName)}>
          {value > min ? `${value}${unit}` : emptyFallback}
        </span>
      )}
    </td>
  );
}
