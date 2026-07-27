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
    expect(screen.getByText(/AI 훈련로드맵 수립을 위해/)).toBeInTheDocument();
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

  it('작성 안내에 정본 원문(□)을 그대로 표시한다', () => {
    render(<StepNecessity value="" onChange={() => {}} />);
    fireEvent.click(screen.getByText('작성 안내'));
    expect(
      screen.getByText(
        '□ 컨설팅 대상 기업의 경영진 또는 담당자(내부전문가)와 인터뷰 등을 통해 파악한 AI훈련로드맵 수립을 위해 해당 과업(또는 워크플로우) 선정 이유 및 AI 적용의 필요성 등 작성(5줄 내외로 간단히 기술)'
      )
    ).toBeInTheDocument();
  });
});
