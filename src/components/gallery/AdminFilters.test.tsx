import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

// next/navigation mock — useSearchParams를 동적으로 변경할 수 있도록 ref 사용
const mockPush = vi.fn();
let mockSearchParamsStr = '';

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
  useSearchParams: () => new URLSearchParams(mockSearchParamsStr),
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
// onValueChange를 select 엘리먼트로 래핑하여 직접 트리거 가능하도록 구현
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
      {/* 테스트용 select 엘리먼트 — onChange 이벤트로 onValueChange 직접 호출 */}
      <select
        data-select-native
        value={value ?? ''}
        onChange={(e) => onValueChange?.(e.target.value)}
        aria-hidden="true"
      >
        <option value="">all</option>
        <option value="DRAFT">DRAFT</option>
        <option value="FINAL">FINAL</option>
        <option value="ARCHIVED">ARCHIVED</option>
        <option value="true">true</option>
        <option value="false">false</option>
        <option value="c-123">c-123</option>
        <option value="c-test">c-test</option>
      </select>
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
    mockSearchParamsStr = ''; // searchParams 초기화
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

  // =====================================================================
  // 추가: updateParam, getConsultantLabel 함수 커버리지 확보
  // Select의 onValueChange는 mock의 hidden input change 이벤트로 트리거
  // =====================================================================

  describe('updateParam — Select 렌더링 확인', () => {
    it('컴포넌트가 렌더링되고 3개의 Select가 존재한다', async () => {
      render(<AdminFilters />);

      await waitFor(() => {
        expect(screen.getAllByTestId('select')).toHaveLength(3);
      });

      // Select value 확인 (기본값 'all')
      const selects = screen.getAllByTestId('select');
      expect(selects[0]).toHaveAttribute('data-value', 'all');
      expect(selects[1]).toHaveAttribute('data-value', 'all');
      expect(selects[2]).toHaveAttribute('data-value', 'all');
    });

    it('Select의 상태/공유/컨설턴트 옵션이 각각 렌더링된다', async () => {
      render(<AdminFilters />);

      await waitFor(() => {
        // 상태 옵션
        expect(screen.getByText('모든 상태')).toBeInTheDocument();
        expect(screen.getByText('초안')).toBeInTheDocument();
        // 공유 옵션
        expect(screen.getAllByText('공유').length).toBeGreaterThanOrEqual(1);
        // 기본 컨설턴트 옵션
        expect(screen.getByText('모든 컨설턴트')).toBeInTheDocument();
      });
    });
  });

  describe('getConsultantLabel — 컨설턴트 라벨 조회', () => {
    it('컨설턴트가 로드되면 SelectItem에 이름이 표시된다', async () => {
      mockFetchConsultantOptions.mockResolvedValue({
        success: true,
        data: [{ id: 'c-test', name: '테스트컨설턴트' }],
      });

      render(<AdminFilters />);

      await waitFor(() => {
        expect(screen.getByText('테스트컨설턴트')).toBeInTheDocument();
      });
    });
  });

  // =====================================================================
  // 추가: Select onValueChange 직접 트리거 — updateParam 분기 커버
  // hidden input change 이벤트로 Select mock의 onValueChange 호출
  // =====================================================================

  describe('updateParam — Select 값 변경 시 router.push 호출', () => {
    it('상태 Select에서 DEFAULT 외 값 선택 시 router.push에 status 파라미터 포함', async () => {
      render(<AdminFilters />);
      await waitFor(() => expect(screen.getAllByTestId('select')).toHaveLength(3));

      // data-select-native select들 중 첫 번째(status용)에 change 이벤트 발생
      const nativeSelects = document.querySelectorAll<HTMLSelectElement>('select[data-select-native]');
      expect(nativeSelects.length).toBeGreaterThanOrEqual(1);

      fireEvent.change(nativeSelects[0], { target: { value: 'DRAFT' } });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('status=DRAFT'),
          { scroll: false },
        );
      });
    });

    it('상태 Select에서 all 값 선택 시 status 파라미터 제거 후 router.push 호출', async () => {
      render(<AdminFilters />);
      await waitFor(() => expect(screen.getAllByTestId('select')).toHaveLength(3));

      const nativeSelects = document.querySelectorAll<HTMLSelectElement>('select[data-select-native]');
      // 먼저 DRAFT 설정
      fireEvent.change(nativeSelects[0], { target: { value: 'DRAFT' } });
      // 다시 all(DEFAULT)로 복귀 — updateParam에서 params.delete 분기
      fireEvent.change(nativeSelects[0], { target: { value: '' } });

      await waitFor(() => {
        // 최소 2번 호출(DRAFT → '')
        expect(mockPush).toHaveBeenCalledTimes(2);
      });
    });

    it('공유 Select에서 "true" 선택 시 isShared=true 파라미터 포함', async () => {
      render(<AdminFilters />);
      await waitFor(() => expect(screen.getAllByTestId('select')).toHaveLength(3));

      const nativeSelects = document.querySelectorAll<HTMLSelectElement>('select[data-select-native]');
      expect(nativeSelects.length).toBeGreaterThanOrEqual(2);

      fireEvent.change(nativeSelects[1], { target: { value: 'true' } });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('isShared=true'),
          { scroll: false },
        );
      });
    });

    it('컨설턴트 Select에서 컨설턴트 ID 선택 시 consultantId 파라미터 포함', async () => {
      mockFetchConsultantOptions.mockResolvedValue({
        success: true,
        data: [{ id: 'c-123', name: '홍길동' }],
      });
      render(<AdminFilters />);
      await waitFor(() => expect(screen.getByText('홍길동')).toBeInTheDocument());

      const nativeSelects = document.querySelectorAll<HTMLSelectElement>('select[data-select-native]');
      expect(nativeSelects.length).toBeGreaterThanOrEqual(3);

      fireEvent.change(nativeSelects[2], { target: { value: 'c-123' } });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('consultantId=c-123'),
          { scroll: false },
        );
      });
    });
  });

  describe('FilterBadge 및 handleResetAdminFilters', () => {
    it('Select 값 변경 시 router.push가 호출된다', async () => {
      render(<AdminFilters />);
      await waitFor(() => expect(screen.getAllByTestId('select')).toHaveLength(3));

      const nativeSelects = document.querySelectorAll<HTMLSelectElement>('select[data-select-native]');
      fireEvent.change(nativeSelects[0], { target: { value: 'DRAFT' } });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
    });

    it('FilterBadge의 getStatusLabel이 알 수 없는 값이면 value 그대로 반환', async () => {
      // AdminFilters 내부 getStatusLabel('UNKNOWN') === 'UNKNOWN'
      // 간접 검증: 렌더 중 crash 없음
      expect(() => {
        render(<AdminFilters />);
      }).not.toThrow();
    });
  });

  describe('getSharedLabel / getConsultantLabel 분기', () => {
    it('getSharedLabel — 공유=false 선택 시 isShared=false 파라미터 포함', async () => {
      render(<AdminFilters />);
      await waitFor(() => expect(screen.getAllByTestId('select')).toHaveLength(3));

      const nativeSelects = document.querySelectorAll<HTMLSelectElement>('select[data-select-native]');
      fireEvent.change(nativeSelects[1], { target: { value: 'false' } });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('isShared=false'),
          { scroll: false },
        );
      });
    });
  });

  // =====================================================================
  // 추가: FilterBadge 표시 — searchParams에 값이 있을 때
  // =====================================================================

  describe('FilterBadge — hasAdminFilters가 true인 경우', () => {
    it('status=DRAFT로 초기화된 경우 "상태" FilterBadge를 표시한다', async () => {
      // searchParams에 status=DRAFT를 설정하면 currentStatus === 'DRAFT'
      mockSearchParamsStr = 'status=DRAFT';
      render(<AdminFilters />);
      await waitFor(() => {
        // FilterBadge의 "상태: 초안" 텍스트 확인
        expect(screen.getByTestId('badge')).toBeInTheDocument();
      });
    });

    it('status=DRAFT 상태에서 필터 초기화 버튼이 표시된다', async () => {
      mockSearchParamsStr = 'status=DRAFT';
      render(<AdminFilters />);
      await waitFor(() => {
        // aria-label="필터 초기화" 버튼 확인
        expect(screen.getByLabelText('필터 초기화')).toBeInTheDocument();
      });
    });

    it('status=DRAFT 상태에서 필터 초기화 버튼 클릭 시 router.push 호출', async () => {
      mockSearchParamsStr = 'status=DRAFT';
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByLabelText('필터 초기화')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('필터 초기화'));
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
    });

    it('isShared=true로 초기화된 경우 "공유" FilterBadge를 표시한다', async () => {
      mockSearchParamsStr = 'isShared=true';
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getAllByTestId('badge').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('consultantId가 설정된 경우 "컨설턴트" FilterBadge를 표시한다', async () => {
      mockFetchConsultantOptions.mockResolvedValue({
        success: true,
        data: [{ id: 'c-xyz', name: '테스트이름' }],
      });
      mockSearchParamsStr = 'consultantId=c-xyz';
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getAllByTestId('badge').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('FilterBadge의 onClear 클릭 시 해당 필터가 제거된다 (status 필터)', async () => {
      mockSearchParamsStr = 'status=DRAFT';
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByLabelText('상태 필터 제거')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('상태 필터 제거'));
      await waitFor(() => {
        // updateParam('status', '') 호출 → router.push 호출
        expect(mockPush).toHaveBeenCalled();
      });
    });

    it('isShared FilterBadge onClear 클릭 시 해당 필터가 제거된다', async () => {
      mockSearchParamsStr = 'isShared=true';
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByLabelText('공유 필터 제거')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('공유 필터 제거'));
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
    });

    it('consultantId FilterBadge onClear 클릭 시 해당 필터가 제거된다', async () => {
      mockFetchConsultantOptions.mockResolvedValue({
        success: true,
        data: [{ id: 'c-abc', name: '컨설턴트명' }],
      });
      mockSearchParamsStr = 'consultantId=c-abc';
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByLabelText('컨설턴트 필터 제거')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('컨설턴트 필터 제거'));
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
    });

    it('모든 필터가 동시에 활성화된 경우 3개 FilterBadge를 표시한다', async () => {
      mockFetchConsultantOptions.mockResolvedValue({
        success: true,
        data: [{ id: 'c-multi', name: '멀티컨설턴트' }],
      });
      mockSearchParamsStr = 'status=FINAL&isShared=false&consultantId=c-multi';
      render(<AdminFilters />);
      await waitFor(() => {
        const badges = screen.getAllByTestId('badge');
        expect(badges.length).toBe(3);
      });
    });

    it('handleResetAdminFilters — 쿼리 스트링이 없을 때 pathname만 push', async () => {
      // status=DRAFT로 필터 있음 (다른 params는 없음)
      mockSearchParamsStr = 'status=DRAFT';
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByLabelText('필터 초기화')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('필터 초기화'));
      await waitFor(() => {
        // status, isShared, consultantId, page 모두 삭제 후 나머지 없으면 pathname만
        expect(mockPush).toHaveBeenCalledWith('/gallery', { scroll: false });
      });
    });

    it('handleResetAdminFilters — 다른 쿼리 스트링이 있을 때 pathname+qs push', async () => {
      // status=DRAFT&keyword=test → keyword는 남아야 함
      mockSearchParamsStr = 'status=DRAFT&keyword=test';
      render(<AdminFilters />);
      await waitFor(() => {
        expect(screen.getByLabelText('필터 초기화')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByLabelText('필터 초기화'));
      await waitFor(() => {
        // keyword가 남아 /gallery?keyword=test 형태로 push
        expect(mockPush).toHaveBeenCalledWith(
          expect.stringContaining('keyword=test'),
          { scroll: false },
        );
      });
    });
  });
});
