import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  StepTargetAndLevel,
  type StepTargetAndLevelValue,
} from '../StepTargetAndLevel';

function baseValue(): StepTargetAndLevelValue {
  return {
    target: {
      name: '',
      code: '',
      scope: '',
      necessity: '',
      necessity_score: 3,
      details: [],
    },
    currentAiLevel: { level: 'BASIC', note: '' },
    expectedAiLevel: { level: 'USER', note: '' },
  };
}

describe('StepTargetAndLevel', () => {
  it('3개 블록 (Ⅲ-3 / Ⅲ-4-가 / Ⅲ-4-나) heading 이 모두 노출된다', () => {
    render(<StepTargetAndLevel value={baseValue()} onChange={vi.fn()} />);
    expect(
      screen.getByText('Ⅲ-3 훈련대상 업무 (가·나·다)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ⅲ-4-가 현재 AI역량 수준')).toBeInTheDocument();
    expect(screen.getByText('Ⅲ-4-나 예상 AI역량 수준')).toBeInTheDocument();
  });

  it('훈련대상 업무명 편집 시 onChange.target.name 에 반영된다', () => {
    const onChange = vi.fn();
    render(<StepTargetAndLevel value={baseValue()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('훈련대상 업무명'), {
      target: { value: '품질 전처리' },
    });
    const next = onChange.mock.calls[0][0] as StepTargetAndLevelValue;
    expect(next.target.name).toBe('품질 전처리');
  });

  it('현재 AI역량 수준 radio 4개가 모두 렌더된다', () => {
    render(<StepTargetAndLevel value={baseValue()} onChange={vi.fn()} />);
    const currentGroup = screen.getAllByRole('radiogroup', {
      name: '현재 AI역량 수준',
    });
    expect(currentGroup.length).toBeGreaterThanOrEqual(1);
    // 4등급 라벨
    expect(screen.getAllByText('AI기초형').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AI탐구형').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AI활용형').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AI선도형').length).toBeGreaterThanOrEqual(1);
  });

  it('예상 AI역량 수준 선택 시 onChange.expectedAiLevel.level 이 변경된다', () => {
    const onChange = vi.fn();
    render(<StepTargetAndLevel value={baseValue()} onChange={onChange} />);
    // 예상 radiogroup 내에서 LEADER 선택
    const expectedGroup = screen.getByRole('radiogroup', {
      name: '예상 AI역량 수준',
    });
    const leaderRadio = expectedGroup.querySelector(
      'input[value="LEADER"]',
    ) as HTMLInputElement;
    expect(leaderRadio).not.toBeNull();
    fireEvent.click(leaderRadio);
    const next = onChange.mock.calls[0][0] as StepTargetAndLevelValue;
    expect(next.expectedAiLevel.level).toBe('LEADER');
    // 현재 AI역량은 유지
    expect(next.currentAiLevel.level).toBe('BASIC');
  });

  it('AI훈련과정 개발 필요성 점수 input 이 1~5 범위로 렌더되고 변경 시 onChange 에 반영된다 (PR #5)', () => {
    const onChange = vi.fn();
    render(<StepTargetAndLevel value={baseValue()} onChange={onChange} />);
    const scoreInput = screen.getByLabelText(
      '훈련대상 업무 AI훈련과정 개발 필요성 점수',
    ) as HTMLInputElement;
    expect(scoreInput).not.toBeNull();
    expect(scoreInput.type).toBe('number');
    expect(scoreInput.min).toBe('1');
    expect(scoreInput.max).toBe('5');
    expect(Number(scoreInput.value)).toBe(3); // baseValue default

    fireEvent.change(scoreInput, { target: { value: '5' } });
    const next = onChange.mock.calls[0][0] as StepTargetAndLevelValue;
    expect(next.target.necessity_score).toBe(5);
  });

  it('점수 input 이 1~5 외 값 입력 시 기존 값으로 reject 한다', () => {
    const onChange = vi.fn();
    render(<StepTargetAndLevel value={baseValue()} onChange={onChange} />);
    const scoreInput = screen.getByLabelText(
      '훈련대상 업무 AI훈련과정 개발 필요성 점수',
    ) as HTMLInputElement;
    fireEvent.change(scoreInput, { target: { value: '7' } });
    const next = onChange.mock.calls[0][0] as StepTargetAndLevelValue;
    // 7 입력 → 1~5 범위 외 → 기존 값 (3) 유지
    expect(next.target.necessity_score).toBe(3);
  });

  it('세부내용 행 추가 클릭 시 details 배열이 확장된다', () => {
    const onChange = vi.fn();
    render(<StepTargetAndLevel value={baseValue()} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('세부내용 행 추가'));
    const next = onChange.mock.calls[0][0] as StepTargetAndLevelValue;
    expect(next.target.details.length).toBeGreaterThanOrEqual(2);
  });
});
