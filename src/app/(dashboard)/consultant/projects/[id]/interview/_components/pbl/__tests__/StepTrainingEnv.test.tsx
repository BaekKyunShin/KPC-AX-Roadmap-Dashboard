import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepTrainingEnv } from '../StepTrainingEnv';

describe('StepTrainingEnv', () => {
  it('FormSection 번호·제목이 노출된다', () => {
    render(<StepTrainingEnv value="" onChange={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: '기업 훈련환경 분석', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ⅱ-2')).toBeInTheDocument();
  });

  it('textarea 편집 시 onChange 가 새 문자열로 호출된다', () => {
    const onChange = vi.fn();
    render(<StepTrainingEnv value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('훈련환경 분석'), {
      target: { value: '사내 교육장 활용 가능' },
    });
    expect(onChange).toHaveBeenCalledWith('사내 교육장 활용 가능');
  });

  it('readOnly 이면 textarea 가 disabled 이다', () => {
    render(<StepTrainingEnv value="x" onChange={vi.fn()} readOnly />);
    expect(screen.getByLabelText('훈련환경 분석')).toBeDisabled();
  });
});
