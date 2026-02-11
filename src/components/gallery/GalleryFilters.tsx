'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PROJECT_INDUSTRIES } from '@/lib/constants/industry';

export function GalleryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get('search') || '';
  const currentIndustry = searchParams.get('industry') || '';
  const currentSort = searchParams.get('sort') || 'latest';

  const [search, setSearch] = useState(currentSearch);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search });
  };

  const handleIndustryClick = (industry: string) => {
    updateParams({ industry: industry === currentIndustry ? '' : industry });
  };

  const handleSortChange = (sort: string) => {
    updateParams({ sort });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="로드맵 검색 (기업명, 업종, 키워드...)"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            variant={!currentIndustry ? 'default' : 'outline'}
            size="sm"
            className="whitespace-nowrap"
            onClick={() => updateParams({ industry: '' })}
          >
            전체
          </Button>
          {PROJECT_INDUSTRIES.map((ind) => (
            <Button
              key={ind}
              variant={currentIndustry === ind ? 'default' : 'outline'}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => handleIndustryClick(ind)}
            >
              {ind}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">정렬:</span>
        <Button
          variant={currentSort === 'latest' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-7"
          onClick={() => handleSortChange('latest')}
        >
          최신순
        </Button>
        <Button
          variant={currentSort === 'popular' ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-7"
          onClick={() => handleSortChange('popular')}
        >
          좋아요순
        </Button>
      </div>
    </div>
  );
}
