'use client';

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
 * TrackFilter 와 동일 구조로 작성. 본인 작성·공유분만 빠르게 찾을 수 있게 한다 (H2).
 */
export function ScopeFilter({ value, onChange }: ScopeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();

  const rawFromUrl = urlSearchParams.get('scope');
  const normalized: ScopeFilterValue = rawFromUrl === 'mine' ? 'mine' : 'all';

  const current: ScopeFilterValue = value ?? normalized;

  const handleSelect = (next: ScopeFilterValue) => {
    if (onChange) {
      onChange(next);
      return;
    }
    const params = new URLSearchParams(urlSearchParams.toString());
    if (next === 'all') {
      params.delete('scope');
    } else {
      params.set('scope', next);
    }
    // 필터 변경 시 첫 페이지로 이동 (TrackFilter 패턴과 일치)
    params.delete('page');
    const search = params.toString();
    router.push(`${pathname}${search ? `?${search}` : ''}`);
  };

  return (
    <div
      role="tablist"
      aria-label="본인 산출물 필터"
      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1"
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
