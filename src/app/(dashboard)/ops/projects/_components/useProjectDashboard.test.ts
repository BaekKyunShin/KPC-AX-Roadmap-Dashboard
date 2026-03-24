import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProjectDashboard } from './useProjectDashboard';
import type {
  ProjectStats,
  MonthlyCompletion,
  ConsultantProgress,
  StalledProject,
} from '../actions';

// ============================================================================
// 모킹
// ============================================================================

const mockFetchProjectStats = vi.fn<() => Promise<ProjectStats>>();
const mockFetchMonthlyCompletions = vi.fn<() => Promise<MonthlyCompletion[]>>();
const mockFetchConsultantProgress = vi.fn<() => Promise<ConsultantProgress[]>>();
const mockFetchStalledProjects = vi.fn<() => Promise<StalledProject[]>>();

vi.mock('../actions', async () => {
  const actual = await vi.importActual('../actions');
  return {
    ...actual,
    fetchProjectStats: (...args: unknown[]) => mockFetchProjectStats(...(args as [])),
    fetchMonthlyCompletions: (...args: unknown[]) => mockFetchMonthlyCompletions(...(args as [])),
    fetchConsultantProgress: (...args: unknown[]) => mockFetchConsultantProgress(...(args as [])),
    fetchStalledProjects: (...args: unknown[]) => mockFetchStalledProjects(...(args as [])),
  };
});

// ============================================================================
// 테스트 데이터
// ============================================================================

const mockStats: ProjectStats = {
  total: 10,
  byStatus: { NEW: 3, DIAGNOSED: 2, FINALIZED: 5 },
};

const mockMonthly: MonthlyCompletion[] = [
  { month: '2026-03', label: '3월', count: 2 },
];

const mockConsultant: ConsultantProgress[] = [
  {
    id: 'c1',
    name: '김컨설턴트',
    email: 'kim@test.com',
    assigned: 1,
    interviewing: 0,
    drafting: 0,
    completed: 1,
    total: 2,
  },
];

const mockStalled: StalledProject[] = [
  {
    id: 'p1',
    company_name: '정체기업',
    contact_email: 'a@test.com',
    status: 'ASSIGNED',
    days_stalled: 20,
    assigned_consultant: null,
    severity: 'medium',
  },
];

// ============================================================================
// 헬퍼
// ============================================================================

function setupMocks() {
  mockFetchProjectStats.mockResolvedValue(mockStats);
  mockFetchMonthlyCompletions.mockResolvedValue(mockMonthly);
  mockFetchConsultantProgress.mockResolvedValue(mockConsultant);
  mockFetchStalledProjects.mockResolvedValue(mockStalled);
}

// ============================================================================
// 테스트
// ============================================================================

describe('useProjectDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 기본 동작 (initialStats 없음)
  // --------------------------------------------------------------------------
  describe('initialStats 없이 호출', () => {
    it('4개 fetch 함수를 모두 호출한다', async () => {
      setupMocks();
      renderHook(() => useProjectDashboard());

      await waitFor(() => {
        expect(mockFetchProjectStats).toHaveBeenCalledTimes(1);
        expect(mockFetchMonthlyCompletions).toHaveBeenCalledTimes(1);
        expect(mockFetchConsultantProgress).toHaveBeenCalledTimes(1);
        expect(mockFetchStalledProjects).toHaveBeenCalledTimes(1);
      });
    });

    it('로드 완료 후 stats 데이터를 반환한다', async () => {
      setupMocks();
      const { result } = renderHook(() => useProjectDashboard());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats).toEqual(mockStats);
    });
  });

  // --------------------------------------------------------------------------
  // 2. initialStats가 전달된 경우
  // --------------------------------------------------------------------------
  describe('initialStats가 전달된 경우', () => {
    it('fetchProjectStats를 호출하지 않는다', async () => {
      setupMocks();
      renderHook(() => useProjectDashboard(mockStats));

      await waitFor(() => {
        expect(mockFetchMonthlyCompletions).toHaveBeenCalledTimes(1);
      });

      expect(mockFetchProjectStats).not.toHaveBeenCalled();
    });

    it('나머지 3개 fetch 함수는 호출한다', async () => {
      setupMocks();
      renderHook(() => useProjectDashboard(mockStats));

      await waitFor(() => {
        expect(mockFetchMonthlyCompletions).toHaveBeenCalledTimes(1);
        expect(mockFetchConsultantProgress).toHaveBeenCalledTimes(1);
        expect(mockFetchStalledProjects).toHaveBeenCalledTimes(1);
      });
    });

    it('전달된 stats를 그대로 반환한다', async () => {
      setupMocks();
      const { result } = renderHook(() => useProjectDashboard(mockStats));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.stats).toEqual(mockStats);
    });
  });
});
