'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Pencil, Check, X, Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 결과 페이지 DRAFT 상태에서 필드를 클릭으로 인라인 편집하는 컴포넌트.
 *
 * 동작:
 * - view 모드: 값 표시 + 호버 시 연필 아이콘. 클릭/Enter/Space → edit 모드.
 * - edit 모드: input/textarea + 저장/취소 버튼. Enter=저장(input only), Esc=취소,
 *   Ctrl/⌘+Enter=저장(multiline).
 * - 저장 성공: `saved` 인디케이터(3초 후 idle) + view 모드 복귀.
 * - 저장 실패: `error` 인디케이터 + 사용자 입력(editBuffer) 보존, edit 모드 유지.
 *   "다시 시도" 버튼 클릭 시 동일 입력으로 saveEdit 재호출.
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
  /**
   * view 모드 표시 전용 변환. edit 모드의 editBuffer/onSave 에는 영향 없음.
   * 예: 줄바꿈 텍스트에 머리기호 prepend.
   */
  displayTransform?: (raw: string) => string;
  /**
   * view 모드 버튼의 접근성 이름(예: "수립 배경 편집").
   *
   * 미지정 시 접근성 이름은 값 텍스트가 된다 — 한 화면에 편집 필드가 여러 개인 표에서는
   * 스크린리더가 어느 항목인지 구분할 수 없으므로, 표·다항목 섹션에서는 지정할 것.
   * `readOnly` 면 button role 자체가 없어 적용되지 않는다.
   */
  ariaLabel?: string;
}

type SavingState = 'idle' | 'saving' | 'saved' | 'error';

export function InlineEditField({
  value,
  onSave,
  readOnly = false,
  placeholder = '클릭하여 편집',
  className,
  multiline = false,
  displayTransform,
  ariaLabel,
}: InlineEditFieldProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  // edit 모드 진입 시의 편집 버퍼. view 모드에서는 외부 value 를 직접 표시하므로
  // 별도 동기화 effect 불필요(React 'you might not need an effect' 원칙).
  const [editBuffer, setEditBuffer] = useState(value);
  const [savingState, setSavingState] = useState<SavingState>('idle');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // 사용자 입력 보존 — "다시 시도" 버튼이 같은 입력으로 saveEdit 재호출.
    }
  }, [editBuffer, onSave, value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        <button
          type="button"
          onClick={() => void saveEdit()}
          className="ml-1 inline-flex items-center gap-0.5 rounded px-1 text-destructive underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          aria-label="다시 시도"
        >
          <RefreshCcw className="size-3" />
          다시 시도
        </button>
      </span>
    ) : null;

  if (mode === 'edit') {
    // multiline 은 테스트 페이지(LargeTextBox)와 시각 일관성을 위해 동일 스타일 적용.
    // 단일행 input 은 인라인 편집용 컴팩트 스타일 유지.
    const commonInputClass = cn(
      'flex-1 border border-input bg-background text-sm',
      multiline
        ? 'min-h-[160px] resize-y rounded-md px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        : 'rounded px-2 py-1'
    );

    return (
      <div className={cn('flex items-start gap-2', className)} data-saving-state={savingState}>
        {multiline ? (
          <textarea
            value={editBuffer}
            onChange={(e) => setEditBuffer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={savingState === 'saving'}
            placeholder={placeholder}
            className={commonInputClass}
            autoFocus
          />
        ) : (
          <input
            value={editBuffer}
            onChange={(e) => setEditBuffer(e.target.value)}
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
        {errorIndicator && <div className="self-center">{errorIndicator}</div>}
      </div>
    );
  }

  // view 모드
  const viewIndicator = (() => {
    if (savingState === 'saving') {
      return <span className="text-xs text-muted-foreground">저장 중…</span>;
    }
    if (savingState === 'saved') {
      return <span className="text-xs text-green-600">자동 저장됨</span>;
    }
    if (savingState === 'error') return errorIndicator;
    return null;
  })();

  return (
    <div
      className={cn('group flex items-center gap-2', !readOnly && 'cursor-pointer', className)}
      data-saving-state={savingState}
      onClick={startEdit}
      role={readOnly ? undefined : 'button'}
      aria-label={readOnly ? undefined : ariaLabel}
      tabIndex={readOnly ? undefined : 0}
      onKeyDown={(e) => {
        if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          startEdit();
        }
      }}
    >
      <span
        className={cn(
          'flex-1',
          multiline && 'whitespace-pre-line',
          !value && 'text-muted-foreground'
        )}
      >
        {value ? (displayTransform ? displayTransform(value) : value) : placeholder}
      </span>
      {viewIndicator ??
        (!readOnly && (
          <Pencil className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        ))}
    </div>
  );
}
