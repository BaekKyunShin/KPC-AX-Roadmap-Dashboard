import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DimensionHeader } from './DimensionHeader';

// ============================================================================
// 테스트
// ============================================================================

describe('DimensionHeader', () => {
  describe('차원 이름 표시', () => {
    it('전달된 dimension 이름을 렌더링한다', () => {
      render(<DimensionHeader dimension="데이터 인프라" answeredCount={0} totalCount={5} />);
      expect(screen.getByText('데이터 인프라')).toBeInTheDocument();
    });

    it('다른 차원 이름도 정상 표시된다', () => {
      render(<DimensionHeader dimension="AI 역량" answeredCount={2} totalCount={3} />);
      expect(screen.getByText('AI 역량')).toBeInTheDocument();
    });
  });

  describe('완료 상태 표시', () => {
    it('answeredCount / totalCount 완료 형식으로 표시한다', () => {
      render(<DimensionHeader dimension="인재" answeredCount={3} totalCount={5} />);
      expect(screen.getByText('3 / 5 완료')).toBeInTheDocument();
    });

    it('0/0 완료를 표시할 수 있다', () => {
      render(<DimensionHeader dimension="전략" answeredCount={0} totalCount={0} />);
      expect(screen.getByText('0 / 0 완료')).toBeInTheDocument();
    });

    it('모두 완료된 경우를 표시한다', () => {
      render(<DimensionHeader dimension="프로세스" answeredCount={10} totalCount={10} />);
      expect(screen.getByText('10 / 10 완료')).toBeInTheDocument();
    });
  });

  describe('레이블 표시', () => {
    it('"평가 영역" 라벨을 표시한다', () => {
      render(<DimensionHeader dimension="테스트" answeredCount={0} totalCount={1} />);
      expect(screen.getByText('평가 영역')).toBeInTheDocument();
    });
  });
});
