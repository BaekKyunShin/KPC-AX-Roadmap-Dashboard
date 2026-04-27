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
        participants: {
          pm: '',
          external_expert: '',
          internal_expert: '',
          jurisdiction_manager: '',
        },
      },
      {
        round: 2,
        date: '26.04.15',
        content: '',
        method: '',
        participants: {
          pm: '',
          external_expert: '',
          internal_expert: '',
          jurisdiction_manager: '',
        },
      },
    ];
    render(<StepActivities value={initial} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('차수 추가'));
    const next = onChange.mock.calls[0][0] as PBLActivityItem[];
    expect(next).toHaveLength(3);
    expect(next[2].round).toBe(3);
  });

  it('참석자 4역할 (PM/외부/내부/주치의) input 이 차수마다 별도 렌더된다 (PR #5 Phase F-4)', () => {
    const onChange = vi.fn();
    render(<StepActivities value={[]} onChange={onChange} />);
    // 1행 4역할 input
    expect(screen.getByLabelText('1행 PM 성명')).toBeInTheDocument();
    expect(screen.getByLabelText('1행 외부전문가 성명')).toBeInTheDocument();
    expect(screen.getByLabelText('1행 내부전문가 성명')).toBeInTheDocument();
    expect(screen.getByLabelText('1행 주치의 성명')).toBeInTheDocument();

    // 입력 시 onChange 의 participants object 에 반영
    fireEvent.change(screen.getByLabelText('1행 PM 성명'), {
      target: { value: '홍길동' },
    });
    const next = onChange.mock.calls[0][0] as PBLActivityItem[];
    expect(next[0].participants.pm).toBe('홍길동');
    expect(next[0].participants.external_expert).toBe('');
  });
});
