import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepProblems, type StepProblemsValue } from '../StepProblems';

function base(): StepProblemsValue {
  return {
    problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
  };
}

describe('StepProblems (V2 — 문제 정의서 단일 세트, 우선순위 제거)', () => {
  it('문제 정의서 heading 이 노출된다', () => {
    render(<StepProblems value={base()} onChange={vi.fn()} />);
    expect(screen.getByText('Ⅲ-2-가 문제 정의서')).toBeInTheDocument();
  });

  it('V2 제거: 문제 우선순위(Ⅲ-2-나) 블록이 노출되지 않는다', () => {
    render(<StepProblems value={base()} onChange={vi.fn()} />);
    expect(screen.queryByText('Ⅲ-2-나 문제 우선순위 결정')).toBeNull();
    expect(screen.queryByLabelText('우선순위 결정 방법')).toBeNull();
    expect(screen.queryByRole('button', { name: /우선순위 행 추가/ })).toBeNull();
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

  // 분기 cover — value.problemDefinitionSheet 누락 시 빈 시트로 안전 동작
  it('value.problemDefinitionSheet 누락 시 빈 시트로 안전 동작', () => {
    const onChange = vi.fn();
    const partialValue = {} as unknown as StepProblemsValue;
    render(<StepProblems value={partialValue} onChange={onChange} />);
    expect(screen.getByLabelText('문제 배경')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('핵심 문제'), { target: { value: 'X' } });
    const next = onChange.mock.calls[0][0] as StepProblemsValue;
    expect(next.problemDefinitionSheet.core).toBe('X');
  });

  it('작성 가이드에 정본 원문(번호·-)을 그대로 표시한다', () => {
    render(<StepProblems value={base()} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('작성 가이드'));
    expect(
      screen.getByText(
        '1. 실제로 직무에 해결해야 할 문제를 선정하기 위한 문제 범위 도출하고 핵심 개념, 문제를 명확히 정의한다.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('- ‘제약 조건’은 시간, 예산, 인력, 기술적 제약 사항을 기술')
    ).toBeInTheDocument();
  });
});
