import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';
import { GalleryCard } from './GalleryCard';
import type { GalleryRoadmapItem } from '../actions';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('./LikeButton', () => ({
  LikeButton: ({
    roadmapVersionId,
    initialLiked,
    initialCount,
  }: {
    roadmapVersionId: string;
    initialLiked: boolean;
    initialCount: number;
  }) => (
    <button data-testid="like-button" data-id={roadmapVersionId}>
      {initialLiked ? '좋아요 취소' : '좋아요'} ({initialCount})
    </button>
  ),
}));

// ─── 테스트 데이터 ───────────────────────────────────────────────────────────

function makeItem(overrides: Partial<GalleryRoadmapItem> = {}): GalleryRoadmapItem {
  return {
    id: 'rv-1',
    track: 'ROADMAP',
    title: '삼성전자 — AI 불량 예측',
    industry: '제조업',
    companySize: '300-999',
    companyName: '삼성전자',
    diagnosisSummary: 'AI 기반 품질관리 도입이 시급합니다.',
    pblCourseName: 'AI 불량 예측',
    pblTotalHours: 24,
    tags: ['품질관리', 'AI'],
    createdBy: 'user-1',
    createdByName: '김컨설턴트',
    likeCount: 5,
    isLiked: false,
    isShared: true,
    status: 'FINAL',
    createdAt: '2026-01-15T09:00:00Z',
    ...overrides,
  };
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('GalleryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('제목이 표시된다', () => {
      render(<GalleryCard item={makeItem()} />);
      expect(screen.getByText('삼성전자 — AI 불량 예측')).toBeInTheDocument();
    });

    it('상세 보기 링크가 올바른 경로(?track 쿼리 포함)를 가진다', () => {
      render(<GalleryCard item={makeItem({ id: 'rv-42' })} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/gallery/rv-42?track=ROADMAP');
    });

    it('PBL 트랙 카드는 ?track=PBL 쿼리를 포함한다', () => {
      render(<GalleryCard item={makeItem({ id: 'pbl-1', track: 'PBL' })} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/gallery/pbl-1?track=PBL');
    });

    it('진단 요약이 표시된다', () => {
      render(<GalleryCard item={makeItem()} />);
      expect(screen.getByText('AI 기반 품질관리 도입이 시급합니다.')).toBeInTheDocument();
    });

    it('상세 보기 텍스트가 표시된다', () => {
      render(<GalleryCard item={makeItem()} />);
      expect(screen.getByText('상세 보기')).toBeInTheDocument();
    });

    it('회사 이름이 표시된다', () => {
      render(<GalleryCard item={makeItem()} />);
      expect(screen.getByText('삼성전자')).toBeInTheDocument();
    });
  });

  describe('배지 표시', () => {
    it('업종 배지가 표시된다', () => {
      render(<GalleryCard item={makeItem({ industry: '금융업' })} />);
      expect(screen.getByText('금융업')).toBeInTheDocument();
    });

    it('기업 규모 배지에 레이블이 표시된다 (예: 300-999 → 300~999명 (중견기업))', () => {
      render(<GalleryCard item={makeItem({ companySize: '300-999' })} />);
      expect(screen.getByText('300~999명 (중견기업)')).toBeInTheDocument();
    });

    it('알 수 없는 company_size는 원본 값 그대로 표시된다', () => {
      render(<GalleryCard item={makeItem({ companySize: '커스텀 규모' })} />);
      expect(screen.getByText('커스텀 규모')).toBeInTheDocument();
    });

    it('각 company_size 값이 올바른 레이블로 변환된다', () => {
      const cases: Array<[string, string]> = [
        ['1-9', '10명 미만 (소상공인)'],
        ['10-49', '10~49명 (소기업)'],
        ['50-299', '50~299명 (중소기업)'],
        ['1000+', '1,000명 이상 (대기업)'],
      ];

      for (const [value, label] of cases) {
        const { unmount } = render(<GalleryCard item={makeItem({ companySize: value })} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('태그', () => {
    it('태그 목록이 표시된다', () => {
      render(<GalleryCard item={makeItem({ tags: ['품질관리', 'AI', '자동화'] })} />);
      expect(screen.getByText('품질관리')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
      expect(screen.getByText('자동화')).toBeInTheDocument();
    });

    it('태그가 빈 배열이면 태그 영역이 렌더링되지 않는다', () => {
      const { container } = render(<GalleryCard item={makeItem({ tags: [] })} />);
      // secondary 배지(태그용)가 없어야 함
      const badges = container.querySelectorAll('[data-slot="badge"]');
      // 트랙 뱃지 + 업종 + 기업규모 = 3개
      expect(badges.length).toBe(3);
    });
  });

  describe('PBL 과정 영역', () => {
    it('PBL 과정명이 표시된다', () => {
      render(<GalleryCard item={makeItem({ pblCourseName: 'AI 워크숍' })} />);
      expect(screen.getByText('AI 워크숍')).toBeInTheDocument();
    });

    it('PBL 시간이 0보다 크면 (시간h)이 표시된다', () => {
      render(<GalleryCard item={makeItem({ pblTotalHours: 16 })} />);
      expect(screen.getByText('(16h)')).toBeInTheDocument();
    });

    it('PBL 시간이 0이면 시간 표시가 없다', () => {
      render(<GalleryCard item={makeItem({ pblTotalHours: 0 })} />);
      expect(screen.queryByText(/\(\d+h\)/)).not.toBeInTheDocument();
    });

    it('PBL 과정명이 없으면 PBL 영역이 렌더링되지 않는다', () => {
      render(<GalleryCard item={makeItem({ pblCourseName: '' })} />);
      expect(screen.queryByText('PBL 최적 과정')).not.toBeInTheDocument();
    });
  });

  describe('아바타', () => {
    it('작성자 이름의 첫 글자가 아바타에 표시된다', () => {
      render(<GalleryCard item={makeItem({ createdByName: '박컨설턴트' })} />);
      expect(screen.getByText('박')).toBeInTheDocument();
    });

    it('작성자 이름이 빈 문자열이면 ?가 표시된다', () => {
      render(<GalleryCard item={makeItem({ createdByName: '' })} />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('작성자 이름이 표시된다', () => {
      render(<GalleryCard item={makeItem({ createdByName: '이매니저' })} />);
      expect(screen.getByText('이매니저')).toBeInTheDocument();
    });

    it('같은 이름은 항상 같은 색상을 반환한다 (결정적)', () => {
      const { container: c1 } = render(<GalleryCard item={makeItem({ createdByName: 'Alice' })} />);
      const { container: c2 } = render(<GalleryCard item={makeItem({ createdByName: 'Alice' })} />);

      // 아바타 div의 class를 비교
      const avatar1 = c1.querySelector('.rounded-full.text-white');
      const avatar2 = c2.querySelector('.rounded-full.text-white');
      expect(avatar1?.className).toBe(avatar2?.className);
    });
  });

  describe('LikeButton 통합', () => {
    it('LikeButton에 올바른 props가 전달된다', () => {
      render(<GalleryCard item={makeItem({ id: 'rv-7', isLiked: true, likeCount: 10 })} />);
      const btn = screen.getByTestId('like-button');
      expect(btn).toHaveAttribute('data-id', 'rv-7');
      expect(btn).toHaveTextContent('좋아요 취소 (10)');
    });

    it('좋아요 안 한 상태에서 텍스트가 올바르다', () => {
      render(<GalleryCard item={makeItem({ isLiked: false, likeCount: 0 })} />);
      const btn = screen.getByTestId('like-button');
      expect(btn).toHaveTextContent('좋아요 (0)');
    });
  });
});
