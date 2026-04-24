'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Pencil, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 결과 페이지 DRAFT 상태에서 필드를 클릭으로 인라인 편집하는 컴포넌트.
 *
 * 동작:
 * - view 모드: 값 표시 + 호버 시 연필 아이콘. 클릭/Enter/Space → edit 모드.
 * - edit 모드: input/textarea + 저장/취소 버튼. Enter=저장(input only), Esc=취소,
 *   Ctrl/⌘+Enter=저장(multiline).
 * - 저장 성공: `saved` 인디케이터(3초 후 idle) + view 모드 복귀.
 * - 저장 실패: `error` 인디케이터 + localValue 를 원본 value 로 롤백, edit 모드 유지.
 *
 * 낙관적 업데이트는 호출부가 책임진다. 이 컴포넌트는 `onSave` Promise 결과만 반영.
 */
export interface InlineEditFieldProps {
  /** 현재 값(readonly 또는 edit 초기값). */
  value: string;
  /** 저장 호출. 실패 시 에러 throw → 컴포넌트가 롤백. */
  onSave: (next: string) => Promise<void>;
  /** true 면 편집 불가. */
  readOnly?: boolean;
  /** 플레이스홀더(기본: "클릭하여 편집"). */
  placeholder?: string;
  /** 추가 className 합성. */
  className?: string;
  /** true 면 textarea, false 면 input. */
  multiline?: boolean;
}

type SavingState = 'idle' | 'saving' | 'saved' | 'error';

export function InlineEditField({
  value,
  onSave,
  readOnly = false,
  placeholder = '클릭하여 편집',
  className,
  multiline = false,
}: InlineEditFieldProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [localValue, setLocalValue] = useState(value);
  const [savingState, setSavingState] = useState<SavingState>('idle');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 외부 value 가 변하면 view 모드에서만 localValue 동기화
  useEffect(() => {
    if (mode === 'view') setLocalValue(value);
  }, [value, mode]);

  // saved 상태 3초 후 idle 복귀
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
    setLocalValue(value);
    setMode('edit');
    setSavingState('idle');
  }, [readOnly, value]);

  const cancelEdit = useCallback(() => {
    setLocalValue(value);
    setMode('view');
    setSavingState('idle');
  }, [value]);

  const saveEdit = useCallback(async () => {
    if (localValue === value) {
      setMode('view');
      return;
    }
    setSavingState('saving');
    try {
      await onSave(localValue);
      setSavingState('saved');
      setMode('view');
    } catch {
      setSavingState('error');
      setLocalValue(value); // 롤백
    }
  }, [localValue, onSave, value]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
      return;
    }
    if (e.key === 'Enter') {
      // input: 단순 Enter = 저장. textarea: Ctrl/⌘+Enter = 저장.
      if (!multiline || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        void saveEdit();
      }
    }
  };

  const errorIndicator =
    savingState === 'error' ? (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="size-3" /> 저장 실패
      </span>
    ) : null;

  if (mode === 'edit') {
    const commonInputClass = cn(
      'flex-1 rounded border border-input bg-background px-2 py-1 text-sm',
      multiline && 'min-h-[120px] resize-y',
    );

    return (
      <div className={cn('flex items-start gap-2', className)}>
        {multiline ? (
          <textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={savingState === 'saving'}
            placeholder={placeholder}
            className={commonInputClass}
            autoFocus
          />
        ) : (
          <input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={savingState === 'saving'}
            placeholder={placeholder}
            className={commonInputClass}
            autoFocus
          />
        )}
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
        {errorIndicator && (
          <div className="self-center">{errorIndicator}</div>
        )}
      </div>
    );
  }

  // view 모드
  const viewIndicator = (() => {
    if (savingState === 'saving') {
      return (
        <span className="text-xs text-muted-foreground">저장 중…</span>
      );
    }
    if (savingState === 'saved') {
      return <span className="text-xs text-green-600">자동 저장됨</span>;
    }
    if (savingState === 'error') return errorIndicator;
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
      <span className={cn('flex-1', !value && 'text-muted-foreground')}>
        {value || placeholder}
      </span>
      {viewIndicator ??
        (!readOnly && (
          <Pencil className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        ))}
    </div>
  );
}
