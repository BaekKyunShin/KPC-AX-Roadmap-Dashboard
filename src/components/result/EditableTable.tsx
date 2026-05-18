'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InlineEditField } from './InlineEditField';

/**
 * 결과 페이지의 표 영역(jsonb 배열) 행 단위 편집 컴포넌트.
 *
 * 동작:
 * - 각 셀: InlineEditField 인스턴스 — 클릭/Enter/Space → 편집 → 저장 → onChange.
 * - 행 추가 버튼: emptyRow() 결과를 배열 끝에 push → onChange.
 * - 행 삭제 버튼: 해당 인덱스 splice → onChange. minRows 도달 시 비활성.
 * - readOnly: 모든 편집 차단.
 *
 * onChange 는 매 변경 시 전체 배열 통째로 전달한다 (delta 가 아님).
 * 호출부 Server Action 이 jsonb 컬럼을 통째로 교체하는 패턴과 일치.
 *
 * 빈 행 정리 정책 (2026-05-18 변경):
 * - 클라이언트는 빈 행을 그대로 보내 사용자가 입력 시작할 수 있게 한다.
 * - DRAFT 편집 중에는 sanitize 미적용 — 빈 행이 DB에 보존되어 다음 세션에도 표시.
 * - 서버 측 `sanitizeRoadmapResult()` 는 `finalizeRoadmap` / 내보내기 직전에만 1회 호출.
 *
 * 셀렉트(enum) 컬럼은 본 컴포넌트 범위 밖. `InlineSelectField` 를 별도 영역에서
 * 사용하거나, 호출부에서 행별 행을 SectionCard 등으로 전개해 처리.
 */

export type EditableTableColumn<T> = {
  key: keyof T & string;
  label: string;
  /** 다중 라인 입력. 기본 false. */
  multiline?: boolean;
  /** 'number' 면 InlineEditField 의 string 값을 number 로 파싱해 저장. */
  type?: 'text' | 'number';
  /** 셀 표시 폭 (Tailwind class). 미지정 시 균등. */
  className?: string;
  /** view 모드 표시 전용 변환 (예: 줄바꿈 텍스트 → 머리기호 텍스트). */
  displayTransform?: (raw: string) => string;
};

export interface EditableTableProps<T> {
  /** 현재 행 배열. */
  rows: T[];
  /** 컬럼 정의. */
  columns: EditableTableColumn<T>[];
  /** 행 변경 시 호출. 전체 배열을 인자로 받는다. */
  onChange: (newRows: T[]) => Promise<void>;
  /** 새 빈 행 생성기. */
  emptyRow: () => T;
  /** true 면 모든 편집 차단 (행 추가/삭제 포함). */
  readOnly?: boolean;
  /** 행 삭제 차단 최소 행 수. 기본 0. */
  minRows?: number;
  /** 행 추가 차단 최대 행 수. 기본 무제한. */
  maxRows?: number;
  /** [➕ 행 추가] 버튼 라벨. 기본 "행 추가". */
  addLabel?: string;
  /** 첫 컬럼 앞에 행 번호 표시. 기본 true. */
  showRowNumber?: boolean;
  /** 빈 상태 안내. */
  emptyMessage?: string;
  /** 추가 className. */
  className?: string;
  /** 행 식별 키 (React key 용). 미지정 시 index. */
  getRowKey?: (row: T, index: number) => string;
  /** data-testid prefix. */
  testIdPrefix?: string;
}

export function EditableTable<T extends Record<string, unknown>>({
  rows,
  columns,
  onChange,
  emptyRow,
  readOnly = false,
  minRows = 0,
  maxRows,
  addLabel = '행 추가',
  showRowNumber = true,
  emptyMessage = '데이터가 없습니다.',
  className,
  getRowKey,
  testIdPrefix,
}: EditableTableProps<T>) {
  const [isMutating, setIsMutating] = useState(false);

  const updateCell = useCallback(
    async (rowIndex: number, columnKey: string, nextValue: string, type: 'text' | 'number') => {
      const parsedValue: unknown = type === 'number' ? Number(nextValue) || 0 : nextValue;
      const newRows = rows.map((row, i) =>
        i === rowIndex ? { ...row, [columnKey]: parsedValue } : row,
      );
      await onChange(newRows);
    },
    [rows, onChange],
  );

  const addRow = useCallback(async () => {
    if (readOnly) return;
    if (maxRows !== undefined && rows.length >= maxRows) return;
    setIsMutating(true);
    try {
      await onChange([...rows, emptyRow()]);
    } finally {
      setIsMutating(false);
    }
  }, [readOnly, maxRows, rows, emptyRow, onChange]);

  const removeRow = useCallback(
    async (index: number) => {
      if (readOnly) return;
      if (rows.length <= minRows) return;
      setIsMutating(true);
      try {
        await onChange(rows.filter((_, i) => i !== index));
      } finally {
        setIsMutating(false);
      }
    },
    [readOnly, rows, minRows, onChange],
  );

  const canAdd = !readOnly && (maxRows === undefined || rows.length < maxRows);
  const canRemove = !readOnly && rows.length > minRows;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="overflow-x-auto rounded-md border">
        <table
          className="w-full text-sm"
          data-testid={testIdPrefix ? `${testIdPrefix}-table` : undefined}
        >
          <thead className="bg-muted/50 text-xs font-semibold">
            <tr>
              {showRowNumber && <th className="w-12 px-2 py-2 text-center">#</th>}
              {columns.map((col) => (
                <th key={col.key} className={cn('px-3 py-2 text-left', col.className)}>
                  {col.label}
                </th>
              ))}
              {!readOnly && <th className="w-12 px-2 py-2" aria-label="행 작업" />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showRowNumber ? 1 : 0) + (readOnly ? 0 : 1)}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={getRowKey ? getRowKey(row, rowIndex) : rowIndex}
                  className="border-t"
                  data-testid={testIdPrefix ? `${testIdPrefix}-row-${rowIndex}` : undefined}
                >
                  {showRowNumber && (
                    <td className="px-2 py-2 text-center text-xs text-muted-foreground">
                      {rowIndex + 1}
                    </td>
                  )}
                  {columns.map((col) => {
                    const raw = row[col.key];
                    const stringValue = raw === null || raw === undefined ? '' : String(raw);
                    return (
                      <td key={col.key} className={cn('px-3 py-2 align-top', col.className)}>
                        <InlineEditField
                          value={stringValue}
                          onSave={(next) =>
                            updateCell(rowIndex, col.key, next, col.type ?? 'text')
                          }
                          multiline={col.multiline}
                          readOnly={readOnly}
                          displayTransform={col.displayTransform}
                        />
                      </td>
                    );
                  })}
                  {!readOnly && (
                    <td className="px-2 py-2 text-center align-top">
                      <button
                        type="button"
                        onClick={() => void removeRow(rowIndex)}
                        disabled={!canRemove || isMutating}
                        aria-label={`${rowIndex + 1}행 삭제`}
                        className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                        data-testid={
                          testIdPrefix ? `${testIdPrefix}-remove-${rowIndex}` : undefined
                        }
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void addRow()}
            disabled={!canAdd || isMutating}
            data-testid={testIdPrefix ? `${testIdPrefix}-add` : undefined}
          >
            {isMutating ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Plus className="mr-1 size-4" />
            )}
            {addLabel}
          </Button>
          {maxRows !== undefined && (
            <span className="text-xs text-muted-foreground">
              {rows.length} / {maxRows}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
