import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StepSummary from './StepSummary';
import type {
  InterviewParticipant,
  CompanyDetails,
  JobTask,
  PainPoint,
  Constraint,
  ImprovementGoal,
  SttInsights,
} from '@/lib/schemas/interview';

// =============================================================================
// SummaryComponents 경량 모킹
// =============================================================================

vi.mock('@/components/interview/SummaryComponents', () => ({
  SummarySection: ({
    title,
    onEdit,
    children,
    isEmpty,
  }: {
    title: string;
    onEdit: () => void;
    children: React.ReactNode;
    isEmpty?: boolean;
  }) => (
    <div data-testid={`summary-section-${title}`}>
      <span>{title}</span>
      <button data-testid={`edit-btn-${title}`} onClick={onEdit}>
        수정
      </button>
      {isEmpty ? <span>입력된 내용 없음</span> : children}
    </div>
  ),
  SeverityBadge: ({ severity }: { severity: string }) => (
    <span data-testid={`severity-${severity}`}>{severity}</span>
  ),
  StatCard: ({
    value,
    label,
  }: {
    value: number;
    label: string;
    colorScheme: string;
  }) => (
    <div data-testid={`stat-${label}`}>
      <span>{value}</span>
      <span>{label}</span>
    </div>
  ),
  InfoBox: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="info-box">
      <span>{title}</span>
      {children}
    </div>
  ),
  formatKoreanDate: (dateStr: string) => `formatted:${dateStr}`,
}));

// =============================================================================
// 테스트 데이터 헬퍼
// =============================================================================

function makeParticipant(overrides: Partial<InterviewParticipant> = {}): InterviewParticipant {
  return {
    id: 'p1',
    name: '홍길동',
    position: '팀장',
    ...overrides,
  };
}

function makeCompanyDetails(overrides: Partial<CompanyDetails> = {}): CompanyDetails {
  return {
    systems_and_tools: ['MS Office', 'ERP'],
    ai_experience: 'ChatGPT 업무 활용 경험 있음',
    ...overrides,
  };
}

function makeJobTask(overrides: Partial<JobTask> = {}): JobTask {
  return {
    id: 'jt1',
    task_name: '데이터 정리',
    task_description: '엑셀로 데이터 정리하는 업무',
    ...overrides,
  };
}

function makePainPoint(overrides: Partial<PainPoint> = {}): PainPoint {
  return {
    id: 'pp1',
    description: '반복 업무가 많아 시간이 부족함',
    severity: 'HIGH',
    related_task_ids: [],
    ...overrides,
  };
}

function makeConstraint(overrides: Partial<Constraint> = {}): Constraint {
  return {
    id: 'c1',
    type: 'DATA',
    description: '데이터 접근 권한 제한',
    severity: 'MEDIUM',
    workaround: '담당자 승인 후 접근',
    ...overrides,
  };
}

function makeImprovementGoal(overrides: Partial<ImprovementGoal> = {}): ImprovementGoal {
  return {
    id: 'ig1',
    goal_description: '반복 업무 자동화로 시간 50% 절감',
    kpi: '업무 처리 시간',
    measurement_method: '사전/사후 측정',
    target_value: '50%',
    before_value: '현재 기준',
    related_task_ids: [],
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  interviewDate: '2024-03-15',
  participants: [makeParticipant()],
  companyDetails: makeCompanyDetails(),
  jobTasks: [makeJobTask()],
  painPoints: [makePainPoint()],
  constraints: [makeConstraint()],
  improvementGoals: [makeImprovementGoal()],
  notes: '추가 메모 내용',
  sttInsights: null as SttInsights | null,
  onEditStep: vi.fn(),
};

// =============================================================================
// 테스트
// =============================================================================

describe('StepSummary', () => {
  describe('헤더 및 안내 텍스트', () => {
    it('제목 "입력 내용 확인"을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText('입력 내용 확인')).toBeInTheDocument();
    });

    it('안내 문구를 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText(/수정이 필요하면/)).toBeInTheDocument();
    });
  });

  describe('통계 카드', () => {
    it('참석자 수를 표시한다', () => {
      const props = {
        ...DEFAULT_PROPS,
        participants: [makeParticipant({ id: 'p1' }), makeParticipant({ id: 'p2', name: '이영희' })],
      };
      render(<StepSummary {...props} />);
      const statCard = screen.getByTestId('stat-참석자');
      expect(statCard).toHaveTextContent('2');
    });

    it('세부업무 수를 표시한다', () => {
      const props = {
        ...DEFAULT_PROPS,
        jobTasks: [
          makeJobTask({ id: 'jt1' }),
          makeJobTask({ id: 'jt2', task_name: '보고서 작성' }),
          makeJobTask({ id: 'jt3', task_name: '회의 진행' }),
        ],
      };
      render(<StepSummary {...props} />);
      const statCard = screen.getByTestId('stat-세부업무');
      expect(statCard).toHaveTextContent('3');
    });

    it('페인포인트 수를 표시한다', () => {
      const props = {
        ...DEFAULT_PROPS,
        painPoints: [makePainPoint({ id: 'pp1' }), makePainPoint({ id: 'pp2', description: '두 번째 페인포인트' })],
      };
      render(<StepSummary {...props} />);
      const statCard = screen.getByTestId('stat-페인포인트');
      expect(statCard).toHaveTextContent('2');
    });

    it('개선목표 수를 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      const statCard = screen.getByTestId('stat-개선목표');
      expect(statCard).toHaveTextContent('1');
    });
  });

  describe('기본 정보 섹션', () => {
    it('"기본 정보" 섹션을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByTestId('summary-section-기본 정보')).toBeInTheDocument();
    });

    it('날짜를 포맷팅하여 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText('formatted:2024-03-15')).toBeInTheDocument();
    });

    it('참석자 이름을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText('홍길동')).toBeInTheDocument();
    });

    it('참석자 직책을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText('(팀장)')).toBeInTheDocument();
    });

    it('직책이 없는 참석자는 괄호 없이 이름만 표시한다', () => {
      const props = {
        ...DEFAULT_PROPS,
        participants: [makeParticipant({ position: undefined })],
      };
      render(<StepSummary {...props} />);
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.queryByText('(팀장)')).not.toBeInTheDocument();
    });
  });

  describe('시스템/AI 활용 경험 섹션', () => {
    it('"시스템/AI 활용 경험" 섹션을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByTestId('summary-section-시스템/AI 활용 경험')).toBeInTheDocument();
    });

    it('시스템/도구 목록을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText('MS Office')).toBeInTheDocument();
      expect(screen.getByText('ERP')).toBeInTheDocument();
    });

    it('AI 활용 경험을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText('ChatGPT 업무 활용 경험 있음')).toBeInTheDocument();
    });

    it('시스템/도구와 AI 경험이 없으면 isEmpty=true로 전달한다', () => {
      const props = {
        ...DEFAULT_PROPS,
        companyDetails: makeCompanyDetails({ systems_and_tools: [], ai_experience: '' }),
      };
      render(<StepSummary {...props} />);
      expect(screen.getByText('입력된 내용 없음')).toBeInTheDocument();
    });
  });

  describe('세부업무 섹션', () => {
    it('"세부업무" 섹션을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByTestId('summary-section-세부업무')).toBeInTheDocument();
    });

    it('업무명을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText('데이터 정리')).toBeInTheDocument();
    });

    it('업무 설명을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText('엑셀로 데이터 정리하는 업무')).toBeInTheDocument();
    });
  });

  describe('페인포인트 섹션', () => {
    it('"페인포인트" 섹션을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByTestId('summary-section-페인포인트')).toBeInTheDocument();
    });

    it('페인포인트 설명을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText('반복 업무가 많아 시간이 부족함')).toBeInTheDocument();
    });

    it('심각도 배지를 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByTestId('severity-HIGH')).toBeInTheDocument();
    });
  });

  describe('목표 및 제약사항 섹션', () => {
    it('"목표 및 제약사항" 섹션을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByTestId('summary-section-목표 및 제약사항')).toBeInTheDocument();
    });

    it('개선 목표를 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText('반복 업무 자동화로 시간 50% 절감')).toBeInTheDocument();
    });

    it('제약사항을 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText('데이터 접근 권한 제한')).toBeInTheDocument();
    });

    it('메모를 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByText('추가 메모 내용')).toBeInTheDocument();
    });

    it('메모가 없으면 메모 영역을 렌더링하지 않는다', () => {
      const props = { ...DEFAULT_PROPS, notes: '' };
      render(<StepSummary {...props} />);
      expect(screen.queryByText('메모')).not.toBeInTheDocument();
    });
  });

  describe('STT 인사이트', () => {
    it('sttInsights가 null이면 STT 영역을 표시하지 않는다', () => {
      render(<StepSummary {...DEFAULT_PROPS} sttInsights={null} />);
      expect(screen.queryByText('✓ AI 분석 완료')).not.toBeInTheDocument();
    });

    it('sttInsights가 있으면 "AI 분석 완료" 텍스트를 표시한다', () => {
      const sttInsights: SttInsights = {
        추가_업무: ['추가 업무 1'],
        숨은_니즈: ['숨은 니즈 1', '숨은 니즈 2'],
      };
      render(<StepSummary {...DEFAULT_PROPS} sttInsights={sttInsights} />);
      expect(screen.getByText(/AI 분석 완료/)).toBeInTheDocument();
    });

    it('추가 업무 개수를 표시한다', () => {
      const sttInsights: SttInsights = {
        추가_업무: ['업무A', '업무B'],
      };
      render(<StepSummary {...DEFAULT_PROPS} sttInsights={sttInsights} />);
      expect(screen.getByText(/추가 업무 2개/)).toBeInTheDocument();
    });

    it('숨은 니즈 개수를 표시한다', () => {
      const sttInsights: SttInsights = {
        숨은_니즈: ['니즈1'],
      };
      render(<StepSummary {...DEFAULT_PROPS} sttInsights={sttInsights} />);
      expect(screen.getByText(/숨은 니즈 1개/)).toBeInTheDocument();
    });
  });

  describe('편집 버튼 콜백', () => {
    it('기본 정보 수정 버튼 클릭 시 onEditStep(1)을 호출한다', async () => {
      const user = userEvent.setup();
      const onEditStep = vi.fn();
      render(<StepSummary {...DEFAULT_PROPS} onEditStep={onEditStep} />);

      await user.click(screen.getByTestId('edit-btn-기본 정보'));
      expect(onEditStep).toHaveBeenCalledWith(1);
    });

    it('시스템/AI 활용 경험 수정 버튼 클릭 시 onEditStep(2)을 호출한다', async () => {
      const user = userEvent.setup();
      const onEditStep = vi.fn();
      render(<StepSummary {...DEFAULT_PROPS} onEditStep={onEditStep} />);

      await user.click(screen.getByTestId('edit-btn-시스템/AI 활용 경험'));
      expect(onEditStep).toHaveBeenCalledWith(2);
    });

    it('세부업무 수정 버튼 클릭 시 onEditStep(3)을 호출한다', async () => {
      const user = userEvent.setup();
      const onEditStep = vi.fn();
      render(<StepSummary {...DEFAULT_PROPS} onEditStep={onEditStep} />);

      await user.click(screen.getByTestId('edit-btn-세부업무'));
      expect(onEditStep).toHaveBeenCalledWith(3);
    });

    it('페인포인트 수정 버튼 클릭 시 onEditStep(4)을 호출한다', async () => {
      const user = userEvent.setup();
      const onEditStep = vi.fn();
      render(<StepSummary {...DEFAULT_PROPS} onEditStep={onEditStep} />);

      await user.click(screen.getByTestId('edit-btn-페인포인트'));
      expect(onEditStep).toHaveBeenCalledWith(4);
    });

    it('목표 및 제약사항 수정 버튼 클릭 시 onEditStep(5)을 호출한다', async () => {
      const user = userEvent.setup();
      const onEditStep = vi.fn();
      render(<StepSummary {...DEFAULT_PROPS} onEditStep={onEditStep} />);

      await user.click(screen.getByTestId('edit-btn-목표 및 제약사항'));
      expect(onEditStep).toHaveBeenCalledWith(5);
    });
  });

  describe('저장 안내 InfoBox', () => {
    it('"저장 준비 완료" InfoBox를 표시한다', () => {
      render(<StepSummary {...DEFAULT_PROPS} />);
      expect(screen.getByTestId('info-box')).toBeInTheDocument();
      expect(screen.getByText('저장 준비 완료')).toBeInTheDocument();
    });
  });
});
