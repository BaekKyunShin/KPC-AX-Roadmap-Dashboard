import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹 — vi.hoisted로 최상단에 배치
// =============================================================================

const mockPush = vi.fn();
const mockSearchParamsGet = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

// useTransition: 기본은 isPending=false, 테스트별로 변경 가능
let isPendingMock = false;
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useTransition: () => [isPendingMock, (fn: () => void) => fn()],
  };
});

// =============================================================================
// 대상 컴포넌트 임포트
// =============================================================================

import { NoticeSearchBar } from './NoticeSearchBar';

// =============================================================================
// 테스트
// =============================================================================

describe('NoticeSearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPendingMock = false;
    // 기본: q='', filter_by=null (→ 'title' 기본값)
    mockSearchParamsGet.mockImplementation((key: string) => {
      if (key === 'q') return '';
      if (key === 'filter_by') return null;
      return null;
    });
  });

  // ---------------------------------------------------------------------------
  // 진행 표시 (isPending)
  // ---------------------------------------------------------------------------
  describe('isPending 진행 표시', () => {
    it('isPending=true 시 검색 버튼 안에 Loader2 스피너 (animate-spin) 가 표시된다', () => {
      isPendingMock = true;
      const { container } = render(<NoticeSearchBar />);
      const submitButton = screen.getByRole('button', { name: /검색/ });
      expect(submitButton.querySelector('.animate-spin')).toBeInTheDocument();
      // hint: Loader2 는 SVG 이므로 container 차원에서도 검증
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('isPending=false 시 검색 버튼 안에 스피너가 표시되지 않는다', () => {
      isPendingMock = false;
      render(<NoticeSearchBar />);
      const submitButton = screen.getByRole('button', { name: /검색/ });
      expect(submitButton.querySelector('.animate-spin')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 렌더링
  // ---------------------------------------------------------------------------
  describe('초기 렌더링', () => {
    it('data-testid="notice-search-bar" form 요소가 렌더링된다', () => {
      render(<NoticeSearchBar />);
      expect(screen.getByTestId('notice-search-bar')).toBeInTheDocument();
    });

    it('필터 탭 "제목"과 "작성자"가 모두 표시된다', () => {
      render(<NoticeSearchBar />);
      expect(screen.getByRole('tab', { name: '제목' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '작성자' })).toBeInTheDocument();
    });

    it('검색 입력창이 렌더링된다', () => {
      render(<NoticeSearchBar />);
      expect(screen.getByLabelText('검색어')).toBeInTheDocument();
    });

    it('검색 버튼이 렌더링된다', () => {
      render(<NoticeSearchBar />);
      expect(screen.getByRole('button', { name: /검색/ })).toBeInTheDocument();
    });

    it('초기 q가 없으면 초기화 버튼이 표시되지 않는다', () => {
      render(<NoticeSearchBar />);
      expect(screen.queryByLabelText('필터 초기화')).not.toBeInTheDocument();
    });

    it('q가 있으면 초기화 버튼이 표시된다', () => {
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === 'q') return 'hello';
        if (key === 'filter_by') return 'title';
        return null;
      });
      render(<NoticeSearchBar />);
      expect(screen.getByLabelText('필터 초기화')).toBeInTheDocument();
    });

    it('기본 필터(title)일 때 "제목" 탭의 aria-selected가 true다', () => {
      render(<NoticeSearchBar />);
      expect(screen.getByRole('tab', { name: '제목' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: '작성자' })).toHaveAttribute('aria-selected', 'false');
    });

    it('filter_by=author이면 "작성자" 탭의 aria-selected가 true다', () => {
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === 'q') return '';
        if (key === 'filter_by') return 'author';
        return null;
      });
      render(<NoticeSearchBar />);
      expect(screen.getByRole('tab', { name: '작성자' })).toHaveAttribute('aria-selected', 'true');
    });

    it('제목 필터일 때 플레이스홀더가 "제목으로 검색"이다', () => {
      render(<NoticeSearchBar />);
      expect(screen.getByPlaceholderText('제목으로 검색')).toBeInTheDocument();
    });

    it('작성자 필터일 때 플레이스홀더가 "작성자 이름으로 검색"이다', () => {
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === 'q') return '';
        if (key === 'filter_by') return 'author';
        return null;
      });
      render(<NoticeSearchBar />);
      expect(screen.getByPlaceholderText('작성자 이름으로 검색')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 접근성
  // ---------------------------------------------------------------------------
  describe('접근성', () => {
    it('탭 목록에 role="tablist"와 aria-label="검색 필터"가 있다', () => {
      render(<NoticeSearchBar />);
      const tablist = screen.getByRole('tablist', { name: '검색 필터' });
      expect(tablist).toBeInTheDocument();
    });

    it('검색 입력창에 aria-label="검색어"가 있다', () => {
      render(<NoticeSearchBar />);
      expect(screen.getByLabelText('검색어')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 상호작용
  // ---------------------------------------------------------------------------
  describe('상호작용', () => {
    it('검색 폼 제출 시 router.push가 q와 filter_by를 포함해 호출된다', async () => {
      const user = userEvent.setup();
      render(<NoticeSearchBar />);

      const input = screen.getByLabelText('검색어');
      await user.type(input, '안녕');
      await user.click(screen.getByRole('button', { name: /검색/ }));

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('q=%EC%95%88%EB%85%95'));
    });

    it('"작성자" 탭 클릭 시 filter_by=author로 router.push가 호출된다', async () => {
      const user = userEvent.setup();
      render(<NoticeSearchBar />);

      await user.click(screen.getByRole('tab', { name: '작성자' }));

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('filter_by=author'));
    });

    it('"제목" 탭 클릭 시 filter_by=title로 router.push가 호출된다', async () => {
      const user = userEvent.setup();
      // 작성자 탭이 선택된 상태에서 시작
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === 'q') return '';
        if (key === 'filter_by') return 'author';
        return null;
      });
      render(<NoticeSearchBar />);

      await user.click(screen.getByRole('tab', { name: '제목' }));

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('filter_by=title'));
    });

    it('초기화 버튼 클릭 시 /notices로 router.push가 호출된다', async () => {
      const user = userEvent.setup();
      mockSearchParamsGet.mockImplementation((key: string) => {
        if (key === 'q') return '검색어';
        if (key === 'filter_by') return 'title';
        return null;
      });
      render(<NoticeSearchBar />);

      await user.click(screen.getByLabelText('필터 초기화'));

      expect(mockPush).toHaveBeenCalledWith('/notices');
    });

    it('검색 시 page=1이 파라미터에 포함된다', async () => {
      const user = userEvent.setup();
      render(<NoticeSearchBar />);

      const input = screen.getByLabelText('검색어');
      await user.type(input, '테스트');
      await user.click(screen.getByRole('button', { name: /검색/ }));

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('page=1'));
    });

    it('빈 q로 검색하면 q 파라미터가 포함되지 않는다', async () => {
      const user = userEvent.setup();
      render(<NoticeSearchBar />);
      // 입력창을 비워둔 채 검색 버튼 클릭
      await user.click(screen.getByRole('button', { name: /검색/ }));

      // q가 빈 문자열이면 params.set('q', ...)가 호출되지 않아야 함
      const callArg = mockPush.mock.calls[0]?.[0] as string;
      expect(callArg).not.toMatch(/q=/);
    });
  });
});
