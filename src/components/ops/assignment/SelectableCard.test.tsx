import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/utils', () => ({
  cn: (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(' '),
}));

// ─── Import ──────────────────────────────────────────────────────────────────

import SelectableCard from './SelectableCard';
import type { ValidRecommendation } from './utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRecommendation(overrides: Partial<ValidRecommendation> = {}): ValidRecommendation {
  return {
    id: 'rec-1',
    candidate_user_id: 'consultant-1',
    total_score: 85,
    rank: 1,
    rationale: null,
    candidate: {
      id: 'consultant-1',
      name: '김컨설턴트',
      email: 'kim@test.com',
    },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SelectableCard', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('컨설턴트 이름이 렌더링된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ candidate: { id: 'c1', name: '홍길동', email: 'hong@test.com' } })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('홍길동')).toBeInTheDocument();
    });

    it('컨설턴트 이메일이 렌더링된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ candidate: { id: 'c1', name: '홍길동', email: 'hong@test.com' } })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('hong@test.com')).toBeInTheDocument();
    });

    it('순위 숫자가 렌더링된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ rank: 2 })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('미선택 상태에서 "이 컨설턴트 선택하기" 텍스트가 표시된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation()}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('이 컨설턴트 선택하기')).toBeInTheDocument();
    });
  });

  describe('선택/미선택 스타일', () => {
    it('isSelected=true일 때 "✓ 선택됨" 텍스트가 표시된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation()}
          isSelected={true}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('✓ 선택됨')).toBeInTheDocument();
    });

    it('isSelected=false일 때 "✓ 선택됨" 텍스트가 표시되지 않는다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation()}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.queryByText('✓ 선택됨')).not.toBeInTheDocument();
    });

    it('isSelected=true일 때 버튼에 border-blue-500 클래스가 포함된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation()}
          isSelected={true}
          onSelect={mockOnSelect}
        />,
      );
      const button = screen.getByRole('button');
      expect(button.className).toContain('border-blue-500');
    });

    it('isSelected=false이고 rank=1일 때 버튼에 border-emerald-300 클래스가 포함된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ rank: 1 })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      const button = screen.getByRole('button');
      expect(button.className).toContain('border-emerald-300');
    });

    it('isSelected=false이고 rank≠1일 때 버튼에 border-gray-200 클래스가 포함된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ rank: 2 })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      const button = screen.getByRole('button');
      expect(button.className).toContain('border-gray-200');
    });
  });

  describe('점수 게이지', () => {
    it('점수 숫자가 렌더링된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ total_score: 85 })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    it('점수 게이지의 conic-gradient style에 score*3.6deg가 반영된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ total_score: 80 })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      // 80점 → 80*3.6 = 288deg
      const gaugeEl = screen.getByText('80').closest('.rounded-full')?.parentElement;
      expect(gaugeEl?.getAttribute('style')).toContain('288deg');
    });

    it('점수가 100을 초과하면 100으로 클램프된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ total_score: 150 })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('점수가 0 미만이면 0으로 클램프된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ total_score: -10 })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('1등 rank 뱃지', () => {
    it('rank=1이면 "AI 추천" 뱃지가 표시된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ rank: 1 })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('AI 추천')).toBeInTheDocument();
    });

    it('rank=2이면 "AI 추천" 뱃지가 표시되지 않는다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ rank: 2 })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.queryByText('AI 추천')).not.toBeInTheDocument();
    });

    it('rank=1이면 순위 뱃지 배경에 bg-emerald-500 클래스가 포함된다 (미선택 시)', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ rank: 1 })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      const rankBadge = screen.getByText('1');
      expect(rankBadge.className).toContain('bg-emerald-500');
    });

    it('rank=1이고 선택된 경우 순위 뱃지 배경에 bg-blue-500 클래스가 포함된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ rank: 1 })}
          isSelected={true}
          onSelect={mockOnSelect}
        />,
      );
      const rankBadge = screen.getByText('1');
      expect(rankBadge.className).toContain('bg-blue-500');
    });
  });

  describe('rationale 표시', () => {
    it('rationale에 analysis가 있으면 분석 텍스트가 렌더링된다', () => {
      const rationale = JSON.stringify({
        analysis: 'AI 분석: 제조업 전문성이 높습니다.',
        strengths: ['제조업 경험'],
        considerations: [],
      });
      render(
        <SelectableCard
          recommendation={makeRecommendation({ rationale })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('AI 분석: 제조업 전문성이 높습니다.')).toBeInTheDocument();
    });

    it('rationale에 strengths가 있으면 강점 항목이 렌더링된다', () => {
      const rationale = JSON.stringify({
        analysis: '분석 텍스트',
        strengths: ['제조업 경험', 'AI 도입 역량'],
        considerations: [],
      });
      render(
        <SelectableCard
          recommendation={makeRecommendation({ rationale })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('제조업 경험')).toBeInTheDocument();
      expect(screen.getByText('AI 도입 역량')).toBeInTheDocument();
    });

    it('rationale에 considerations가 있으면 고려사항 항목이 렌더링된다', () => {
      const rationale = JSON.stringify({
        analysis: '분석 텍스트',
        strengths: [],
        considerations: ['일정 확인 필요'],
      });
      render(
        <SelectableCard
          recommendation={makeRecommendation({ rationale })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('일정 확인 필요')).toBeInTheDocument();
    });

    it('rationale=null이면 분석 텍스트가 렌더링되지 않는다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation({ rationale: null })}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      // 분석 텍스트가 없으면 특정 분석 내용이 DOM에 없어야 함
      expect(screen.queryByText('AI 분석:')).not.toBeInTheDocument();
    });
  });

  describe('onClick 콜백', () => {
    it('버튼 클릭 시 onSelect가 호출된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation()}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnSelect).toHaveBeenCalledOnce();
    });

    it('여러 번 클릭 시 호출 횟수만큼 onSelect가 호출된다', () => {
      render(
        <SelectableCard
          recommendation={makeRecommendation()}
          isSelected={false}
          onSelect={mockOnSelect}
        />,
      );
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnSelect).toHaveBeenCalledTimes(2);
    });
  });
});
