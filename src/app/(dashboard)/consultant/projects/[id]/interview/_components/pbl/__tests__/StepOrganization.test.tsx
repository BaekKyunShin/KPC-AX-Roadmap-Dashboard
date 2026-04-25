import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepOrganization } from '../StepOrganization';
import type { PBLOrganization } from '@/lib/schemas/interview-pbl';

function baseValue(): PBLOrganization {
  return {
    orgTree: [],
    mainWork: [{ dept: '', role: '', description: '' }],
  };
}

describe('StepOrganization', () => {
  it('FormSection 번호·제목이 노출된다', () => {
    render(<StepOrganization value={baseValue()} onChange={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: '조직 및 주요 업무', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ⅱ-1-나')).toBeInTheDocument();
  });

  it('OrganizationTree 의 "루트 노드 추가" 버튼이 포함된다', () => {
    render(<StepOrganization value={baseValue()} onChange={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: '루트 노드 추가' }),
    ).toBeInTheDocument();
  });

  it('mainWork 행 편집 시 onChange 에 반영된다', () => {
    const onChange = vi.fn();
    render(<StepOrganization value={baseValue()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('주요업무 부서 1'), {
      target: { value: '경영지원' },
    });
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as PBLOrganization;
    expect(next.mainWork[0].dept).toBe('경영지원');
  });

  it('"행 추가" 클릭 시 빈 mainWork 행이 추가된다', () => {
    const onChange = vi.fn();
    render(<StepOrganization value={baseValue()} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('주요업무 행 추가'));
    const next = onChange.mock.calls[0][0] as PBLOrganization;
    expect(next.mainWork).toHaveLength(2);
    expect(next.mainWork[1]).toEqual({ dept: '', role: '', description: '' });
  });

  it('2행 이상일 때 삭제 버튼 클릭 시 행이 제거된다', () => {
    const onChange = vi.fn();
    const two: PBLOrganization = {
      orgTree: [],
      mainWork: [
        { dept: 'A', role: 'a1', description: '' },
        { dept: 'B', role: 'b1', description: '' },
      ],
    };
    render(<StepOrganization value={two} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('주요업무 삭제 1'));
    const next = onChange.mock.calls[0][0] as PBLOrganization;
    expect(next.mainWork).toHaveLength(1);
    expect(next.mainWork[0].dept).toBe('B');
  });

  it('readOnly=true 이면 삭제/추가 버튼이 비활성화·숨겨진다', () => {
    render(
      <StepOrganization value={baseValue()} onChange={vi.fn()} readOnly />,
    );
    // OrganizationTree 루트 추가 버튼이 숨겨져야 함
    expect(
      screen.queryByRole('button', { name: '루트 노드 추가' }),
    ).toBeNull();
    // mainWork 행 추가/삭제 버튼은 disabled
    expect(screen.getByLabelText('주요업무 행 추가')).toBeDisabled();
  });
});
