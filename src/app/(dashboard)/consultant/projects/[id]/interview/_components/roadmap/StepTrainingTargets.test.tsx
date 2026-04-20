import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StepTrainingTargets from './StepTrainingTargets';
import { createEmptyTrainingTarget, type TrainingTarget } from '@/lib/schemas/interview-roadmap';

function makeItems(n = 1): TrainingTarget[] {
  return Array.from({ length: n }, () => createEmptyTrainingTarget());
}

describe('StepTrainingTargets', () => {
  it('4개 필드(훈련대상 과업·선정사유·As-Is·To-Be)가 각 행에 렌더', () => {
    render(<StepTrainingTargets items={makeItems(1)} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/훈련대상 과업/)).toBeInTheDocument();
    expect(screen.getByLabelText(/선정사유/)).toBeInTheDocument();
    expect(screen.getByLabelText(/현행.*As-Is/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/개선.*To-Be/i)).toBeInTheDocument();
  });

  it('제목에 "훈련대상 과업(Task)·워크플로우 선정" 표기', () => {
    render(<StepTrainingTargets items={makeItems(1)} onChange={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: /훈련대상 과업\(Task\)·워크플로우 선정/ }),
    ).toBeInTheDocument();
  });

  it('"기대효과" 그룹 fieldset으로 As-Is/To-Be 묶음', () => {
    render(<StepTrainingTargets items={makeItems(1)} onChange={vi.fn()} />);
    const fieldset = screen.getByRole('group', { name: /기대효과/ });
    expect(fieldset).toBeInTheDocument();
  });

  it('"훈련대상 추가" 버튼 클릭 시 새 행 추가', async () => {
    const onChange = vi.fn();
    render(<StepTrainingTargets items={makeItems(1)} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /훈련대상 추가/ }));
    const [next] = onChange.mock.calls[0];
    expect(next).toHaveLength(2);
  });

  it('행 2개 이상일 때만 삭제 버튼 노출', async () => {
    const onChange = vi.fn();
    const items = makeItems(2);
    render(<StepTrainingTargets items={items} onChange={onChange} />);

    const removeButtons = screen.getAllByRole('button', { name: /행 삭제/ });
    expect(removeButtons).toHaveLength(2);

    await userEvent.click(removeButtons[1]);
    const [next] = onChange.mock.calls[0];
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe(items[0].id);
  });

  it('1개 행만 있으면 삭제 버튼 없음', () => {
    render(<StepTrainingTargets items={makeItems(1)} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /행 삭제/ })).not.toBeInTheDocument();
  });

  it('필드 변경 시 onChange에 부분 업데이트 전달', async () => {
    const onChange = vi.fn();
    const items = makeItems(1);
    render(<StepTrainingTargets items={items} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText(/훈련대상 과업/), 'A');
    const [next] = onChange.mock.calls.at(-1)!;
    expect(next[0].task_name).toBe('A');
  });

  it('2개 항목에서 첫 번째 과업명 변경 시 두 번째 항목 유지 (Line 25 cond-expr false 분기 커버)', async () => {
    // branch 0[1]: i !== index → item 그대로 반환하는 false 경로 커버
    const onChange = vi.fn();
    const items = makeItems(2);
    // 두 번째 항목에 구분 가능한 값 설정
    items[1] = { ...items[1], task_name: '기존과업B' };
    render(<StepTrainingTargets items={items} onChange={onChange} />);

    // 첫 번째 항목의 훈련대상 과업 input 변경 → updateItem(0, ...) → i=1 false 경로
    const taskInputs = screen.getAllByLabelText(/훈련대상 과업/);
    await userEvent.type(taskInputs[0], 'A');
    const [next] = onChange.mock.calls.at(-1)!;
    expect(next[1].task_name).toBe('기존과업B');
  });
});
