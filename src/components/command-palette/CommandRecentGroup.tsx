'use client';

import { Command } from 'cmdk';
import { Clock } from 'lucide-react';
import { COMMAND_ITEM_CLASS } from './types';
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
          className={COMMAND_ITEM_CLASS}
        >
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{visit.label}</span>
        </Command.Item>
      ))}
    </Command.Group>
  );
}
