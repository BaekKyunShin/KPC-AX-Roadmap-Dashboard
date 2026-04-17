import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepPBLHrdNecessity from './StepPBLHrdNecessity';
import type { PBLHrdNecessity } from '@/lib/schemas/interview-pbl';

function makeValue(partial: Partial<PBLHrdNecessity> = {}): PBLHrdNecessity {
  return {
    training_history: [],
    support_history: [],
    recommendations: [],
    course_development_necessity: '',
    ...partial,
  };
}

describe('StepPBLHrdNecessity', () => {
  it('Ⅱ-3 제목과 주요 섹션이 렌더링된다', () => {
    render(<StepPBLHrdNecessity value={makeValue()} onChange={vi.fn()} />);
    expect(screen.getByText('Ⅱ-3. AI 과정개발의 필요성')).toBeInTheDocument();
    expect(screen.getByText('훈련 실시 이력')).toBeInTheDocument();
    expect(screen.getByText('훈련 지원 이력')).toBeInTheDocument();
    expect(screen.getByText('추천훈련사업')).toBeInTheDocument();
    expect(screen.getByLabelText(/AI훈련과정 개발 필요성/)).toBeInTheDocument();
  });

  it('이력 추가 버튼 클릭 시 training_history 배열에 추가된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLHrdNecessity value={makeValue()} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /이력 추가/ }));
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.training_history).toHaveLength(1);
    expect(last.training_history[0]).toMatchObject({
      seq: 0,
      program: '',
      course_name: '',
    });
  });

  it('연도 추가 및 삭제 버튼이 작동한다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLHrdNecessity
        value={makeValue({
          support_history: [
            {
              id: 's1',
              year: '2025',
              annual_limit: 1000,
              supported: 600,
              ratio: '60%',
            },
          ],
        })}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole('button', { name: '지원 이력 1 삭제' }));
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.support_history).toHaveLength(0);
  });

  it('추천 추가 버튼은 3개까지만 허용된다', () => {
    render(
      <StepPBLHrdNecessity
        value={makeValue({
          recommendations: [
            { id: 'r1', rank: 1, program: 'A', proposal: '' },
            { id: 'r2', rank: 2, program: 'B', proposal: '' },
            { id: 'r3', rank: 3, program: 'C', proposal: '' },
          ],
        })}
        onChange={vi.fn()}
      />
    );
    const addBtn = screen.getByRole('button', { name: /추천 추가/ });
    expect(addBtn).toBeDisabled();
  });

  it('과정개발 필요성 textarea 입력 시 onChange 호출', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLHrdNecessity value={makeValue()} onChange={onChange} />);
    await user.type(screen.getByLabelText(/AI훈련과정 개발 필요성/), '필');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ course_development_necessity: '필' })
    );
  });
});
