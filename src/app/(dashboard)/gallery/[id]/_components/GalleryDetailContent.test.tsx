import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/components/roadmap/RoadmapMatrix', () => ({
  RoadmapMatrix: ({ matrix }: { matrix: unknown[]; canEdit: boolean }) => (
    <div data-testid="roadmap-matrix">matrix: {matrix.length}rows</div>
  ),
}));

vi.mock('@/components/roadmap/CoursesList', () => ({
  CoursesList: ({ courses }: { courses: unknown[]; canEdit: boolean }) => (
    <div data-testid="courses-list">courses: {courses.length}</div>
  ),
}));

vi.mock('@/components/roadmap/PBLCourseView', () => ({
  PBLCourseView: () => <div data-testid="pbl-course-view">PBL 과정</div>,
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

import React from 'react';
import { GalleryDetailContent } from './GalleryDetailContent';
import type { RoadmapDetailView } from '../../actions';

// ─── 테스트 데이터 ────────────────────────────────────────────────────────────

const mockDetail: RoadmapDetailView = {
  id: 'rv-1',
  title: '제조업 AI 로드맵',
  industry: '제조업',
  companySize: '50-299',
  companyName: '테스트 제조회사',
  createdByName: '홍길동',
  diagnosisSummary: '제조업 AI 도입 초기 단계 기업입니다.',
  roadmapMatrix: [
    { task_id: 't1', task_name: '데이터 분석', beginner: [], intermediate: [], advanced: [] },
  ],
  pblCourse: { course_name: 'PBL 데이터 분석', total_hours: 16 },
  courses: [
    { course_name: '데이터 분석 기초', level: 'BEGINNER', recommended_hours: 16 },
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

    it('기본 탭은 "과정 체계도"이며 RoadmapMatrix가 표시된다', () => {
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      expect(screen.getByTestId('roadmap-matrix')).toBeInTheDocument();
    });
  });

  describe('탭 전환', () => {
    it('"과정 상세" 탭 클릭 시 CoursesList가 표시된다', async () => {
      const user = userEvent.setup();
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      await user.click(screen.getByRole('button', { name: '과정 상세' }));
      await waitFor(() => {
        expect(screen.getByTestId('courses-list')).toBeInTheDocument();
      });
    });

    it('"PBL 과정" 탭 클릭 시 PBLCourseView가 표시된다', async () => {
      const user = userEvent.setup();
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      await user.click(screen.getByRole('button', { name: 'PBL 과정' }));
      await waitFor(() => {
        expect(screen.getByTestId('pbl-course-view')).toBeInTheDocument();
      });
    });

    it('"과정 체계도" 탭으로 다시 돌아오면 RoadmapMatrix가 표시된다', async () => {
      const user = userEvent.setup();
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      await user.click(screen.getByRole('button', { name: '과정 상세' }));
      await user.click(screen.getByRole('button', { name: '과정 체계도' }));
      expect(screen.getByTestId('roadmap-matrix')).toBeInTheDocument();
    });

    it('탭 클릭 시 탭 버튼에 border-primary 클래스가 적용된다', async () => {
      const user = userEvent.setup();
      render(<GalleryDetailContent detail={mockDetail} isConsultant={false} />);
      const coursesTab = screen.getByRole('button', { name: '과정 상세' });
      await user.click(coursesTab);
      expect(coursesTab.className).toContain('border-primary');
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
