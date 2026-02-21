'use client';

import { Command } from 'cmdk';
import { COMMAND_ITEM_CLASS } from './types';
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
            className={COMMAND_ITEM_CLASS}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{item.label}</span>
          </Command.Item>
        );
      })}
    </Command.Group>
  );
}
