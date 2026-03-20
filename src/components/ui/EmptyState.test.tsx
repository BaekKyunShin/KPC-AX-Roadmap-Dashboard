import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState, NoSearchResults } from './EmptyState';

// ============================================================================
// 테스트
// ============================================================================

describe('EmptyState', () => {
  describe('필수 props', () => {
    it('title을 렌더링한다', () => {
      render(<EmptyState title="데이터가 없습니다" />);
      expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument();
    });

    it('title이 h3 태그로 렌더링된다', () => {
      render(<EmptyState title="데이터가 없습니다" />);
      expect(
        screen.getByRole('heading', { level: 3, name: '데이터가 없습니다' })
      ).toBeInTheDocument();
    });
  });

  describe('기본 아이콘', () => {
    it('icon prop이 없으면 기본 SVG 아이콘을 렌더링한다', () => {
      render(<EmptyState title="빈 상태" />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('icon prop이 있으면 커스텀 아이콘을 렌더링한다', () => {
      const CustomIcon = () => <div data-testid="custom-icon">아이콘</div>;
      render(<EmptyState title="빈 상태" icon={<CustomIcon />} />);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('icon prop이 있으면 기본 SVG 아이콘을 렌더링하지 않는다', () => {
      const CustomIcon = () => <div data-testid="custom-icon">아이콘</div>;
      render(<EmptyState title="빈 상태" icon={<CustomIcon />} />);
      const svg = document.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });
  });

  describe('description prop', () => {
    it('description이 있으면 표시한다', () => {
      render(<EmptyState title="빈 상태" description="조건에 맞는 항목이 없습니다." />);
      expect(screen.getByText('조건에 맞는 항목이 없습니다.')).toBeInTheDocument();
    });

    it('description이 없으면 설명 텍스트를 표시하지 않는다', () => {
      render(<EmptyState title="빈 상태" />);
      // description p 태그가 없어야 함
      const paragraphs = document.querySelectorAll('p');
      expect(paragraphs).toHaveLength(0);
    });
  });

  describe('action prop', () => {
    it('action이 있으면 렌더링한다', () => {
      const ActionButton = () => <button>새 항목 추가</button>;
      render(<EmptyState title="빈 상태" action={<ActionButton />} />);
      expect(screen.getByText('새 항목 추가')).toBeInTheDocument();
    });

    it('action이 없으면 액션 영역을 렌더링하지 않는다', () => {
      render(<EmptyState title="빈 상태" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('action 버튼이 클릭 가능하다', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <EmptyState
          title="빈 상태"
          action={<button onClick={onClick}>클릭</button>}
        />
      );

      await user.click(screen.getByText('클릭'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('전체 props 조합', () => {
    it('모든 props를 함께 렌더링한다', () => {
      render(
        <EmptyState
          title="결과 없음"
          description="검색 조건을 변경해보세요."
          action={<button>초기화</button>}
          icon={<span data-testid="icon">아이콘</span>}
        />
      );
      expect(screen.getByText('결과 없음')).toBeInTheDocument();
      expect(screen.getByText('검색 조건을 변경해보세요.')).toBeInTheDocument();
      expect(screen.getByText('초기화')).toBeInTheDocument();
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// NoSearchResults 테스트
// ============================================================================

describe('NoSearchResults', () => {
  describe('기본 렌더링', () => {
    it('기본 메시지를 표시한다', () => {
      render(<NoSearchResults />);
      expect(
        screen.getByText('검색 조건에 맞는 결과가 없습니다.')
      ).toBeInTheDocument();
    });

    it('커스텀 message를 표시한다', () => {
      render(<NoSearchResults message="프로젝트가 없습니다." />);
      expect(screen.getByText('프로젝트가 없습니다.')).toBeInTheDocument();
    });
  });

  describe('초기화 버튼', () => {
    it('onReset이 있으면 "필터 초기화" 버튼을 표시한다', () => {
      render(<NoSearchResults onReset={vi.fn()} />);
      expect(screen.getByText('필터 초기화')).toBeInTheDocument();
    });

    it('onReset이 없으면 초기화 버튼을 표시하지 않는다', () => {
      render(<NoSearchResults />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('초기화 버튼 클릭 시 onReset을 호출한다', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();
      render(<NoSearchResults onReset={onReset} />);

      await user.click(screen.getByText('필터 초기화'));
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });
});
