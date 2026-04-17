import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepPBLTargetTasks from './StepPBLTargetTasks';
import type { PBLTargetTasks } from '@/lib/schemas/interview-pbl';

function makeValue(partial: Partial<PBLTargetTasks> = {}): PBLTargetTasks {
  return {
    target_tasks: [],
    selection_reason: '',
    target_task_details: [],
    ...partial,
  };
}

describe('StepPBLTargetTasks', () => {
  it('Ⅲ-3 제목과 3개 섹션 헤더가 렌더링된다', () => {
    render(<StepPBLTargetTasks value={makeValue()} onChange={vi.fn()} />);
    expect(screen.getByText('Ⅲ-3. 훈련대상 업무 선정')).toBeInTheDocument();
    expect(screen.getByText('가. 훈련대상 업무 선정')).toBeInTheDocument();
    expect(screen.getByLabelText(/AI기반 문제해결의 필요성/)).toBeInTheDocument();
    expect(screen.getByText('다. 훈련대상 업무 세부내용')).toBeInTheDocument();
  });

  it('"업무 추가" 버튼 클릭 시 target_tasks에 새 행 추가', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLTargetTasks value={makeValue()} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /업무 추가/ }));

    const next = onChange.mock.calls.at(-1)![0] as PBLTargetTasks;
    expect(next.target_tasks).toHaveLength(1);
    expect(next.target_tasks[0].necessity).toBe(3);
    expect(next.target_tasks[0].selected).toBe(false);
    expect(next.target_tasks[0].task_name).toBe('');
  });

  it('업무 행의 삭제 버튼(aria-label: "업무 N 삭제")으로 행 제거', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLTargetTasks
        value={makeValue({
          target_tasks: [
            { id: 't1', task_name: '외관검사', necessity: 4, selected: true },
            { id: 't2', task_name: '공정분석', necessity: 3, selected: false },
          ],
        })}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: '업무 1 삭제' }));
    const next = onChange.mock.calls.at(-1)![0] as PBLTargetTasks;
    expect(next.target_tasks).toHaveLength(1);
    expect(next.target_tasks[0].id).toBe('t2');
  });

  it('필요도 라디오 그룹에 1~5 옵션이 있고 선택 시 onChange 호출', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLTargetTasks
        value={makeValue({
          target_tasks: [
            { id: 't1', task_name: '외관검사', necessity: 3, selected: false },
          ],
        })}
        onChange={onChange}
      />,
    );

    const group = screen.getByRole('radiogroup', { name: '업무 1 필요도' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(5);
    expect(radios.map((r) => r.getAttribute('value'))).toEqual(['1', '2', '3', '4', '5']);

    await user.click(within(group).getByRole('radio', { name: /^5/ }));
    const next = onChange.mock.calls.at(-1)![0] as PBLTargetTasks;
    expect(next.target_tasks[0].necessity).toBe(5);
  });

  it('선정 사유 Textarea 입력 시 onChange 호출', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLTargetTasks value={makeValue()} onChange={onChange} />);

    await user.type(screen.getByLabelText(/AI기반 문제해결의 필요성/), '사');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ selection_reason: '사' }),
    );
  });

  it('"업무 세부내용 추가" 버튼 클릭 시 target_task_details에 새 행 추가 + 삭제 버튼 작동', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <StepPBLTargetTasks value={makeValue()} onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', { name: /업무 세부내용 추가/ }));
    const afterAdd = onChange.mock.calls.at(-1)![0] as PBLTargetTasks;
    expect(afterAdd.target_task_details).toHaveLength(1);
    expect(afterAdd.target_task_details[0].task_name).toBe('');

    rerender(
      <StepPBLTargetTasks
        value={makeValue({
          target_task_details: [
            {
              id: 'd1',
              task_name: '외관검사',
              as_is: 'A',
              to_be: 'B',
              required_knowledge: 'K',
              required_skill: 'S',
            },
          ],
        })}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: '세부내용 1 삭제' }));
    const afterRemove = onChange.mock.calls.at(-1)![0] as PBLTargetTasks;
    expect(afterRemove.target_task_details).toHaveLength(0);
  });
});
