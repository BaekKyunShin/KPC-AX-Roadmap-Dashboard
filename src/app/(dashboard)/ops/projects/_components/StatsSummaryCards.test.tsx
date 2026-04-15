import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StatsSummaryCards from './StatsSummaryCards';
import type { ProjectStats } from '../actions';

// ============================================================================
// 모킹
// ============================================================================

const mockFetchProjectStats = vi.fn<() => Promise<ProjectStats>>();

vi.mock('../actions', async () => {
  const actual = await vi.importActual('../actions');
  return {
    ...actual,
    fetchProjectStats: (...args: unknown[]) => mockFetchProjectStats(...args as []),
  };
});

// ============================================================================
// 테스트 데이터
// ============================================================================

const mockStats: ProjectStats = {
  total: 15,
  byStatus: {
    NEW: 3,
    DIAGNOSED: 2,
    MATCH_RECOMMENDED: 1,
    ASSIGNED: 4,
    INTERVIEWED: 2,
    ROADMAP_DRAFTED: 1,
    FINALIZED: 2,
  },
};

// ============================================================================
// 테스트
// ============================================================================

describe('StatsSummaryCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 로딩 상태
  // --------------------------------------------------------------------------
  describe('로딩 상태', () => {
    it('데이터 로딩 중 스켈레톤 shimmer 요소를 표시한다', () => {
      mockFetchProjectStats.mockReturnValue(new Promise(() => {}));

      const { container } = render(<StatsSummaryCards />);
      expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. 카드 렌더링
  // --------------------------------------------------------------------------
  describe('카드 렌더링', () => {
    it('로드 후 전체 프로젝트 카드를 표시한다', async () => {
      mockFetchProjectStats.mockResolvedValue(mockStats);
      render(<StatsSummaryCards />);
      await waitFor(() => {
        expect(screen.getByText('전체 프로젝트')).toBeInTheDocument();
      });
    });

    it('전체 프로젝트 수 15를 표시한다', async () => {
      mockFetchProjectStats.mockResolvedValue(mockStats);
      render(<StatsSummaryCards />);
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
      });
    });

    it('7개의 버튼(카드)을 렌더링한다', async () => {
      mockFetchProjectStats.mockResolvedValue(mockStats);
      render(<StatsSummaryCards />);
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBe(7);
      });
    });

    it('모든 워크플로우 단계 라벨을 표시한다', async () => {
      mockFetchProjectStats.mockResolvedValue(mockStats);
      render(<StatsSummaryCards />);
      await waitFor(() => {
        expect(screen.getByText('신규 등록 완료')).toBeInTheDocument();
        expect(screen.getByText('진단결과 입력 완료')).toBeInTheDocument();
        expect(screen.getByText('컨설턴트 배정 완료')).toBeInTheDocument();
        expect(screen.getByText('현장 인터뷰 완료')).toBeInTheDocument();
        expect(screen.getByText('초안 완료')).toBeInTheDocument();
        expect(screen.getByText('최종 확정')).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. 카운트 계산
  // --------------------------------------------------------------------------
  describe('카운트 계산', () => {
    it('진단결과 단계 수를 DIAGNOSED + MATCH_RECOMMENDED 합산으로 표시한다', async () => {
      mockFetchProjectStats.mockResolvedValue(mockStats);
      render(<StatsSummaryCards />);
      await waitFor(() => {
        // DIAGNOSED(2) + MATCH_RECOMMENDED(1) = 3
        const buttons = screen.getAllByRole('button');
        const diagnosedBtn = buttons.find(btn => btn.textContent?.includes('진단결과 입력 완료'));
        expect(diagnosedBtn?.textContent).toMatch('3');
      });
    });

    it('FINALIZED 카운트를 2로 표시한다', async () => {
      mockFetchProjectStats.mockResolvedValue(mockStats);
      render(<StatsSummaryCards />);
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const finalizedBtn = buttons.find(btn => btn.textContent?.includes('최종 확정'));
        expect(finalizedBtn?.textContent).toMatch('2');
      });
    });
  });

  // --------------------------------------------------------------------------
  // 4. 상호작용
  // --------------------------------------------------------------------------
  describe('상호작용', () => {
    it('onStatusFilter가 없어도 카드 클릭 시 에러가 발생하지 않는다', async () => {
      mockFetchProjectStats.mockResolvedValue(mockStats);
      render(<StatsSummaryCards />);
      await waitFor(() => {
        expect(screen.getAllByRole('button').length).toBe(7);
      });
      expect(() => {
        fireEvent.click(screen.getAllByRole('button')[0]);
      }).not.toThrow();
    });

    it('전체 프로젝트 카드 클릭 시 onStatusFilter(null)을 호출한다', async () => {
      mockFetchProjectStats.mockResolvedValue(mockStats);
      const onStatusFilter = vi.fn();
      render(<StatsSummaryCards onStatusFilter={onStatusFilter} />);
      await waitFor(() => {
        expect(screen.getByText('전체 프로젝트')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const totalBtn = buttons.find(btn => btn.textContent?.includes('전체 프로젝트'));
      fireEvent.click(totalBtn!);

      expect(onStatusFilter).toHaveBeenCalledWith(null);
    });

    it('특정 상태 카드 클릭 시 onStatusFilter에 해당 statuses 배열을 전달한다', async () => {
      mockFetchProjectStats.mockResolvedValue(mockStats);
      const onStatusFilter = vi.fn();
      render(<StatsSummaryCards onStatusFilter={onStatusFilter} />);
      await waitFor(() => {
        expect(screen.getByText('신규 등록 완료')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      const newBtn = buttons.find(btn => btn.textContent?.includes('신규 등록 완료'));
      fireEvent.click(newBtn!);

      expect(onStatusFilter).toHaveBeenCalledWith(['NEW']);
    });
  });

  // --------------------------------------------------------------------------
  // 5. activeStatuses prop
  // --------------------------------------------------------------------------
  describe('activeStatuses prop', () => {
    it('activeStatuses가 null일 때 전체 프로젝트 카드가 활성화된다', async () => {
      mockFetchProjectStats.mockResolvedValue(mockStats);
      render(<StatsSummaryCards activeStatuses={null} />);
      await waitFor(() => {
        expect(screen.getAllByRole('button').length).toBe(7);
      });
      // 전체 프로젝트 버튼에 활성 border 클래스가 있는지 확인
      const buttons = screen.getAllByRole('button');
      const totalBtn = buttons.find(btn => btn.textContent?.includes('전체 프로젝트'));
      expect(totalBtn?.className).toMatch(/border-slate-400/);
    });

    it('activeStatuses가 특정 상태로 설정되면 해당 카드가 활성화된다', async () => {
      mockFetchProjectStats.mockResolvedValue(mockStats);
      render(<StatsSummaryCards activeStatuses={['NEW']} />);
      await waitFor(() => {
        expect(screen.getAllByRole('button').length).toBe(7);
      });
      const buttons = screen.getAllByRole('button');
      const newBtn = buttons.find(btn => btn.textContent?.includes('신규 등록 완료'));
      expect(newBtn?.className).toMatch(/border-gray-400/);
    });
  });

  // --------------------------------------------------------------------------
  // 6. 빈 데이터
  // --------------------------------------------------------------------------
  describe('빈 데이터', () => {
    it('stats가 비어있어도 0을 표시한다', async () => {
      mockFetchProjectStats.mockResolvedValue({ total: 0, byStatus: {} });
      render(<StatsSummaryCards />);
      await waitFor(() => {
        expect(screen.getByText('전체 프로젝트')).toBeInTheDocument();
      });
      const buttons = screen.getAllByRole('button');
      const totalBtn = buttons.find(btn => btn.textContent?.includes('전체 프로젝트'));
      expect(totalBtn?.textContent).toMatch('0');
    });
  });

  // --------------------------------------------------------------------------
  // 7. initialStats prop (중복 호출 제거)
  // --------------------------------------------------------------------------
  describe('initialStats prop', () => {
    it('initialStats가 전달되면 fetchProjectStats를 호출하지 않는다', async () => {
      render(<StatsSummaryCards initialStats={mockStats} />);
      await waitFor(() => {
        expect(screen.getByText('전체 프로젝트')).toBeInTheDocument();
      });
      expect(mockFetchProjectStats).not.toHaveBeenCalled();
    });

    it('initialStats가 전달되면 해당 데이터로 카드를 렌더링한다', async () => {
      render(<StatsSummaryCards initialStats={mockStats} />);
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('전체 프로젝트')).toBeInTheDocument();
      });
    });

    it('initialStats가 없으면 기존처럼 fetchProjectStats를 호출한다', async () => {
      mockFetchProjectStats.mockResolvedValue(mockStats);
      render(<StatsSummaryCards />);
      await waitFor(() => {
        expect(mockFetchProjectStats).toHaveBeenCalledTimes(1);
      });
    });
  });
});
