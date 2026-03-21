import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SummaryCards } from './SummaryCards';

const defaultProps = {
  total: 10,
  waitingInterview: 3,
  interviewDone: 2,
  draftingRoadmap: 4,
  roadmapCompleted: 1,
};

describe('SummaryCards', () => {
  describe('카드 렌더링', () => {
    it('5개의 카드가 모두 렌더링된다', () => {
      const { container } = render(<SummaryCards {...defaultProps} />);
      // 5개 카드 — 각각 독립 div
      const cards = container.querySelectorAll('.border-l-4');
      expect(cards).toHaveLength(5);
    });

    it('전체 프로젝트 카드에 올바른 값을 표시한다', () => {
      render(<SummaryCards {...defaultProps} />);
      expect(screen.getByText('전체 프로젝트')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('인터뷰 대기 카드에 올바른 값을 표시한다', () => {
      render(<SummaryCards {...defaultProps} />);
      expect(screen.getByText('인터뷰 대기')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('인터뷰 완료 카드에 올바른 값을 표시한다', () => {
      render(<SummaryCards {...defaultProps} />);
      expect(screen.getByText('인터뷰 완료')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('로드맵 작성 중 카드에 올바른 값을 표시한다', () => {
      render(<SummaryCards {...defaultProps} />);
      expect(screen.getByText('로드맵 작성 중')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('로드맵 완료 카드에 올바른 값을 표시한다', () => {
      render(<SummaryCards {...defaultProps} />);
      expect(screen.getByText('로드맵 완료')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('값이 0일 때', () => {
    it('모든 값이 0이어도 정상 렌더링된다', () => {
      render(
        <SummaryCards
          total={0}
          waitingInterview={0}
          interviewDone={0}
          draftingRoadmap={0}
          roadmapCompleted={0}
        />,
      );
      const zeros = screen.getAllByText('0');
      expect(zeros).toHaveLength(5);
    });
  });

  describe('큰 숫자 렌더링', () => {
    it('세 자리 이상의 숫자도 렌더링된다', () => {
      render(
        <SummaryCards
          {...defaultProps}
          total={999}
        />,
      );
      expect(screen.getByText('999')).toBeInTheDocument();
    });
  });

  describe('그리드 레이아웃', () => {
    it('그리드 컨테이너가 존재한다', () => {
      const { container } = render(<SummaryCards {...defaultProps} />);
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });
  });
});
