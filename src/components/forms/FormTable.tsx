import * as React from 'react';

import { cn } from '@/lib/utils';

export interface FormTableCell {
  /** 셀 내용 (React 노드 허용) */
  content: React.ReactNode;
  /** 병합: rowspan */
  rowSpan?: number;
  /** 병합: colspan */
  colSpan?: number;
  /** 헤더 셀 여부 (기본 false). th 로 렌더 */
  header?: boolean;
  /** 텍스트 정렬 */
  align?: 'left' | 'center' | 'right';
  /** 셀 className */
  className?: string;
}

export interface FormTableRow {
  cells: FormTableCell[];
}

export interface FormTableProps {
  /** 헤더 행 (thead) — 선택적 */
  headerRows?: FormTableRow[];
  /** 본문 행 (tbody) */
  bodyRows: FormTableRow[];
  /** 전체 테이블 className */
  className?: string;
  /** caption (a11y) */
  caption?: string;
}

function alignClassOf(align: FormTableCell['align']): string {
  if (align === 'left') return 'text-left';
  if (align === 'right') return 'text-right';
  return 'text-center';
}

/**
 * FormTable
 *
 * 양식의 표(rowspan/colspan 병합 포함)를 선언적으로 렌더한다.
 * 인터뷰·결과 페이지에서 공용으로 사용한다.
 */
export function FormTable({
  headerRows,
  bodyRows,
  className,
  caption,
}: FormTableProps) {
  return (
    <table
      className={cn(
        'w-full border-collapse border border-border text-sm',
        className,
      )}
    >
      {caption && <caption className="sr-only">{caption}</caption>}
      {headerRows && headerRows.length > 0 && (
        <thead>
          {headerRows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.cells.map((cell, cIdx) => (
                <th
                  key={cIdx}
                  rowSpan={cell.rowSpan}
                  colSpan={cell.colSpan}
                  className={cn(
                    'border border-border bg-muted px-3 py-2 text-center font-semibold',
                    cell.className,
                  )}
                >
                  {cell.content}
                </th>
              ))}
            </tr>
          ))}
        </thead>
      )}
      <tbody>
        {bodyRows.map((row, rIdx) => (
          <tr key={rIdx}>
            {row.cells.map((cell, cIdx) => {
              const Tag = cell.header ? 'th' : 'td';
              return (
                <Tag
                  key={cIdx}
                  rowSpan={cell.rowSpan}
                  colSpan={cell.colSpan}
                  className={cn(
                    'border border-border px-3 py-2 align-top',
                    alignClassOf(cell.align),
                    cell.header && 'bg-muted font-semibold',
                    cell.className,
                  )}
                >
                  {cell.content}
                </Tag>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
