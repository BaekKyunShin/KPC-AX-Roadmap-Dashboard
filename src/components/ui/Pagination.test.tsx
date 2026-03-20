import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Pagination } from './Pagination';

// ============================================================================
// 기본 props 팩토리
// ============================================================================

interface PaginationTestProps {
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  maxVisiblePages?: number;
}

function makePaginationProps(overrides: PaginationTestProps = {}) {
  return {
    currentPage: 1,
    totalPages: 10,
    totalItems: 100,
    itemsPerPage: 10,
    onPageChange: vi.fn(),
    ...overrides,
  };
}

// ============================================================================
// 테스트
// ============================================================================

describe('Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('null 렌더링 조건', () => {
    it('totalPages가 1이면 null을 반환한다', () => {
      const { container } = render(<Pagination {...makePaginationProps({ totalPages: 1 })} />);
      expect(container.firstChild).toBeNull();
    });

    it('totalPages가 0이면 null을 반환한다', () => {
      const { container } = render(<Pagination {...makePaginationProps({ totalPages: 0 })} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('페이지 번호 렌더링', () => {
    it('현재 페이지 기준으로 최대 5개 페이지 번호를 렌더링한다', () => {
      render(<Pagination {...makePaginationProps({ currentPage: 1, totalPages: 10 })} />);
      // 기본 maxVisiblePages=5
      const pageButtons = screen.getAllByRole('button').filter((btn) => /^\d+$/.test(btn.textContent || ''));
      expect(pageButtons).toHaveLength(5);
    });

    it('totalPages가 maxVisiblePages보다 작으면 전체 페이지 버튼을 표시한다', () => {
      render(
        <Pagination {...makePaginationProps({ currentPage: 1, totalPages: 3, totalItems: 30 })} />
      );
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('현재 페이지 번호 버튼이 활성 스타일을 가진다', () => {
      render(<Pagination {...makePaginationProps({ currentPage: 3, totalPages: 10 })} />);
      const currentPageBtn = screen.getByText('3');
      expect(currentPageBtn).toHaveClass('bg-blue-600');
    });

    it('다른 페이지 번호 버튼은 비활성 스타일을 가진다', () => {
      render(<Pagination {...makePaginationProps({ currentPage: 1, totalPages: 10 })} />);
      const otherPageBtn = screen.getByText('2');
      expect(otherPageBtn).not.toHaveClass('bg-blue-600');
    });
  });

  describe('이전/다음 버튼', () => {
    it('"처음", "이전", "다음", "마지막" 버튼을 렌더링한다', () => {
      render(<Pagination {...makePaginationProps()} />);
      expect(screen.getByText('처음')).toBeInTheDocument();
      expect(screen.getByText('이전')).toBeInTheDocument();
      expect(screen.getByText('다음')).toBeInTheDocument();
      expect(screen.getByText('마지막')).toBeInTheDocument();
    });
  });

  describe('disabled 상태', () => {
    it('첫 페이지에서 "처음" 버튼이 disabled이다', () => {
      render(<Pagination {...makePaginationProps({ currentPage: 1 })} />);
      expect(screen.getByText('처음')).toBeDisabled();
    });

    it('첫 페이지에서 "이전" 버튼이 disabled이다', () => {
      render(<Pagination {...makePaginationProps({ currentPage: 1 })} />);
      expect(screen.getByText('이전')).toBeDisabled();
    });

    it('마지막 페이지에서 "다음" 버튼이 disabled이다', () => {
      render(<Pagination {...makePaginationProps({ currentPage: 10, totalPages: 10 })} />);
      expect(screen.getByText('다음')).toBeDisabled();
    });

    it('마지막 페이지에서 "마지막" 버튼이 disabled이다', () => {
      render(<Pagination {...makePaginationProps({ currentPage: 10, totalPages: 10 })} />);
      expect(screen.getByText('마지막')).toBeDisabled();
    });

    it('중간 페이지에서 모든 네비게이션 버튼이 활성화된다', () => {
      render(<Pagination {...makePaginationProps({ currentPage: 5, totalPages: 10 })} />);
      expect(screen.getByText('처음')).not.toBeDisabled();
      expect(screen.getByText('이전')).not.toBeDisabled();
      expect(screen.getByText('다음')).not.toBeDisabled();
      expect(screen.getByText('마지막')).not.toBeDisabled();
    });
  });

  describe('페이지 클릭 콜백', () => {
    it('페이지 번호 클릭 시 onPageChange를 해당 번호로 호출한다', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(<Pagination {...makePaginationProps({ currentPage: 1, onPageChange })} />);

      await user.click(screen.getByText('2'));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('"다음" 버튼 클릭 시 currentPage + 1로 호출한다', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(<Pagination {...makePaginationProps({ currentPage: 3, onPageChange })} />);

      await user.click(screen.getByText('다음'));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('"이전" 버튼 클릭 시 currentPage - 1로 호출한다', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(<Pagination {...makePaginationProps({ currentPage: 5, onPageChange })} />);

      await user.click(screen.getByText('이전'));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('"처음" 버튼 클릭 시 1페이지로 호출한다', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(<Pagination {...makePaginationProps({ currentPage: 7, onPageChange })} />);

      await user.click(screen.getByText('처음'));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('"마지막" 버튼 클릭 시 totalPages로 호출한다', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(<Pagination {...makePaginationProps({ currentPage: 3, totalPages: 10, onPageChange })} />);

      await user.click(screen.getByText('마지막'));
      expect(onPageChange).toHaveBeenCalledWith(10);
    });
  });

  describe('페이지 정보 표시', () => {
    it('현재 범위와 전체 항목 수를 표시한다', () => {
      render(
        <Pagination
          {...makePaginationProps({
            currentPage: 1,
            totalPages: 5,
            totalItems: 50,
            itemsPerPage: 10,
          })}
        />
      );
      // startItem=1, endItem=10, totalItems=50
      expect(screen.getByText(/1 - 10 \/ 50/)).toBeInTheDocument();
    });

    it('마지막 페이지에서 올바른 범위를 표시한다', () => {
      render(
        <Pagination
          {...makePaginationProps({
            currentPage: 5,
            totalPages: 5,
            totalItems: 48,
            itemsPerPage: 10,
          })}
        />
      );
      // startItem=41, endItem=48 (Math.min(50, 48))
      expect(screen.getByText(/41 - 48 \/ 48/)).toBeInTheDocument();
    });
  });

  describe('maxVisiblePages 옵션', () => {
    it('maxVisiblePages=3이면 3개의 페이지 번호만 표시한다', () => {
      render(
        <Pagination
          {...makePaginationProps({ currentPage: 5, totalPages: 10, maxVisiblePages: 3 })}
        />
      );
      const pageButtons = screen.getAllByRole('button').filter((btn) => /^\d+$/.test(btn.textContent || ''));
      expect(pageButtons).toHaveLength(3);
    });
  });
});
