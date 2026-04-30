import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepActivities } from '../StepActivities';
import type { PBLActivityRow } from '@/lib/schemas/interview-pbl';

describe('StepActivities (R8 PBL-자체-03 — 차수×4 역할 평면 4행)', () => {
  it('FormSection 번호·제목이 노출된다', () => {
    render(<StepActivities value={[]} onChange={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: '훈련과제 도출 수행활동', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ⅲ-1')).toBeInTheDocument();
  });

  it('빈 value 일 때 기본 3차수 prefill (각 차수당 4 역할 = 12 행)', () => {
    render(<StepActivities value={[]} onChange={vi.fn()} />);
    // 1·2·3차 카드 + 각 카드마다 4 역할 (PM/외부전문가/기업내부전문가/능력개발전담주치의) 라벨 노출
    expect(screen.getByText('1차')).toBeInTheDocument();
    expect(screen.getByText('2차')).toBeInTheDocument();
    expect(screen.getByText('3차')).toBeInTheDocument();
    expect(screen.getAllByText('PM').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('외부전문가').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('기업내부전문가').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('능력개발전담주치의').length).toBeGreaterThanOrEqual(3);
  });

  it('1차 PM 수행 내용 편집 시 onChange 에 평면 배열로 전달된다', () => {
    const onChange = vi.fn();
    render(<StepActivities value={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('1차 PM 수행 내용'), {
      target: { value: '현장 인터뷰 수행' },
    });
    const next = onChange.mock.calls[0][0] as PBLActivityRow[];
    const pmRow = next.find((r) => r.round === 1 && r.role === 'PM');
    expect(pmRow?.content).toBe('현장 인터뷰 수행');
  });

  it('차수 추가 클릭 시 4 역할 행이 한 번에 추가된다', () => {
    const onChange = vi.fn();
    const initial: PBLActivityRow[] = [
      // 1차 (4 역할)
      { round: 1, role: 'PM', personName: '', date: '', content: '', method: '' },
      { round: 1, role: 'EXTERNAL_EXPERT', personName: '', date: '', content: '', method: '' },
      { round: 1, role: 'INTERNAL_EXPERT', personName: '', date: '', content: '', method: '' },
      { round: 1, role: 'JURISDICTION_MANAGER', personName: '', date: '', content: '', method: '' },
    ];
    render(<StepActivities value={initial} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('차수 추가'));
    const next = onChange.mock.calls[0][0] as PBLActivityRow[];
    expect(next).toHaveLength(8); // 1차 4 + 2차 4
    const round2Rows = next.filter((r) => r.round === 2);
    expect(round2Rows).toHaveLength(4);
    expect(new Set(round2Rows.map((r) => r.role))).toEqual(
      new Set(['PM', 'EXTERNAL_EXPERT', 'INTERNAL_EXPERT', 'JURISDICTION_MANAGER']),
    );
  });

  it('차수 삭제 클릭 시 해당 차수 4 행이 모두 제거된다', () => {
    const onChange = vi.fn();
    const initial: PBLActivityRow[] = [
      ...['PM', 'EXTERNAL_EXPERT', 'INTERNAL_EXPERT', 'JURISDICTION_MANAGER'].map(
        (role) => ({ round: 1, role: role as PBLActivityRow['role'], personName: '', date: '', content: '', method: '' }),
      ),
      ...['PM', 'EXTERNAL_EXPERT', 'INTERNAL_EXPERT', 'JURISDICTION_MANAGER'].map(
        (role) => ({ round: 2, role: role as PBLActivityRow['role'], personName: '', date: '', content: '', method: '' }),
      ),
    ];
    render(<StepActivities value={initial} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('2차 삭제'));
    const next = onChange.mock.calls[0][0] as PBLActivityRow[];
    expect(next).toHaveLength(4);
    expect(next.every((r) => r.round === 1)).toBe(true);
  });

  it('1차 4 역할 성명 입력이 각각 정확한 키에 반영된다', () => {
    const onChange = vi.fn();
    render(<StepActivities value={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('1차 PM 성명'), {
      target: { value: '홍길동' },
    });
    fireEvent.change(screen.getByLabelText('1차 외부전문가 성명'), {
      target: { value: '김전문' },
    });
    const calls = onChange.mock.calls;
    expect((calls[0][0] as PBLActivityRow[]).find((r) => r.round === 1 && r.role === 'PM')?.personName).toBe('홍길동');
    expect((calls[1][0] as PBLActivityRow[]).find((r) => r.round === 1 && r.role === 'EXTERNAL_EXPERT')?.personName).toBe('김전문');
  });

  // R8 분기 cover — readOnly / MAX_ROUNDS / 1 round 만 있을 때 삭제 disabled
  it('readOnly 이면 차수 추가 버튼이 disabled', () => {
    render(<StepActivities value={[]} onChange={vi.fn()} readOnly />);
    expect(screen.getByLabelText('차수 추가')).toBeDisabled();
  });

  it('MAX_ROUNDS=5 도달 시 차수 추가 버튼 disabled (분기 cover)', () => {
    const fiveRounds: PBLActivityRow[] = [];
    for (let r = 1; r <= 5; r++) {
      ['PM', 'EXTERNAL_EXPERT', 'INTERNAL_EXPERT', 'JURISDICTION_MANAGER'].forEach(
        (role) => {
          fiveRounds.push({
            round: r,
            role: role as PBLActivityRow['role'],
            personName: '',
            date: '',
            content: '',
            method: '',
          });
        },
      );
    }
    render(<StepActivities value={fiveRounds} onChange={vi.fn()} />);
    expect(screen.getByLabelText('차수 추가')).toBeDisabled();
  });

  it('1 round 만 있을 때 1차 삭제 버튼 disabled (분기 cover)', () => {
    const oneRound: PBLActivityRow[] = [
      { round: 1, role: 'PM', personName: '', date: '', content: '', method: '' },
      { round: 1, role: 'EXTERNAL_EXPERT', personName: '', date: '', content: '', method: '' },
      { round: 1, role: 'INTERNAL_EXPERT', personName: '', date: '', content: '', method: '' },
      { round: 1, role: 'JURISDICTION_MANAGER', personName: '', date: '', content: '', method: '' },
    ];
    render(<StepActivities value={oneRound} onChange={vi.fn()} />);
    expect(screen.getByLabelText('1차 삭제')).toBeDisabled();
  });

  it('updateRow — 일자 / 방법 편집 분기 cover', () => {
    const onChange = vi.fn();
    render(<StepActivities value={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('1차 PM 수행 일자'), {
      target: { value: '2026.05.01' },
    });
    fireEvent.change(screen.getByLabelText('1차 PM 수행 방법'), {
      target: { value: '대면' },
    });
    const calls = onChange.mock.calls;
    expect((calls[0][0] as PBLActivityRow[]).find((r) => r.round === 1 && r.role === 'PM')?.date).toBe('2026.05.01');
    expect((calls[1][0] as PBLActivityRow[]).find((r) => r.round === 1 && r.role === 'PM')?.method).toBe('대면');
  });
});
