import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepPBLProblemDefinition from './StepPBLProblemDefinition';
import type { PBLProblemDefinition } from '@/lib/schemas/interview-pbl';

function makeValue(
  overrides?: Partial<PBLProblemDefinition>,
): PBLProblemDefinition {
  return {
    problem_definition: {
      background: '',
      core_problem: '',
      scope: '',
      constraints: '',
    },
    problem_priorities: [],
    ...overrides,
  };
}

function makePriority(
  overrides?: Partial<PBLProblemDefinition['problem_priorities'][number]>,
): PBLProblemDefinition['problem_priorities'][number] {
  return {
    id: 'p-1',
    problem_name: '',
    priority: 3,
    selected: false,
    ...overrides,
  };
}

describe('StepPBLProblemDefinition', () => {
  it('Ⅲ-2 제목이 렌더링된다', () => {
    render(
      <StepPBLProblemDefinition value={makeValue()} onChange={vi.fn()} />,
    );
    expect(screen.getByText('Ⅲ-2. 문제 도출·우선순위')).toBeInTheDocument();
  });

  it('문제정의서 4개 필드가 모두 렌더링된다', () => {
    render(
      <StepPBLProblemDefinition value={makeValue()} onChange={vi.fn()} />,
    );
    expect(screen.getByLabelText(/문제 배경/)).toBeInTheDocument();
    expect(screen.getByLabelText(/핵심 문제/)).toBeInTheDocument();
    expect(screen.getByLabelText(/문제 범위/)).toBeInTheDocument();
    expect(screen.getByLabelText(/제약 조건/)).toBeInTheDocument();
  });

  it('배경 입력 시 problem_definition.background가 업데이트된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLProblemDefinition value={makeValue()} onChange={onChange} />);
    await user.type(screen.getByLabelText(/문제 배경/), '이');
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.problem_definition.background).toBe('이');
  });

  it('"문제 추가" 버튼 클릭 시 problem_priorities에 새 항목이 추가된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLProblemDefinition value={makeValue()} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /문제 추가/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const called = onChange.mock.calls[0][0] as PBLProblemDefinition;
    expect(called.problem_priorities).toHaveLength(1);
    expect(called.problem_priorities[0].priority).toBe(3);
    expect(called.problem_priorities[0].selected).toBe(false);
  });

  it('우선순위 1~5 라디오 중 "5 - 매우중요" 선택 시 priority가 5로 변경된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLProblemDefinition
        value={makeValue({ problem_priorities: [makePriority()] })}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('radio', { name: '5 - 매우중요' }));
    const called = onChange.mock.calls[0][0] as PBLProblemDefinition;
    expect(called.problem_priorities[0].priority).toBe(5);
  });

  it('문제가 2개 이상일 때 삭제 버튼이 표시되고 클릭 시 제거된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLProblemDefinition
        value={makeValue({
          problem_priorities: [
            makePriority({ id: 'p1', problem_name: '문제1' }),
            makePriority({ id: 'p2', problem_name: '문제2' }),
          ],
        })}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: '문제 1 삭제' }));
    const called = onChange.mock.calls[0][0] as PBLProblemDefinition;
    expect(called.problem_priorities).toHaveLength(1);
    expect(called.problem_priorities[0].id).toBe('p2');
  });

  it('선정 체크박스 클릭 시 selected가 true로 변경된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLProblemDefinition
        value={makeValue({ problem_priorities: [makePriority()] })}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByLabelText('문제 1 선정'));
    const called = onChange.mock.calls[0][0] as PBLProblemDefinition;
    expect(called.problem_priorities[0].selected).toBe(true);
  });

  it('빈 problem_priorities면 placeholder 메시지가 표시된다', () => {
    render(
      <StepPBLProblemDefinition value={makeValue()} onChange={vi.fn()} />,
    );
    expect(
      screen.getByText(/아직 등록된 문제가 없습니다/),
    ).toBeInTheDocument();
  });

  it('2개 문제에서 첫 번째 문제 이름 변경 시 두 번째 문제는 유지된다 (Line 54 cond-expr false 분기 커버)', async () => {
    // branch 0[1]: i !== index → item 그대로 반환하는 false 경로 커버
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLProblemDefinition
        value={makeValue({
          problem_priorities: [
            makePriority({ id: 'p1', problem_name: '문제A' }),
            makePriority({ id: 'p2', problem_name: '문제B' }),
          ],
        })}
        onChange={onChange}
      />,
    );
    // 첫 번째 문제명 input 변경 → updatePriority(0, 'problem_name', ...) → i=1 false 경로
    const nameInputs = screen.getAllByPlaceholderText(/예\) 불량률/);
    await user.clear(nameInputs[0]);
    await user.type(nameInputs[0], '새문제A');
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0] as PBLProblemDefinition;
    expect(last.problem_priorities[1].problem_name).toBe('문제B');
  });

  it('1개 문제만 있을 때 삭제 버튼이 없어 removePriority early return 분기는 UI로 미노출 (렌더 확인)', () => {
    // branch 1[0]: problem_priorities.length <= 1 → return 경로
    // 삭제 버튼이 렌더되지 않으므로 버튼 부재 확인으로 갈음
    render(
      <StepPBLProblemDefinition
        value={makeValue({ problem_priorities: [makePriority()] })}
        onChange={vi.fn()}
      />,
    );
    // 1개일 때는 삭제 버튼이 없음
    expect(screen.queryByRole('button', { name: /문제 1 삭제/ })).not.toBeInTheDocument();
  });
});
