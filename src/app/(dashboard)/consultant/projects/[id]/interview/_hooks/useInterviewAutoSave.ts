'use client';

import { useEffect, useRef, useState } from 'react';

export interface AutoSaveResult {
  success: boolean;
  error?: string;
}

interface UseInterviewAutoSaveOptions<T> {
  data: T;
  save: (data: T) => Promise<AutoSaveResult>;
  debounceMs?: number;
  enabled?: boolean;
}

const DEFAULT_DEBOUNCE_MS = 3000;

/**
 * 인터뷰 폼 자동 저장 훅.
 * - data 직렬화 기준 변경 감지 → debounceMs 대기 → save 호출
 * - 성공 시 lastSaved 업데이트, 실패 시 autoSaveError 세팅
 * - 이전 타이머는 재요청 시 자동 클리어
 */
export function useInterviewAutoSave<T>({
  data,
  save,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  enabled = true,
}: UseInterviewAutoSaveOptions<T>) {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerializedRef = useRef<string>(JSON.stringify(data));
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!enabled) return;
    const serialized = JSON.stringify(data);
    if (serialized === lastSerializedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        const result = await saveRef.current(data);
        if (result.success) {
          lastSerializedRef.current = serialized;
          setLastSaved(new Date());
          setAutoSaveError(null);
        } else {
          setAutoSaveError(result.error ?? '자동 저장에 실패했습니다.');
        }
      } catch (error) {
        setAutoSaveError(error instanceof Error ? error.message : '자동 저장 중 오류가 발생했습니다.');
      } finally {
        setIsAutoSaving(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, debounceMs, enabled]);

  return { isAutoSaving, lastSaved, autoSaveError };
}
