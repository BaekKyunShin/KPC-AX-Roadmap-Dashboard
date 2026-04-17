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
});
