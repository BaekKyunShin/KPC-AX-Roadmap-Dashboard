import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import FillExampleButton from './FillExampleButton';

// =============================================================================
// 테스트
// =============================================================================

describe('FillExampleButton', () => {
  // -------------------------------------------------------------------------
  // 1. 기본 렌더링
  // -------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('"예시 채우기" 텍스트가 표시된다', () => {
      render(<FillExampleButton onClick={vi.fn()} />);

      expect(screen.getByText('예시 채우기')).toBeInTheDocument();
    });

    it('버튼 타입이 "button"이다 (폼 제출 방지)', () => {
      render(<FillExampleButton onClick={vi.fn()} />);

      const button = screen.getByRole('button', { name: /예시 채우기/ });
      expect(button).toHaveAttribute('type', 'button');
    });

    it('title 속성이 "예시 채우기"이다', () => {
      render(<FillExampleButton onClick={vi.fn()} />);

      expect(screen.getByTitle('예시 채우기')).toBeInTheDocument();
    });

    it('SVG 아이콘이 렌더링된다', () => {
      render(<FillExampleButton onClick={vi.fn()} />);

      expect(document.querySelector('svg')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 2. 클릭 콜백
  // -------------------------------------------------------------------------
  describe('클릭 콜백', () => {
    it('버튼 클릭 시 onClick이 1회 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(<FillExampleButton onClick={mockOnClick} />);

      await user.click(screen.getByRole('button', { name: /예시 채우기/ }));

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('여러 번 클릭하면 클릭한 횟수만큼 onClick이 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();

      render(<FillExampleButton onClick={mockOnClick} />);

      const button = screen.getByRole('button', { name: /예시 채우기/ });
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });
  });
});
