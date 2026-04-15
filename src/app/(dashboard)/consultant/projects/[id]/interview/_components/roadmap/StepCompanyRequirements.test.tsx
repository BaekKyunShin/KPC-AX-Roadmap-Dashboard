import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StepCompanyRequirements from './StepCompanyRequirements';
import type { CompanyRequirements } from '@/lib/schemas/interview-roadmap';

const EMPTY: CompanyRequirements = {
  company_status: '',
  main_problems: '',
  push_willingness: '',
  expected_outcomes: '',
};

describe('StepCompanyRequirements', () => {
  it('4개 textarea 모두 렌더', () => {
    render(<StepCompanyRequirements value={EMPTY} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/기업 현황/)).toBeInTheDocument();
    expect(screen.getByLabelText(/주요 문제/)).toBeInTheDocument();
    expect(screen.getByLabelText(/추진 의지/)).toBeInTheDocument();
    expect(screen.getByLabelText(/기대 성과/)).toBeInTheDocument();
  });

  it('입력 시 해당 key로 onChange 호출', async () => {
    const onChange = vi.fn();
    render(<StepCompanyRequirements value={EMPTY} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText(/주요 문제/), 'X');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ main_problems: 'X' }),
    );
  });

  it('초기값이 textarea에 표시', () => {
    const value: CompanyRequirements = {
      company_status: '제조업, AI 미도입',
      main_problems: '품질 편차',
      push_willingness: '적극 지원',
      expected_outcomes: '15% 개선',
    };
    render(<StepCompanyRequirements value={value} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('제조업, AI 미도입')).toBeInTheDocument();
    expect(screen.getByDisplayValue('품질 편차')).toBeInTheDocument();
    expect(screen.getByDisplayValue('적극 지원')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15% 개선')).toBeInTheDocument();
  });

  it('빈 필드에 대한 errors prop 전달 시 에러 메시지 표시', () => {
    render(
      <StepCompanyRequirements
        value={EMPTY}
        onChange={vi.fn()}
        errors={{ company_status: '기업 현황을 입력하세요.' }}
      />,
    );
    expect(screen.getByText('기업 현황을 입력하세요.')).toBeInTheDocument();
  });
});
