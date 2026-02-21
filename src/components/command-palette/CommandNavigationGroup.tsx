'use client';

import { Command } from 'cmdk';
import type { NavItemWithKeywords } from '@/lib/constants/navigation';

interface CommandNavigationGroupProps {
  navItems: NavItemWithKeywords[];
  onSelect: (href: string) => void;
}

export default function CommandNavigationGroup({
  navItems,
  onSelect,
}: CommandNavigationGroupProps) {
  return (
    <Command.Group heading="바로가기">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Command.Item
            key={item.href}
            value={item.href}
            keywords={item.keywords}
            onSelect={() => onSelect(item.href)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer aria-selected:bg-blue-50 aria-selected:text-blue-700"
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{item.label}</span>
          </Command.Item>
        );
      })}
    </Command.Group>
  );
}
