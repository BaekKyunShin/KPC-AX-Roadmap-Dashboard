import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StepCompetencyModeling from './StepCompetencyModeling';
import type { CompetencyModel, NcsUsage } from '@/lib/schemas/interview-roadmap';

function makeCompetency(overrides: Partial<CompetencyModel> = {}): CompetencyModel {
  return {
    id: 'c-1',
    competency_name: '',
    competency_definition: '',
    knowledge: '',
    skill: '',
    attitude: '',
    ...overrides,
  };
}

const EMPTY_NCS_FALSE: NcsUsage = {
  uses_ncs: false,
  competency_derivation_method: '',
};

const EMPTY_NCS_TRUE: NcsUsage = {
  uses_ncs: true,
  ncs_usage_method: '',
};

describe('StepCompetencyModeling', () => {
  it('역량 1개를 기본 렌더하고 5개 입력 필드 + NCS 라디오그룹을 표시', () => {
    render(
      <StepCompetencyModeling
        competencies={[makeCompetency()]}
        ncsUsage={EMPTY_NCS_FALSE}
        onCompetenciesChange={vi.fn()}
        onNcsUsageChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/역량명/)).toBeInTheDocument();
    expect(screen.getByLabelText(/역량 정의/)).toBeInTheDocument();
    expect(screen.getByLabelText(/필요 지식/)).toBeInTheDocument();
    expect(screen.getByLabelText(/필요 기술/)).toBeInTheDocument();
    expect(screen.getByLabelText(/필요 태도/)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /NCS 능력단위 활용 여부/ })).toBeInTheDocument();
  });

  it('역량 추가 버튼 클릭 시 onCompetenciesChange 에 한 줄 추가', async () => {
    const onCompetenciesChange = vi.fn();
    render(
      <StepCompetencyModeling
        competencies={[makeCompetency()]}
        ncsUsage={EMPTY_NCS_FALSE}
        onCompetenciesChange={onCompetenciesChange}
        onNcsUsageChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /역량 추가/ }));

    expect(onCompetenciesChange).toHaveBeenCalledTimes(1);
    const next = onCompetenciesChange.mock.calls[0]![0];
    expect(next).toHaveLength(2);
  });

  it('역량이 1개뿐이면 삭제 버튼이 나타나지 않는다', () => {
    render(
      <StepCompetencyModeling
        competencies={[makeCompetency()]}
        ncsUsage={EMPTY_NCS_FALSE}
        onCompetenciesChange={vi.fn()}
        onNcsUsageChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /행 삭제/ })).not.toBeInTheDocument();
  });

  it('역량이 2개 이상이면 삭제 버튼 클릭 시 해당 인덱스가 제거된다', async () => {
    const onCompetenciesChange = vi.fn();
    render(
      <StepCompetencyModeling
        competencies={[
          makeCompetency({ id: 'c-1', competency_name: '역량1' }),
          makeCompetency({ id: 'c-2', competency_name: '역량2' }),
        ]}
        ncsUsage={EMPTY_NCS_FALSE}
        onCompetenciesChange={onCompetenciesChange}
        onNcsUsageChange={vi.fn()}
      />,
    );

    const deleteButtons = screen.getAllByRole('button', { name: /행 삭제/ });
    await userEvent.click(deleteButtons[0]!);

    const next = onCompetenciesChange.mock.calls[0]![0];
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('c-2');
  });

  it('역량명 입력 시 updateCompetency 로 onCompetenciesChange 호출', async () => {
    const onCompetenciesChange = vi.fn();
    render(
      <StepCompetencyModeling
        competencies={[makeCompetency({ id: 'c-1' })]}
        ncsUsage={EMPTY_NCS_FALSE}
        onCompetenciesChange={onCompetenciesChange}
        onNcsUsageChange={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText(/역량명/), 'A');
    const next = onCompetenciesChange.mock.calls[0]![0];
    expect(next[0].competency_name).toBe('A');
  });

  it('NCS 활용 여부 false → true 토글 시 ncs_usage_method 보존', async () => {
    const onNcsUsageChange = vi.fn();
    const ncsUsage: NcsUsage = {
      uses_ncs: false,
      competency_derivation_method: '벤치마킹',
    };
    render(
      <StepCompetencyModeling
        competencies={[makeCompetency()]}
        ncsUsage={ncsUsage}
        onCompetenciesChange={vi.fn()}
        onNcsUsageChange={onNcsUsageChange}
      />,
    );

    const radiogroup = screen.getByRole('radiogroup', { name: /NCS/ });
    const yesRadio = within(radiogroup)
      .getAllByRole('radio')
      .find((r) => (r as HTMLInputElement).value === 'true');
    await userEvent.click(yesRadio!);

    expect(onNcsUsageChange).toHaveBeenCalledWith(
      expect.objectContaining({ uses_ncs: true, ncs_usage_method: '' }),
    );
  });

  it('NCS 활용 여부 true → false 토글 시 competency_derivation_method 보존', async () => {
    const onNcsUsageChange = vi.fn();
    const ncsUsage: NcsUsage = {
      uses_ncs: true,
      ncs_usage_method: '기존 NCS 20.02.01',
    };
    render(
      <StepCompetencyModeling
        competencies={[makeCompetency()]}
        ncsUsage={ncsUsage}
        onCompetenciesChange={vi.fn()}
        onNcsUsageChange={onNcsUsageChange}
      />,
    );

    const radiogroup = screen.getByRole('radiogroup', { name: /NCS/ });
    const noRadio = within(radiogroup)
      .getAllByRole('radio')
      .find((r) => (r as HTMLInputElement).value === 'false');
    await userEvent.click(noRadio!);

    expect(onNcsUsageChange).toHaveBeenCalledWith(
      expect.objectContaining({ uses_ncs: false, competency_derivation_method: '' }),
    );
  });

  it('uses_ncs=true 면 NCS 활용 방법 textarea 표시', () => {
    render(
      <StepCompetencyModeling
        competencies={[makeCompetency()]}
        ncsUsage={EMPTY_NCS_TRUE}
        onCompetenciesChange={vi.fn()}
        onNcsUsageChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/NCS 활용 방법/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/역량 도출 방법/)).not.toBeInTheDocument();
  });

  it('uses_ncs=false 면 역량 도출 방법 textarea 표시', () => {
    render(
      <StepCompetencyModeling
        competencies={[makeCompetency()]}
        ncsUsage={EMPTY_NCS_FALSE}
        onCompetenciesChange={vi.fn()}
        onNcsUsageChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/역량 도출 방법/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/NCS 활용 방법/)).not.toBeInTheDocument();
  });

  it('NCS 활용 방법 textarea 입력 시 onNcsUsageChange 호출', async () => {
    const onNcsUsageChange = vi.fn();
    render(
      <StepCompetencyModeling
        competencies={[makeCompetency()]}
        ncsUsage={EMPTY_NCS_TRUE}
        onCompetenciesChange={vi.fn()}
        onNcsUsageChange={onNcsUsageChange}
      />,
    );

    await userEvent.type(screen.getByLabelText(/NCS 활용 방법/), 'X');
    expect(onNcsUsageChange).toHaveBeenCalledWith(
      expect.objectContaining({ uses_ncs: true, ncs_usage_method: 'X' }),
    );
  });

  it('역량 도출 방법 textarea 입력 시 onNcsUsageChange 호출', async () => {
    const onNcsUsageChange = vi.fn();
    render(
      <StepCompetencyModeling
        competencies={[makeCompetency()]}
        ncsUsage={EMPTY_NCS_FALSE}
        onCompetenciesChange={vi.fn()}
        onNcsUsageChange={onNcsUsageChange}
      />,
    );

    await userEvent.type(screen.getByLabelText(/역량 도출 방법/), 'Y');
    expect(onNcsUsageChange).toHaveBeenCalledWith(
      expect.objectContaining({ uses_ncs: false, competency_derivation_method: 'Y' }),
    );
  });
});
