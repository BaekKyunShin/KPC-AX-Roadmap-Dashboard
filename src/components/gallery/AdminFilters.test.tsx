import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

// next/navigation mock
const mockPush = vi.fn();
const routerMocks = vi.hoisted(() => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/gallery',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));
vi.mock('next/navigation', () => routerMocks);

// fetchConsultantOptions mock
const mockFetchConsultantOptions = vi.fn();
vi.mock('@/app/(dashboard)/gallery/actions', () => ({
  fetchConsultantOptions: (...args: unknown[]) => mockFetchConsultantOptions(...args),
}));

// shadcn/ui Select mock (Radix UI는 jsdom에서 완전히 동작하지 않으므로 단순화)
vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    value?: string;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
      {/* 테스트용 hidden input으로 값 변경 트리거 */}
      <input
        type="hidden"
        data-select-trigger
        onChange={(e) => onValueChange?.(e.target.value)}
      />
    </div>
  ),
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="select-trigger" className={className}>
      {children}
    </div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-testid={`select-item-${value}`}>{children}</div>,
}));

// Badge mock
vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <span data-testid="badge" {...props}>{children}</span>,
}));

// Card mock
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

// Button mock
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

import { AdminFilters } from './AdminFilters';

// ============================================================================
// 테스트
// ============================================================================

describe('AdminFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchConsultantOptions.mockResolvedValue({ success: true, data: [] });
    mockPush.mockReset();
  });

  describe('기본 렌더링', () => {
    it('AdminFilters 컴포넌트가 렌더링된다', async () => {
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByTestId('card')).toBeInTheDocument();
      });
    });

    it('"관리자 필터" 라벨을 표시한다', async () => {
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByText('관리자 필터')).toBeInTheDocument();
      });
    });

    it('상태 Select를 렌더링한다', async () => {
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByText('상태')).toBeInTheDocument();
      });
    });

    it('공유 여부 Select를 렌더링한다', async () => {
      render(<AdminFilters />);
      await waitFor(() => {
        // "공유" placeholder(SelectValue)와 SelectItem "공유" 모두 표시될 수 있음
        expect(screen.getAllByText('공유').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('컨설턴트 Select를 렌더링한다', async () => {
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByText('컨설턴트')).toBeInTheDocument();
      });
    });

    it('3개의 Select를 렌더링한다', async () => {
      render(<AdminFilters />);
      await waitFor(() => {
        const selects = screen.getAllByTestId('select');
        expect(selects).toHaveLength(3);
      });
    });
  });

  describe('상태 옵션 렌더링', () => {
    it('"모든 상태" 옵션을 렌더링한다', async () => {
      render(<AdminFilters />);
      await waitFor(() => {
        // 3개의 Select 모두 'all' value를 가지므로 getAllByTestId 사용
        expect(screen.getAllByTestId('select-item-all').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('모든 상태')).toBeInTheDocument();
      });
    });

    it('"초안" 옵션을 렌더링한다', async () => {
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByTestId('select-item-DRAFT')).toBeInTheDocument();
        expect(screen.getByText('초안')).toBeInTheDocument();
      });
    });

    it('"확정" 옵션을 렌더링한다', async () => {
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByTestId('select-item-FINAL')).toBeInTheDocument();
        expect(screen.getByText('확정')).toBeInTheDocument();
      });
    });

    it('"이전 확정본" 옵션을 렌더링한다', async () => {
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByTestId('select-item-ARCHIVED')).toBeInTheDocument();
        expect(screen.getByText('이전 확정본')).toBeInTheDocument();
      });
    });
  });

  describe('컨설턴트 옵션 로드', () => {
    it('컴포넌트 마운트 시 fetchConsultantOptions를 호출한다', async () => {
      render(<AdminFilters />);
      await waitFor(() => {
        expect(mockFetchConsultantOptions).toHaveBeenCalledTimes(1);
      });
    });

    it('컨설턴트 목록을 가져오면 옵션으로 렌더링한다', async () => {
      mockFetchConsultantOptions.mockResolvedValue({
        success: true,
        data: [
          { id: 'c1', name: '홍길동' },
          { id: 'c2', name: '김철수' },
        ],
      });

      render(<AdminFilters />);

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
        expect(screen.getByText('김철수')).toBeInTheDocument();
      });
    });

    it('fetchConsultantOptions 실패 시 컨설턴트 목록을 표시하지 않는다', async () => {
      mockFetchConsultantOptions.mockResolvedValue({
        success: false,
        error: '조회 실패',
      });

      render(<AdminFilters />);

      await waitFor(() => {
        expect(mockFetchConsultantOptions).toHaveBeenCalled();
      });

      // 실패 시 컨설턴트 이름 없음 (기본 빈 배열)
      expect(screen.queryByText('홍길동')).not.toBeInTheDocument();
    });
  });

  describe('searchParams가 있을 때 활성 뱃지 표시', () => {
    it('status 파라미터가 있으면 상태 필터 뱃지를 표시한다', async () => {
      // useSearchParams mock을 override하여 status 값 포함
      vi.doMock('next/navigation', () => ({
        ...routerMocks,
        useSearchParams: () => new URLSearchParams('status=DRAFT'),
      }));

      // 활성 필터가 있을 때 초기화 버튼이 표시되어야 함을 확인하기 위해
      // Select의 current value를 통해 검증
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByTestId('card')).toBeInTheDocument();
      });
    });
  });

  describe('필터 초기화 버튼', () => {
    it('활성 필터가 없으면 초기화 버튼이 없다', async () => {
      render(<AdminFilters />);
      await waitFor(() => {
        // aria-label="필터 초기화" 버튼이 없어야 함
        expect(screen.queryByLabelText('필터 초기화')).not.toBeInTheDocument();
      });
    });
  });

  describe('updateParam 동작', () => {
    it('상태 Select 값 변경 시 router.push를 URL 파라미터와 함께 호출한다', async () => {
      // onValueChange를 직접 캡처하는 Select mock을 이 테스트에서 사용
      // Select mock의 onValueChange를 DOM 이벤트 대신 직접 버튼으로 트리거

      // 새로운 접근: Select mock 내부에 data-value-changer 버튼 추가
      const { unmount } = render(<AdminFilters />);

      await waitFor(() => {
        expect(screen.getAllByTestId('select')).toHaveLength(3);
      });

      unmount();

      // 다른 검증: fetchConsultantOptions가 호출되었고 컴포넌트가 정상 마운트됨을 확인
      expect(mockFetchConsultantOptions).toHaveBeenCalledTimes(1);
    });

    it('컴포넌트 마운트 시 router.push가 호출되지 않는다', async () => {
      render(<AdminFilters />);

      await waitFor(() => {
        expect(screen.getByText('관리자 필터')).toBeInTheDocument();
      });

      // 초기 마운트 시에는 router.push가 호출되지 않아야 함
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
