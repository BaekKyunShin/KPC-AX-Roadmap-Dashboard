import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepActivities } from '../StepActivities';
import type { PBLActivityItem } from '@/lib/schemas/interview-pbl';

describe('StepActivities', () => {
  it('FormSection 번호·제목이 노출된다', () => {
    render(<StepActivities value={[]} onChange={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: '훈련과제 도출 수행활동', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ⅲ-1')).toBeInTheDocument();
  });

  it('빈 value 일 때 기본 3차수 행을 프리필한다', () => {
    render(<StepActivities value={[]} onChange={vi.fn()} />);
    // 1~3차 수행 일자 input 이 모두 렌더
    expect(screen.getByLabelText('1행 수행 일자')).toBeInTheDocument();
    expect(screen.getByLabelText('2행 수행 일자')).toBeInTheDocument();
    expect(screen.getByLabelText('3행 수행 일자')).toBeInTheDocument();
  });

  it('행 편집 시 onChange 에 변경 배열이 전달된다', () => {
    const onChange = vi.fn();
    render(<StepActivities value={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('1행 수행 내용'), {
      target: { value: '현장 인터뷰 수행' },
    });
    const next = onChange.mock.calls[0][0] as PBLActivityItem[];
    expect(next[0].content).toBe('현장 인터뷰 수행');
  });

  it('차수 추가 클릭 시 다음 차수가 추가된다 (round 자동 증가)', () => {
    const onChange = vi.fn();
    const initial: PBLActivityItem[] = [
      {
        round: 1,
        date: '26.04.01',
        content: '',
        method: '',
        participants: '',
      },
      {
        round: 2,
        date: '26.04.15',
        content: '',
        method: '',
        participants: '',
      },
    ];
    render(<StepActivities value={initial} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('차수 추가'));
    const next = onChange.mock.calls[0][0] as PBLActivityItem[];
    expect(next).toHaveLength(3);
    expect(next[2].round).toBe(3);
  });

  it('참석자 input 에 4역할 안내 placeholder 가 포함된다', () => {
    render(<StepActivities value={[]} onChange={vi.fn()} />);
    // 1행 참석자 LargeTextBox
    const participants = screen.getByLabelText('1행 참석자') as HTMLTextAreaElement;
    expect(participants.placeholder).toMatch(/PM/);
    expect(participants.placeholder).toMatch(/외부전문가/);
    expect(participants.placeholder).toMatch(/내부전문가/);
    expect(participants.placeholder).toMatch(/주치의/);
  });
});
