'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Check, X, Loader2, AlertCircle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 결과 페이지 DRAFT/FINAL 상태에서 셀렉트(enum) 필드를 클릭으로 인라인 편집하는 컴포넌트.
 *
 * `InlineEditField` 의 텍스트 전용 패턴을 셀렉트 옵션으로 확장.
 * 동작:
 * - view 모드: 현재 옵션 라벨 표시 + 호버 시 연필 아이콘. 클릭 → edit 모드.
 * - edit 모드: <select> + 저장/취소 버튼.
 * - 저장 성공: saved 인디케이터 (3초 후 idle) + view 모드 복귀.
 * - 저장 실패: error 인디케이터 + 원본 값 롤백, edit 모드 유지.
 */
export interface InlineSelectFieldOption<V extends string> {
  value: V;
  label: string;
}

export interface InlineSelectFieldProps<V extends string> {
  /** 현재 선택된 값. */
  value: V;
  /** 선택 옵션 목록. */
  options: InlineSelectFieldOption<V>[];
  /** 저장 호출. 실패 시 throw → 컴포넌트가 롤백. */
  onSave: (next: V) => Promise<void>;
  /** true 면 편집 불가. */
  readOnly?: boolean;
  /** 추가 className. */
  className?: string;
}

type SavingState = 'idle' | 'saving' | 'saved' | 'error';

export function InlineSelectField<V extends string>({
  value,
  options,
  onSave,
  readOnly = false,
  className,
}: InlineSelectFieldProps<V>) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [editBuffer, setEditBuffer] = useState<V>(value);
  const [savingState, setSavingState] = useState<SavingState>('idle');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (savingState === 'saved') {
      savedTimerRef.current = setTimeout(() => setSavingState('idle'), 3000);
      return () => {
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      };
    }
  }, [savingState]);

  const startEdit = useCallback(() => {
    if (readOnly) return;
    setEditBuffer(value);
    setMode('edit');
    setSavingState('idle');
  }, [readOnly, value]);

  const cancelEdit = useCallback(() => {
    setEditBuffer(value);
    setMode('view');
    setSavingState('idle');
  }, [value]);

  const saveEdit = useCallback(async () => {
    if (editBuffer === value) {
      setMode('view');
      return;
    }
    setSavingState('saving');
    try {
      await onSave(editBuffer);
      setSavingState('saved');
      setMode('view');
    } catch {
      setSavingState('error');
      setEditBuffer(value);
    }
  }, [editBuffer, onSave, value]);

  const currentLabel =
    options.find((opt) => opt.value === value)?.label ?? String(value);

  if (mode === 'edit') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <select
          value={editBuffer}
          onChange={(e) => setEditBuffer(e.target.value as V)}
          disabled={savingState === 'saving'}
          className="rounded border border-input bg-background px-2 py-1 text-sm"
          autoFocus
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void saveEdit()}
          disabled={savingState === 'saving'}
          aria-label="저장"
          className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"
        >
          {savingState === 'saving' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={savingState === 'saving'}
          aria-label="취소"
          className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
        {savingState === 'error' && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="size-3" /> 저장 실패
          </span>
        )}
      </div>
    );
  }

  const viewIndicator = (() => {
    if (savingState === 'saving') {
      return <span className="text-xs text-muted-foreground">저장 중…</span>;
    }
    if (savingState === 'saved') {
      return <span className="text-xs text-green-600">자동 저장됨</span>;
    }
    if (savingState === 'error') {
      return (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="size-3" /> 저장 실패
        </span>
      );
    }
    return null;
  })();

  return (
    <div
      className={cn(
        'group flex items-center gap-2',
        !readOnly && 'cursor-pointer',
        className,
      )}
      onClick={startEdit}
      role={readOnly ? undefined : 'button'}
      tabIndex={readOnly ? undefined : 0}
      onKeyDown={(e) => {
        if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          startEdit();
        }
      }}
    >
      <span className="flex-1">{currentLabel}</span>
      {viewIndicator ??
        (!readOnly && (
          <Pencil className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        ))}
    </div>
  );
}
