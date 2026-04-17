import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepPBLTrainingEnvironment from './StepPBLTrainingEnvironment';
import type { PBLTrainingEnvironment } from '@/lib/schemas/interview-pbl';

function makeValue(partial: Partial<PBLTrainingEnvironment> = {}): PBLTrainingEnvironment {
  return {
    proper_training_hours: 0,
    training_place: { type: '사내', special_notes: '' },
    internal_instructor: { used: false, name: '', position: '' },
    target_count: 0,
    target_characteristics: { career: '', level: '' },
    ai_infrastructure: {
      ai_tools: '가능',
      network: '양호',
      pc_count: 0,
      etc_equipment: '',
    },
    training_needs_analysis: '',
    expectation: { as_is: '', to_be: '' },
    ...partial,
  };
}

describe('StepPBLTrainingEnvironment', () => {
  it('Ⅱ-2 제목과 주요 섹션이 렌더링된다', () => {
    render(<StepPBLTrainingEnvironment value={makeValue()} onChange={vi.fn()} />);
    expect(screen.getByText('Ⅱ-2. 기업 훈련환경 분석')).toBeInTheDocument();
    expect(screen.getByText('훈련 장소 및 시간')).toBeInTheDocument();
    expect(screen.getByText('사내 강사')).toBeInTheDocument();
    expect(screen.getByText('AI 인프라')).toBeInTheDocument();
    expect(screen.getByText('기대효과')).toBeInTheDocument();
  });

  it('훈련장소·AI도구·네트워크 라디오 그룹이 모두 표시된다', () => {
    render(<StepPBLTrainingEnvironment value={makeValue()} onChange={vi.fn()} />);
    expect(screen.getByRole('radiogroup', { name: '훈련장소' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'AI 도구 활용' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: '네트워크 환경' })).toBeInTheDocument();
    // AI 도구 라디오 3개 확인
    ['가능', '제한적', '불가능'].forEach((label) => {
      expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    });
  });

  it('훈련장소 라디오 변경 시 onChange 호출', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: '사외' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        training_place: expect.objectContaining({ type: '사외' }),
      })
    );
  });

  it('사내강사 "사용" 선택 시에만 성명·직위 입력이 노출된다', () => {
    const { rerender } = render(
      <StepPBLTrainingEnvironment value={makeValue()} onChange={vi.fn()} />
    );
    expect(screen.queryByLabelText('성명')).not.toBeInTheDocument();
    rerender(
      <StepPBLTrainingEnvironment
        value={makeValue({ internal_instructor: { used: true, name: '', position: '' } })}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('성명')).toBeInTheDocument();
    expect(screen.getByLabelText('직위')).toBeInTheDocument();
  });

  it('적정 훈련시간 숫자 입력 시 onChange 호출', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
    await user.type(screen.getByLabelText(/적정 훈련시간/), '8');
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.proper_training_hours).toBe(8);
  });

  it('As-Is / To-Be textarea 입력이 반영된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
    await user.type(screen.getByLabelText(/현재\(As-Is\)/), '수');
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.expectation.as_is).toBe('수');
  });
});
