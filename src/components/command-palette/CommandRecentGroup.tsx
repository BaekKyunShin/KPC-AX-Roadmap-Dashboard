'use client';

import { Command } from 'cmdk';
import { Clock } from 'lucide-react';
import type { RecentVisit } from './types';

interface CommandRecentGroupProps {
  recentVisits: RecentVisit[];
  onSelect: (href: string) => void;
}

export default function CommandRecentGroup({
  recentVisits,
  onSelect,
}: CommandRecentGroupProps) {
  if (recentVisits.length === 0) return null;

  return (
    <Command.Group heading="최근 방문">
      {recentVisits.map((visit) => (
        <Command.Item
          key={visit.href}
          value={`recent-${visit.href}`}
          onSelect={() => onSelect(visit.href)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700"
        >
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{visit.label}</span>
        </Command.Item>
      ))}
    </Command.Group>
  );
}
