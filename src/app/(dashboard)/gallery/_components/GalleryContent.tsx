'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, Library, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { GalleryCard } from '@/components/gallery/GalleryCard';
import { AdminFilters } from '@/components/gallery/AdminFilters';
import { TrackFilter, type TrackFilterValue } from '@/components/gallery/TrackFilter';
import { ScopeFilter } from '@/components/gallery/ScopeFilter';
import { PROJECT_INDUSTRIES } from '@/lib/constants/industry';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchGalleryItems } from '../actions';
import type { GalleryRoadmapItem, GalleryPaginatedResult } from '../actions';

const DEFAULT_FILTER_VALUE = 'all';

/**
 * 보여줄 목록이 아직 없을 때(첫 진입) 쓰는 로딩 자리표시자 개수.
 *
 * 목록이 이미 있으면 그 개수만큼 그린다 — 자리표시자가 더 적으면 로딩 순간 문서가
 * 짧아지고, 브라우저가 스크롤을 최상단으로 끌어내린 뒤 목록이 다시 채워져도 위치가
 * 돌아오지 않는다(하단에서 페이지를 넘길 때 화면이 맨 위로 튀던 원인).
 */
const SKELETON_FALLBACK_COUNT = 4;

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '좋아요순' },
];

interface GalleryContentProps {
  isAdmin: boolean;
  searchParams: Record<string, string | undefined>;
  initialData?: GalleryPaginatedResult;
}

function FilterBadge({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <Badge variant="secondary" className="gap-1">
      {label}: {value}
      <button onClick={onClear} aria-label={`${label} 필터 제거`}>
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

export function GalleryContent({ isAdmin, searchParams, initialData }: GalleryContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();

  const isResettingRef = useRef(false);
  const isInitialMount = useRef(!!initialData);

  const [items, setItems] = useState<GalleryRoadmapItem[]>(initialData?.items ?? []);
  const [total, setTotal] = useState(initialData?.total ?? 0);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages ?? 0);
  const [currentPage, setCurrentPage] = useState(initialData?.page ?? 1);
  const [isLoading, setIsLoading] = useState(!initialData);
  // 로딩 중 그리드가 줄어들지 않도록 직전 높이를 붙잡아 둔다 (아래 렌더 주석 참고)
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridMinHeight, setGridMinHeight] = useState<number | undefined>(undefined);
  const [searchInput, setSearchInput] = useState(searchParams.search || '');
  const [industry, setIndustry] = useState(urlSearchParams.get('industry') || DEFAULT_FILTER_VALUE);
  const [sort, setSort] = useState(urlSearchParams.get('sort') || 'latest');
  const rawTrack = urlSearchParams.get('track');
  const [track, setTrack] = useState<TrackFilterValue>(
    rawTrack === 'ROADMAP' || rawTrack === 'PBL' ? rawTrack : 'ALL'
  );

  const debouncedSearch = useDebounce(searchInput, 300);

  // URL 파라미터 문자열을 키로 사용하여 변경 감지
  const searchParamsKey = urlSearchParams.toString();

  useEffect(() => {
    // 서버에서 프리페치한 초기 데이터가 있으면 첫 마운트 시 fetch 건너뛰기
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    let cancelled = false;
    // 자리표시자로 바뀌기 **전**의 실제 높이를 재둔다 — 바뀐 뒤에 재면 이미 늦다
    setGridMinHeight(gridRef.current?.offsetHeight || undefined);
    setIsLoading(true);

    const params: Record<string, string | undefined> = {};
    urlSearchParams.forEach((value, key) => {
      params[key] = value;
    });

    fetchGalleryItems(params).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setItems(result.data.items);
        setTotal(result.data.total);
        setTotalPages(result.data.totalPages);
        setCurrentPage(result.data.page);
      }
      setIsLoading(false);
      // 새 목록이 그려진 뒤에는 고정을 풀어야 목록이 짧아졌을 때 빈 공간이 남지 않는다
      setGridMinHeight(undefined);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsKey]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      // page=1은 기본값이므로 URL에서 제거 (깔끔한 URL)
      if (key === 'page' && value === '1') {
        params.delete(key);
      } else if (value && value !== DEFAULT_FILTER_VALUE) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // 디바운스된 검색어 변경 시 URL 업데이트 + page 리셋
  useEffect(() => {
    if (isResettingRef.current) return;
    const currentSearch = urlSearchParams.get('search') || '';
    if (debouncedSearch !== currentSearch) {
      updateParams({ search: debouncedSearch, page: '1' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleIndustryChange = (value: string) => {
    setIndustry(value);
    updateParams({ industry: value === DEFAULT_FILTER_VALUE ? '' : value, page: '1' });
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    updateParams({ sort: value, page: '1' });
  };

  const handleTrackChange = (value: TrackFilterValue) => {
    setTrack(value);
    updateParams({ track: value === 'ALL' ? '' : value, page: '1' });
  };

  const handleResetFilters = () => {
    isResettingRef.current = true;
    setSearchInput('');
    setIndustry(DEFAULT_FILTER_VALUE);
    setSort('latest');
    setTrack('ALL');
    router.push(pathname, { scroll: false });
    setTimeout(() => {
      isResettingRef.current = false;
    }, 500);
  };

  const hasFilters =
    debouncedSearch || industry !== DEFAULT_FILTER_VALUE || sort !== 'latest' || track !== 'ALL';

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="p-4">
          {/* 트랙 필터 + 본인 산출물 필터 (나란히 노출) */}
          {/* ScopeFilter 는 컨설턴트 전용 — 운영관리자·시스템관리자는 산출물 작성자가 아니므로 미렌더 */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <TrackFilter value={track} onChange={handleTrackChange} />
            {!isAdmin && <ScopeFilter />}
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="검색 (기업명, 업종, 키워드...)"
                aria-label="검색"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={industry} onValueChange={handleIndustryChange}>
                <SelectTrigger className="w-full sm:w-[140px]" aria-label="업종 필터">
                  <SelectValue placeholder="업종" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_FILTER_VALUE}>모든 업종</SelectItem>
                  {PROJECT_INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full sm:w-[120px]" aria-label="정렬 기준">
                  <SelectValue placeholder="정렬" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleResetFilters}
                  aria-label="필터 초기화"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 활성 필터 표시 */}
          {hasFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {debouncedSearch && (
                <FilterBadge
                  label="검색"
                  value={debouncedSearch}
                  onClear={() => setSearchInput('')}
                />
              )}
              {industry !== DEFAULT_FILTER_VALUE && (
                <FilterBadge
                  label="업종"
                  value={industry}
                  onClear={() => handleIndustryChange(DEFAULT_FILTER_VALUE)}
                />
              )}
              {sort !== 'latest' && (
                <FilterBadge
                  label="정렬"
                  value={SORT_OPTIONS.find((o) => o.value === sort)?.label ?? ''}
                  onClear={() => handleSortChange('latest')}
                />
              )}
              {track !== 'ALL' && (
                <FilterBadge
                  label="트랙"
                  value={track === 'PBL' ? 'PBL' : '로드맵'}
                  onClear={() => handleTrackChange('ALL')}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 관리자 필터 */}
      {isAdmin && <AdminFilters />}

      {/* 카드 그리드 */}
      {!isLoading && items.length === 0 ? (
        urlSearchParams.toString() !== '' ? (
          <EmptyState
            title="검색 결과가 없습니다"
            description="다른 키워드로 검색해보세요."
            action={
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                필터 초기화
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Library className="mx-auto h-12 w-12 text-gray-400" />}
            title={
              track === 'PBL'
                ? '아직 공유된 PBL 보고서가 없습니다'
                : track === 'ROADMAP'
                  ? '아직 공유된 로드맵이 없습니다'
                  : '아직 공유된 산출물이 없습니다'
            }
            description="산출물을 확정한 후 갤러리에 공유해보세요."
          />
        )
      ) : (
        <>
          {/*
            카드와 로딩 자리표시자는 **같은 그리드**를 공유하고, 로딩 중에는 직전 높이를
            minHeight 로 붙잡는다. 둘을 다른 컨테이너로 나누면 교체되는 찰나 문서가
            짧아지고, 브라우저가 스크롤을 최상단으로 끌어내린다(JS 가 부른 게 아니라
            브라우저 기본 동작이라 코드로는 잡히지 않는다). 목록 하단에서 페이지를 넘길 때
            화면이 맨 위로 튀던 원인.
          */}
          <div
            ref={gridRef}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            style={gridMinHeight ? { minHeight: gridMinHeight } : undefined}
          >
            {isLoading
              ? Array.from({ length: items.length || SKELETON_FALLBACK_COUNT }, (_, i) => (
                  <div
                    key={i}
                    data-testid="gallery-card-skeleton"
                    className="h-64 animate-shimmer rounded-lg border"
                  />
                ))
              : items.map((item) => <GalleryCard key={item.id} item={item} />)}
          </div>
          {/* 로딩 중에도 자리를 지킨다 — 사라지면 그만큼 문서가 짧아진다 */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={12}
              onPageChange={(page) => updateParams({ page: String(page) })}
            />
          )}
        </>
      )}
    </div>
  );
}
