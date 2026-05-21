'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type FilterBy = 'title' | 'author';

const FILTER_OPTIONS: Array<{ value: FilterBy; label: string }> = [
  { value: 'title', label: '제목' },
  { value: 'author', label: '작성자' },
];

/**
 * 공지 검색 바.
 * 세그먼트 탭(제목/작성자) + 검색 입력 + 검색·초기화 버튼을 한 줄로 배치한다.
 * Notion·Linear 등의 필터 패턴을 참고해 밀도 높고 시각적으로 정렬된 구조로 구성.
 */
export function NoticeSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get('q') ?? '';
  const currentFilter =
    (searchParams.get('filter_by') as FilterBy | null) ?? 'title';
  const hasActiveFilter = currentQ.length > 0;

  function applyFilter(next: { q?: string; filter_by?: FilterBy }) {
    const params = new URLSearchParams();
    const q = next.q !== undefined ? next.q : currentQ;
    const filter_by = next.filter_by ?? currentFilter;
    if (q.trim()) params.set('q', q.trim());
    params.set('filter_by', filter_by);
    params.set('page', '1');
    startTransition(() => {
      router.push(`/notices?${params.toString()}`, { scroll: false });
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = String(formData.get('q') ?? '');
    applyFilter({ q });
  }

  function handleReset() {
    startTransition(() => {
      router.push('/notices', { scroll: false });
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      data-testid="notice-search-bar"
    >
      {/* 세그먼트 탭 */}
      <div
        role="tablist"
        aria-label="검색 필터"
        className="inline-flex rounded-md border bg-muted/40 p-0.5 text-sm"
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = opt.value === currentFilter;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => applyFilter({ filter_by: opt.value })}
              disabled={isPending}
              className={cn(
                'rounded-sm px-3 py-1.5 font-medium transition-colors',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* 검색 입력 */}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={currentQ}
          placeholder={
            currentFilter === 'title'
              ? '제목으로 검색'
              : '작성자 이름으로 검색'
          }
          aria-label="검색어"
          className="pl-9"
        />
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} className="gap-1.5">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          검색
        </Button>
        {hasActiveFilter && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={isPending}
            aria-label="필터 초기화"
            className="gap-1.5"
          >
            <X className="h-4 w-4" />
            초기화
          </Button>
        )}
      </div>
    </form>
  );
}
