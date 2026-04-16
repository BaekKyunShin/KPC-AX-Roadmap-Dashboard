import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StepOverview from './StepOverview';
import type { Overview } from '@/lib/schemas/interview-roadmap';

const EMPTY: Overview = {
  establishment_necessity: '',
  ai_competency_level: 'BEGINNER',
  selected_tasks_summary: '',
  roadmap_summary: '',
};

describe('StepOverview', () => {
  it('수립 필요성 · 선정 과업 · 수립 주요내용 요약 textarea 렌더', () => {
    render(<StepOverview value={EMPTY} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/수립 필요성/)).toBeInTheDocument();
    expect(screen.getByLabelText(/선정 과업/)).toBeInTheDocument();
    expect(screen.getByLabelText(/수립 주요내용/)).toBeInTheDocument();
  });

  it('AI 역량 수준 라디오 3개 + 각 부제 렌더', () => {
    render(<StepOverview value={EMPTY} onChange={vi.fn()} />);

    const radiogroup = screen.getByRole('radiogroup', { name: /AI 역량 수준/ });
    expect(radiogroup).toBeInTheDocument();

    // 3개 라벨 + 각 부제가 함께 표시되어야 함 (양식 Ⅰ-3)
    expect(within(radiogroup).getByText('초급')).toBeInTheDocument();
    expect(within(radiogroup).getByText('(AI기초형)')).toBeInTheDocument();
    expect(within(radiogroup).getByText('중급')).toBeInTheDocument();
    expect(within(radiogroup).getByText('(AI탐구형)')).toBeInTheDocument();
    expect(within(radiogroup).getByText('고급')).toBeInTheDocument();
    expect(within(radiogroup).getByText('(AI활용형·선도형)')).toBeInTheDocument();
  });

  it('선택된 AI 역량 수준 라디오가 checked 상태', () => {
    render(
      <StepOverview value={{ ...EMPTY, ai_competency_level: 'INTERMEDIATE' }} onChange={vi.fn()} />,
    );
    const radios = screen.getAllByRole('radio');
    const intermediate = radios.find((r) => (r as HTMLInputElement).value === 'INTERMEDIATE');
    expect(intermediate).toBeChecked();
  });

  it('라디오 변경 시 ai_competency_level onChange 호출', async () => {
    const onChange = vi.fn();
    render(<StepOverview value={EMPTY} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText(/^중급/));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ ai_competency_level: 'INTERMEDIATE' }),
    );
  });

  it('textarea 입력 시 해당 key로 onChange', async () => {
    const onChange = vi.fn();
    render(<StepOverview value={EMPTY} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText(/수립 필요성/), 'X');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ establishment_necessity: 'X' }),
    );
  });

  it('HRD이음 첨부 미존재 시 "파일 선택" 버튼 표시', () => {
    render(
      <StepOverview
        value={EMPTY}
        onChange={vi.fn()}
        onUploadHrdReport={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /파일 선택/ })).toBeInTheDocument();
  });

  it('HRD이음 첨부가 있으면 파일명·삭제 버튼 표시', () => {
    render(
      <StepOverview
        value={{
          ...EMPTY,
          hrd_report_attachment: {
            storage_path: 'p1/abc.pdf',
            file_name: '진단보고서.pdf',
            mime_type: 'application/pdf',
            size: 102400,
          },
        }}
        onChange={vi.fn()}
        onRemoveHrdReport={vi.fn()}
      />,
    );
    expect(screen.getByText('진단보고서.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /삭제/ })).toBeInTheDocument();
  });

  it('errors prop으로 필드 에러 메시지 표시', () => {
    render(
      <StepOverview
        value={EMPTY}
        onChange={vi.fn()}
        errors={{ establishment_necessity: '필수 입력' }}
      />,
    );
    expect(screen.getByText('필수 입력')).toBeInTheDocument();
  });
});
