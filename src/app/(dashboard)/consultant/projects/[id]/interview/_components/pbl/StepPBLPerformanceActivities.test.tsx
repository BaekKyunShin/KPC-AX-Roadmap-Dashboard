import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepPBLPerformanceActivities from './StepPBLPerformanceActivities';
import type { PBLPerformanceActivities } from '@/lib/schemas/interview-pbl';

function makeActivity(
  overrides?: Partial<
    PBLPerformanceActivities['performance_activities'][number]
  >,
): PBLPerformanceActivities['performance_activities'][number] {
  return {
    id: 'act-1',
    round: 1,
    date: '',
    content: '',
    method: '',
    operation_mode: '대면',
    participants: {
      pm: '',
      external_expert: '',
      internal_expert: '',
      jurisdiction_manager: '',
    },
    ...overrides,
  };
}

describe('StepPBLPerformanceActivities', () => {
  it('Ⅲ-1 제목이 렌더링된다', () => {
    render(
      <StepPBLPerformanceActivities
        value={{ performance_activities: [makeActivity()] }}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByText('Ⅲ-1. 훈련과제 도출 수행활동'),
    ).toBeInTheDocument();
  });

  it('참석자 4역할 라벨이 모두 표시된다', () => {
    render(
      <StepPBLPerformanceActivities
        value={{ performance_activities: [makeActivity()] }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('컨설팅책임자(PM)')).toBeInTheDocument();
    expect(screen.getByText('외부전문가(직무·HRD)')).toBeInTheDocument();
    expect(screen.getByText('기업내부전문가')).toBeInTheDocument();
    expect(screen.getByText('능력개발전담주치의')).toBeInTheDocument();
  });

  it('차수 추가 버튼 클릭 시 performance_activities에 새 항목이 추가된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLPerformanceActivities
        value={{ performance_activities: [makeActivity({ round: 1 })] }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /차수 추가/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const called = onChange.mock.calls[0][0] as PBLPerformanceActivities;
    expect(called.performance_activities).toHaveLength(2);
    expect(called.performance_activities[1].round).toBe(2);
  });

  it('차수가 2개 이상일 때 삭제 버튼이 표시되고 클릭 시 제거된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLPerformanceActivities
        value={{
          performance_activities: [
            makeActivity({ id: 'a1', round: 1 }),
            makeActivity({ id: 'a2', round: 2 }),
          ],
        }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: '차수 1 삭제' }));
    const called = onChange.mock.calls[0][0] as PBLPerformanceActivities;
    expect(called.performance_activities).toHaveLength(1);
    expect(called.performance_activities[0].id).toBe('a2');
  });

  it('차수가 1개이면 삭제 버튼이 표시되지 않는다', () => {
    render(
      <StepPBLPerformanceActivities
        value={{ performance_activities: [makeActivity()] }}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /차수 \d+ 삭제/ }),
    ).not.toBeInTheDocument();
  });

  it('참석자 PM 입력 시 onChange가 호출된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLPerformanceActivities
        value={{ performance_activities: [makeActivity()] }}
        onChange={onChange}
      />,
    );
    await user.type(screen.getByLabelText('컨설팅책임자(PM)'), '김');
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.performance_activities[0].participants.pm).toBe('김');
  });

  it('운영 방식 "비대면" 라디오 클릭 시 operation_mode가 변경된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLPerformanceActivities
        value={{ performance_activities: [makeActivity()] }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('radio', { name: '비대면' }));
    const called = onChange.mock.calls[0][0] as PBLPerformanceActivities;
    expect(called.performance_activities[0].operation_mode).toBe('비대면');
  });

  it('빈 배열이면 placeholder 메시지가 표시된다', () => {
    render(
      <StepPBLPerformanceActivities
        value={{ performance_activities: [] }}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/아직 등록된 수행활동이 없습니다/),
    ).toBeInTheDocument();
  });
});
