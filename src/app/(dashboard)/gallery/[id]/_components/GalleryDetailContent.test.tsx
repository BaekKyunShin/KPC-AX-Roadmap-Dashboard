import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/components/roadmap/CoursesList', () => ({
  CoursesList: ({ specs }: { specs: unknown[]; canEdit: boolean }) => (
    <div data-testid="courses-list">specs: {specs.length}</div>
  ),
}));

vi.mock('@/components/gallery/LikeButton', () => ({
  LikeButton: ({
    roadmapVersionId,
    initialLiked,
    initialCount,
  }: {
    roadmapVersionId: string;
    initialLiked: boolean;
    initialCount: number;
    size?: string;
  }) => (
    <button data-testid="like-button" data-id={roadmapVersionId} data-liked={initialLiked}>
      좋아요 {initialCount}
    </button>
  ),
}));

vi.mock('./UseRoadmapDialog', () => ({
  UseRoadmapDialog: ({
    isOpen,
    onClose,
    roadmapVersionId,
  }: {
    isOpen: boolean;
    onClose: () => void;
    roadmapVersionId: string;
  }) =>
    isOpen ? (
      <div data-testid="use-roadmap-dialog" data-id={roadmapVersionId}>
        <button onClick={onClose}>닫기</button>
      </div>
    ) : null,
}));

import { GalleryDetailContent } from './GalleryDetailContent';
import type { RoadmapDetailView } from '../../actions';

// ─── 테스트 데이터 (DB legacy 컬럼 구조 — 산인공 양식 v2 저장 형태) ──────────────
//   roadmap_matrix → 미사용([]) · pbl_course → Ⅰ장 필드 · courses → course_specs

const mockDetail: RoadmapDetailView = {
  id: 'rv-1',
  track: 'ROADMAP',
  title: '제조업 AI 로드맵',
  industry: '제조업',
  companySize: '50-299',
  companyName: '테스트 제조회사',
  createdByName: '홍길동',
  diagnosisSummary: '제조업 AI 도입 초기 단계 기업입니다.',
  roadmapMatrix: [],
  pblCourse: {
    setup_necessity: '반복 업무 자동화를 위한 AI 훈련이 필요합니다.',
    outcome_summary: {
      ai_competency_level: 'BEGINNER',
      selected_tasks: '생산 데이터 분석',
      main_content: '초급 중심 3단계 훈련 체계',
    },
  },
  courses: [
    {
      training_period: '2026년 1분기',
      training_level: 'BEGINNER',
      course_name: '데이터 분석 기초',
      training_method: '집체',
      recommended_program: '재직자',
      goal: '기초',
      main_content: '파이썬/판다스',
      target_audience: '전사',
      subjects: [{ name: '기초', details: '개요', hours: 4 }],
    },
  ],
  likeCount: 7,
  isLiked: false,
  isShared: true,
  status: 'FINAL',
  versionNumber: 1,
  createdAt: '2026-03-21T00:00:00Z',
};

// ─── 테스트 ────────────────────────────────────────────────────────────────────

describe('GalleryDetailContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('진단 요약이 표시된다', () => {
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      expect(screen.getByText('제조업 AI 도입 초기 단계 기업입니다.')).toBeInTheDocument();
    });

    it('LikeButton이 렌더링된다', () => {
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      expect(screen.getByTestId('like-button')).toBeInTheDocument();
    });

    it('LikeButton에 초기 좋아요 수가 전달된다', () => {
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      expect(screen.getByText('좋아요 7')).toBeInTheDocument();
    });

    it('훈련과정 명세서 탭이 기본 활성화되고 CoursesList가 표시된다', () => {
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      expect(screen.getByTestId('courses-list')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '훈련과정 명세서' }).className).toContain(
        'border-primary'
      );
    });

    it('DB courses 컬럼이 course_specs로 매핑되어 CoursesList에 전달된다', () => {
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      expect(screen.getByText('specs: 1')).toBeInTheDocument();
    });
  });

  describe('v1 삭제 섹션', () => {
    it('삭제된 v1 탭(역량 모델링·훈련체계도·연간 훈련계획)이 표시되지 않는다', () => {
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      expect(screen.queryByRole('button', { name: '역량 모델링' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '훈련체계도' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '연간 훈련계획' })).not.toBeInTheDocument();
    });
  });

  describe('isConsultant 조건부 렌더링', () => {
    it('isConsultant가 false이면 "이 로드맵 사용하기" 버튼이 없다', () => {
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      expect(screen.queryByRole('button', { name: /이 로드맵 사용하기/ })).not.toBeInTheDocument();
    });

    it('isConsultant가 true이면 "이 로드맵 사용하기" 버튼이 표시된다', () => {
      render(<GalleryDetailContent detail={mockDetail} isConsultant={true} />);
      expect(screen.getByRole('button', { name: /이 로드맵 사용하기/ })).toBeInTheDocument();
    });

    it('isConsultant가 true일 때 사용하기 버튼 클릭 시 다이얼로그가 열린다', async () => {
      const user = userEvent.setup();
      render(<GalleryDetailContent detail={mockDetail} isConsultant={true} />);
      expect(screen.queryByTestId('use-roadmap-dialog')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /이 로드맵 사용하기/ }));
      expect(screen.getByTestId('use-roadmap-dialog')).toBeInTheDocument();
    });

    it('다이얼로그 닫기 버튼 클릭 시 다이얼로그가 닫힌다', async () => {
      const user = userEvent.setup();
      render(<GalleryDetailContent detail={mockDetail} isConsultant={true} />);
      await user.click(screen.getByRole('button', { name: /이 로드맵 사용하기/ }));
      expect(screen.getByTestId('use-roadmap-dialog')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '닫기' }));
      await waitFor(() => {
        expect(screen.queryByTestId('use-roadmap-dialog')).not.toBeInTheDocument();
      });
    });

    it('UseRoadmapDialog에 roadmapVersionId가 전달된다', async () => {
      const user = userEvent.setup();
      render(<GalleryDetailContent detail={mockDetail} isConsultant={true} />);
      await user.click(screen.getByRole('button', { name: /이 로드맵 사용하기/ }));
      expect(screen.getByTestId('use-roadmap-dialog')).toHaveAttribute('data-id', 'rv-1');
    });
  });

  describe('진단 요약 없을 때', () => {
    it('diagnosisSummary가 없으면 요약 섹션이 표시되지 않는다', () => {
      const detailWithoutSummary = { ...mockDetail, diagnosisSummary: '' };
      render(<GalleryDetailContent detail={detailWithoutSummary} isConsultant={false} />);
      expect(screen.queryByText('제조업 AI 도입 초기 단계 기업입니다.')).not.toBeInTheDocument();
    });
  });
});
