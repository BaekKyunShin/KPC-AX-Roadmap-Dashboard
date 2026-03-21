import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';
import ProjectList from './ProjectList';
import type { ProjectWithTimeline, ProjectFilterOptions } from '../actions';

// ============================================================================
// 모킹
// ============================================================================

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/ops/projects',
}));

const mockFetchProjectsWithTimeline = vi.fn();
const mockFetchProjectFilters = vi.fn();

vi.mock('../actions', async () => {
  const actual = await vi.importActual('../actions');
  return {
    ...actual,
    fetchProjectsWithTimeline: (...args: unknown[]) =>
      mockFetchProjectsWithTimeline(...args),
    fetchProjectFilters: (...args: unknown[]) =>
      mockFetchProjectFilters(...args),
  };
});

// MiniStepper 경량 모킹
vi.mock('./MiniStepper', () => ({
  default: ({ status }: { status: string }) => (
    <div data-testid="mini-stepper">{status}</div>
  ),
}));

// ============================================================================
// 테스트 데이터
// ============================================================================

function makeProject(overrides: Partial<ProjectWithTimeline> = {}): ProjectWithTimeline {
  return {
    id: 'proj-1',
    company_name: '테스트기업',
    industry: 'IT',
    status: 'NEW',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
    contact_email: 'test@corp.com',
    assigned_consultant: null,
    days_in_current_status: 5,
    ...overrides,
  };
}

const mockProjects: ProjectWithTimeline[] = [
  makeProject({ id: 'proj-1', company_name: '알파주식회사', industry: 'IT', status: 'NEW' }),
  makeProject({ id: 'proj-2', company_name: '베타코퍼레이션', industry: '제조', status: 'ASSIGNED',
    assigned_consultant: { id: 'c1', name: '박컨설턴트', email: 'park@test.com' } }),
];

const mockFilterOptions: ProjectFilterOptions = {
  statuses: [
    { value: 'NEW', label: '신규', statuses: ['NEW'] },
    { value: 'ASSIGNED', label: '배정됨', statuses: ['ASSIGNED'] },
  ],
  industries: ['IT', '제조'],
};

// ============================================================================
// 헬퍼
// ============================================================================

function setupMocks(options?: {
  projects?: ProjectWithTimeline[];
  total?: number;
  totalPages?: number;
}) {
  mockFetchProjectsWithTimeline.mockResolvedValue({
    projects: options?.projects ?? mockProjects,
    total: options?.total ?? mockProjects.length,
    totalPages: options?.totalPages ?? 1,
    page: 1,
  });
  mockFetchProjectFilters.mockResolvedValue(mockFilterOptions);
}

// ============================================================================
// 테스트
// ============================================================================

describe('ProjectList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 초기 렌더링
  // --------------------------------------------------------------------------
  describe('초기 렌더링', () => {
    it('마운트 시 fetchProjectsWithTimeline을 호출한다', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        expect(mockFetchProjectsWithTimeline).toHaveBeenCalled();
      });
    });

    it('마운트 시 fetchProjectFilters를 호출한다', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        expect(mockFetchProjectFilters).toHaveBeenCalled();
      });
    });

    it('프로젝트 목록이 렌더링된다', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByText('알파주식회사').length).toBeGreaterThan(0);
        expect(screen.getAllByText('베타코퍼레이션').length).toBeGreaterThan(0);
      });
    });

    it('총 프로젝트 수를 표시한다', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getByText(/총 2개의 프로젝트/)).toBeInTheDocument();
      });
    });

    it('담당 컨설턴트를 표시한다', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByText('박컨설턴트').length).toBeGreaterThan(0);
      });
    });

    it('미배정 프로젝트는 "미배정"을 표시한다', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByText('미배정').length).toBeGreaterThan(0);
      });
    });

    it('상세보기 링크가 올바른 href를 갖는다', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        const links = screen.getAllByText('상세보기');
        const firstLink = links[0].closest('a');
        expect(firstLink).toHaveAttribute('href', '/ops/projects/proj-1');
      });
    });
  });

  // --------------------------------------------------------------------------
  // 2. 검색 기능
  // --------------------------------------------------------------------------
  describe('검색 기능', () => {
    it('검색 입력란이 렌더링된다', () => {
      setupMocks();
      render(<ProjectList />);
      const input = screen.getByPlaceholderText('회사명 또는 이메일 검색...');
      expect(input).toBeInTheDocument();
    });

    it('검색어 입력 시 debounce 후 fetchProjectsWithTimeline을 재호출한다', async () => {
      setupMocks();
      render(<ProjectList />);

      await waitFor(() => {
        expect(mockFetchProjectsWithTimeline).toHaveBeenCalledTimes(1);
      });

      const input = screen.getByPlaceholderText('회사명 또는 이메일 검색...');
      await act(async () => {
        fireEvent.change(input, { target: { value: '알파' } });
      });

      // debounce 300ms 이후 재호출
      await waitFor(() => {
        expect(mockFetchProjectsWithTimeline).toHaveBeenCalledTimes(2);
      }, { timeout: 1000 });
    });
  });

  // --------------------------------------------------------------------------
  // 3. 빈 데이터 상태
  // --------------------------------------------------------------------------
  describe('빈 데이터 상태', () => {
    it('프로젝트가 없으면 "프로젝트 없음" 메시지를 표시한다', async () => {
      setupMocks({ projects: [], total: 0, totalPages: 0 });
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getByText('프로젝트 없음')).toBeInTheDocument();
      });
    });

    it('프로젝트가 없으면 "등록된 프로젝트가 없습니다" 문구를 표시한다', async () => {
      setupMocks({ projects: [], total: 0, totalPages: 0 });
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getByText('등록된 프로젝트가 없습니다.')).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 4. 페이지네이션
  // --------------------------------------------------------------------------
  describe('페이지네이션', () => {
    it('totalPages가 1이면 페이지네이션 버튼이 표시되지 않는다', async () => {
      setupMocks({ total: 2, totalPages: 1 });
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByText('알파주식회사').length).toBeGreaterThan(0);
      });
      // ChevronLeft/ChevronRight 버튼 없음
      const paginationBtns = document.querySelectorAll('.flex.gap-1 button');
      expect(paginationBtns.length).toBe(0);
    });

    it('totalPages가 2 이상이면 이전/다음 버튼이 표시된다', async () => {
      const manyProjects = Array.from({ length: 10 }, (_, i) =>
        makeProject({ id: `proj-${i}`, company_name: `기업${i}` })
      );
      setupMocks({ projects: manyProjects, total: 20, totalPages: 2 });
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByText('기업0').length).toBeGreaterThan(0);
      });
      // ChevronLeft/Right 버튼 존재
      const buttons = document.querySelectorAll('.flex.gap-1 button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('다음 페이지 버튼 클릭 시 fetchProjectsWithTimeline이 page=2로 재호출된다', async () => {
      const manyProjects = Array.from({ length: 10 }, (_, i) =>
        makeProject({ id: `proj-${i}`, company_name: `기업${i}` })
      );
      setupMocks({ projects: manyProjects, total: 20, totalPages: 2 });
      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getAllByText('기업0').length).toBeGreaterThan(0);
      });

      // 숫자 페이지 버튼 "2" 클릭
      const pageBtn = screen.getByText('2');
      await act(async () => {
        fireEvent.click(pageBtn);
      });

      await waitFor(() => {
        const calls = mockFetchProjectsWithTimeline.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.page).toBe(2);
      });
    });
  });

  // --------------------------------------------------------------------------
  // 5. 필터 초기화
  // --------------------------------------------------------------------------
  describe('필터 초기화', () => {
    it('필터가 없으면 초기화 버튼이 표시되지 않는다', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByText('알파주식회사').length).toBeGreaterThan(0);
      });
      expect(screen.queryByLabelText('필터 초기화')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 6. statusFilter prop
  // --------------------------------------------------------------------------
  describe('statusFilter prop', () => {
    it('statusFilter가 있으면 카드 필터 배지를 표시한다', async () => {
      setupMocks();
      render(<ProjectList statusFilter={['NEW']} />);
      await waitFor(() => {
        expect(screen.getByText(/카드 필터/)).toBeInTheDocument();
      });
    });

    it('statusFilter가 null이면 카드 필터 배지를 표시하지 않는다', async () => {
      setupMocks();
      render(<ProjectList statusFilter={null} />);
      await waitFor(() => {
        expect(screen.queryByText(/카드 필터/)).not.toBeInTheDocument();
      });
    });
  });
});
