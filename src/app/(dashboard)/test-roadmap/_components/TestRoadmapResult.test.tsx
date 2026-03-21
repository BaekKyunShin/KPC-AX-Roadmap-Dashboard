import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/components/roadmap/RoadmapMatrix', () => ({
  RoadmapMatrix: ({ matrix, canEdit }: { matrix: unknown[]; canEdit: boolean }) => (
    <div data-testid="roadmap-matrix" data-can-edit={canEdit}>
      matrix rows: {matrix.length}
    </div>
  ),
}));

vi.mock('@/components/roadmap/CoursesList', () => ({
  CoursesList: ({ courses, canEdit }: { courses: unknown[]; canEdit: boolean }) => (
    <div data-testid="courses-list" data-can-edit={canEdit}>
      courses: {courses.length}
    </div>
  ),
}));

vi.mock('@/components/roadmap/PBLCourseView', () => ({
  PBLCourseView: ({ course }: { course: unknown }) => (
    <div data-testid="pbl-course-view">{JSON.stringify(course)}</div>
  ),
}));

import TestRoadmapResult from './TestRoadmapResult';
import type { RoadmapResult, ValidationResult } from '@/lib/services/roadmap';

// ─── 테스트 데이터 ─────────────────────────────────────────────────────────────

const mockMatrix = [
  {
    task_id: 't1',
    task_name: '데이터 분석',
    beginner: [{ course_name: '데이터 분석 기초', recommended_hours: 16 }],
    intermediate: [],
    advanced: [],
  },
];

const mockCourses = [
  {
    course_name: '데이터 분석 기초',
    level: 'BEGINNER' as const,
    target_task: '데이터 분석',
    target_audience: '초급자',
    recommended_hours: 16,
    curriculum: [],
    tools: [],
    expected_outcome: '기본 분석 능력',
    measurement_method: '실습 평가',
    prerequisites: [],
  },
];

const mockPblCourse = {
  selected_course_name: '데이터 분석 기초',
  selected_course_level: 'BEGINNER' as const,
  selected_course_task: '데이터 분석',
  selection_rationale: {
    consultant_expertise_fit: '적합',
    pain_point_alignment: '연관',
    feasibility_assessment: '가능',
    summary: '적합한 과정',
  },
  course_name: 'PBL 데이터 분석',
  total_hours: 16,
  target_tasks: ['데이터 분석'],
  target_audience: '초급자',
  curriculum: [],
  final_deliverables: [],
  expected_outcomes: [],
  business_impact: '',
  measurement_methods: [],
  prerequisites: [],
};

const mockResult: RoadmapResult = {
  diagnosis_summary: '제조업 AI 도입 초기 단계 기업입니다.',
  roadmap_matrix: mockMatrix,
  courses: mockCourses,
  pbl_course: mockPblCourse,
};

const mockValidation: ValidationResult = {
  isValid: true,
  errors: [],
  warnings: [],
};

const defaultProps = {
  result: mockResult,
  validation: mockValidation,
  companyName: '테스트 제조회사',
  industry: '제조업',
  onReset: vi.fn(),
};

// ─── 테스트 ────────────────────────────────────────────────────────────────────

describe('TestRoadmapResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('회사명과 업종이 표시된다', () => {
      render(<TestRoadmapResult {...defaultProps} />);
      expect(screen.getByText('테스트 제조회사')).toBeInTheDocument();
      expect(screen.getByText('제조업')).toBeInTheDocument();
    });

    it('진단 요약이 표시된다', () => {
      render(<TestRoadmapResult {...defaultProps} />);
      expect(screen.getByText('제조업 AI 도입 초기 단계 기업입니다.')).toBeInTheDocument();
    });

    it('테스트 모드 배너가 표시된다', () => {
      render(<TestRoadmapResult {...defaultProps} />);
      expect(screen.getByText('테스트 로드맵')).toBeInTheDocument();
    });

    it('"새 테스트 시작" 버튼이 표시된다', () => {
      render(<TestRoadmapResult {...defaultProps} />);
      expect(screen.getByRole('button', { name: '새 테스트 시작' })).toBeInTheDocument();
    });

    it('"새 테스트 시작" 버튼 클릭 시 onReset이 호출된다', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();
      render(<TestRoadmapResult {...defaultProps} onReset={onReset} />);
      await user.click(screen.getByRole('button', { name: '새 테스트 시작' }));
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('탭 전환', () => {
    it('기본 탭은 "과정 체계도"이고 RoadmapMatrix가 표시된다', () => {
      render(<TestRoadmapResult {...defaultProps} />);
      expect(screen.getByTestId('roadmap-matrix')).toBeInTheDocument();
    });

    it('"과정 상세" 탭 클릭 시 CoursesList가 표시된다', async () => {
      const user = userEvent.setup();
      render(<TestRoadmapResult {...defaultProps} />);
      await user.click(screen.getByRole('tab', { name: '과정 상세' }));
      await waitFor(() => {
        expect(screen.getByTestId('courses-list')).toBeInTheDocument();
      });
    });

    it('"PBL 과정" 탭 클릭 시 PBLCourseView가 표시된다', async () => {
      const user = userEvent.setup();
      render(<TestRoadmapResult {...defaultProps} />);
      await user.click(screen.getByRole('tab', { name: 'PBL 과정' }));
      await waitFor(() => {
        expect(screen.getByTestId('pbl-course-view')).toBeInTheDocument();
      });
    });

    it('"과정 체계도" 탭으로 다시 돌아오면 RoadmapMatrix가 표시된다', async () => {
      const user = userEvent.setup();
      render(<TestRoadmapResult {...defaultProps} />);
      await user.click(screen.getByRole('tab', { name: '과정 상세' }));
      await user.click(screen.getByRole('tab', { name: '과정 체계도' }));
      expect(screen.getByTestId('roadmap-matrix')).toBeInTheDocument();
    });
  });

  describe('검증 노트 표시', () => {
    it('에러와 경고가 있을 때 검토 필요 사항이 표시된다', () => {
      const validationWithNotes: ValidationResult = {
        isValid: false,
        errors: ['오류 항목 1', '오류 항목 2'],
        warnings: ['경고 항목 1'],
      };
      render(<TestRoadmapResult {...defaultProps} validation={validationWithNotes} />);
      expect(screen.getByText('검토 필요 사항(3건)')).toBeInTheDocument();
    });

    it('에러와 경고가 없으면 검토 필요 사항이 표시되지 않는다', () => {
      render(<TestRoadmapResult {...defaultProps} />);
      expect(screen.queryByText(/검토 필요 사항/)).not.toBeInTheDocument();
    });

    it('검토 필요 사항 토글 클릭 시 목록이 접힌다', async () => {
      const user = userEvent.setup();
      const validationWithNotes: ValidationResult = {
        isValid: false,
        errors: ['오류 항목 1'],
        warnings: [],
      };
      render(<TestRoadmapResult {...defaultProps} validation={validationWithNotes} />);
      // 초기에는 펼쳐져 있음
      expect(screen.getByText('오류 항목 1')).toBeInTheDocument();
      // 토글 버튼 클릭
      await user.click(screen.getByText('검토 필요 사항(1건)'));
      await waitFor(() => {
        expect(screen.queryByText('오류 항목 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('수정 요청', () => {
    it('onRevisionRequest가 없으면 수정 요청 섹션이 표시되지 않는다', () => {
      render(<TestRoadmapResult {...defaultProps} />);
      expect(screen.queryByText('수정 요청')).not.toBeInTheDocument();
    });

    it('onRevisionRequest가 있으면 수정 요청 섹션이 표시된다', () => {
      const onRevisionRequest = vi.fn().mockResolvedValue(undefined);
      render(<TestRoadmapResult {...defaultProps} onRevisionRequest={onRevisionRequest} />);
      expect(screen.getByText('수정 요청')).toBeInTheDocument();
    });

    it('내용 없이 수정 요청 반영 버튼은 비활성화 상태이다', () => {
      const onRevisionRequest = vi.fn().mockResolvedValue(undefined);
      render(<TestRoadmapResult {...defaultProps} onRevisionRequest={onRevisionRequest} />);
      expect(screen.getByRole('button', { name: '수정 요청 반영' })).toBeDisabled();
    });

    it('내용 입력 후 수정 요청 반영 버튼 클릭 시 onRevisionRequest가 호출된다', async () => {
      const user = userEvent.setup();
      const onRevisionRequest = vi.fn().mockResolvedValue(undefined);
      render(<TestRoadmapResult {...defaultProps} onRevisionRequest={onRevisionRequest} />);
      const textarea = screen.getByPlaceholderText(/초급 과정에 Python/);
      await user.type(textarea, '초급 과정을 수정해주세요.');
      await user.click(screen.getByRole('button', { name: '수정 요청 반영' }));
      expect(onRevisionRequest).toHaveBeenCalledWith('초급 과정을 수정해주세요.');
    });

    it('isRevising이 true이면 "수정 중..." 텍스트가 표시된다', () => {
      const onRevisionRequest = vi.fn().mockResolvedValue(undefined);
      render(
        <TestRoadmapResult
          {...defaultProps}
          onRevisionRequest={onRevisionRequest}
          isRevising={true}
        />
      );
      expect(screen.getByText('수정 중...')).toBeInTheDocument();
    });

    it('isRevising이 true이면 수정 요청 반영 버튼이 비활성화된다', () => {
      const onRevisionRequest = vi.fn().mockResolvedValue(undefined);
      render(
        <TestRoadmapResult
          {...defaultProps}
          onRevisionRequest={onRevisionRequest}
          isRevising={true}
        />
      );
      expect(screen.getByRole('button', { name: /수정 중/ })).toBeDisabled();
    });
  });
});
