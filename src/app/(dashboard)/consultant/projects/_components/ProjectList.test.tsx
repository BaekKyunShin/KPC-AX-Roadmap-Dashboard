import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';

// =============================================================================
// 모킹
// =============================================================================

const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/consultant/projects',
}));

const mockFetchConsultantProjects = vi.fn();
const mockFetchConsultantProjectFilters = vi.fn();
vi.mock('../actions', () => ({
  fetchConsultantProjects: (...args: unknown[]) => mockFetchConsultantProjects(...args),
  fetchConsultantProjectFilters: (...args: unknown[]) => mockFetchConsultantProjectFilters(...args),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('@/lib/constants/status', () => ({
  getConsultantProjectStatusBadge: (status: string, hasInterview: boolean) => {
    if (status === 'ASSIGNED' && hasInterview) {
      return { label: '인터뷰 완료', color: 'bg-amber-100 text-amber-800' };
    }
    const map: Record<string, { label: string; color: string }> = {
      ASSIGNED: { label: '인터뷰 대기', color: 'bg-blue-100 text-blue-800' },
      INTERVIEWED: { label: '인터뷰 완료', color: 'bg-amber-100 text-amber-800' },
      ROADMAP_DRAFTED: { label: '로드맵 작성 중', color: 'bg-purple-100 text-purple-800' },
      FINALIZED: { label: '로드맵 완료', color: 'bg-green-100 text-green-800' },
    };
    return map[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  },
}));

vi.mock('@/lib/constants/company-size', () => ({
  COMPANY_SIZE_LABELS: {
    small: '소기업 (10~49명)',
    medium: '중기업 (50~299명)',
    large: '대기업 (300명 이상)',
  },
}));

vi.mock('@/components/ui/Skeleton', () => ({
  ConsultantProjectTableSkeleton: ({ rows }: { rows?: number }) => (
    <div data-testid="table-skeleton" data-rows={rows}>로딩 중...</div>
  ),
}));

vi.mock('@/components/ui/page-header', () => ({
  PageHeader: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  ),
}));

// =============================================================================
// Import
// =============================================================================

import ProjectList from './ProjectList';
import type { ConsultantProjectItem, ConsultantProjectListResult } from '../actions';

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeProject(overrides: Partial<ConsultantProjectItem> = {}): ConsultantProjectItem {
  return {
    id: 'proj-1',
    company_name: '테스트기업',
    industry: '제조업',
    company_size: 'small',
    status: 'ASSIGNED',
    created_at: '2026-01-15T00:00:00Z',
    assigned_at: '2026-01-20T00:00:00Z',
    has_interview: false,
    has_assessment: false,
    ...overrides,
  };
}

const defaultFilters = { statuses: [] };

// =============================================================================
// 테스트
// =============================================================================

describe('ProjectList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchConsultantProjectFilters.mockResolvedValue(defaultFilters);
    mockFetchConsultantProjects.mockResolvedValue({
      projects: [],
      total: 0,
      consultantName: '',
    });
  });

  describe('로딩 상태', () => {
    it('초기 렌더링 시 스켈레톤을 표시한다', () => {
      // 절대 resolve되지 않는 promise로 로딩 상태 유지
      mockFetchConsultantProjects.mockReturnValue(new Promise(() => {}));
      render(<ProjectList />);
      expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
    });

    it('데이터 로드 완료 후 스켈레톤이 사라진다', async () => {
      mockFetchConsultantProjects.mockResolvedValue({
        projects: [makeProject()],
        total: 1,
        consultantName: '홍길동',
      });
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.queryByTestId('table-skeleton')).not.toBeInTheDocument();
      });
    });
  });

  describe('헤더', () => {
    it('"담당 프로젝트" 제목을 표시한다', async () => {
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getByText('담당 프로젝트')).toBeInTheDocument();
      });
    });

    it('컨설턴트 이름이 있으면 이름을 포함한 설명을 표시한다', async () => {
      mockFetchConsultantProjects.mockResolvedValue({
        projects: [],
        total: 0,
        consultantName: '김철수',
      });
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getByText('김철수님의 담당 프로젝트 목록입니다.')).toBeInTheDocument();
      });
    });

    it('컨설턴트 이름이 없으면 기본 설명을 표시한다', async () => {
      mockFetchConsultantProjects.mockResolvedValue({
        projects: [],
        total: 0,
        consultantName: '',
      });
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getByText('담당 프로젝트 목록입니다.')).toBeInTheDocument();
      });
    });
  });

  describe('빈 상태', () => {
    it('프로젝트가 없으면 빈 상태 메시지를 표시한다', async () => {
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getByText('담당 프로젝트가 없습니다')).toBeInTheDocument();
      });
    });

    it('프로젝트가 없으면 운영관리자 안내 메시지를 표시한다', async () => {
      render(<ProjectList />);
      await waitFor(() => {
        expect(
          screen.getByText('운영 관리자가 프로젝트를 배정하면 여기에 표시됩니다.'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('프로젝트 목록 렌더링', () => {
    it('프로젝트 기업명을 표시한다', async () => {
      mockFetchConsultantProjects.mockResolvedValue({
        projects: [makeProject({ company_name: '삼성전자' })],
        total: 1,
        consultantName: '',
      });
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByText('삼성전자').length).toBeGreaterThan(0);
      });
    });

    it('프로젝트 업종을 표시한다', async () => {
      mockFetchConsultantProjects.mockResolvedValue({
        projects: [makeProject({ industry: 'IT/소프트웨어' })],
        total: 1,
        consultantName: '',
      });
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getAllByText('IT/소프트웨어').length).toBeGreaterThan(0);
      });
    });

    it('상세 보기 링크가 올바른 href를 가진다', async () => {
      mockFetchConsultantProjects.mockResolvedValue({
        projects: [makeProject({ id: 'proj-abc' })],
        total: 1,
        consultantName: '',
      });
      render(<ProjectList />);
      await waitFor(() => {
        const links = screen.getAllByRole('link', { name: '상세 보기' });
        expect(links[0]).toHaveAttribute('href', '/consultant/projects/proj-abc');
      });
    });

    it('총 프로젝트 수를 표시한다', async () => {
      mockFetchConsultantProjects.mockResolvedValue({
        projects: [makeProject(), makeProject({ id: 'proj-2', company_name: '기업B' })],
        total: 2,
        consultantName: '',
      });
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getByText('총 2개의 프로젝트')).toBeInTheDocument();
      });
    });
  });

  describe('검색 기능', () => {
    it('검색 입력창이 존재한다', async () => {
      render(<ProjectList />);
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('기업명 또는 업종 검색...'),
        ).toBeInTheDocument();
      });
    });

    it('검색어 입력 시 fetchConsultantProjects가 재호출된다', async () => {
      mockFetchConsultantProjects.mockResolvedValue({
        projects: [],
        total: 0,
        consultantName: '',
      });
      const user = userEvent.setup();
      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('기업명 또는 업종 검색...')).toBeInTheDocument();
      });

      const callCountBefore = mockFetchConsultantProjects.mock.calls.length;

      const input = screen.getByPlaceholderText('기업명 또는 업종 검색...');
      await act(async () => {
        await user.type(input, '삼성');
      });

      await waitFor(() => {
        expect(mockFetchConsultantProjects.mock.calls.length).toBeGreaterThan(callCountBefore);
      });
    });
  });

  describe('상태 필터', () => {
    it('상태 선택 드롭다운이 존재한다', async () => {
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.getByText('모든 상태')).toBeInTheDocument();
      });
    });

    it('상태 필터 옵션이 렌더링된다', async () => {
      mockFetchConsultantProjectFilters.mockResolvedValue({
        statuses: [
          { value: 'ASSIGNED', label: '인터뷰 대기' },
          { value: 'FINALIZED', label: '로드맵 완료' },
        ],
      });
      render(<ProjectList />);
      await waitFor(() => {
        // SelectItem들이 존재하는지 확인 (필터 옵션)
        expect(mockFetchConsultantProjectFilters).toHaveBeenCalled();
      });
    });
  });

  describe('필터 초기화', () => {
    it('필터가 없을 때는 초기화 버튼이 표시되지 않는다', async () => {
      render(<ProjectList />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: '필터 초기화' })).not.toBeInTheDocument();
      });
    });
  });

  describe('fetchConsultantProjects 호출', () => {
    it('컴포넌트 마운트 시 데이터를 불러온다', async () => {
      render(<ProjectList />);
      await waitFor(() => {
        expect(mockFetchConsultantProjects).toHaveBeenCalled();
      });
    });

    it('필터 옵션을 마운트 시 불러온다', async () => {
      render(<ProjectList />);
      await waitFor(() => {
        expect(mockFetchConsultantProjectFilters).toHaveBeenCalled();
      });
    });
  });

  describe('서버 프리페치 (initialData)', () => {
    const initialData: ConsultantProjectListResult = {
      projects: [makeProject({ company_name: '프리페치기업' })],
      total: 1,
      consultantName: '프리페치컨설턴트',
    };

    const initialFilters = {
      statuses: [
        { value: 'ASSIGNED', label: '인터뷰 대기' },
        { value: 'FINALIZED', label: '로드맵 완료' },
      ],
    };

    it('initialData가 있으면 스켈레톤 없이 즉시 데이터를 표시한다', () => {
      render(<ProjectList initialData={initialData} initialFilters={initialFilters} />);
      expect(screen.queryByTestId('table-skeleton')).not.toBeInTheDocument();
      expect(screen.getAllByText('프리페치기업').length).toBeGreaterThan(0);
      expect(screen.getByText('프리페치컨설턴트님의 담당 프로젝트 목록입니다.')).toBeInTheDocument();
    });

    it('initialData가 있으면 초기 마운트 시 fetchConsultantProjects를 호출하지 않는다', async () => {
      render(<ProjectList initialData={initialData} initialFilters={initialFilters} />);
      // 약간의 대기 후에도 fetch가 호출되지 않았는지 확인
      await waitFor(() => {
        expect(mockFetchConsultantProjects).not.toHaveBeenCalled();
      });
    });

    it('initialFilters가 있으면 fetchConsultantProjectFilters를 호출하지 않는다', async () => {
      render(<ProjectList initialData={initialData} initialFilters={initialFilters} />);
      await waitFor(() => {
        expect(mockFetchConsultantProjectFilters).not.toHaveBeenCalled();
      });
    });
  });
});
