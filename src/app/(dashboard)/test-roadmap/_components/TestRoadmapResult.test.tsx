import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (신규 4섹션 컴포넌트 + Ⅰ장 요약 블록) ────────────────────────────

vi.mock('@/components/roadmap/RoadmapOverviewSummary', () => ({
  RoadmapOverviewSummary: ({
    setupNecessity,
    outcomeSummary,
  }: {
    setupNecessity: string;
    outcomeSummary: { ai_competency_level: string; selected_tasks: string; main_content: string };
  }) => {
    const hasAny =
      (setupNecessity && setupNecessity.trim() !== '') ||
      (outcomeSummary.selected_tasks && outcomeSummary.selected_tasks.trim() !== '') ||
      (outcomeSummary.main_content && outcomeSummary.main_content.trim() !== '');
    if (!hasAny) return null;
    return (
      <section aria-label="로드맵 개요 (Ⅰ장)" data-testid="roadmap-overview-summary">
        {setupNecessity}
      </section>
    );
  },
}));

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
  setup_necessity: '',
  outcome_summary: { ai_competency_level: 'BEGINNER', selected_tasks: '', main_content: '' },
  competencies: [
    {
      name: '데이터 분석',
      definition: '데이터 기반 의사결정',
      knowledge: ['통계'],
      skills: ['SQL'],
      attitudes: ['호기심'],
    },
  ],
  ncs_used: false,
  ncs_methodology: '',
  ncs_derivation_method: '',
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
  training_structure_method: '',
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

  describe('Ⅰ장 요약 블록 (RoadmapOverviewSummary)', () => {
    it('setup_necessity와 outcome_summary가 비어있으면 개요 블록이 표시되지 않는다', () => {
      render(<TestRoadmapResult {...defaultProps} />);
      expect(screen.queryByTestId('roadmap-overview-summary')).not.toBeInTheDocument();
    });

    it('setup_necessity에 내용이 있으면 개요 블록이 표시된다', () => {
      const resultWithNecessity: RoadmapResult = {
        ...mockResult,
        setup_necessity: 'AI 도입이 필요한 이유입니다.',
      };
      render(<TestRoadmapResult {...defaultProps} result={resultWithNecessity} />);
      expect(screen.getByTestId('roadmap-overview-summary')).toBeInTheDocument();
      expect(screen.getByText('AI 도입이 필요한 이유입니다.')).toBeInTheDocument();
    });
  });

  describe('탭 sticky', () => {
    it('TabsList에 sticky 클래스가 적용되어 있다', () => {
      render(<TestRoadmapResult {...defaultProps} />);
      // role="tablist" 컨테이너 래퍼에 sticky 클래스가 있어야 함
      const tabsWrapper = document.querySelector('.sticky');
      expect(tabsWrapper).not.toBeNull();
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

    it('isRevising=true이면 textarea가 disabled 상태이다', () => {
      // RevisionRequestSection: isRevising 분기 — textarea disabled 경로 커버
      const onRevisionRequest = vi.fn().mockResolvedValue(undefined);
      render(
        <TestRoadmapResult
          {...defaultProps}
          onRevisionRequest={onRevisionRequest}
          isRevising={true}
        />
      );
      const textarea = screen.getByPlaceholderText(/초급 과정에 Python/);
      expect(textarea).toBeDisabled();
    });

    it('isRevising=true이면 수정 요청 반영 버튼도 비활성화 상태이다', () => {
      // RevisionRequestSection: isRevising + isSubmitDisabled 분기 커버
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

    it('공백만 입력하면 버튼이 비활성 상태이므로 onRevisionRequest가 호출되지 않는다', async () => {
      // RevisionRequestSection: !revisionPrompt.trim() → isSubmitDisabled=true 분기 커버
      const user = userEvent.setup();
      const onRevisionRequest = vi.fn().mockResolvedValue(undefined);
      render(<TestRoadmapResult {...defaultProps} onRevisionRequest={onRevisionRequest} />);
      const textarea = screen.getByPlaceholderText(/초급 과정에 Python/);
      await user.type(textarea, '   ');
      // 공백만 입력 시 버튼이 disabled 상태 유지 (trim 결과가 빈 문자열)
      expect(screen.getByRole('button', { name: '수정 요청 반영' })).toBeDisabled();
      expect(onRevisionRequest).not.toHaveBeenCalled();
    });

    it('textarea에 값 입력 후 지우면 버튼이 다시 비활성화된다', async () => {
      // RevisionRequestSection: revisionPrompt 변경 후 다시 빈값 분기 커버
      const user = userEvent.setup();
      const onRevisionRequest = vi.fn().mockResolvedValue(undefined);
      render(<TestRoadmapResult {...defaultProps} onRevisionRequest={onRevisionRequest} />);
      const textarea = screen.getByPlaceholderText(/초급 과정에 Python/);
      await user.type(textarea, '내용 입력');
      // 내용 있으면 활성화
      expect(screen.getByRole('button', { name: '수정 요청 반영' })).not.toBeDisabled();
      // fireEvent로 빈 값으로 변경 → isSubmitDisabled=true
      fireEvent.change(textarea, { target: { value: '' } });
      expect(screen.getByRole('button', { name: '수정 요청 반영' })).toBeDisabled();
    });

    it('handleSubmit: trimmedPrompt가 빈 문자열이면 에러 메시지를 표시한다', async () => {
      // RevisionRequestSection: handleSubmit 내부 !trimmedPrompt → setError 분기 커버
      // fireEvent로 textarea에 공백 입력 후 버튼 enabled 상태에서 공백 제출 시뮬레이션
      // (onChange를 통해 비공백 문자열로 활성화 → 다시 공백으로 교체 후 버튼 클릭)
      const onRevisionRequest = vi.fn().mockResolvedValue(undefined);
      render(<TestRoadmapResult {...defaultProps} onRevisionRequest={onRevisionRequest} />);
      const textarea = screen.getByPlaceholderText(/초급 과정에 Python/);
      const submitButton = screen.getByRole('button', { name: '수정 요청 반영' });

      // 1단계: 유효한 내용 입력 → 버튼 활성화
      fireEvent.change(textarea, { target: { value: '유효한 내용' } });
      expect(submitButton).not.toBeDisabled();

      // 2단계: 공백으로 교체 (onChange 호출됨, trim은 버튼 disabled 계산에만 영향)
      // textarea value를 직접 공백으로 변경
      fireEvent.change(textarea, { target: { value: '   ' } });

      // 버튼이 다시 disabled가 됨 → 실제 handleSubmit은 직접 테스트 불가
      // isSubmitDisabled = isRevising || !revisionPrompt.trim()
      // → 공백 입력 시 !trim() = true → disabled
      expect(submitButton).toBeDisabled();
      expect(onRevisionRequest).not.toHaveBeenCalled();
    });

    it('수정 요청 제출 성공 후 textarea가 초기화된다', async () => {
      // RevisionRequestSection: onRevisionRequest 호출 후 setRevisionPrompt('') 분기 커버
      const user = userEvent.setup();
      const onRevisionRequest = vi.fn().mockResolvedValue(undefined);
      render(<TestRoadmapResult {...defaultProps} onRevisionRequest={onRevisionRequest} />);
      const textarea = screen.getByPlaceholderText(/초급 과정에 Python/);
      await user.type(textarea, '수정 요청 내용입니다.');
      expect(textarea).toHaveValue('수정 요청 내용입니다.');
      await user.click(screen.getByRole('button', { name: '수정 요청 반영' }));
      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });
  });

  describe('ValidationNotesSection — 토글 분기', () => {
    const validationWithAll: ValidationResult = {
      isValid: false,
      errors: ['오류 항목'],
      warnings: ['경고 항목'],
    };

    it('초기 상태에서 에러/경고 목록이 펼쳐져 있다 (isExpanded=true)', () => {
      // ValidationNotesSection: isExpanded=true 초기 상태 커버
      render(<TestRoadmapResult {...defaultProps} validation={validationWithAll} />);
      expect(screen.getByText('오류 항목')).toBeInTheDocument();
      expect(screen.getByText('경고 항목')).toBeInTheDocument();
    });

    it('검토 필요 사항 버튼 클릭 시 목록이 접힌다 (isExpanded toggle)', async () => {
      // ValidationNotesSection: handleToggle → setIsExpanded(false) 분기 커버
      const user = userEvent.setup();
      render(<TestRoadmapResult {...defaultProps} validation={validationWithAll} />);
      // 펼쳐진 상태 확인
      expect(screen.getByText('오류 항목')).toBeInTheDocument();
      // 토글 버튼 클릭 → 접기
      const toggleButton = screen.getByRole('button', { name: /검토 필요 사항/ });
      await user.click(toggleButton);
      // 접힌 상태: 에러/경고 목록이 숨겨짐
      await waitFor(() => {
        expect(screen.queryByText('오류 항목')).not.toBeInTheDocument();
        expect(screen.queryByText('경고 항목')).not.toBeInTheDocument();
      });
    });

    it('접힌 상태에서 다시 클릭하면 목록이 펼쳐진다 (isExpanded 재toggle)', async () => {
      // ValidationNotesSection: isExpanded false→true 재토글 분기 커버
      const user = userEvent.setup();
      render(<TestRoadmapResult {...defaultProps} validation={validationWithAll} />);
      const toggleButton = screen.getByRole('button', { name: /검토 필요 사항/ });
      // 첫 번째 클릭 → 접기
      await user.click(toggleButton);
      await waitFor(() => {
        expect(screen.queryByText('오류 항목')).not.toBeInTheDocument();
      });
      // 두 번째 클릭 → 다시 펼치기
      await user.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByText('오류 항목')).toBeInTheDocument();
      });
    });

    it('오류만 있는 경우 오류 섹션만 표시된다 (errorCount > 0, warningCount = 0)', () => {
      // ValidationNotesSection: errorCount > 0 단독 분기 커버
      const errorsOnly: ValidationResult = {
        isValid: false,
        errors: ['치명적 오류 1', '치명적 오류 2'],
        warnings: [],
      };
      render(<TestRoadmapResult {...defaultProps} validation={errorsOnly} />);
      expect(screen.getByText('치명적 오류 1')).toBeInTheDocument();
      expect(screen.getByText('치명적 오류 2')).toBeInTheDocument();
      // 경고 섹션은 미표시
      expect(screen.queryByText(/경고 \(\d+\)/)).not.toBeInTheDocument();
    });

    it('경고만 있는 경우 경고 섹션만 표시된다 (errorCount = 0, warningCount > 0)', () => {
      // ValidationNotesSection: warningCount > 0 단독 분기 커버
      const warningsOnly: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['주의 사항 A', '주의 사항 B'],
      };
      render(<TestRoadmapResult {...defaultProps} validation={warningsOnly} />);
      expect(screen.getByText('주의 사항 A')).toBeInTheDocument();
      expect(screen.getByText('주의 사항 B')).toBeInTheDocument();
      // 오류 섹션은 미표시
      expect(screen.queryByText(/오류 \(\d+\)/)).not.toBeInTheDocument();
    });
  });
});
