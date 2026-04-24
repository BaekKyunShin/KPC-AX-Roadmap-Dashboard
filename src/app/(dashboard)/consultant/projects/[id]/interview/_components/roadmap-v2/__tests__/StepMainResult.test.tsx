import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepMainResult, type StepMainResultValue } from '../StepMainResult';

function makeValue(over: Partial<StepMainResultValue> = {}): StepMainResultValue {
  return { aiLevel: 'BEGINNER', selectedTask: '', ...over };
}

describe('StepMainResult', () => {
  it('섹션 머리글과 두 하위 입력 영역을 표시한다', () => {
    render(<StepMainResult value={makeValue()} onChange={() => {}} />);
    expect(screen.getByText('Ⅰ-3')).toBeInTheDocument();
    expect(screen.getByText('수립 주요 결과')).toBeInTheDocument();
    expect(screen.getByText('[인터뷰 입력 → 결과 페이지]')).toBeInTheDocument();
    expect(screen.getByText('기업 AI 역량 수준 (택1)')).toBeInTheDocument();
    expect(
      screen.getByText('선정 과업 (또는 워크플로우)'),
    ).toBeInTheDocument();
  });

  it('현재 선택된 AI 레벨을 ☑ 로 표시한다 (택1)', () => {
    render(
      <StepMainResult
        value={makeValue({ aiLevel: 'INTERMEDIATE' })}
        onChange={() => {}}
      />,
    );
    // ☑ 1개, □ 2개
    expect(screen.getAllByText('☑')).toHaveLength(1);
    expect(screen.getAllByText('□')).toHaveLength(2);
  });

  it('AI 레벨 선택 시 onChange 가 새 aiLevel 로 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepMainResult
        value={makeValue({ aiLevel: 'BEGINNER' })}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('고급 (AI활용형·선도형)'));
    expect(onChange).toHaveBeenCalledWith({
      aiLevel: 'ADVANCED',
      selectedTask: '',
    });
  });

  it('선정 과업 입력 시 onChange 가 새 selectedTask 로 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepMainResult
        value={makeValue({ selectedTask: '' })}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('선정 과업'), {
      target: { value: '데이터 분석 워크플로우' },
    });
    expect(onChange).toHaveBeenCalledWith({
      aiLevel: 'BEGINNER',
      selectedTask: '데이터 분석 워크플로우',
    });
  });

  it('readOnly 이면 textarea 가 비활성화된다', () => {
    render(
      <StepMainResult value={makeValue()} onChange={() => {}} readOnly />,
    );
    expect(screen.getByLabelText('선정 과업')).toBeDisabled();
  });
});
