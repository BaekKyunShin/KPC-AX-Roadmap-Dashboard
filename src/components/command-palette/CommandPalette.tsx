'use client';

import { Command } from 'cmdk';
import { DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Search, CornerDownLeft } from 'lucide-react';
import { fuzzyMatch } from '@/lib/utils/fuzzy-match';
import { getNavItemsWithKeywords } from '@/lib/constants/navigation';
import type { SearchResults, RecentVisit } from './types';
import CommandRecentGroup from './CommandRecentGroup';
import CommandNavigationGroup from './CommandNavigationGroup';
import CommandSearchResults from './CommandSearchResults';

type UserRole = 'CONSULTANT_APPROVED' | 'OPS_ADMIN' | 'SYSTEM_ADMIN';

interface CommandPaletteProps {
  userRole: UserRole;
  open: boolean;
  setOpen: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  dbResults: SearchResults | null;
  isSearching: boolean;
  handleSelect: (href: string) => void;
  handleOpenChange: (open: boolean) => void;
  recentVisits: RecentVisit[];
}

export default function CommandPalette({
  userRole,
  open,
  setOpen: _setOpen,
  query,
  setQuery,
  dbResults,
  isSearching,
  handleSelect,
  handleOpenChange,
  recentVisits,
}: CommandPaletteProps) {
  const navItems = getNavItemsWithKeywords(userRole);
  const hasQuery = query.length > 0;
  const hasDbResults =
    dbResults !== null &&
    (dbResults.projects.length > 0 ||
      dbResults.users.length > 0 ||
      dbResults.gallery.length > 0);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="커맨드 팔레트"
      loop
      filter={(value, search, keywords) => {
        const combined = [value, ...(keywords ?? [])].join(' ');
        return fuzzyMatch(search, combined);
      }}
      overlayClassName="fixed inset-0 z-50 bg-black/50"
      contentClassName="fixed top-[20%] left-1/2 z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border bg-white shadow-2xl"
    >
      <VisuallyHidden>
        <DialogTitle>커맨드 팔레트</DialogTitle>
        <DialogDescription>페이지, 프로젝트, 사용자를 검색합니다</DialogDescription>
      </VisuallyHidden>

      {/* 검색 입력 */}
      <div className="flex items-center gap-3 border-b px-4">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="페이지, 프로젝트, 사용자 검색..."
          className="flex-1 h-12 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          ESC
        </kbd>
      </div>

      {/* 결과 목록 */}
      <Command.List className="max-h-[360px] overflow-y-auto p-2">
        {!isSearching && !hasDbResults && (
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            검색 결과가 없습니다
          </Command.Empty>
        )}

        {/* 최근 방문 — 빈 검색어일 때만 */}
        {!hasQuery && (
          <CommandRecentGroup
            recentVisits={recentVisits}
            onSelect={handleSelect}
          />
        )}

        {/* 바로가기 — 항상 표시, cmdk 기본 필터로 필터링 */}
        <CommandNavigationGroup
          navItems={navItems}
          onSelect={handleSelect}
        />

        {/* DB 검색 결과 — 검색어가 있을 때만 */}
        {hasQuery && (
          <CommandSearchResults
            dbResults={dbResults}
            isSearching={isSearching}
            onSelect={handleSelect}
          />
        )}
      </Command.List>

      {/* 하단 힌트 바 */}
      <div className="flex items-center gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">
            &uarr;
          </kbd>
          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">
            &darr;
          </kbd>
          <span className="ml-1">탐색</span>
        </span>
        <span className="flex items-center gap-1">
          <CornerDownLeft className="h-3 w-3" />
          <span>이동</span>
        </span>
      </div>
    </Command.Dialog>
  );
}
