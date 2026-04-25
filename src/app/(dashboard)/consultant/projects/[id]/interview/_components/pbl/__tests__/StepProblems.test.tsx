import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepProblems, type StepProblemsValue } from '../StepProblems';

function base(): StepProblemsValue {
  return {
    problems: [],
    priority: { items: [], method: '' },
  };
}

describe('StepProblems', () => {
  it('두 블록(문제 도출 / 우선순위) heading 이 모두 노출된다', () => {
    render(<StepProblems value={base()} onChange={vi.fn()} />);
    expect(screen.getByText('Ⅲ-2-가 문제 도출')).toBeInTheDocument();
    expect(screen.getByText('Ⅲ-2-나 문제 우선순위 결정')).toBeInTheDocument();
  });

  it('문제명 편집 시 onChange.problems 에 반영된다', () => {
    const onChange = vi.fn();
    render(<StepProblems value={base()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('문제 1 문제명'), {
      target: { value: '불량률 상승' },
    });
    const next = onChange.mock.calls[0][0] as StepProblemsValue;
    expect(next.problems[0].title).toBe('불량률 상승');
  });

  it('우선순위 점수는 1~5 범위 정수만 허용한다', () => {
    const onChange = vi.fn();
    const value: StepProblemsValue = {
      problems: [],
      priority: { items: [{ problem: 'A', score: 3, rank: 1 }], method: '' },
    };
    render(<StepProblems value={value} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('우선순위 1 점수'), {
      target: { value: '5' },
    });
    const next = onChange.mock.calls[0][0] as StepProblemsValue;
    expect(next.priority.items[0].score).toBe(5);
  });

  it('우선순위 결정 방법 textarea 편집이 onChange.priority.method 에 반영된다', () => {
    const onChange = vi.fn();
    render(<StepProblems value={base()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('우선순위 결정 방법'), {
      target: { value: 'AHP 평가' },
    });
    const next = onChange.mock.calls[0][0] as StepProblemsValue;
    expect(next.priority.method).toBe('AHP 평가');
  });

  it('"문제 추가" 클릭 시 problems 배열에 빈 행이 추가된다', () => {
    const onChange = vi.fn();
    render(<StepProblems value={base()} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('문제 행 추가'));
    const next = onChange.mock.calls[0][0] as StepProblemsValue;
    expect(next.problems).toHaveLength(2);
    expect(next.problems[1]).toEqual({
      title: '',
      description: '',
      impact: '',
    });
  });
});
