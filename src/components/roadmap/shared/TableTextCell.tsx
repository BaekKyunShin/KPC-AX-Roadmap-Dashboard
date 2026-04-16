'use client';

import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import { cn } from '@/lib/utils';
import { TABLE_CELL_TEXT_CLASS, READ_ONLY_TEXT_CLASS } from './table-styles';

export interface TableTextCellProps {
  canEdit: boolean;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  tdClassName?: string;
  inputClassName?: string;
  readOnlyClassName?: string;
  /** 읽기 모드에서 값이 비어있을 때 표시할 fallback. 기본 '-'. */
  emptyFallback?: string;
}

/**
 * 로드맵 표 공용 "긴 텍스트 셀".
 * 자동 줄바꿈 + 자동 리사이즈 + 상단 정렬. 행 단위 높이 동기화 대상.
 * <tr>의 직계 자식으로 사용한다.
 */
export function TableTextCell({
  canEdit,
  value,
  onChange,
  ariaLabel,
  placeholder,
  tdClassName,
  inputClassName,
  readOnlyClassName,
  emptyFallback = '-',
}: TableTextCellProps) {
  return (
    <td className={cn(TABLE_CELL_TEXT_CLASS, tdClassName)}>
      {canEdit ? (
        <AutoResizeTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={inputClassName}
        />
      ) : (
        <span className={cn(READ_ONLY_TEXT_CLASS, readOnlyClassName)}>
          {value || emptyFallback}
        </span>
      )}
    </td>
  );
}
