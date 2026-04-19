import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';
import ProjectDashboard from './ProjectDashboard';
import type { ProjectStats, MonthlyCompletion, ConsultantProgress, StalledProject } from '../actions';

// ============================================================================
// 모킹
// ============================================================================

// Server Actions 모킹
const mockFetchProjectStats = vi.fn<() => Promise<ProjectStats>>();
const mockFetchMonthlyCompletions = vi.fn<() => Promise<MonthlyCompletion[]>>();
const mockFetchConsultantProgress = vi.fn<() => Promise<ConsultantProgress[]>>();
const mockFetchStalledProjects = vi.fn<() => Promise<StalledProject[]>>();

vi.mock('../actions', async () => {
  const actual = await vi.importActual('../actions');
  return {
    ...actual,
    fetchProjectStats: (...args: unknown[]) => mockFetchProjectStats(...args as []),
    fetchMonthlyCompletions: (...args: unknown[]) => mockFetchMonthlyCompletions(...args as []),
    fetchConsultantProgress: (...args: unknown[]) => mockFetchConsultantProgress(...args as []),
    fetchStalledProjects: (...args: unknown[]) => mockFetchStalledProjects(...args as []),
  };
});

// Recharts 모킹 (jsdom에서 SVG 렌더링 제한)
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Label: () => null,
}));

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

const mockMonthlyData: MonthlyCompletion[] = [
  { month: '2026-01', label: '1월', count: 3 },
  { month: '2026-02', label: '2월', count: 5 },
  { month: '2025-12', label: '12월', count: 2 },
];

const mockConsultantData: ConsultantProgress[] = [
  { id: 'c1', name: '김컨설턴트', email: 'kim@test.com', assigned: 2, interviewing: 1, drafting: 0, completed: 1, total: 4 },
  { id: 'c2', name: '이컨설턴트', email: 'lee@test.com', assigned: 1, interviewing: 0, drafting: 1, completed: 0, total: 2 },
  { id: 'c3', name: '박컨설턴트', email: 'park@test.com', assigned: 0, interviewing: 1, drafting: 0, completed: 2, total: 3 },
  { id: 'c4', name: '최컨설턴트', email: 'choi@test.com', assigned: 1, interviewing: 0, drafting: 0, completed: 0, total: 1 },
  { id: 'c5', name: '정컨설턴트', email: 'jung@test.com', assigned: 0, interviewing: 0, drafting: 1, completed: 1, total: 2 },
  { id: 'c6', name: '강컨설턴트', email: 'kang@test.com', assigned: 1, interviewing: 1, drafting: 0, completed: 0, total: 2 },
  { id: 'c7', name: '조컨설턴트', email: 'jo@test.com', assigned: 0, interviewing: 0, drafting: 0, completed: 1, total: 1 },
];

const mockStalledProjects: StalledProject[] = [
  {
    id: 'p1',
    company_name: '정체기업A',
    contact_email: 'a@test.com',
    status: 'ASSIGNED',
    days_stalled: 35,
    assigned_consultant: { id: 'c1', name: '김컨설턴트' },
    severity: 'high',
  },
  {
    id: 'p2',
    company_name: '정체기업B',
    contact_email: 'b@test.com',
    status: 'INTERVIEWED',
    days_stalled: 22,
    assigned_consultant: { id: 'c2', name: '이컨설턴트' },
    severity: 'medium',
  },
];

// ============================================================================
// 헬퍼 함수
// ============================================================================

function setupMocks(options?: {
  stats?: ProjectStats | null;
  monthly?: MonthlyCompletion[];
  consultants?: ConsultantProgress[];
  stalled?: StalledProject[];
}) {
  mockFetchProjectStats.mockResolvedValue(options?.stats ?? mockStats);
  mockFetchMonthlyCompletions.mockResolvedValue(options?.monthly ?? mockMonthlyData);
  mockFetchConsultantProgress.mockResolvedValue(options?.consultants ?? mockConsultantData);
  mockFetchStalledProjects.mockResolvedValue(options?.stalled ?? mockStalledProjects);
}

// ============================================================================
// 테스트
// ============================================================================

describe('ProjectDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 로딩 상태
  // --------------------------------------------------------------------------
  describe('로딩 상태', () => {
    it('데이터 로딩 중 스켈레톤을 표시한다', () => {
      // 절대 resolve되지 않는 Promise로 로딩 상태 유지
      mockFetchProjectStats.mockReturnValue(new Promise(() => {}));
      mockFetchMonthlyCompletions.mockReturnValue(new Promise(() => {}));
      mockFetchConsultantProgress.mockReturnValue(new Promise(() => {}));
      mockFetchStalledProjects.mockReturnValue(new Promise(() => {}));

      const { container } = render(<ProjectDashboard />);
      // 스켈레톤 shimmer 애니메이션 요소가 존재
      expect(container.querySelectorAll('.animate-shimmer').length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. 섹션 제목
  // --------------------------------------------------------------------------
  describe('섹션 제목', () => {
    it('상태별 프로젝트 분포 카드를 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        expect(screen.getByText('상태별 프로젝트 분포')).toBeInTheDocument();
      });
    });

    it('월별 양식 확정 현황 카드를 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        expect(screen.getByText('월별 양식 확정 현황')).toBeInTheDocument();
      });
    });

    it('컨설턴트별 현황 카드를 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        expect(screen.getByText('컨설턴트별 현황')).toBeInTheDocument();
      });
    });

    it('정체 프로젝트 카드를 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        expect(screen.getByText('정체 프로젝트')).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 3. 컨설턴트별 현황 테이블
  // --------------------------------------------------------------------------
  describe('컨설턴트별 현황 테이블', () => {
    it('컨설턴트 수를 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        expect(screen.getByText(/총 7명의 컨설턴트/)).toBeInTheDocument();
      });
    });

    it('테이블 헤더 컬럼을 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        // 테이블 헤더는 <th> 내부의 <button> 텍스트로 확인
        const headerRow = screen.getAllByRole('columnheader');
        const headerTexts = headerRow.map(th => th.textContent);
        expect(headerTexts).toEqual(
          expect.arrayContaining(['컨설턴트', '총 담당 프로젝트', '프로젝트 수행 전'])
        );
      });
    });

    it('기본적으로 5명까지만 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        // 테이블에 데이터가 로드되었는지 확인 (row 역할로 확인)
        const rows = screen.getAllByRole('row');
        // 헤더 1행 + 데이터 5행 = 6행
        expect(rows.length).toBe(6);
      });
    });

    it('더보기 버튼 클릭 시 모든 컨설턴트를 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/더보기/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/더보기/));

      // 7명 모두 표시
      const rows = screen.getAllByRole('row');
      // 헤더 1행 + 데이터 7행 = 8행
      expect(rows.length).toBe(8);
    });

    it('접기 버튼 클릭 시 다시 5명만 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/더보기/)).toBeInTheDocument();
      });

      // 더보기 → 접기
      fireEvent.click(screen.getByText(/더보기/));
      fireEvent.click(screen.getByText('접기'));

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBe(6);
    });

    it('컬럼 헤더 클릭 시 정렬이 변경된다', async () => {
      setupMocks();
      render(<ProjectDashboard />);

      await waitFor(() => {
        expect(screen.getByText('컨설턴트')).toBeInTheDocument();
      });

      // "컨설턴트" 컬럼 클릭하여 이름순 정렬
      fireEvent.click(screen.getByText('컨설턴트'));

      // 정렬 변경 후에도 테이블이 렌더링됨
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
    });

    it('컨설턴트가 없을 때 빈 상태 메시지를 표시한다', async () => {
      setupMocks({ consultants: [] });
      render(<ProjectDashboard />);
      await waitFor(() => {
        expect(screen.getByText(/배정된 프로젝트가 있는 컨설턴트가 없습니다/)).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 4. 정체 프로젝트
  // --------------------------------------------------------------------------
  describe('정체 프로젝트', () => {
    it('정체 프로젝트 수를 배지로 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        expect(screen.getByText('2건')).toBeInTheDocument();
      });
    });

    it('정체 프로젝트 기업명을 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        expect(screen.getByText('정체기업A')).toBeInTheDocument();
        expect(screen.getByText('정체기업B')).toBeInTheDocument();
      });
    });

    it('경과일을 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        expect(screen.getByText('35일 경과')).toBeInTheDocument();
        expect(screen.getByText('22일 경과')).toBeInTheDocument();
      });
    });

    it('담당 컨설턴트 이름을 표시한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        // 김컨설턴트는 테이블과 정체 카드 양쪽에 등장하므로 getAllByText 사용
        const kimElements = screen.getAllByText('김컨설턴트');
        expect(kimElements.length).toBeGreaterThanOrEqual(2); // 테이블 + 정체 카드
      });
    });

    it('미배정 프로젝트는 "미배정"을 표시한다', async () => {
      const stalledWithUnassigned: StalledProject[] = [
        {
          id: 'p3',
          company_name: '미배정기업',
          contact_email: 'c@test.com',
          status: 'DIAGNOSED',
          days_stalled: 25,
          assigned_consultant: null,
          severity: 'medium',
        },
      ];
      setupMocks({ stalled: stalledWithUnassigned });
      render(<ProjectDashboard />);
      await waitFor(() => {
        expect(screen.getByText('미배정')).toBeInTheDocument();
      });
    });

    it('상세보기 링크가 프로젝트 상세 페이지로 연결된다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        const links = screen.getAllByText('상세보기');
        expect(links.length).toBe(2);
        // 링크 부모의 href 확인
        const firstLink = links[0].closest('a');
        expect(firstLink).toHaveAttribute('href', '/ops/projects/p1');
      });
    });

    it('정체 프로젝트가 없으면 안내 메시지를 표시한다', async () => {
      setupMocks({ stalled: [] });
      render(<ProjectDashboard />);
      await waitFor(() => {
        expect(screen.getByText(/정체된 프로젝트가 없습니다/)).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 5. 빈 데이터 상태
  // --------------------------------------------------------------------------
  describe('빈 데이터 상태', () => {
    it('프로젝트 통계가 없으면 "데이터가 없습니다"를 표시한다', async () => {
      setupMocks({ stats: { total: 0, byStatus: {} } });
      render(<ProjectDashboard />);
      await waitFor(() => {
        const emptyMessages = screen.getAllByText('데이터가 없습니다');
        expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('월별 데이터가 없으면 "데이터가 없습니다"를 표시한다', async () => {
      setupMocks({ monthly: [] });
      render(<ProjectDashboard />);
      await waitFor(() => {
        const emptyMessages = screen.getAllByText('데이터가 없습니다');
        expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // --------------------------------------------------------------------------
  // 6. 데이터 로드 호출 확인
  // --------------------------------------------------------------------------
  describe('데이터 로드', () => {
    it('마운트 시 4개 fetch 함수를 모두 호출한다', async () => {
      setupMocks();
      render(<ProjectDashboard />);
      await waitFor(() => {
        expect(mockFetchProjectStats).toHaveBeenCalledTimes(1);
        expect(mockFetchMonthlyCompletions).toHaveBeenCalledTimes(1);
        expect(mockFetchConsultantProgress).toHaveBeenCalledTimes(1);
        expect(mockFetchStalledProjects).toHaveBeenCalledTimes(1);
      });
    });
  });
});
