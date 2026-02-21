'use client';

import { Command } from 'cmdk';
import { FolderKanban, Users, Library, Loader2 } from 'lucide-react';
import type { SearchResults, CommandItem } from './types';

interface CommandSearchResultsProps {
  dbResults: SearchResults | null;
  isSearching: boolean;
  onSelect: (href: string) => void;
}

const CATEGORY_CONFIG = {
  projects: { heading: '프로젝트', Icon: FolderKanban },
  users: { heading: '사용자', Icon: Users },
  gallery: { heading: '갤러리', Icon: Library },
} as const;

function ResultGroup({
  heading,
  Icon,
  items,
  onSelect,
}: {
  heading: string;
  Icon: React.ComponentType<{ className?: string }>;
  items: CommandItem[];
  onSelect: (href: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <Command.Group heading={heading} forceMount>
      {items.map((item) => (
        <Command.Item
          key={item.id}
          value={`${item.category}-${item.id}`}
          onSelect={() => onSelect(item.href)}
          forceMount
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700"
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-col min-w-0">
            <span className="truncate">{item.label}</span>
            {item.description && (
              <span className="truncate text-xs text-muted-foreground">
                {item.description}
              </span>
            )}
          </div>
        </Command.Item>
      ))}
    </Command.Group>
  );
}

export default function CommandSearchResults({
  dbResults,
  isSearching,
  onSelect,
}: CommandSearchResultsProps) {
  if (isSearching) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>검색 중...</span>
      </div>
    );
  }

  if (!dbResults) return null;

  return (
    <>
      {(Object.keys(CATEGORY_CONFIG) as (keyof typeof CATEGORY_CONFIG)[]).map(
        (key) => (
          <ResultGroup
            key={key}
            heading={CATEGORY_CONFIG[key].heading}
            Icon={CATEGORY_CONFIG[key].Icon}
            items={dbResults[key]}
            onSelect={onSelect}
          />
        ),
      )}
    </>
  );
}
