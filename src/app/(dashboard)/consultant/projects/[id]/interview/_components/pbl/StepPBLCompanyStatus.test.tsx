import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepPBLCompanyStatus from './StepPBLCompanyStatus';

describe('StepPBLCompanyStatus', () => {
  it('Ⅱ-1 제목과 경영 이슈 textarea가 렌더링된다', () => {
    render(
      <StepPBLCompanyStatus
        value={{ business_issues: '', organization: [] }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Ⅱ-1. 기업 현황 분석')).toBeInTheDocument();
    expect(screen.getByLabelText(/경영 이슈/)).toBeInTheDocument();
  });

  it('경영 이슈 입력 시 onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLCompanyStatus
        value={{ business_issues: '', organization: [] }}
        onChange={onChange}
      />
    );
    await user.type(screen.getByLabelText(/경영 이슈/), '이');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ business_issues: '이' }));
  });

  it('부서 추가 버튼 클릭 시 organization에 새 부서 추가', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLCompanyStatus
        value={{ business_issues: '', organization: [] }}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole('button', { name: /부서 추가/ }));
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.organization).toHaveLength(1);
    expect(lastCall.organization[0].department_name).toBe('');
  });

  it('부서 삭제 버튼이 작동한다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLCompanyStatus
        value={{
          business_issues: '',
          organization: [{ id: 'u1', department_name: '생산팀', tasks: ['품질검사'] }],
        }}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole('button', { name: '부서 1 삭제' }));
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.organization).toHaveLength(0);
  });

  it('업무 추가 버튼이 작동한다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLCompanyStatus
        value={{
          business_issues: '',
          organization: [{ id: 'u1', department_name: '생산팀', tasks: [] }],
        }}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole('button', { name: /업무 추가/ }));
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.organization[0].tasks).toEqual(['']);
  });

  it('2개 유닛에서 첫 번째 부서명 변경 시 다른 유닛은 유지된다 (Line 23 cond-expr false 분기 커버)', async () => {
    // branch 0[1]: i !== index → u 그대로 반환하는 false 경로 커버
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLCompanyStatus
        value={{
          business_issues: '',
          organization: [
            { id: 'u1', department_name: '생산팀', tasks: [] },
            { id: 'u2', department_name: '품질팀', tasks: [] },
          ],
        }}
        onChange={onChange}
      />
    );
    // 첫 번째 유닛의 부서명 입력 → updateUnit(0, ...) 호출 → i=1 false 경로 실행
    const input = screen.getAllByPlaceholderText(/예: 생산팀/)[0];
    await user.type(input, '가');
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    // 두 번째 유닛은 변경 없음
    expect(last.organization[1].department_name).toBe('품질팀');
  });

  it('2개 업무가 있는 유닛에서 첫 업무 변경 시 다른 업무 유지 (Line 40 cond-expr false 분기 커버)', async () => {
    // branch 1[1]: i !== taskIndex → t 그대로 반환하는 false 경로 커버
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLCompanyStatus
        value={{
          business_issues: '',
          organization: [
            { id: 'u1', department_name: '생산팀', tasks: ['업무A', '업무B'] },
          ],
        }}
        onChange={onChange}
      />
    );
    // 첫 번째 업무 input에 타이핑 → updateTask(0, 0, ...) → i=1 false 경로
    const taskInputs = screen.getAllByPlaceholderText(/예: 제품생산직무/);
    await user.clear(taskInputs[0]);
    await user.type(taskInputs[0], '새업무');
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.organization[0].tasks[1]).toBe('업무B');
  });
});
