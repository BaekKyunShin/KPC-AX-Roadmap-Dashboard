import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockPathname = '/gallery';
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

const mockFetchGalleryRoadmaps = vi.fn();

vi.mock('../actions', () => ({
  fetchGalleryRoadmaps: (...args: unknown[]) => mockFetchGalleryRoadmaps(...args),
  fetchGalleryItems: (...args: unknown[]) => mockFetchGalleryRoadmaps(...args),
}));

vi.mock('@/components/gallery/GalleryCard', () => ({
  GalleryCard: ({ item }: { item: { id: string; title: string } }) => (
    <div data-testid={`gallery-card-${item.id}`}>{item.title}</div>
  ),
}));

vi.mock('@/components/gallery/AdminFilters', () => ({
  AdminFilters: () => <div data-testid="admin-filters">관리자 필터</div>,
}));

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <div data-testid="empty-state">
      <p>{title}</p>
      {description && <p>{description}</p>}
    </div>
  ),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange: _onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button data-testid="select-trigger" className={className}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({
    value,
    children,
    onClick,
  }: {
    value: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button data-testid={`select-item-${value}`} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/Pagination', () => ({
  Pagination: ({
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
  }) =>
    totalPages > 1 ? (
      <div data-testid="pagination">
        <span data-testid="pagination-info">
          {currentPage}/{totalPages} (총 {totalItems}건)
        </span>
        <button data-testid="pagination-next" onClick={() => onPageChange(currentPage + 1)}>
          다음
        </button>
      </div>
    ) : null,
}));

import React from 'react';
import { GalleryContent } from './GalleryContent';
import type { GalleryRoadmapItem } from '../actions';

// ─── 테스트 데이터 ────────────────────────────────────────────────────────────

const mockItems: GalleryRoadmapItem[] = [
  {
    id: 'rv-1',
    track: 'ROADMAP',
    title: '제조업 AI 로드맵',
    industry: '제조업',
    companySize: '50-299',
    companyName: '테스트 제조회사',
    diagnosisSummary: '진단 요약 1',
    pblCourseName: 'PBL 과정 1',
    pblTotalHours: 16,
    tags: ['AI', '자동화'],
    createdBy: 'consultant-1',
    createdByName: '홍길동',
    likeCount: 5,
    isLiked: false,
    isShared: true,
    status: 'FINAL',
    createdAt: '2026-03-21T00:00:00Z',
  },
  {
    id: 'rv-2',
    track: 'ROADMAP',
    title: '서비스업 AI 로드맵',
    industry: '서비스업',
    companySize: '10-49',
    companyName: '테스트 서비스회사',
    diagnosisSummary: '진단 요약 2',
    pblCourseName: 'PBL 과정 2',
    pblTotalHours: 24,
    tags: ['AI', '고객서비스'],
    createdBy: 'consultant-2',
    createdByName: '김철수',
    likeCount: 3,
    isLiked: true,
    isShared: true,
    status: 'FINAL',
    createdAt: '2026-03-20T00:00:00Z',
  },
];

// ─── 테스트 ────────────────────────────────────────────────────────────────────

describe('GalleryContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 빈 searchParams 리셋
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
    mockFetchGalleryRoadmaps.mockResolvedValue({
      success: true,
      data: { items: mockItems, total: mockItems.length, totalPages: 1, page: 1 },
    });
  });

  describe('기본 렌더링', () => {
    it('검색 입력 필드가 표시된다', async () => {
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('검색 (기업명, 업종, 키워드...)')).toBeInTheDocument();
      });
    });

    it('업종 필터 SelectValue placeholder가 표시된다', async () => {
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByText('업종')).toBeInTheDocument();
      });
    });

    it('정렬 SelectValue placeholder가 표시된다', async () => {
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByText('정렬')).toBeInTheDocument();
      });
    });
  });

  describe('데이터 로딩', () => {
    it('fetchGalleryRoadmaps 성공 시 카드 목록이 표시된다', async () => {
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByTestId('gallery-card-rv-1')).toBeInTheDocument();
        expect(screen.getByTestId('gallery-card-rv-2')).toBeInTheDocument();
      });
    });

    it('fetchGalleryRoadmaps가 호출된다', async () => {
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(mockFetchGalleryRoadmaps).toHaveBeenCalledTimes(1);
      });
    });

    it('빈 결과이고 필터 없을 때 빈 갤러리 EmptyState가 표시된다', async () => {
      mockFetchGalleryRoadmaps.mockResolvedValue({
        success: true,
        data: { items: [], total: 0, totalPages: 0, page: 1 },
      });
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
        expect(screen.getByText('아직 공유된 산출물이 없습니다')).toBeInTheDocument();
      });
    });

    // 로딩 자리표시자를 항상 4개만 그리면, 12장을 보고 있다가 페이지를 넘길 때
    // 문서가 반토막 나고 브라우저가 스크롤을 최상단으로 끌어내린다(목록이 다시
    // 채워져도 위치는 돌아오지 않는다). 자리표시자가 직전 목록 높이를 지켜야 한다.
    it('로딩 중 자리표시자 개수가 직전 목록 개수와 같다', async () => {
      const twelveItems = Array.from({ length: 12 }, (_, i) => ({
        ...mockItems[0],
        id: `rv-seed-${i}`,
      }));
      // 응답을 붙잡아 로딩 상태를 유지시킨다
      mockFetchGalleryRoadmaps.mockReturnValue(new Promise(() => {}));

      const initialData = {
        items: twelveItems,
        total: 12,
        totalPages: 2,
        page: 1,
      };

      const { rerender } = render(
        <GalleryContent isAdmin={false} searchParams={{}} initialData={initialData} />
      );

      // 첫 마운트는 프리페치 데이터를 쓰므로 fetch 를 건너뛴다 → 파라미터를 바꿔 로딩 유발
      mockSearchParams.set('page', '2');
      rerender(
        <GalleryContent isAdmin={false} searchParams={{ page: '2' }} initialData={initialData} />
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('gallery-card-skeleton')).toHaveLength(12);
      });
    });

    it('직전 목록이 비어 있으면 자리표시자를 기본 개수만큼 그린다', async () => {
      mockFetchGalleryRoadmaps.mockReturnValue(new Promise(() => {}));
      render(<GalleryContent isAdmin={false} searchParams={{}} />);

      await waitFor(() => {
        expect(screen.getAllByTestId('gallery-card-skeleton')).toHaveLength(4);
      });
    });
  });

  describe('관리자 필터', () => {
    it('isAdmin이 true이면 AdminFilters가 표시된다', async () => {
      render(<GalleryContent isAdmin={true} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByTestId('admin-filters')).toBeInTheDocument();
      });
    });

    it('isAdmin이 false이면 AdminFilters가 표시되지 않는다', async () => {
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.queryByTestId('admin-filters')).not.toBeInTheDocument();
      });
    });

    it('isAdmin이 false (컨설턴트)면 ScopeFilter「내 산출물」 토글이 표시된다', async () => {
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByTestId('scope-filter')).toBeInTheDocument();
      });
    });

    it('isAdmin이 true이면 ScopeFilter「내 산출물」 토글이 표시되지 않는다 (운영관리자·시스템관리자는 산출물 작성자가 아님)', async () => {
      render(<GalleryContent isAdmin={true} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.queryByTestId('scope-filter')).not.toBeInTheDocument();
      });
    });
  });

  describe('검색 기능', () => {
    it('검색어 입력 시 router.push가 호출된다', async () => {
      const user = userEvent.setup();
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/검색/)).toBeInTheDocument();
      });
      const searchInput = screen.getByPlaceholderText(/검색/);
      await user.type(searchInput, '제조업');
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
    });
  });

  describe('필터 초기화', () => {
    it('필터가 없으면 초기화 버튼이 표시되지 않는다', async () => {
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        // 필터 없는 초기 상태
        expect(screen.queryByRole('button', { name: '필터 초기화' })).not.toBeInTheDocument();
      });
    });
  });

  describe('카드 목록 표시', () => {
    it('로드맵 제목이 카드에 표시된다', async () => {
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByText('제조업 AI 로드맵')).toBeInTheDocument();
        expect(screen.getByText('서비스업 AI 로드맵')).toBeInTheDocument();
      });
    });
  });

  describe('페이지네이션', () => {
    it('totalPages > 1일 때 Pagination 컴포넌트가 렌더링된다', async () => {
      mockFetchGalleryRoadmaps.mockResolvedValue({
        success: true,
        data: { items: mockItems, total: 25, totalPages: 3, page: 1 },
      });
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByTestId('pagination')).toBeInTheDocument();
        expect(screen.getByTestId('pagination-info')).toHaveTextContent('1/3 (총 25건)');
      });
    });

    // 로딩 중 페이지네이션이 사라지면 그만큼 문서가 짧아져, 목록 하단에서 페이지를
    // 넘길 때 브라우저가 스크롤을 최상단으로 끌어내린다. 전환 중에도 자리를 지켜야 한다.
    it('로딩 중에도 Pagination이 사라지지 않는다', async () => {
      const initialData = {
        items: mockItems,
        total: 25,
        totalPages: 3,
        page: 1,
      };
      mockFetchGalleryRoadmaps.mockReturnValue(new Promise(() => {}));

      const { rerender } = render(
        <GalleryContent isAdmin={false} searchParams={{}} initialData={initialData} />
      );
      expect(screen.getByTestId('pagination')).toBeInTheDocument();

      mockSearchParams.set('page', '2');
      rerender(
        <GalleryContent isAdmin={false} searchParams={{ page: '2' }} initialData={initialData} />
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('gallery-card-skeleton').length).toBeGreaterThan(0);
      });
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });

    it('totalPages <= 1일 때 Pagination이 렌더링되지 않는다', async () => {
      mockFetchGalleryRoadmaps.mockResolvedValue({
        success: true,
        data: { items: mockItems, total: 2, totalPages: 1, page: 1 },
      });
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByTestId('gallery-card-rv-1')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
    });

    it('페이지 변경 시 URL 파라미터가 업데이트된다', async () => {
      const user = userEvent.setup();
      mockFetchGalleryRoadmaps.mockResolvedValue({
        success: true,
        data: { items: mockItems, total: 25, totalPages: 3, page: 1 },
      });
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByTestId('pagination-next')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('pagination-next'));
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('page=2'), { scroll: false });
      });
    });
  });
});
