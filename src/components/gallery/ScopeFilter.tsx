'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'all', label: '전체 갤러리' },
  { value: 'mine', label: '내 산출물' },
] as const;

export type ScopeFilterValue = (typeof OPTIONS)[number]['value'];

interface ScopeFilterProps {
  /** 현재 선택값 (미전달 시 URL ?scope 에서 읽음) */
  value?: ScopeFilterValue;
  /** 제어형일 때 값 변경 콜백. URL 동기화까지 부모가 관리. */
  onChange?: (value: ScopeFilterValue) => void;
}

/**
 * 갤러리 본인 산출물 필터 (2개 토글: 전체 갤러리 / 내 산출물).
 *
 * - 비제어형: URL ?scope 파라미터를 직접 읽고 router.push 수행.
 * - 제어형: value/onChange 사용 (상위 컨텐츠가 이미 URL 상태를 관리할 때).
 *
 * H2 — 본인 작성·공유분만 빠르게 찾을 수 있게 한다.
 *
 * 비제어형에서는 클릭 즉시 active 상태를 갱신하고, RSC navigation(데이터 재조회)
 * 을 `useTransition` 으로 감싸 메인 스레드 freeze 를 막는다. isPending 동안에는
 * 토글 영역을 살짝 흐리게 표시해 "로딩 중" 피드백을 제공한다.
 */
export function ScopeFilter({ value, onChange }: ScopeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const rawFromUrl = urlSearchParams.get('scope');
  const normalized: ScopeFilterValue = rawFromUrl === 'mine' ? 'mine' : 'all';

  // 비제어형: 낙관적 active 상태. 클릭 즉시 setState 로 토글 색을 바꾸고
  // URL navigation 은 startTransition 으로 백그라운드 진행. URL 이 새 값으로 반영되면
  // useEffect 로 동기화 (외부 navigation 으로 URL 이 바뀐 경우 토글도 따라옴).
  const [optimistic, setOptimistic] = useState<ScopeFilterValue>(normalized);

  useEffect(() => {
    setOptimistic(normalized);
  }, [normalized]);

  const current: ScopeFilterValue = value ?? optimistic;

  const handleSelect = (next: ScopeFilterValue) => {
    if (onChange) {
      onChange(next);
      return;
    }
    if (next === current) return;
    setOptimistic(next);
    const params = new URLSearchParams(urlSearchParams.toString());
    if (next === 'all') {
      params.delete('scope');
    } else {
      params.set('scope', next);
    }
    // 필터 변경 시 첫 페이지로 이동 (TrackFilter 패턴과 일치)
    params.delete('page');
    const search = params.toString();
    startTransition(() => {
      router.push(`${pathname}${search ? `?${search}` : ''}`, { scroll: false });
    });
  };

  return (
    <div
      role="tablist"
      aria-label="본인 산출물 필터"
      data-pending={isPending ? 'true' : 'false'}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 transition-opacity',
        isPending && 'opacity-70 cursor-wait',
      )}
      data-testid="scope-filter"
    >
      {OPTIONS.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`scope-filter-${opt.value}`}
            onClick={() => handleSelect(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              active
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
