import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StepConstraintsGoals from './StepConstraintsGoals';
import type { Constraint, ImprovementGoal, SttInsights } from '@/lib/schemas/interview';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('./FillExampleButton', () => ({
  default: ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick} data-testid="fill-example-btn">
      예시 채우기
    </button>
  ),
}));

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeConstraint(overrides?: Partial<Constraint>): Constraint {
  return {
    id: 'c1',
    type: 'DATA',
    description: '개인정보 보호 제약',
    severity: 'MEDIUM',
    workaround: '',
    ...overrides,
  };
}

function makeGoal(overrides?: Partial<ImprovementGoal>): ImprovementGoal {
  return {
    id: 'g1',
    goal_description: '처리 시간 50% 단축',
    kpi: '',
    measurement_method: '',
    target_value: '',
    before_value: '',
    related_task_ids: [],
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  constraints: [] as Constraint[],
  improvementGoals: [makeGoal()],
  notes: '',
  sttInsights: null as SttInsights | null,
  onConstraintsChange: vi.fn(),
  onImprovementGoalsChange: vi.fn(),
  onNotesChange: vi.fn(),
  onSttFileUpload: vi.fn().mockResolvedValue(undefined),
  onSttInsightsDelete: vi.fn().mockResolvedValue(undefined),
  isProcessingStt: false,
};

// =============================================================================
// 테스트
// =============================================================================

describe('StepConstraintsGoals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. 기본 렌더링
  // -------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('개선 목표 섹션 제목이 렌더링된다', () => {
      render(<StepConstraintsGoals {...DEFAULT_PROPS} />);

      expect(screen.getByText('개선 목표')).toBeInTheDocument();
    });

    it('제약사항 섹션 제목이 렌더링된다', () => {
      render(<StepConstraintsGoals {...DEFAULT_PROPS} />);

      expect(screen.getByText('제약사항')).toBeInTheDocument();
    });

    it('추가 정보 섹션이 렌더링된다', () => {
      render(<StepConstraintsGoals {...DEFAULT_PROPS} />);

      expect(screen.getByText('추가 정보')).toBeInTheDocument();
    });

    it('개선 목표 textarea에 초기값이 표시된다', () => {
      render(
        <StepConstraintsGoals
          {...DEFAULT_PROPS}
          improvementGoals={[makeGoal({ goal_description: '응답 시간 단축' })]}
        />,
      );

      expect(screen.getByDisplayValue('응답 시간 단축')).toBeInTheDocument();
    });

    it('제약사항 textarea에 초기값이 표시된다', () => {
      render(
        <StepConstraintsGoals
          {...DEFAULT_PROPS}
          constraints={[makeConstraint({ description: '보안 정책 준수' })]}
        />,
      );

      expect(screen.getByDisplayValue('보안 정책 준수')).toBeInTheDocument();
    });

    it('메모 textarea가 렌더링된다', () => {
      render(
        <StepConstraintsGoals {...DEFAULT_PROPS} notes="테스트 메모" />,
      );

      expect(screen.getByDisplayValue('테스트 메모')).toBeInTheDocument();
    });

    it('STT 파일 업로드 영역이 렌더링된다 (sttInsights 없을 때)', () => {
      render(<StepConstraintsGoals {...DEFAULT_PROPS} sttInsights={null} />);

      expect(screen.getByText(/txt 파일을 업로드/)).toBeInTheDocument();
    });

    it('예시 채우기 버튼이 2개(개선 목표/제약사항) 렌더링된다', () => {
      render(<StepConstraintsGoals {...DEFAULT_PROPS} />);

      expect(screen.getAllByTestId('fill-example-btn')).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // 2. 개선 목표 수정
  // -------------------------------------------------------------------------
  describe('개선 목표 수정', () => {
    it('개선 목표 textarea 입력 시 onImprovementGoalsChange가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepConstraintsGoals
          {...DEFAULT_PROPS}
          improvementGoals={[makeGoal({ goal_description: '' })]}
          onImprovementGoalsChange={mockOnChange}
        />,
      );

      // 개선 목표 textarea (placeholder로 찾기)
      const goalTextarea = screen.getByPlaceholderText(/고객 문의 응답 시간/);
      await user.type(goalTextarea, '자동화 목표');

      expect(mockOnChange).toHaveBeenCalled();
      // user.type은 글자 단위로 콜백을 호출하므로 호출 횟수로 확인
      expect(mockOnChange.mock.calls.length).toBeGreaterThan(0);
    });

    it('improvementGoals가 빈 배열일 때 입력하면 새 항목이 생성된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepConstraintsGoals
          {...DEFAULT_PROPS}
          improvementGoals={[]}
          onImprovementGoalsChange={mockOnChange}
        />,
      );

      const goalTextarea = screen.getByPlaceholderText(/고객 문의 응답 시간/);
      await user.type(goalTextarea, '목표 추가');

      expect(mockOnChange).toHaveBeenCalled();
      // 빈 배열일 때 첫 입력에서 새 항목이 생성되어야 함
      const firstCall = mockOnChange.mock.calls[0][0] as ImprovementGoal[];
      expect(firstCall.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. 제약사항 수정
  // -------------------------------------------------------------------------
  describe('제약사항 수정', () => {
    it('제약사항 textarea 입력 시 onConstraintsChange가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepConstraintsGoals
          {...DEFAULT_PROPS}
          constraints={[makeConstraint({ description: '' })]}
          onConstraintsChange={mockOnChange}
        />,
      );

      const constraintTextarea = screen.getByPlaceholderText(/고객 개인정보/);
      await user.type(constraintTextarea, '예산 제한');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('제약사항 textarea를 비우면 onConstraintsChange가 빈 배열로 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepConstraintsGoals
          {...DEFAULT_PROPS}
          constraints={[makeConstraint({ description: '기존 제약' })]}
          onConstraintsChange={mockOnChange}
        />,
      );

      const constraintTextarea = screen.getByDisplayValue('기존 제약');
      await user.clear(constraintTextarea);

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0] as Constraint[];
      expect(lastCall).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 4. 메모 수정
  // -------------------------------------------------------------------------
  describe('메모 수정', () => {
    it('메모 textarea 입력 시 onNotesChange가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnNotesChange = vi.fn();

      render(
        <StepConstraintsGoals
          {...DEFAULT_PROPS}
          notes=""
          onNotesChange={mockOnNotesChange}
        />,
      );

      const notesTextarea = screen.getByPlaceholderText(/기업 요구사항/);
      await user.type(notesTextarea, '후속 미팅 예정');

      expect(mockOnNotesChange).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 5. 예시 채우기
  // -------------------------------------------------------------------------
  describe('예시 채우기', () => {
    it('첫 번째 예시 채우기 버튼(개선 목표) 클릭 시 onImprovementGoalsChange가 예시로 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepConstraintsGoals
          {...DEFAULT_PROPS}
          improvementGoals={[makeGoal({ goal_description: '' })]}
          onImprovementGoalsChange={mockOnChange}
        />,
      );

      const fillButtons = screen.getAllByTestId('fill-example-btn');
      await user.click(fillButtons[0]);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as ImprovementGoal[];
      expect(called[0].goal_description).toBeTruthy();
    });

    it('두 번째 예시 채우기 버튼(제약사항) 클릭 시 onConstraintsChange가 예시로 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepConstraintsGoals
          {...DEFAULT_PROPS}
          constraints={[]}
          onConstraintsChange={mockOnChange}
        />,
      );

      const fillButtons = screen.getAllByTestId('fill-example-btn');
      await user.click(fillButtons[1]);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as Constraint[];
      expect(called.length).toBeGreaterThan(0);
      expect(called[0].description).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 6. STT 파일 업로드
  // -------------------------------------------------------------------------
  describe('STT 파일 업로드', () => {
    it('유효한 .txt 파일 업로드 시 onSttFileUpload가 파일 텍스트로 호출된다', async () => {
      const mockOnSttUpload = vi.fn().mockResolvedValue(undefined);
      const fileContent = '인터뷰 녹취 내용입니다.';

      render(
        <StepConstraintsGoals
          {...DEFAULT_PROPS}
          onSttFileUpload={mockOnSttUpload}
        />,
      );

      // jsdom에서 File.prototype.text()가 없을 수 있으므로 직접 정의
      const file = new File([fileContent], 'interview.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'text', {
        value: () => Promise.resolve(fileContent),
        configurable: true,
      });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      // fireEvent로 hidden input에 직접 change 이벤트 발생
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(mockOnSttUpload).toHaveBeenCalledWith(fileContent);
      });
    });

    it('.txt 이외 파일 업로드 시 에러 메시지가 표시된다', async () => {
      render(<StepConstraintsGoals {...DEFAULT_PROPS} />);

      const file = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // fireEvent로 accept 제한 없이 직접 파일 변경 이벤트 발생
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('txt 파일만 업로드 가능합니다.')).toBeInTheDocument();
      });
    });

    it('파일 크기 초과 시 에러 메시지가 표시된다', async () => {
      const user = userEvent.setup();

      render(<StepConstraintsGoals {...DEFAULT_PROPS} />);

      // 501KB 파일 생성 (MAX = 500KB)
      const largeContent = 'a'.repeat(501 * 1024);
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await user.upload(fileInput, file);

      expect(screen.getByText(/파일 크기가 너무 큽니다/)).toBeInTheDocument();
    });

    it('isProcessingStt가 true이면 로딩 메시지가 표시된다', () => {
      render(
        <StepConstraintsGoals {...DEFAULT_PROPS} isProcessingStt={true} />,
      );

      expect(screen.getByText(/AI가 인사이트를 추출하는 중/)).toBeInTheDocument();
    });

    it('sttInsights가 있으면 "인사이트 추출 완료" 메시지가 표시된다', () => {
      const mockInsights: SttInsights = {
        추가_업무: ['업무1', '업무2'],
        숨은_니즈: ['니즈1'],
      };

      render(
        <StepConstraintsGoals
          {...DEFAULT_PROPS}
          sttInsights={mockInsights}
        />,
      );

      expect(screen.getByText('인사이트 추출 완료')).toBeInTheDocument();
      expect(screen.getByText(/추가 업무 2개/)).toBeInTheDocument();
      expect(screen.getByText(/숨은 니즈 1개/)).toBeInTheDocument();
    });

    it('인사이트 삭제 버튼 클릭 시 onSttInsightsDelete가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnDelete = vi.fn().mockResolvedValue(undefined);
      const mockInsights: SttInsights = { 추가_업무: ['업무1'] };

      render(
        <StepConstraintsGoals
          {...DEFAULT_PROPS}
          sttInsights={mockInsights}
          onSttInsightsDelete={mockOnDelete}
        />,
      );

      await user.click(screen.getByTitle('삭제'));

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });
  });
});
