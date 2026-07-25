import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepPerformanceActivities } from '../StepPerformanceActivities';
import type { PBLPerformanceActivity } from '@/lib/schemas/interview-pbl';

function activity(over: Partial<PBLPerformanceActivity> = {}): PBLPerformanceActivity {
  return {
    round: 1,
    date: '',
    content: '',
    method: 'ONSITE',
    participants: {
      pm: '',
      external_expert: '',
      internal_expert: '',
      jurisdiction_manager: '',
    },
    ...over,
  };
}

describe('StepPerformanceActivities (PBL Ⅲ-1)', () => {
  it('섹션 머리글(Ⅲ-1 · 훈련과제 도출 수행활동)을 표시한다', () => {
    render(<StepPerformanceActivities value={[]} onChange={() => {}} />);
    expect(screen.getByText('Ⅲ-1')).toBeInTheDocument();
    expect(screen.getByText('훈련과제 도출 수행활동')).toBeInTheDocument();
    expect(screen.getByText('[인터뷰 입력]')).toBeInTheDocument();
  });

  it('빈 배열일 때 기본 3차수(1·2·3차)를 렌더한다', () => {
    render(<StepPerformanceActivities value={[]} onChange={() => {}} />);
    expect(screen.getByText('1차')).toBeInTheDocument();
    expect(screen.getByText('2차')).toBeInTheDocument();
    expect(screen.getByText('3차')).toBeInTheDocument();
  });

  it('각 차수는 정본 참석자 4역할을 별도 행으로 렌더한다', () => {
    render(<StepPerformanceActivities value={[]} onChange={() => {}} />);
    // 3 차수 × 4 역할
    expect(screen.getAllByText('컨설팅책임자(PM)')).toHaveLength(3);
    expect(screen.getAllByText('외부전문가(직무,HRD)')).toHaveLength(3);
    expect(screen.getAllByText('기업내부전문가')).toHaveLength(3);
    expect(screen.getAllByText('능력개발전담주치의')).toHaveLength(3);
  });

  it('차수·일자·내용·방법 셀은 rowSpan=4 로 병합된다 (정본 T19 구조)', () => {
    render(<StepPerformanceActivities value={[]} onChange={() => {}} />);
    const round = screen.getByText('1차');
    expect(round.tagName).toBe('TH');
    expect(round.getAttribute('rowspan')).toBe('4');
  });

  it('수행 일자는 날짜 단일 입력이다 — 정본 Ⅲ-1 에 시간 칸이 없다', () => {
    render(<StepPerformanceActivities value={[]} onChange={() => {}} />);
    expect(screen.getByLabelText('1차 수행 일자')).toBeInTheDocument();
    expect(screen.queryByLabelText('1차 수행 일시')).not.toBeInTheDocument();
  });

  it('참석자 4역할 입력이 각각 해당 필드로 반영된다', () => {
    const onChange = vi.fn();
    render(<StepPerformanceActivities value={[activity()]} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('1차 외부전문가 성명'), {
      target: { value: '이직무' },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        participants: expect.objectContaining({ external_expert: '이직무' }),
      }),
    ]);

    fireEvent.change(screen.getByLabelText('1차 능력개발전담주치의 성명'), {
      target: { value: '최주치의' },
    });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({
        participants: expect.objectContaining({ jurisdiction_manager: '최주치의' }),
      }),
    ]);
  });

  it('수행 일자·내용 입력이 반영된다', () => {
    const onChange = vi.fn();
    render(<StepPerformanceActivities value={[activity()]} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('1차 수행 일자'), { target: { value: '25/04/10' } });
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ date: '25/04/10' })]);

    fireEvent.change(screen.getByLabelText('1차 수행 내용'), { target: { value: '워크숍' } });
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ content: '워크숍' })]);
  });

  it('value 가 주어지면 해당 차수 개수만 렌더한다 (기본 프리필 덮어쓰기 금지)', () => {
    render(<StepPerformanceActivities value={[activity({ round: 1 })]} onChange={() => {}} />);
    expect(screen.getByText('1차')).toBeInTheDocument();
    expect(screen.queryByText('2차')).not.toBeInTheDocument();
  });

  it('차수 추가 버튼이 다음 차수를 붙인다', () => {
    const onChange = vi.fn();
    render(<StepPerformanceActivities value={[activity({ round: 1 })]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '차수 추가' }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ round: 1 }),
      expect.objectContaining({ round: 2 }),
    ]);
  });

  it('상한 15차에 도달하면 차수 추가가 비활성화된다', () => {
    const rows = Array.from({ length: 15 }, (_, i) => activity({ round: i + 1 }));
    render(<StepPerformanceActivities value={rows} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '차수 추가' })).toBeDisabled();
  });

  it('readOnly 면 입력과 차수 추가가 모두 비활성화된다', () => {
    render(<StepPerformanceActivities value={[activity()]} onChange={() => {}} readOnly />);
    expect(screen.getByLabelText('1차 수행 일자')).toBeDisabled();
    expect(screen.getByLabelText('1차 PM 성명')).toBeDisabled();
    expect(screen.getByRole('button', { name: '차수 추가' })).toBeDisabled();
  });

  it('작성 가이드 헤더는 PBL 규칙에 따라 "작성 가이드" 다', () => {
    render(<StepPerformanceActivities value={[]} onChange={() => {}} />);
    expect(screen.getByText('작성 가이드')).toBeInTheDocument();
  });
});
