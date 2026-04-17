import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepPBLAILevel from './StepPBLAILevel';
import type { PBLAILevelDiagnosis } from '@/lib/schemas/interview-pbl';

function makeValue(partial: Partial<PBLAILevelDiagnosis> = {}): PBLAILevelDiagnosis {
  return {
    current_ai_level: 'AI기초형',
    expected_ai_level: 'AI활용형',
    improvement_reason: '',
    ...partial,
  };
}

describe('StepPBLAILevel', () => {
  it('Ⅲ-4 제목과 두 라디오 그룹 + 향상 사유 Textarea 렌더', () => {
    render(<StepPBLAILevel value={makeValue()} onChange={vi.fn()} />);
    expect(screen.getByText('Ⅲ-4. AI 수준 진단')).toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: '현재 AI역량 수준' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: '향후 AI역량 수준' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/향상 사유/)).toBeInTheDocument();
  });

  it('현재 AI역량 4등급 라디오가 모두 노출되고 설명 텍스트 포함', () => {
    render(<StepPBLAILevel value={makeValue()} onChange={vi.fn()} />);
    const current = screen.getByRole('radiogroup', { name: '현재 AI역량 수준' });
    const radios = within(current).getAllByRole('radio');
    expect(radios).toHaveLength(4);
    ['AI기초형', 'AI탐구형', 'AI활용형', 'AI선도형'].forEach((label) => {
      expect(within(current).getByRole('radio', { name: label })).toBeInTheDocument();
    });
    // 등급별 설명이 노출되는지 (양식 공식 문구)
    expect(
      within(current).getByText(/AI 및 디지털 기술 도입에 대한 인식/),
    ).toBeInTheDocument();
  });

  it('현재 AI역량 라디오 선택 시 current_ai_level 변경', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLAILevel value={makeValue()} onChange={onChange} />);

    const current = screen.getByRole('radiogroup', { name: '현재 AI역량 수준' });
    await user.click(within(current).getByRole('radio', { name: 'AI탐구형' }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ current_ai_level: 'AI탐구형' }),
    );
  });

  it('향후 AI역량 라디오 선택 시 expected_ai_level 변경', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLAILevel value={makeValue()} onChange={onChange} />);

    const expected = screen.getByRole('radiogroup', { name: '향후 AI역량 수준' });
    await user.click(within(expected).getByRole('radio', { name: 'AI선도형' }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ expected_ai_level: 'AI선도형' }),
    );
  });

  it('향상 사유 Textarea 입력 시 onChange 호출', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLAILevel value={makeValue()} onChange={onChange} />);

    await user.type(screen.getByLabelText(/향상 사유/), '이');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ improvement_reason: '이' }),
    );
  });
});
