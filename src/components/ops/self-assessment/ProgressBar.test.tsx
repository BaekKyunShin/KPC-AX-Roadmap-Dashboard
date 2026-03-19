import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from './ProgressBar';

// ============================================================================
// 테스트
// ============================================================================

describe('ProgressBar', () => {
  describe('진행률 퍼센트 계산', () => {
    it('0/10이면 0%를 표시한다', () => {
      render(<ProgressBar answeredCount={0} totalCount={10} />);
      expect(screen.getByText('0 / 10 문항 (0%)')).toBeInTheDocument();
    });

    it('5/10이면 50%를 표시한다', () => {
      render(<ProgressBar answeredCount={5} totalCount={10} />);
      expect(screen.getByText('5 / 10 문항 (50%)')).toBeInTheDocument();
    });

    it('10/10이면 100%를 표시한다', () => {
      render(<ProgressBar answeredCount={10} totalCount={10} />);
      expect(screen.getByText('10 / 10 문항 (100%)')).toBeInTheDocument();
    });

    it('1/3이면 33%로 반올림한다', () => {
      render(<ProgressBar answeredCount={1} totalCount={3} />);
      expect(screen.getByText('1 / 3 문항 (33%)')).toBeInTheDocument();
    });

    it('2/3이면 67%로 반올림한다', () => {
      render(<ProgressBar answeredCount={2} totalCount={3} />);
      expect(screen.getByText('2 / 3 문항 (67%)')).toBeInTheDocument();
    });
  });

  describe('라벨 표시', () => {
    it('"전체 진행률" 라벨을 표시한다', () => {
      render(<ProgressBar answeredCount={3} totalCount={10} />);
      expect(screen.getByText('전체 진행률')).toBeInTheDocument();
    });

    it('문항 수 텍스트를 표시한다', () => {
      render(<ProgressBar answeredCount={7} totalCount={20} />);
      expect(screen.getByText('7 / 20 문항 (35%)')).toBeInTheDocument();
    });
  });

  describe('프로그레스 바 너비', () => {
    it('진행률에 맞는 width 스타일을 적용한다', () => {
      const { container } = render(<ProgressBar answeredCount={3} totalCount={4} />);
      const bar = container.querySelector('[style]');
      expect(bar).toHaveStyle({ width: '75%' });
    });

    it('0%일 때 width가 0%이다', () => {
      const { container } = render(<ProgressBar answeredCount={0} totalCount={5} />);
      const bar = container.querySelector('[style]');
      expect(bar).toHaveStyle({ width: '0%' });
    });

    it('100%일 때 width가 100%이다', () => {
      const { container } = render(<ProgressBar answeredCount={5} totalCount={5} />);
      const bar = container.querySelector('[style]');
      expect(bar).toHaveStyle({ width: '100%' });
    });
  });

  describe('엣지 케이스', () => {
    it('totalCount가 0이면 0%를 표시한다', () => {
      render(<ProgressBar answeredCount={0} totalCount={0} />);
      expect(screen.getByText('0 / 0 문항 (0%)')).toBeInTheDocument();
    });

    it('totalCount가 0일 때 width는 0%이다', () => {
      const { container } = render(<ProgressBar answeredCount={0} totalCount={0} />);
      const bar = container.querySelector('[style]');
      expect(bar).toHaveStyle({ width: '0%' });
    });
  });
});
