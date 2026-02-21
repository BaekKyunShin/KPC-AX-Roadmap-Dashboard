import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentVisits, STORAGE_KEY, MAX_RECENT } from './useRecentVisits';

// usePathname 모킹
let mockPathname = '/unregistered';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// navigation 상수 모킹 — 등록된 경로만 기록하므로
vi.mock('@/lib/constants/navigation', () => ({
  CONSULTANT_NAV_ITEMS: [
    { href: '/consultant/home', label: '대시보드', icon: () => null },
    { href: '/consultant/projects', label: '담당 프로젝트', icon: () => null },
  ],
  ADMIN_NAV_GROUPS: [
    {
      label: '워크스페이스',
      items: [
        { href: '/ops/projects', label: '프로젝트 관리', icon: () => null },
      ],
    },
  ],
}));

describe('useRecentVisits', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPathname = '/unregistered';
  });

  // ─── 기본 동작 ──────────────────────────────────────────────────────────

  test('초기 상태에서 빈 배열을 반환한다', () => {
    const { result } = renderHook(() => useRecentVisits());
    expect(result.current.recentVisits).toEqual([]);
  });

  test('recordVisit으로 방문을 기록하면 목록에 추가된다', () => {
    const { result } = renderHook(() => useRecentVisits());

    act(() => {
      result.current.recordVisit('/consultant/projects', '담당 프로젝트');
    });

    expect(result.current.recentVisits).toHaveLength(1);
    expect(result.current.recentVisits[0].href).toBe('/consultant/projects');
    expect(result.current.recentVisits[0].label).toBe('담당 프로젝트');
  });

  // ─── 최대 개수 제한 ─────────────────────────────────────────────────────

  test(`최대 ${MAX_RECENT}개까지만 유지한다`, () => {
    const { result } = renderHook(() => useRecentVisits());

    act(() => {
      for (let i = 0; i < MAX_RECENT + 2; i++) {
        result.current.recordVisit(`/page-${i}`, `페이지 ${i}`);
      }
    });

    expect(result.current.recentVisits).toHaveLength(MAX_RECENT);
  });

  test('같은 경로 재방문 시 중복 없이 맨 앞으로 이동한다', () => {
    const { result } = renderHook(() => useRecentVisits());

    act(() => {
      result.current.recordVisit('/page-a', '페이지 A');
      result.current.recordVisit('/page-b', '페이지 B');
      result.current.recordVisit('/page-a', '페이지 A');
    });

    expect(result.current.recentVisits).toHaveLength(2);
    expect(result.current.recentVisits[0].href).toBe('/page-a');
  });

  // ─── localStorage 연동 ─────────────────────────────────────────────────

  test('localStorage에 저장된다', () => {
    const { result } = renderHook(() => useRecentVisits());

    act(() => {
      result.current.recordVisit('/consultant/projects', '담당 프로젝트');
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].href).toBe('/consultant/projects');
  });

  test('localStorage에 기존 데이터가 있으면 초기화 시 읽어온다', () => {
    const existing = [
      { href: '/ops/projects', label: '프로젝트 관리', visitedAt: Date.now() },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    const { result } = renderHook(() => useRecentVisits());
    expect(result.current.recentVisits).toHaveLength(1);
    expect(result.current.recentVisits[0].href).toBe('/ops/projects');
  });

  // ─── clearRecent ──────────────────────────────────────────────────────

  test('clearRecent 호출 시 모든 방문 기록이 삭제된다', () => {
    const { result } = renderHook(() => useRecentVisits());

    act(() => {
      result.current.recordVisit('/page-a', '페이지 A');
      result.current.recordVisit('/page-b', '페이지 B');
    });
    expect(result.current.recentVisits).toHaveLength(2);

    act(() => {
      result.current.clearRecent();
    });

    expect(result.current.recentVisits).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // ─── usePathname 자동 기록 ─────────────────────────────────────────────

  test('usePathname 변경 시 등록된 경로면 자동 기록한다', () => {
    mockPathname = '/consultant/home';
    const { result, rerender } = renderHook(() => useRecentVisits());

    // 초기 렌더 시 /consultant/home이 기록됨
    expect(
      result.current.recentVisits.some((v) => v.href === '/consultant/home'),
    ).toBe(true);

    // pathname 변경
    mockPathname = '/consultant/projects';
    rerender();

    expect(
      result.current.recentVisits.some(
        (v) => v.href === '/consultant/projects',
      ),
    ).toBe(true);
  });

  test('등록되지 않은 경로는 자동 기록하지 않는다', () => {
    mockPathname = '/unknown/page';
    const { result } = renderHook(() => useRecentVisits());

    expect(result.current.recentVisits).toHaveLength(0);
  });
});
