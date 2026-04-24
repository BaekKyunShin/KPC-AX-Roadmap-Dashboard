import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepNecessity } from '../StepNecessity';

describe('StepNecessity', () => {
  it('value 를 textarea 에 표시한다', () => {
    render(<StepNecessity value="필요성 본문" onChange={() => {}} />);
    expect(screen.getByLabelText('수립 필요성')).toHaveValue('필요성 본문');
  });

  it('섹션 번호 / 제목 / 라벨 / 설명을 표시한다', () => {
    render(<StepNecessity value="" onChange={() => {}} />);
    expect(screen.getByText('Ⅰ-1')).toBeInTheDocument();
    expect(screen.getByText('수립 필요성')).toBeInTheDocument();
    expect(screen.getByText('[인터뷰 입력]')).toBeInTheDocument();
    expect(
      screen.getByText(/AI 훈련로드맵 수립을 위해/),
    ).toBeInTheDocument();
  });

  it('textarea 입력 시 onChange 가 새 값으로 호출된다', () => {
    const onChange = vi.fn();
    render(<StepNecessity value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('수립 필요성'), {
      target: { value: '새 필요성' },
    });
    expect(onChange).toHaveBeenCalledWith('새 필요성');
  });

  it('readOnly 이면 textarea 가 비활성화된다', () => {
    render(<StepNecessity value="값" onChange={() => {}} readOnly />);
    expect(screen.getByLabelText('수립 필요성')).toBeDisabled();
  });
});
