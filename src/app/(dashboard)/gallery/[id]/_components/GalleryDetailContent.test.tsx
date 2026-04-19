import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/components/roadmap/CompetencyModelingTable', () => ({
  CompetencyModelingTable: ({ competencies }: { competencies: unknown[]; canEdit: boolean }) => (
    <div data-testid="competency-modeling-table">competencies: {competencies.length}</div>
  ),
}));

vi.mock('@/components/roadmap/RoadmapMatrix', () => ({
  RoadmapMatrix: ({
    trainingStructure,
  }: {
    competencies: unknown[];
    trainingStructure: unknown[];
    canEdit: boolean;
  }) => (
    <div data-testid="roadmap-matrix">structure: {trainingStructure.length}</div>
  ),
}));

vi.mock('@/components/roadmap/AnnualTrainingPlanTable', () => ({
  AnnualTrainingPlanTable: ({
    plan,
  }: {
    plan: { items: unknown[]; usage_plan: string };
    canEdit: boolean;
  }) => <div data-testid="annual-plan">items: {plan.items.length}</div>,
}));

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

vi.mock('@/components/gallery/UseRoadmapDialog', () => ({
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

// ─── 테스트 데이터 (DB legacy 컬럼 구조 — 신규 데이터 저장형태) ─────────────────

const mockDetail: RoadmapDetailView = {
  id: 'rv-1',
  track: 'ROADMAP',
  title: '제조업 AI 로드맵',
  industry: '제조업',
  companySize: '50-299',
  companyName: '테스트 제조회사',
  createdByName: '홍길동',
  diagnosisSummary: '제조업 AI 도입 초기 단계 기업입니다.',
  // 신규 저장 형태: roadmap_matrix=training_structure, pbl_course={competencies, annual_plan}
  roadmapMatrix: [
    {
      competency_name: '데이터 분석',
      level: 'BEGINNER',
      content: '기초',
      target_audience: '전사',
      method: '집체',
      goal: '데이터 이해',
    },
  ],
  pblCourse: {
    competencies: [
      {
        name: '데이터 분석',
        definition: '데이터 기반 의사결정',
        knowledge: [],
        skills: [],
        attitudes: [],
        ncs_used: false,
      },
    ],
    annual_plan: {
      items: [
        {
          competency_name: '데이터 분석',
          course_name: '데이터 분석 기초',
          format: '집체',
          hours: 16,
          notes: '',
        },
      ],
      usage_plan: '사내 교육 활용',
    },
  },
  courses: [
    {
      course_name: '데이터 분석 기초',
      format: '집체',
      recommended_program: '재직자',
      goal: '기초',
      main_content: '파이썬/판다스',
      target_audience: '전사',
      subjects: [],
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

    it('기본 탭은 "역량 모델링"이며 CompetencyModelingTable이 표시된다', () => {
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      expect(screen.getByTestId('competency-modeling-table')).toBeInTheDocument();
    });
  });

  describe('탭 전환', () => {
    it('"훈련체계도" 탭 클릭 시 RoadmapMatrix가 표시된다', async () => {
      const user = userEvent.setup();
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      await user.click(screen.getByRole('button', { name: '훈련체계도' }));
      await waitFor(() => {
        expect(screen.getByTestId('roadmap-matrix')).toBeInTheDocument();
      });
    });

    it('"연간 훈련계획" 탭 클릭 시 AnnualTrainingPlanTable이 표시된다', async () => {
      const user = userEvent.setup();
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      await user.click(screen.getByRole('button', { name: '연간 훈련계획' }));
      await waitFor(() => {
        expect(screen.getByTestId('annual-plan')).toBeInTheDocument();
      });
    });

    it('"훈련과정 명세서" 탭 클릭 시 CoursesList가 표시된다', async () => {
      const user = userEvent.setup();
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      await user.click(screen.getByRole('button', { name: '훈련과정 명세서' }));
      await waitFor(() => {
        expect(screen.getByTestId('courses-list')).toBeInTheDocument();
      });
    });

    it('탭 클릭 시 탭 버튼에 border-primary 클래스가 적용된다', async () => {
      const user = userEvent.setup();
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      const tab = screen.getByRole('button', { name: '훈련체계도' });
      await user.click(tab);
      expect(tab.className).toContain('border-primary');
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
      expect(
        screen.queryByText('제조업 AI 도입 초기 단계 기업입니다.')
      ).not.toBeInTheDocument();
    });
  });
});
