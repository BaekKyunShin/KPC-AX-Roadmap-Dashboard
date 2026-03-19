import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MatchingRecommendations from './MatchingRecommendations';

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeRecommendation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rec-1',
    candidate_user_id: 'user-1',
    total_score: 0.85,
    rationale: '산업 분야 전문성이 뛰어납니다.',
    rank: 1,
    score_breakdown: [
      { criteria: '전문성', score: 8, maxScore: 10, explanation: '우수' },
      { criteria: '경력', score: 7, maxScore: 10, explanation: '양호' },
    ],
    candidate: {
      id: 'user-1',
      name: '김컨설턴트',
      email: 'kim@test.com',
      consultant_profile: [
        {
          expertise_domains: ['AI/ML', '데이터분석'],
          available_industries: ['제조업', '금융업'],
          skill_tags: ['Python', 'TensorFlow'],
          years_of_experience: 10,
        },
      ],
    },
    ...overrides,
  };
}

function makeSecondRecommendation() {
  return makeRecommendation({
    id: 'rec-2',
    candidate_user_id: 'user-2',
    total_score: 0.72,
    rationale: '폭넓은 경험을 보유하고 있습니다.',
    rank: 2,
    candidate: {
      id: 'user-2',
      name: '이전문가',
      email: 'lee@test.com',
      consultant_profile: [
        {
          expertise_domains: ['RPA'],
          available_industries: ['서비스업'],
          skill_tags: ['UiPath'],
          years_of_experience: 5,
        },
      ],
    },
  });
}

function makeThirdRecommendation() {
  return makeRecommendation({
    id: 'rec-3',
    candidate_user_id: 'user-3',
    total_score: 0.60,
    rationale: '기본 역량 보유.',
    rank: 3,
    candidate: {
      id: 'user-3',
      name: '박분석가',
      email: 'park@test.com',
      consultant_profile: [
        {
          expertise_domains: ['AI/ML', '데이터분석', '클라우드', '보안'],
          available_industries: ['공공'],
          skill_tags: [],
          years_of_experience: 3,
        },
      ],
    },
  });
}

// =============================================================================
// 테스트
// =============================================================================

describe('MatchingRecommendations', () => {
  describe('기본 렌더링', () => {
    it('추천 카드가 올바르게 렌더링된다', () => {
      render(<MatchingRecommendations recommendations={[makeRecommendation()]} />);
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
      expect(screen.getByText('kim@test.com')).toBeInTheDocument();
    });

    it('빈 추천 목록은 카드 없이 렌더링된다', () => {
      const { container } = render(<MatchingRecommendations recommendations={[]} />);
      // space-y-4 컨테이너만 존재하고 자식 없음
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.children.length).toBe(0);
    });

    it('여러 추천 카드를 표시한다', () => {
      render(
        <MatchingRecommendations
          recommendations={[makeRecommendation(), makeSecondRecommendation()]}
        />,
      );
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
      expect(screen.getByText('이전문가')).toBeInTheDocument();
    });
  });

  describe('순위 배지', () => {
    it('1순위 배지가 보라색 스타일로 표시된다', () => {
      render(<MatchingRecommendations recommendations={[makeRecommendation()]} />);
      const badge = screen.getByText('1');
      expect(badge.className).toContain('bg-purple-600');
      expect(badge.className).toContain('text-white');
    });

    it('2순위 배지가 회색 스타일로 표시된다', () => {
      render(<MatchingRecommendations recommendations={[makeSecondRecommendation()]} />);
      const badge = screen.getByText('2');
      expect(badge.className).toContain('bg-gray-400');
    });

    it('3순위 배지가 연한 회색 스타일로 표시된다', () => {
      render(<MatchingRecommendations recommendations={[makeThirdRecommendation()]} />);
      const badge = screen.getByText('3');
      expect(badge.className).toContain('bg-gray-300');
    });
  });

  describe('점수 표시', () => {
    it('총 점수를 퍼센트 형태로 표시한다 (0.85 → 85점)', () => {
      render(<MatchingRecommendations recommendations={[makeRecommendation()]} />);
      expect(screen.getByText('85점')).toBeInTheDocument();
      expect(screen.getByText('/ 100점')).toBeInTheDocument();
    });

    it('소수점 점수를 반올림하여 표시한다 (0.72 → 72점)', () => {
      render(<MatchingRecommendations recommendations={[makeSecondRecommendation()]} />);
      expect(screen.getByText('72점')).toBeInTheDocument();
    });

    it('점수 상세 항목(criteria)을 표시한다', () => {
      render(<MatchingRecommendations recommendations={[makeRecommendation()]} />);
      expect(screen.getByText('전문성')).toBeInTheDocument();
      expect(screen.getByText('경력')).toBeInTheDocument();
      expect(screen.getByText('8/10')).toBeInTheDocument();
      expect(screen.getByText('7/10')).toBeInTheDocument();
    });
  });

  describe('프로필 요약', () => {
    it('전문 분야 배지를 표시한다', () => {
      render(<MatchingRecommendations recommendations={[makeRecommendation()]} />);
      expect(screen.getByText('AI/ML')).toBeInTheDocument();
      expect(screen.getByText('데이터분석')).toBeInTheDocument();
    });

    it('경력과 산업 정보를 표시한다', () => {
      render(<MatchingRecommendations recommendations={[makeRecommendation()]} />);
      expect(screen.getByText('10년 경력 | 제조업, 금융업')).toBeInTheDocument();
    });

    it('전문 분야가 3개 초과 시 "+N" 표시를 한다', () => {
      render(<MatchingRecommendations recommendations={[makeThirdRecommendation()]} />);
      // 4개 중 3개만 표시, +1 표시
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('전문 분야가 3개 이하이면 "+N" 표시가 없다', () => {
      render(<MatchingRecommendations recommendations={[makeRecommendation()]} />);
      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });

    it('프로필이 없으면 프로필 섹션을 표시하지 않는다', () => {
      const rec = makeRecommendation({
        candidate: {
          id: 'user-x',
          name: '무프로필',
          email: 'no@test.com',
          consultant_profile: [],
        },
      });
      render(<MatchingRecommendations recommendations={[rec]} />);
      expect(screen.getByText('무프로필')).toBeInTheDocument();
      expect(screen.queryByText(/년 경력/)).not.toBeInTheDocument();
    });
  });

  describe('추천 근거', () => {
    it('추천 근거를 표시한다', () => {
      render(<MatchingRecommendations recommendations={[makeRecommendation()]} />);
      expect(screen.getByText(/추천 근거:/)).toBeInTheDocument();
      expect(screen.getByText(/산업 분야 전문성이 뛰어납니다/)).toBeInTheDocument();
    });
  });

  describe('1순위 카드 스타일', () => {
    it('1순위 카드는 보라색 테두리를 가진다', () => {
      const { container } = render(
        <MatchingRecommendations recommendations={[makeRecommendation()]} />,
      );
      const card = container.querySelector('.border-purple-500');
      expect(card).toBeInTheDocument();
    });

    it('2순위 카드는 일반 회색 테두리를 가진다', () => {
      const { container } = render(
        <MatchingRecommendations recommendations={[makeSecondRecommendation()]} />,
      );
      const card = container.querySelector('.border-gray-200');
      expect(card).toBeInTheDocument();
    });
  });

  describe('점수 프로그레스 바', () => {
    it('점수 비율에 따른 너비 스타일이 적용된다', () => {
      const { container } = render(
        <MatchingRecommendations recommendations={[makeRecommendation()]} />,
      );
      const progressBars = container.querySelectorAll('.bg-purple-600.h-1\\.5.rounded-full');
      expect(progressBars.length).toBe(2);
      // 전문성: 8/10 = 80%
      expect((progressBars[0] as HTMLElement).style.width).toBe('80%');
      // 경력: 7/10 = 70%
      expect((progressBars[1] as HTMLElement).style.width).toBe('70%');
    });
  });
});
