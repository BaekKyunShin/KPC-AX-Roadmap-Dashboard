import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GuideKeyPoints } from './GuideKeyPoints';
import type { GuideKeyPoint } from '@/lib/schemas/interview-guide';

const criticalPoint: GuideKeyPoint = {
  dimension: '데이터 준비도',
  score_percent: 20,
  status: 'critical',
  insight: '데이터 수집 체계가 전혀 없는 상태입니다.',
};

const warningPoint: GuideKeyPoint = {
  dimension: 'AI 전략',
  score_percent: 45,
  status: 'warning',
  insight: 'AI 전략이 일부 수립되어 있으나 구체성이 부족합니다.',
};

const goodPoint: GuideKeyPoint = {
  dimension: '인적 자원',
  score_percent: 80,
  status: 'good',
  insight: '내부 역량이 충분히 구축되어 있습니다.',
};

describe('GuideKeyPoints', () => {
  describe('상태별 스타일', () => {
    it('critical 상태의 항목이 렌더링된다', () => {
      render(<GuideKeyPoints keyPoints={[criticalPoint]} />);
      expect(screen.getByText('데이터 준비도')).toBeInTheDocument();
      expect(screen.getByText('데이터 수집 체계가 전혀 없는 상태입니다.')).toBeInTheDocument();
    });

    it('critical 항목에 빨간색 배경 클래스가 적용된다', () => {
      const { container } = render(<GuideKeyPoints keyPoints={[criticalPoint]} />);
      const item = container.querySelector('.bg-red-50\\/60');
      expect(item).toBeInTheDocument();
    });

    it('warning 상태의 항목이 렌더링된다', () => {
      render(<GuideKeyPoints keyPoints={[warningPoint]} />);
      expect(screen.getByText('AI 전략')).toBeInTheDocument();
      expect(screen.getByText('AI 전략이 일부 수립되어 있으나 구체성이 부족합니다.')).toBeInTheDocument();
    });

    it('warning 항목에 앰버색 배경 클래스가 적용된다', () => {
      const { container } = render(<GuideKeyPoints keyPoints={[warningPoint]} />);
      const item = container.querySelector('.bg-amber-50\\/60');
      expect(item).toBeInTheDocument();
    });

    it('good 상태의 항목이 렌더링된다', () => {
      render(<GuideKeyPoints keyPoints={[goodPoint]} />);
      expect(screen.getByText('인적 자원')).toBeInTheDocument();
      expect(screen.getByText('내부 역량이 충분히 구축되어 있습니다.')).toBeInTheDocument();
    });

    it('good 항목에 녹색 배경 클래스가 적용된다', () => {
      const { container } = render(<GuideKeyPoints keyPoints={[goodPoint]} />);
      const item = container.querySelector('.bg-green-50\\/60');
      expect(item).toBeInTheDocument();
    });
  });

  describe('점수 표시', () => {
    it('각 항목의 점수(%)가 표시된다', () => {
      render(<GuideKeyPoints keyPoints={[criticalPoint, warningPoint, goodPoint]} />);
      expect(screen.getByText('20%')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  describe('정렬', () => {
    it('critical → warning → good 순서로 정렬된다', () => {
      const { container } = render(
        <GuideKeyPoints keyPoints={[goodPoint, criticalPoint, warningPoint]} />,
      );

      // 렌더링된 순서대로 dimension span 텍스트를 추출
      const dimensionSpans = container.querySelectorAll('span.text-sm.font-semibold.text-gray-900');
      const texts = Array.from(dimensionSpans).map((el) => el.textContent);

      // critical이 첫 번째
      expect(texts[0]).toBe('데이터 준비도');
      // warning이 두 번째
      expect(texts[1]).toBe('AI 전략');
      // good이 세 번째
      expect(texts[2]).toBe('인적 자원');
    });
  });

  describe('여러 항목 렌더링', () => {
    it('전달된 keyPoints 개수만큼 항목이 렌더링된다', () => {
      render(
        <GuideKeyPoints keyPoints={[criticalPoint, warningPoint, goodPoint]} />,
      );
      expect(screen.getByText('데이터 준비도')).toBeInTheDocument();
      expect(screen.getByText('AI 전략')).toBeInTheDocument();
      expect(screen.getByText('인적 자원')).toBeInTheDocument();
    });
  });
});
