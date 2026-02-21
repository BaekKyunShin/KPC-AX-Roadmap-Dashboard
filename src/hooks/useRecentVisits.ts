'use client';

import { useState, useCallback, useEffect, startTransition } from 'react';
import { usePathname } from 'next/navigation';
import {
  CONSULTANT_NAV_ITEMS,
  ADMIN_NAV_GROUPS,
} from '@/lib/constants/navigation';
import type { RecentVisit } from '@/components/command-palette/types';

export const STORAGE_KEY = 'kpc-recent-visits';
export const MAX_RECENT = 5;

/** 등록된 네비게이션 경로 맵 (href → label) */
const NAV_PATH_MAP = new Map<string, string>();
for (const item of CONSULTANT_NAV_ITEMS) {
  NAV_PATH_MAP.set(item.href, item.label);
}
for (const group of ADMIN_NAV_GROUPS) {
  for (const item of group.items) {
    NAV_PATH_MAP.set(item.href, item.label);
  }
}

function loadVisits(): RecentVisit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentVisit[]) : [];
  } catch {
    return [];
  }
}

function saveVisits(visits: RecentVisit[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
}

export function useRecentVisits() {
  const pathname = usePathname();
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>(() =>
    loadVisits(),
  );

  const recordVisit = useCallback((href: string, label: string) => {
    setRecentVisits((prev) => {
      const filtered = prev.filter((v) => v.href !== href);
      const next = [
        { href, label, visitedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT);
      saveVisits(next);
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecentVisits([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // pathname 변경 시 등록된 경로면 자동 기록
  useEffect(() => {
    const label = NAV_PATH_MAP.get(pathname);
    if (label) {
      startTransition(() => {
        recordVisit(pathname, label);
      });
    }
  }, [pathname, recordVisit]);

  return { recentVisits, recordVisit, clearRecent };
}
