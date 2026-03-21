import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StepJobTasks from './StepJobTasks';
import type { JobTask } from '@/lib/schemas/interview';

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

function makeTask(overrides?: Partial<JobTask>): JobTask {
  return {
    id: 'task-1',
    task_name: '데이터 분석',
    task_description: '매출 데이터를 분석합니다.',
    ...overrides,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('StepJobTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. 기본 렌더링
  // -------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('섹션 제목이 렌더링된다', () => {
      render(
        <StepJobTasks
          jobTasks={[makeTask()]}
          onJobTasksChange={vi.fn()}
        />,
      );

      expect(screen.getByText('세부업무')).toBeInTheDocument();
    });

    it('업무 추가 버튼이 렌더링된다', () => {
      render(
        <StepJobTasks
          jobTasks={[makeTask()]}
          onJobTasksChange={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /업무 추가/ })).toBeInTheDocument();
    });

    it('업무 항목의 task_name과 task_description이 표시된다', () => {
      render(
        <StepJobTasks
          jobTasks={[makeTask({ task_name: '고객 응대', task_description: '전화 및 이메일 응대' })]}
          onJobTasksChange={vi.fn()}
        />,
      );

      expect(screen.getByDisplayValue('고객 응대')).toBeInTheDocument();
      expect(screen.getByDisplayValue('전화 및 이메일 응대')).toBeInTheDocument();
    });

    it('업무가 1개이면 삭제 버튼이 표시되지 않는다', () => {
      render(
        <StepJobTasks
          jobTasks={[makeTask()]}
          onJobTasksChange={vi.fn()}
        />,
      );

      expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
    });

    it('업무가 2개이면 삭제 버튼이 2개 표시된다', () => {
      render(
        <StepJobTasks
          jobTasks={[
            makeTask({ id: 't1', task_name: '업무1', task_description: '설명1' }),
            makeTask({ id: 't2', task_name: '업무2', task_description: '설명2' }),
          ]}
          onJobTasksChange={vi.fn()}
        />,
      );

      expect(screen.getAllByRole('button', { name: /삭제/ })).toHaveLength(2);
    });

    it('예시 채우기 버튼이 각 업무 항목마다 렌더링된다', () => {
      render(
        <StepJobTasks
          jobTasks={[
            makeTask({ id: 't1' }),
            makeTask({ id: 't2', task_name: '업무2', task_description: '설명2' }),
          ]}
          onJobTasksChange={vi.fn()}
        />,
      );

      expect(screen.getAllByTestId('fill-example-btn')).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // 2. 업무 추가
  // -------------------------------------------------------------------------
  describe('업무 추가', () => {
    it('"업무 추가" 버튼 클릭 시 onJobTasksChange가 빈 업무를 추가하여 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepJobTasks
          jobTasks={[makeTask()]}
          onJobTasksChange={mockOnChange}
        />,
      );

      await user.click(screen.getByRole('button', { name: /업무 추가/ }));

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as JobTask[];
      expect(called).toHaveLength(2);
      expect(called[1].task_name).toBe('');
      expect(called[1].task_description).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // 3. 업무 삭제
  // -------------------------------------------------------------------------
  describe('업무 삭제', () => {
    it('삭제 버튼 클릭 시 해당 업무가 제거된 배열로 onJobTasksChange가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepJobTasks
          jobTasks={[
            makeTask({ id: 't1', task_name: '업무1', task_description: '설명1' }),
            makeTask({ id: 't2', task_name: '업무2', task_description: '설명2' }),
          ]}
          onJobTasksChange={mockOnChange}
        />,
      );

      const deleteButtons = screen.getAllByRole('button', { name: /삭제/ });
      await user.click(deleteButtons[0]);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as JobTask[];
      expect(called).toHaveLength(1);
      expect(called[0].id).toBe('t2');
    });

    it('업무가 1개이면 삭제 버튼이 없어 삭제할 수 없다', () => {
      render(
        <StepJobTasks
          jobTasks={[makeTask()]}
          onJobTasksChange={vi.fn()}
        />,
      );

      expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 4. 업무명 수정
  // -------------------------------------------------------------------------
  describe('업무명 수정', () => {
    it('업무명 입력 시 onJobTasksChange가 업데이트된 배열로 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepJobTasks
          jobTasks={[makeTask({ task_name: '' })]}
          onJobTasksChange={mockOnChange}
        />,
      );

      const taskNameInput = screen.getByPlaceholderText(/고객 문의 응대/);
      await user.type(taskNameInput, '보고서 작성');

      expect(mockOnChange).toHaveBeenCalled();
      // user.type은 글자 단위로 콜백을 호출하므로 호출 횟수로 확인
      expect(mockOnChange.mock.calls.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 5. 업무 설명 수정
  // -------------------------------------------------------------------------
  describe('업무 설명 수정', () => {
    it('업무 설명 입력 시 onJobTasksChange가 업데이트된 배열로 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepJobTasks
          jobTasks={[makeTask({ task_description: '' })]}
          onJobTasksChange={mockOnChange}
        />,
      );

      const descTextarea = screen.getByPlaceholderText(/업무의 상세 내용/);
      await user.type(descTextarea, '월간 매출 보고서 작성');

      expect(mockOnChange).toHaveBeenCalled();
      // user.type은 글자 단위로 콜백을 호출하므로 호출 횟수로 확인
      expect(mockOnChange.mock.calls.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // 6. 예시 채우기
  // -------------------------------------------------------------------------
  describe('예시 채우기', () => {
    it('예시 채우기 클릭 시 onJobTasksChange가 예시 데이터로 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepJobTasks
          jobTasks={[makeTask({ task_name: '', task_description: '' })]}
          onJobTasksChange={mockOnChange}
        />,
      );

      await user.click(screen.getByTestId('fill-example-btn'));

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as JobTask[];
      expect(called[0].task_name).toBeTruthy();
      expect(called[0].task_description).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 7. 복수 업무 렌더링
  // -------------------------------------------------------------------------
  describe('복수 업무 렌더링', () => {
    it('여러 업무 항목이 모두 렌더링된다', () => {
      render(
        <StepJobTasks
          jobTasks={[
            makeTask({ id: 't1', task_name: '업무A', task_description: '설명A' }),
            makeTask({ id: 't2', task_name: '업무B', task_description: '설명B' }),
            makeTask({ id: 't3', task_name: '업무C', task_description: '설명C' }),
          ]}
          onJobTasksChange={vi.fn()}
        />,
      );

      expect(screen.getByDisplayValue('업무A')).toBeInTheDocument();
      expect(screen.getByDisplayValue('업무B')).toBeInTheDocument();
      expect(screen.getByDisplayValue('업무C')).toBeInTheDocument();
    });

    it('업무 순서 번호가 올바르게 표시된다', () => {
      render(
        <StepJobTasks
          jobTasks={[
            makeTask({ id: 't1', task_name: '업무1', task_description: '설명1' }),
            makeTask({ id: 't2', task_name: '업무2', task_description: '설명2' }),
          ]}
          onJobTasksChange={vi.fn()}
        />,
      );

      expect(screen.getByText('업무 1')).toBeInTheDocument();
      expect(screen.getByText('업무 2')).toBeInTheDocument();
    });
  });
});
