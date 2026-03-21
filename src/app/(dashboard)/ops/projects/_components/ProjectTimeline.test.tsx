import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProjectTimeline from './ProjectTimeline';
import type { ProjectTimeline as ProjectTimelineData } from '../actions';

// ============================================================================
// 모킹
// ============================================================================

const mockFetchProjectTimeline = vi.fn();

vi.mock('../actions', async () => {
  const actual = await vi.importActual('../actions');
  return {
    ...actual,
    fetchProjectTimeline: (...args: unknown[]) =>
      mockFetchProjectTimeline(...args),
  };
});

// ============================================================================
// 테스트 데이터
// ============================================================================

const mockTimeline: ProjectTimelineData = {
  projectId: 'proj-1',
  companyName: '테스트기업',
  currentStatus: 'ASSIGNED',
  steps: [
    { step: 'NEW', label: '신규 등록', date: '2026-03-01', isCompleted: true, isCurrent: false },
    { step: 'DIAGNOSED', label: '진단 완료', date: '2026-03-02', isCompleted: true, isCurrent: false },
    { step: 'MATCH_RECOMMENDED', label: '매칭 추천', date: '2026-03-03', isCompleted: true, isCurrent: false },
    { step: 'ASSIGNED', label: '컨설턴트 배정', date: '2026-03-04', isCompleted: false, isCurrent: true },
    { step: 'INTERVIEWED', label: '인터뷰 완료', date: null, isCompleted: false, isCurrent: false },
    { step: 'FINALIZED', label: '로드맵 확정', date: null, isCompleted: false, isCurrent: false },
  ],
  assignments: [],
};

// ============================================================================
// 테스트
// ============================================================================

describe('ProjectTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 로딩 상태
  // --------------------------------------------------------------------------
  describe('로딩 상태', () => {
    it('데이터 로딩 중 스켈레톤을 표시한다', () => {
      mockFetchProjectTimeline.mockReturnValue(new Promise(() => {}));
      render(<ProjectTimeline projectId="proj-1" />);
      // 스켈레톤 요소(animate-shimmer)가 존재해야 함
      const skeletonElements = document.querySelectorAll('.animate-shimmer');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('로딩 중에는 타임라인 단계 레이블을 표시하지 않는다', () => {
      mockFetchProjectTimeline.mockReturnValue(new Promise(() => {}));
      render(<ProjectTimeline projectId="proj-1" />);
      expect(screen.queryByText('신규 등록')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. 데이터 렌더링
  // --------------------------------------------------------------------------
  describe('데이터 렌더링', () => {
    it('타임라인 카드 헤더 "진행 타임라인"을 표시한다', async () => {
      mockFetchProjectTimeline.mockResolvedValue(mockTimeline);
      render(<ProjectTimeline projectId="proj-1" />);
      await waitFor(() => {
        expect(screen.getByText('진행 타임라인')).toBeInTheDocument();
      });
    });

    it('모든 단계 레이블을 표시한다', async () => {
      mockFetchProjectTimeline.mockResolvedValue(mockTimeline);
      render(<ProjectTimeline projectId="proj-1" />);
      await waitFor(() => {
        // 데스크톱+모바일 뷰 양쪽에 렌더링되므로 getAllByText 사용
        expect(screen.getAllByText('신규 등록').length).toBeGreaterThan(0);
        expect(screen.getAllByText('진단 완료').length).toBeGreaterThan(0);
        expect(screen.getAllByText('컨설턴트 배정').length).toBeGreaterThan(0);
        expect(screen.getAllByText('로드맵 확정').length).toBeGreaterThan(0);
      });
    });

    it('현재 단계에 "현재 단계" 배지를 표시한다', async () => {
      mockFetchProjectTimeline.mockResolvedValue(mockTimeline);
      render(<ProjectTimeline projectId="proj-1" />);
      await waitFor(() => {
        const badges = screen.getAllByText('현재 단계');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('마운트 시 projectId를 인수로 fetchProjectTimeline을 호출한다', async () => {
      mockFetchProjectTimeline.mockResolvedValue(mockTimeline);
      render(<ProjectTimeline projectId="proj-abc-123" />);
      await waitFor(() => {
        expect(mockFetchProjectTimeline).toHaveBeenCalledWith('proj-abc-123');
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. 오류/null 상태
  // --------------------------------------------------------------------------
  describe('오류/null 상태', () => {
    it('fetchProjectTimeline이 null을 반환하면 오류 메시지를 표시한다', async () => {
      mockFetchProjectTimeline.mockResolvedValue(null);
      render(<ProjectTimeline projectId="proj-1" />);
      await waitFor(() => {
        expect(screen.getByText('타임라인을 불러올 수 없습니다.')).toBeInTheDocument();
      });
    });

    it('null 반환 시에도 카드 헤더 "진행 타임라인"을 표시한다', async () => {
      mockFetchProjectTimeline.mockResolvedValue(null);
      render(<ProjectTimeline projectId="proj-1" />);
      await waitFor(() => {
        expect(screen.getByText('진행 타임라인')).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 4. 완료 단계 스타일
  // --------------------------------------------------------------------------
  describe('완료 단계', () => {
    it('모든 단계가 완료된 타임라인을 올바르게 렌더링한다', async () => {
      const allCompletedTimeline: ProjectTimelineData = {
        ...mockTimeline,
        steps: mockTimeline.steps.map((s) => ({
          ...s,
          isCompleted: true,
          isCurrent: false,
        })),
      };
      mockFetchProjectTimeline.mockResolvedValue(allCompletedTimeline);
      render(<ProjectTimeline projectId="proj-1" />);
      await waitFor(() => {
        // "현재 단계" 배지가 없어야 함
        expect(screen.queryByText('현재 단계')).not.toBeInTheDocument();
        // 모든 레이블은 표시됨
        expect(screen.getAllByText('신규 등록').length).toBeGreaterThan(0);
      });
    });

    it('아직 시작하지 않은 단계를 포함한 타임라인을 렌더링한다', async () => {
      const earlyTimeline: ProjectTimelineData = {
        ...mockTimeline,
        steps: mockTimeline.steps.map((s, i) => ({
          ...s,
          isCompleted: false,
          isCurrent: i === 0,
        })),
      };
      mockFetchProjectTimeline.mockResolvedValue(earlyTimeline);
      render(<ProjectTimeline projectId="proj-1" />);
      await waitFor(() => {
        const badges = screen.getAllByText('현재 단계');
        // 데스크톱+모바일 둘 다 렌더링되므로 2개 이상
        expect(badges.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
