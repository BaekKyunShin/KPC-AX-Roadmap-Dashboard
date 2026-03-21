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
    onValueChange,
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
  SelectTrigger: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <button data-testid="select-trigger" className={className}>{children}</button>,
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

import React from 'react';
import { GalleryContent } from './GalleryContent';
import type { GalleryRoadmapItem } from '../actions';

// ─── 테스트 데이터 ────────────────────────────────────────────────────────────

const mockItems: GalleryRoadmapItem[] = [
  {
    id: 'rv-1',
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
    mockFetchGalleryRoadmaps.mockResolvedValue({ success: true, data: mockItems });
  });

  describe('기본 렌더링', () => {
    it('검색 입력 필드가 표시된다', async () => {
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('로드맵 검색 (기업명, 업종, 키워드...)')
        ).toBeInTheDocument();
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
      mockFetchGalleryRoadmaps.mockResolvedValue({ success: true, data: [] });
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
        expect(screen.getByText('아직 공유된 로드맵이 없습니다')).toBeInTheDocument();
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
  });

  describe('검색 기능', () => {
    it('검색어 입력 시 router.push가 호출된다', async () => {
      const user = userEvent.setup();
      render(<GalleryContent isAdmin={false} searchParams={{}} />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/로드맵 검색/)).toBeInTheDocument();
      });
      const searchInput = screen.getByPlaceholderText(/로드맵 검색/);
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
});
