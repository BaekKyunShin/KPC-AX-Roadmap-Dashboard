import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';
import ProjectList from './ProjectList';
import type { ProjectWithTimeline, ProjectFilterOptions } from '../actions';

// ============================================================================
// 모킹
// ============================================================================

const mockRouterReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockRouterReplace, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/ops/projects',
}));

const mockFetchProjectsWithTimeline = vi.fn();
const mockFetchProjectFilters = vi.fn();

vi.mock('../actions', async () => {
  const actual = await vi.importActual('../actions');
  return {
    ...actual,
    fetchProjectsWithTimeline: (...args: unknown[]) => mockFetchProjectsWithTimeline(...args),
    fetchProjectFilters: (...args: unknown[]) => mockFetchProjectFilters(...args),
  };
});

// MiniStepper 경량 모킹
vi.mock('./MiniStepper', () => ({
  default: ({ status }: { status: string }) => <div data-testid="mini-stepper">{status}</div>,
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
    track: 'ROADMAP',
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
  makeProject({
    id: 'proj-2',
    company_name: '베타코퍼레이션',
    industry: '제조',
    status: 'ASSIGNED',
    assigned_consultant: { id: 'c1', name: '박컨설턴트', email: 'park@test.com' },
  }),
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

    it('기업명 셀이 상세 페이지 링크로 동작한다', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        const companyAnchors = screen.getAllByText('알파주식회사').map((el) => el.closest('a'));
        const linkToDetail = companyAnchors.find(
          (a) => a?.getAttribute('href') === '/ops/projects/proj-1'
        );
        expect(linkToDetail).toBeTruthy();
      });
    });

    it('작업 열에 "삭제" 버튼이 노출된다 (상세보기 링크 대신)', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: '삭제' }).length).toBeGreaterThan(0);
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
      await waitFor(
        () => {
          expect(mockFetchProjectsWithTimeline).toHaveBeenCalledTimes(2);
        },
        { timeout: 1000 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. 빈 데이터 상태 (#4 — 운영관리 빈 목록 EmptyState 통일)
  // --------------------------------------------------------------------------
  describe('빈 데이터 상태', () => {
    it('필터 없을 때 "등록된 프로젝트가 없습니다" 제목 + "새 프로젝트 생성" 링크 노출', async () => {
      setupMocks({ projects: [], total: 0, totalPages: 0 });
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getByText('등록된 프로젝트가 없습니다')).toBeInTheDocument();
      });
      expect(screen.getByText('새 프로젝트를 생성하여 컨설턴트를 배정하세요')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /새 프로젝트 생성/ });
      expect(link).toHaveAttribute('href', '/ops/projects/new');
    });

    it('필터 활성 시 "검색 조건에 맞는 프로젝트가 없습니다" + "필터 초기화" 버튼 노출', async () => {
      setupMocks({ projects: [], total: 0, totalPages: 0 });
      // statusFilter prop 으로 외부 필터 활성화 → hasFilters=true
      render(<ProjectList statusFilter={['NEW']} />);
      await waitFor(() => {
        expect(screen.getByText('검색 조건에 맞는 프로젝트가 없습니다')).toBeInTheDocument();
      });
      expect(
        screen.getByText('필터를 초기화하거나 다른 검색어를 시도해보세요')
      ).toBeInTheDocument();
      // EmptyState 내 액션 버튼
      const resetButtons = screen.getAllByRole('button', { name: /필터 초기화/ });
      expect(resetButtons.length).toBeGreaterThan(0);
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

    it('카드 필터만 활성 상태에서 EmptyState "필터 초기화" 클릭 시 onResetCardFilter 콜백이 호출된다', async () => {
      setupMocks({ projects: [], total: 0, totalPages: 0 });
      const onResetCardFilter = vi.fn();
      render(<ProjectList statusFilter={['NEW']} onResetCardFilter={onResetCardFilter} />);
      await waitFor(() => {
        expect(screen.getByText('검색 조건에 맞는 프로젝트가 없습니다')).toBeInTheDocument();
      });
      // EmptyState 내부 outline 버튼 — 텍스트 자식 "필터 초기화"
      // (상단 ghost icon 버튼은 aria-label만 있고 텍스트 자식 없음 → getByText로 매칭 안 됨)
      const emptyStateBtn = screen.getByText('필터 초기화');
      await act(async () => {
        fireEvent.click(emptyStateBtn);
      });
      expect(onResetCardFilter).toHaveBeenCalledTimes(1);
    });

    it('카드 필터만 활성 상태에서 상단 x 아이콘 버튼 클릭 시 onResetCardFilter 콜백이 호출된다', async () => {
      setupMocks({ projects: [], total: 0, totalPages: 0 });
      const onResetCardFilter = vi.fn();
      render(<ProjectList statusFilter={['NEW']} onResetCardFilter={onResetCardFilter} />);
      await waitFor(() => {
        expect(screen.getByLabelText('필터 초기화')).toBeInTheDocument();
      });
      // 상단 ghost icon 버튼 — aria-label="필터 초기화"
      const xBtn = screen.getByLabelText('필터 초기화');
      await act(async () => {
        fireEvent.click(xBtn);
      });
      expect(onResetCardFilter).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // 6. 컬럼 정렬 — 기업명 헤더는 center, 셀은 left(아이콘 X 좌표 일관성),
  //                작업은 center(명시적 flex), 좌우 컬럼은 pl-6/pr-6 여백
  // --------------------------------------------------------------------------
  describe('컬럼 정렬', () => {
    it('데스크톱 테이블 "기업명" 헤더는 text-center 정렬이다 (시각 균형)', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByText('알파주식회사').length).toBeGreaterThan(0);
      });
      const heading = screen.getByRole('columnheader', { name: '기업명' });
      expect(heading.className).toMatch(/text-center/);
      // 헤더에 좌측 패딩 pl-6 이 적용되어야 한다
      expect(heading.className).toMatch(/pl-6/);
    });

    it('데스크톱 테이블 기업명 셀은 text-left + pl-6 (아이콘 X 좌표 일관성·테이블 좌측 여백)', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByText('알파주식회사').length).toBeGreaterThan(0);
      });
      // 기업명 링크의 가장 가까운 td (데스크톱 테이블 셀)
      const link = screen
        .getAllByText('알파주식회사')
        .find((el) => el.closest('a')?.getAttribute('href') === '/ops/projects/proj-1');
      expect(link).toBeTruthy();
      const td = link!.closest('td');
      expect(td).toBeTruthy();
      // 셀에 text-left + pl-6 클래스 존재
      expect(td!.className).toMatch(/text-left/);
      expect(td!.className).toMatch(/pl-6/);
      // 셀 직속 flex 컨테이너 (아이콘+텍스트 묶음) — justify-center 없음
      const outerFlex = td!.querySelector(':scope > .flex');
      expect(outerFlex).toBeTruthy();
      expect(outerFlex!.className).not.toMatch(/justify-center/);
      expect(outerFlex!.className).toMatch(/items-center/);
    });

    it('데스크톱 테이블 "작업" 헤더는 text-center + pr-6 정렬이다', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByText('알파주식회사').length).toBeGreaterThan(0);
      });
      const heading = screen.getByRole('columnheader', { name: '작업' });
      expect(heading.className).toMatch(/text-center/);
      expect(heading.className).toMatch(/pr-6/);
      expect(heading.className).not.toMatch(/text-right/);
    });

    it('데스크톱 테이블 작업 셀은 flex justify-center wrapper + pr-6 여백을 가진다', async () => {
      setupMocks();
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByText('알파주식회사').length).toBeGreaterThan(0);
      });
      // "삭제" 버튼의 가장 가까운 td (작업 컬럼 셀)
      const deleteButtons = screen.getAllByRole('button', { name: '삭제' });
      const deleteBtnInTd = deleteButtons.find((btn) => btn.closest('td'));
      expect(deleteBtnInTd).toBeTruthy();
      const td = deleteBtnInTd!.closest('td');
      expect(td).toBeTruthy();
      // 셀에 pr-6 클래스 존재
      expect(td!.className).toMatch(/pr-6/);
      // 셀 직속 자식 div 가 flex justify-center 인지 확인
      const wrapper = td!.querySelector(':scope > .flex');
      expect(wrapper).toBeTruthy();
      expect(wrapper!.className).toMatch(/justify-center/);
    });
  });

  // --------------------------------------------------------------------------
  // 7. statusFilter prop
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

  // --------------------------------------------------------------------------
  // 8. 로딩 중 문서 높이 보존 (스크롤 리셋 방지)
  //
  // 재조회 중 목록이 고정 5행 스켈레톤으로 교체되면 문서 높이가 급변한다.
  // 진행 중이던 스크롤 애니메이션이 그 변동에 취소되면서 스크롤이 최상단으로
  // 되돌아가는 결함이 있었다(E2E ops-projects-filter.spec.ts 재현).
  // 스켈레톤 행 수를 직전 목록 행 수에 맞춰 높이를 보존한다.
  // --------------------------------------------------------------------------
  describe('로딩 중 문서 높이 보존', () => {
    function makeProjects(count: number): ProjectWithTimeline[] {
      return Array.from({ length: count }, (_, i) =>
        makeProject({ id: `p${i}`, company_name: `기업${i}` })
      );
    }

    /** 데스크톱 테이블 본문 행 수 (스켈레톤·실제 목록 공통) */
    function desktopBodyRowCount(container: HTMLElement): number {
      return container.querySelectorAll('.hidden.md\\:block tbody tr').length;
    }

    it('재조회 로딩 중 스켈레톤 행 수가 직전 목록 행 수와 같다', async () => {
      setupMocks({ projects: makeProjects(8), total: 8, totalPages: 1 });
      const { container } = render(<ProjectList />);

      await waitFor(() => {
        // 데스크톱 테이블·모바일 카드 양쪽에 렌더되므로 getAllByText 사용
        expect(screen.getAllByText('기업0').length).toBeGreaterThan(0);
      });
      expect(desktopBodyRowCount(container)).toBe(8);

      // 다음 조회를 미완료 상태로 붙잡아 로딩 화면을 관찰한다
      mockFetchProjectsWithTimeline.mockImplementationOnce(() => new Promise(() => {}));

      const input = screen.getByPlaceholderText('회사명 또는 이메일 검색...');
      await act(async () => {
        fireEvent.change(input, { target: { value: '기업' } });
      });

      await waitFor(
        () => {
          expect(mockFetchProjectsWithTimeline).toHaveBeenCalledTimes(2);
        },
        { timeout: 1000 }
      );

      expect(desktopBodyRowCount(container)).toBe(8);
    });

    it('직전 목록이 비어 있으면 기본 5행 스켈레톤을 사용한다', async () => {
      setupMocks({ projects: [], total: 0, totalPages: 0 });
      const { container } = render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('등록된 프로젝트가 없습니다')).toBeInTheDocument();
      });

      mockFetchProjectsWithTimeline.mockImplementationOnce(() => new Promise(() => {}));

      const input = screen.getByPlaceholderText('회사명 또는 이메일 검색...');
      await act(async () => {
        fireEvent.change(input, { target: { value: '없는기업' } });
      });

      await waitFor(
        () => {
          expect(mockFetchProjectsWithTimeline).toHaveBeenCalledTimes(2);
        },
        { timeout: 1000 }
      );

      expect(desktopBodyRowCount(container)).toBe(5);
    });

    it('재조회 로딩 중에도 페이지네이션 영역이 유지된다', async () => {
      setupMocks({ projects: makeProjects(10), total: 25, totalPages: 3 });
      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '다음 페이지' })).toBeInTheDocument();
      });

      mockFetchProjectsWithTimeline.mockImplementationOnce(() => new Promise(() => {}));

      const input = screen.getByPlaceholderText('회사명 또는 이메일 검색...');
      await act(async () => {
        fireEvent.change(input, { target: { value: '기업' } });
      });

      await waitFor(
        () => {
          expect(mockFetchProjectsWithTimeline).toHaveBeenCalledTimes(2);
        },
        { timeout: 1000 }
      );

      expect(screen.getByRole('button', { name: '다음 페이지' })).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 9. URL 동기화 — 서버 왕복 없이 주소만 갱신
  //
  // page.tsx 는 이제 search·status·industry·page 를 모두 읽어 프리페치한다
  // (북마크·공유 링크로 진입했을 때 목록이 필터와 일치하도록). 하지만 그건
  // '첫 진입' 한 번뿐이고, 이후 필터 변경의 재조회는 이 컴포넌트가 Server Action
  // 으로 직접 수행한다. 그런데도 router.replace 로 주소를 바꾸면 결과가 달라지지
  // 않는 RSC 왕복(+ 전체 스캔인 fetchProjectStats)이 매번 발생하고, 그 응답은
  // initialData 가 첫 마운트에만 쓰이므로 버려진다. 게다가 그 왕복은 진행 중이던
  // 스크롤 애니메이션을 취소해 위치를 잃게 한다(PR #133). history.replaceState 로
  // 주소만 갱신한다.
  // --------------------------------------------------------------------------
  describe('URL 동기화', () => {
    it('필터 변경 시 router.replace 를 호출하지 않는다 (서버 왕복 없음)', async () => {
      setupMocks();
      render(<ProjectList />);

      await waitFor(() => {
        expect(mockFetchProjectsWithTimeline).toHaveBeenCalledTimes(1);
      });

      const input = screen.getByPlaceholderText('회사명 또는 이메일 검색...');
      await act(async () => {
        fireEvent.change(input, { target: { value: '알파' } });
      });

      await waitFor(
        () => {
          expect(mockFetchProjectsWithTimeline).toHaveBeenCalledTimes(2);
        },
        { timeout: 1000 }
      );

      expect(mockRouterReplace).not.toHaveBeenCalled();
      expect(window.location.search).toContain('search=');
    });

    it('필터 초기화 시에도 router.replace 를 호출하지 않고 쿼리를 비운다', async () => {
      setupMocks();
      render(<ProjectList statusFilter={['NEW']} onResetCardFilter={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/카드 필터/)).toBeInTheDocument();
      });

      const resetButton = screen.getByRole('button', { name: '필터 초기화' });
      await act(async () => {
        fireEvent.click(resetButton);
      });

      expect(mockRouterReplace).not.toHaveBeenCalled();
      expect(window.location.search).toBe('');
    });
  });
});
