'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'ROADMAP', label: '로드맵' },
  { value: 'PBL', label: 'PBL' },
] as const;

export type TrackFilterValue = (typeof OPTIONS)[number]['value'];

interface TrackFilterProps {
  /** 현재 선택값 (미전달 시 URL ?track 에서 읽음) */
  value?: TrackFilterValue;
  /** 제어형일 때 값 변경 콜백. URL 동기화까지 부모가 관리. */
  onChange?: (value: TrackFilterValue) => void;
}

/**
 * 갤러리 트랙 필터 (3개 토글: 전체/로드맵/PBL).
 *
 * - 비제어형: URL ?track 파라미터를 직접 읽고 updateParams 수행.
 * - 제어형: value/onChange 사용 (상위 컨텐츠가 이미 URL 상태를 관리할 때).
 */
export function TrackFilter({ value, onChange }: TrackFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();

  const rawFromUrl = urlSearchParams.get('track');
  const normalized: TrackFilterValue =
    rawFromUrl === 'ROADMAP' || rawFromUrl === 'PBL' ? rawFromUrl : 'ALL';

  const current: TrackFilterValue = value ?? normalized;

  const handleSelect = (next: TrackFilterValue) => {
    if (onChange) {
      onChange(next);
      return;
    }
    const params = new URLSearchParams(urlSearchParams.toString());
    if (next === 'ALL') {
      params.delete('track');
    } else {
      params.set('track', next);
    }
    // 필터 변경 시 첫 페이지로 이동 (기존 GalleryContent 패턴과 일치)
    params.delete('page');
    const search = params.toString();
    router.push(`${pathname}${search ? `?${search}` : ''}`, { scroll: false });
  };

  return (
    <div
      role="tablist"
      aria-label="트랙 필터"
      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1"
      data-testid="track-filter"
    >
      {OPTIONS.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`track-filter-${opt.value}`}
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
