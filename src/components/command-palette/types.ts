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
