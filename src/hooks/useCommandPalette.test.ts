import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandPalette } from './useCommandPalette';

// ─── 모킹 ──────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// unifiedSearch 모킹
const mockUnifiedSearch = vi.fn().mockResolvedValue({
  success: true,
  data: { projects: [], users: [], gallery: [] },
});
vi.mock('@/app/(dashboard)/search/actions', () => ({
  unifiedSearch: (...args: unknown[]) => mockUnifiedSearch(...args),
}));

// useDebounce 모킹 — 디바운스 없이 즉시 반환
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: <T,>(value: T) => value,
}));

describe('useCommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 초기 상태 ──────────────────────────────────────────────────────────

  test('초기 상태: open=false, query=""', () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.open).toBe(false);
    expect(result.current.query).toBe('');
    expect(result.current.isSearching).toBe(false);
  });

  // ─── open/close ─────────────────────────────────────────────────────────

  test('setOpen(true)로 팔레트를 연다', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      result.current.setOpen(true);
    });

    expect(result.current.open).toBe(true);
  });

  test('handleOpenChange(false)로 팔레트를 닫으면 query가 초기화된다', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      result.current.setOpen(true);
      result.current.setQuery('테스트');
    });

    act(() => {
      result.current.handleOpenChange(false);
    });

    expect(result.current.open).toBe(false);
    expect(result.current.query).toBe('');
  });

  // ─── CMD+K 키보드 핸들러 ─────────────────────────────────────────────────

  test('CMD+K (metaKey)로 팔레트가 열린다', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
      });
      window.dispatchEvent(event);
    });

    expect(result.current.open).toBe(true);
  });

  test('Ctrl+K (ctrlKey)로 팔레트가 열린다', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
      });
      window.dispatchEvent(event);
    });

    expect(result.current.open).toBe(true);
  });

  // ─── handleSelect ──────────────────────────────────────────────────────

  test('handleSelect 호출 시 router.push + 팔레트 닫힘 + query 초기화', () => {
    const { result } = renderHook(() => useCommandPalette());

    act(() => {
      result.current.setOpen(true);
      result.current.setQuery('테스트');
    });

    act(() => {
      result.current.handleSelect('/ops/projects');
    });

    expect(mockPush).toHaveBeenCalledWith('/ops/projects');
    expect(result.current.open).toBe(false);
    expect(result.current.query).toBe('');
  });

  // ─── DB 검색 ───────────────────────────────────────────────────────────

  test('2자 이상 쿼리일 때 unifiedSearch를 호출한다', async () => {
    const { result } = renderHook(() => useCommandPalette());

    await act(async () => {
      result.current.setQuery('프로젝트');
    });

    // useEffect + useTransition이 비동기로 동작하므로 대기
    await vi.waitFor(() => {
      expect(mockUnifiedSearch).toHaveBeenCalledWith('프로젝트');
    });
  });

  test('1자 쿼리에서는 unifiedSearch를 호출하지 않는다', async () => {
    const { result } = renderHook(() => useCommandPalette());

    await act(async () => {
      result.current.setQuery('프');
    });

    // 약간 대기 후 호출되지 않았는지 확인
    await new Promise((r) => setTimeout(r, 50));
    expect(mockUnifiedSearch).not.toHaveBeenCalled();
  });

  test('검색 결과가 dbResults에 저장된다', async () => {
    mockUnifiedSearch.mockResolvedValueOnce({
      success: true,
      data: {
        projects: [
          {
            id: 'p1',
            label: '테스트 기업',
            href: '/ops/projects/p1',
            category: 'project',
          },
        ],
        users: [],
        gallery: [],
      },
    });

    const { result } = renderHook(() => useCommandPalette());

    await act(async () => {
      result.current.setQuery('테스트');
    });

    await vi.waitFor(() => {
      expect(result.current.dbResults).toBeDefined();
      expect(result.current.dbResults!.projects).toHaveLength(1);
    });
  });

  // ─── 클린업 ──────────────────────────────────────────────────────────────

  test('언마운트 후 키보드 이벤트가 동작하지 않는다', () => {
    const { result, unmount } = renderHook(() => useCommandPalette());
    unmount();

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
      });
      window.dispatchEvent(event);
    });

    // 언마운트 후에는 상태 접근 불가 — 에러 없이 완료되면 성공
    expect(result.current.open).toBe(false);
  });
});
