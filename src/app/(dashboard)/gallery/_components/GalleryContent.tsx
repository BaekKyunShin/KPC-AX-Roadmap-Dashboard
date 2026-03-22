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
import { GalleryCard } from '@/components/gallery/GalleryCard';
import { AdminFilters } from '@/components/gallery/AdminFilters';
import { PROJECT_INDUSTRIES } from '@/lib/constants/industry';
import { useDebounce } from '@/hooks/useDebounce';
import { fetchGalleryRoadmaps } from '../actions';
import type { GalleryRoadmapItem } from '../actions';

const DEFAULT_FILTER_VALUE = 'all';

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '좋아요순' },
];

interface GalleryContentProps {
  isAdmin: boolean;
  searchParams: Record<string, string | undefined>;
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

export function GalleryContent({ isAdmin, searchParams }: GalleryContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();

  const isResettingRef = useRef(false);

  const [items, setItems] = useState<GalleryRoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.search || '');
  const [industry, setIndustry] = useState(
    urlSearchParams.get('industry') || DEFAULT_FILTER_VALUE
  );
  const [sort, setSort] = useState(
    urlSearchParams.get('sort') || 'latest'
  );

  const debouncedSearch = useDebounce(searchInput, 300);

  // URL 파라미터 문자열을 키로 사용하여 변경 감지
  const searchParamsKey = urlSearchParams.toString();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const params: Record<string, string | undefined> = {};
    urlSearchParams.forEach((value, key) => {
      params[key] = value;
    });

    fetchGalleryRoadmaps(params).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setItems(result.data);
      }
      setIsLoading(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsKey]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== DEFAULT_FILTER_VALUE) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  // 디바운스된 검색어 변경 시 URL 업데이트
  useEffect(() => {
    if (isResettingRef.current) return;
    const currentSearch = urlSearchParams.get('search') || '';
    if (debouncedSearch !== currentSearch) {
      updateParams({ search: debouncedSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleIndustryChange = (value: string) => {
    setIndustry(value);
    updateParams({ industry: value === DEFAULT_FILTER_VALUE ? '' : value });
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    updateParams({ sort: value });
  };

  const handleResetFilters = () => {
    isResettingRef.current = true;
    setSearchInput('');
    setIndustry(DEFAULT_FILTER_VALUE);
    setSort('latest');
    router.push(pathname);
    setTimeout(() => { isResettingRef.current = false; }, 500);
  };

  const hasFilters =
    debouncedSearch ||
    industry !== DEFAULT_FILTER_VALUE ||
    sort !== 'latest';

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="로드맵 검색 (기업명, 업종, 키워드...)"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={industry} onValueChange={handleIndustryChange}>
                <SelectTrigger className="w-full sm:w-[140px]">
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
                <SelectTrigger className="w-full sm:w-[120px]">
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
                <Button variant="ghost" size="icon" onClick={handleResetFilters} aria-label="필터 초기화">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 활성 필터 표시 */}
          {hasFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {debouncedSearch && (
                <FilterBadge label="검색" value={debouncedSearch} onClear={() => setSearchInput('')} />
              )}
              {industry !== DEFAULT_FILTER_VALUE && (
                <FilterBadge label="업종" value={industry} onClear={() => handleIndustryChange(DEFAULT_FILTER_VALUE)} />
              )}
              {sort !== 'latest' && (
                <FilterBadge label="정렬" value={SORT_OPTIONS.find((o) => o.value === sort)?.label ?? ''} onClear={() => handleSortChange('latest')} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 관리자 필터 */}
      {isAdmin && <AdminFilters />}

      {/* 카드 그리드 */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 animate-shimmer rounded-lg border"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
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
            icon={
              <Library className="mx-auto h-12 w-12 text-gray-400" />
            }
            title="아직 공유된 로드맵이 없습니다"
            description="로드맵을 확정한 후 갤러리에 공유해보세요."
          />
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item) => (
            <GalleryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
