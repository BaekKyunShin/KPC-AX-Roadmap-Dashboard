'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { unifiedSearch } from '@/app/(dashboard)/search/actions';
import type { SearchResults } from '@/components/command-palette/types';

const MIN_SEARCH_LENGTH = 2;

export function useCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dbResults, setDbResults] = useState<SearchResults | null>(null);
  const [isSearching, startTransition] = useTransition();

  const debouncedQuery = useDebounce(query, 300);

  // CMD+K / Ctrl+K 글로벌 키보드 핸들러
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 디바운스된 쿼리 변경 시 dbResults 초기화 (render-time state update)
  const [prevDebouncedQuery, setPrevDebouncedQuery] = useState('');
  if (debouncedQuery !== prevDebouncedQuery) {
    setPrevDebouncedQuery(debouncedQuery);
    if (debouncedQuery.length < MIN_SEARCH_LENGTH) {
      setDbResults(null);
    }
  }

  // 디바운스된 쿼리로 DB 검색
  useEffect(() => {
    if (debouncedQuery.length < MIN_SEARCH_LENGTH) return;

    startTransition(async () => {
      const result = await unifiedSearch(debouncedQuery);
      if (result.success) {
        setDbResults(result.data);
      }
    });
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      setDbResults(null);
      router.push(href);
    },
    [router],
  );

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery('');
      setDbResults(null);
    }
  }, []);

  return {
    open,
    setOpen,
    query,
    setQuery,
    dbResults,
    isSearching,
    handleSelect,
    handleOpenChange,
  };
}
