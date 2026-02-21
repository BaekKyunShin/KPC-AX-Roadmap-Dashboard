import type { LucideIcon } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  category: 'recent' | 'navigation' | 'project' | 'user' | 'gallery';
  description?: string;
  keywords?: string[];
}

export interface SearchResults {
  projects: CommandItem[];
  users: CommandItem[];
  gallery: CommandItem[];
}

export interface RecentVisit {
  href: string;
  label: string;
  visitedAt: number;
}

/** Command.Item 공통 스타일 — 3개 서브 컴포넌트에서 공유 */
export const COMMAND_ITEM_CLASS =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700';
