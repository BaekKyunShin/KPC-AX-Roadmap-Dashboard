import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepTargetTask } from '../StepTargetTask';
import type { RoadmapTargetTask } from '@/lib/schemas/interview-roadmap';

function makeValue(over: Partial<RoadmapTargetTask> = {}): RoadmapTargetTask {
  return {
    name: '',
    reason: '',
    expectedAsIs: '',
    expectedToBe: '',
    ...over,
  };
}

describe('StepTargetTask', () => {
  it('섹션 번호 / 제목 / 라벨을 표시한다', () => {
    render(<StepTargetTask value={makeValue()} onChange={() => {}} />);
    expect(screen.getByText('Ⅱ-4')).toBeInTheDocument();
    // v2 — 양식 개정으로 "훈련대상" → "AI 적용 대상" 명칭 변경
    expect(screen.getByText('AI 적용 대상 과업(Task)·워크플로우 선정')).toBeInTheDocument();
    expect(screen.getByText('[인터뷰 입력]')).toBeInTheDocument();
  });

  it('4개 셀(AI 적용 대상 과업·선정 사유·현행·개선)을 모두 렌더한다', () => {
    render(<StepTargetTask value={makeValue()} onChange={() => {}} />);
    expect(screen.getByLabelText('AI 적용 대상 과업')).toBeInTheDocument();
    expect(screen.getByLabelText('선정 사유')).toBeInTheDocument();
    expect(screen.getByLabelText('기대 효과 현행')).toBeInTheDocument();
    expect(screen.getByLabelText('기대 효과 개선')).toBeInTheDocument();
  });

  it('"기대 효과" 행 머리글이 rowSpan=2 로 렌더된다 (As-Is · To-Be 2행 병합)', () => {
    render(<StepTargetTask value={makeValue()} onChange={() => {}} />);
    const 기대효과 = screen.getByText('기대 효과');
    // <th rowspan="2"> 속성 검증
    expect(기대효과.tagName).toBe('TH');
    expect(기대효과.getAttribute('rowspan')).toBe('2');
  });

  it('value 의 4개 필드가 각 textarea 에 반영된다', () => {
    render(
      <StepTargetTask
        value={makeValue({
          name: '설비 진단',
          reason: '가동률 저하',
          expectedAsIs: '수기 점검',
          expectedToBe: '자동 이상 탐지',
        })}
        onChange={() => {}}
      />
    );
    expect(screen.getByLabelText('AI 적용 대상 과업')).toHaveValue('설비 진단');
    expect(screen.getByLabelText('선정 사유')).toHaveValue('가동률 저하');
    expect(screen.getByLabelText('기대 효과 현행')).toHaveValue('수기 점검');
    expect(screen.getByLabelText('기대 효과 개선')).toHaveValue('자동 이상 탐지');
  });

  it('훈련대상 과업 입력 시 onChange 가 name 만 갱신된 객체로 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepTargetTask
        value={makeValue({ reason: 'R', expectedAsIs: 'A', expectedToBe: 'B' })}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText('AI 적용 대상 과업'), {
      target: { value: '새 과업' },
    });
    expect(onChange).toHaveBeenCalledWith({
      name: '새 과업',
      reason: 'R',
      expectedAsIs: 'A',
      expectedToBe: 'B',
    });
  });

  it('기대 효과 개선(To-Be) 입력 시 onChange 가 expectedToBe 만 갱신한다', () => {
    const onChange = vi.fn();
    render(
      <StepTargetTask
        value={makeValue({ name: 'N', reason: 'R', expectedAsIs: 'A' })}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText('기대 효과 개선'), {
      target: { value: 'To-Be' },
    });
    expect(onChange).toHaveBeenCalledWith({
      name: 'N',
      reason: 'R',
      expectedAsIs: 'A',
      expectedToBe: 'To-Be',
    });
  });

  it('readOnly 이면 4개 textarea 가 모두 비활성화된다', () => {
    render(<StepTargetTask value={makeValue()} onChange={() => {}} readOnly />);
    expect(screen.getByLabelText('AI 적용 대상 과업')).toBeDisabled();
    expect(screen.getByLabelText('선정 사유')).toBeDisabled();
    expect(screen.getByLabelText('기대 효과 현행')).toBeDisabled();
    expect(screen.getByLabelText('기대 효과 개선')).toBeDisabled();
  });
});
