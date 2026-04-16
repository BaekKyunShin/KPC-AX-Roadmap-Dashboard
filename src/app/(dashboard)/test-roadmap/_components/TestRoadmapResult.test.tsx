import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (신규 4섹션 컴포넌트) ─────────────────────────────────────────────

vi.mock('@/components/roadmap/CompetencyModelingTable', () => ({
  CompetencyModelingTable: ({
    competencies,
    canEdit,
  }: {
    competencies: unknown[];
    canEdit: boolean;
  }) => (
    <div data-testid="competency-modeling-table" data-can-edit={canEdit}>
      competencies: {competencies.length}
    </div>
  ),
}));

vi.mock('@/components/roadmap/RoadmapMatrix', () => ({
  RoadmapMatrix: ({
    trainingStructure,
    canEdit,
  }: {
    competencies: unknown[];
    trainingStructure: unknown[];
    canEdit: boolean;
  }) => (
    <div data-testid="roadmap-matrix" data-can-edit={canEdit}>
      structure: {trainingStructure.length}
    </div>
  ),
}));

vi.mock('@/components/roadmap/AnnualTrainingPlanTable', () => ({
  AnnualTrainingPlanTable: ({
    plan,
    canEdit,
  }: {
    plan: { items: unknown[]; usage_plan: string };
    canEdit: boolean;
  }) => (
    <div data-testid="annual-plan" data-can-edit={canEdit}>
      items: {plan.items.length}
    </div>
  ),
}));

vi.mock('@/components/roadmap/CoursesList', () => ({
  CoursesList: ({ specs, canEdit }: { specs: unknown[]; canEdit: boolean }) => (
    <div data-testid="courses-list" data-can-edit={canEdit}>
      specs: {specs.length}
    </div>
  ),
}));

import TestRoadmapResult from './TestRoadmapResult';
import type { RoadmapResult, ValidationResult } from '@/lib/services/roadmap';

// ─── 테스트 데이터 (신규 4섹션 구조) ───────────────────────────────────────────

const mockResult: RoadmapResult = {
  diagnosis_summary: '제조업 AI 도입 초기 단계 기업입니다.',
  competencies: [
    {
      name: '데이터 분석',
      definition: '데이터 기반 의사결정',
      knowledge: ['통계'],
      skills: ['SQL'],
      attitudes: ['호기심'],
      ncs_used: false,
    },
  ],
  training_structure: [
    {
      competency_name: '데이터 분석',
      level: 'BEGINNER',
      content: '기초 통계',
      target_audience: '전사',
      method: '집체',
      goal: '기초 통계 이해',
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
    usage_plan: '사내 재직자 교육 활용',
  },
  course_specs: [
    {
      course_name: '데이터 분석 기초',
      format: '집체',
      recommended_program: '재직자',
      goal: '기초 통계 이해',
      main_content: 'Python/Pandas',
      target_audience: '전사',
      subjects: [],
    },
  ],
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

    it('"새 테스트 시작" 버튼 클릭 시 onReset이 호출된다', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();
      render(<TestRoadmapResult {...defaultProps} onReset={onReset} />);
      await user.click(screen.getByRole('button', { name: '새 테스트 시작' }));
      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('기본 탭은 "역량 모델링"이며 CompetencyModelingTable이 표시된다', () => {
      render(<TestRoadmapResult {...defaultProps} />);
      expect(screen.getByTestId('competency-modeling-table')).toBeInTheDocument();
    });

    it('canEdit=false로 읽기 전용 렌더링된다', () => {
      render(<TestRoadmapResult {...defaultProps} />);
      const tbl = screen.getByTestId('competency-modeling-table');
      expect(tbl.getAttribute('data-can-edit')).toBe('false');
    });
  });

  describe('탭 전환 (신규 4섹션)', () => {
    it('"훈련체계도" 탭 클릭 시 RoadmapMatrix가 표시된다', async () => {
      const user = userEvent.setup();
      render(<TestRoadmapResult {...defaultProps} />);
      await user.click(screen.getByRole('tab', { name: '훈련체계도' }));
      await waitFor(() => {
        expect(screen.getByTestId('roadmap-matrix')).toBeInTheDocument();
      });
    });

    it('"연간 훈련계획" 탭 클릭 시 AnnualTrainingPlanTable이 표시된다', async () => {
      const user = userEvent.setup();
      render(<TestRoadmapResult {...defaultProps} />);
      await user.click(screen.getByRole('tab', { name: '연간 훈련계획' }));
      await waitFor(() => {
        expect(screen.getByTestId('annual-plan')).toBeInTheDocument();
      });
    });

    it('"훈련과정 명세서" 탭 클릭 시 CoursesList가 표시된다', async () => {
      const user = userEvent.setup();
      render(<TestRoadmapResult {...defaultProps} />);
      await user.click(screen.getByRole('tab', { name: '훈련과정 명세서' }));
      await waitFor(() => {
        expect(screen.getByTestId('courses-list')).toBeInTheDocument();
      });
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

    it('에러 항목과 경고 항목이 분리 표시된다', () => {
      const validationWithNotes: ValidationResult = {
        isValid: false,
        errors: ['치명적 오류'],
        warnings: ['주의 사항'],
      };
      render(<TestRoadmapResult {...defaultProps} validation={validationWithNotes} />);
      expect(screen.getByText('치명적 오류')).toBeInTheDocument();
      expect(screen.getByText('주의 사항')).toBeInTheDocument();
      expect(screen.getByText(/오류 \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/경고 \(1\)/)).toBeInTheDocument();
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
  });
});
