import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepProblems, type StepProblemsValue } from '../StepProblems';

function base(): StepProblemsValue {
  return {
    problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
    priority: { items: [], method: '' },
  };
}

describe('StepProblems (R8 PBL-자체-04 — 4 정형 항목 단일 세트)', () => {
  it('두 블록(문제 정의서 / 우선순위) heading 이 모두 노출된다', () => {
    render(<StepProblems value={base()} onChange={vi.fn()} />);
    expect(screen.getByText('Ⅲ-2-가 문제 정의서')).toBeInTheDocument();
    expect(screen.getByText('Ⅲ-2-나 문제 우선순위 결정')).toBeInTheDocument();
  });

  it('양식 4 정형 라벨(배경/핵심/범위/제약)이 모두 노출된다', () => {
    render(<StepProblems value={base()} onChange={vi.fn()} />);
    expect(screen.getByText('문제 배경')).toBeInTheDocument();
    expect(screen.getByText('핵심 문제')).toBeInTheDocument();
    expect(screen.getByText('문제 범위')).toBeInTheDocument();
    expect(screen.getByText('제약 조건')).toBeInTheDocument();
  });

  it('"+ 문제 추가" 버튼이 없다 (양식상 단일 세트 — 행 추가 불가)', () => {
    render(<StepProblems value={base()} onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /문제 행 추가/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^문제 추가/ })).toBeNull();
  });

  it('문제 배경 편집 시 onChange.problemDefinitionSheet.background 에 반영된다', () => {
    const onChange = vi.fn();
    render(<StepProblems value={base()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('문제 배경'), {
      target: { value: '제조 공정 자동화 압박이 커짐' },
    });
    const next = onChange.mock.calls[0][0] as StepProblemsValue;
    expect(next.problemDefinitionSheet.background).toBe('제조 공정 자동화 압박이 커짐');
  });

  it('핵심 문제·범위·제약 편집도 각각 정확한 키에 반영된다', () => {
    const onChange = vi.fn();
    render(<StepProblems value={base()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('핵심 문제'), {
      target: { value: '불량률 상승' },
    });
    fireEvent.change(screen.getByLabelText('문제 범위'), {
      target: { value: '품질·생산 부서' },
    });
    fireEvent.change(screen.getByLabelText('제약 조건'), {
      target: { value: '예산·일정' },
    });
    const calls = onChange.mock.calls;
    expect((calls[0][0] as StepProblemsValue).problemDefinitionSheet.core).toBe('불량률 상승');
    expect((calls[1][0] as StepProblemsValue).problemDefinitionSheet.scope).toBe('품질·생산 부서');
    expect((calls[2][0] as StepProblemsValue).problemDefinitionSheet.constraints).toBe('예산·일정');
  });

  it('우선순위 점수는 1~5 범위 정수만 허용한다', () => {
    const onChange = vi.fn();
    const value: StepProblemsValue = {
      problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
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

  // R8 분기 cover — value.priority 누락 시 기본값으로 fallback
  it('value.priority 누락 시 빈 priority items 로 안전 동작', () => {
    const onChange = vi.fn();
    const partialValue = {
      problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
    } as unknown as StepProblemsValue;
    render(<StepProblems value={partialValue} onChange={onChange} />);
    // 기본 행 1개 prefill — input 존재 확인
    expect(screen.getByLabelText('우선순위 1 문제명')).toBeInTheDocument();
  });

  // R8 분기 cover — 우선순위 행 추가/삭제 분기
  it('우선순위 "행 추가" 클릭 시 다음 rank 가 자동 증가한다', () => {
    const onChange = vi.fn();
    const initial: StepProblemsValue = {
      problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
      priority: {
        items: [
          { problem: 'A', score: 5, rank: 1 },
          { problem: 'B', score: 3, rank: 2 },
        ],
        method: '',
      },
    };
    render(<StepProblems value={initial} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('우선순위 행 추가'));
    const next = onChange.mock.calls[0][0] as StepProblemsValue;
    expect(next.priority.items).toHaveLength(3);
    expect(next.priority.items[2].rank).toBe(3);
  });

  it('우선순위 행 삭제 — 1개 남았을 때 삭제 버튼 disabled (분기 cover)', () => {
    render(<StepProblems value={base()} onChange={vi.fn()} />);
    // 기본 1개 prefill — 삭제 버튼이 disabled
    const deleteBtn = screen.getByLabelText('우선순위 1 삭제');
    expect(deleteBtn).toBeDisabled();
  });

  it('우선순위 행 삭제 — 2개 이상일 때 삭제 가능 (분기 cover)', () => {
    const onChange = vi.fn();
    const initial: StepProblemsValue = {
      problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
      priority: {
        items: [
          { problem: 'A', score: 5, rank: 1 },
          { problem: 'B', score: 3, rank: 2 },
        ],
        method: '',
      },
    };
    render(<StepProblems value={initial} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('우선순위 2 삭제'));
    const next = onChange.mock.calls[0][0] as StepProblemsValue;
    expect(next.priority.items).toHaveLength(1);
    expect(next.priority.items[0].problem).toBe('A');
  });

  it('우선순위 점수가 범위 밖(0, 6)이면 기존 값 유지 (분기 cover)', () => {
    const onChange = vi.fn();
    const initial: StepProblemsValue = {
      problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
      priority: { items: [{ problem: 'A', score: 3, rank: 1 }], method: '' },
    };
    render(<StepProblems value={initial} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('우선순위 1 점수'), {
      target: { value: '0' },
    });
    const next = onChange.mock.calls[0][0] as StepProblemsValue;
    // 0 은 범위 밖 → 기존 3 유지
    expect(next.priority.items[0].score).toBe(3);
  });

  it('우선순위 순위 음수 입력 시 기존 값 유지 (분기 cover)', () => {
    const onChange = vi.fn();
    const initial: StepProblemsValue = {
      problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
      priority: { items: [{ problem: 'A', score: 3, rank: 1 }], method: '' },
    };
    render(<StepProblems value={initial} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('우선순위 1 순위'), {
      target: { value: '-1' },
    });
    const next = onChange.mock.calls[0][0] as StepProblemsValue;
    expect(next.priority.items[0].rank).toBe(1);
  });
});
