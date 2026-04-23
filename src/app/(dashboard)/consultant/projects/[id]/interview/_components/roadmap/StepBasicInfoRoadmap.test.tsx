import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StepBasicInfoRoadmap from './StepBasicInfoRoadmap';
import { createEmptyRoadmapParticipant, type RoadmapParticipant } from '@/lib/schemas/interview-roadmap';

function baseProps(overrides: Partial<React.ComponentProps<typeof StepBasicInfoRoadmap>> = {}) {
  const participants: RoadmapParticipant[] = [createEmptyRoadmapParticipant()];
  return {
    interviewDate: '2026-04-16',
    interviewRound: 1,
    interviewStartTime: '10:00',
    interviewEndTime: '12:00',
    interviewMethod: 'ONSITE' as const,
    participants,
    onInterviewDateChange: vi.fn(),
    onInterviewRoundChange: vi.fn(),
    onInterviewStartTimeChange: vi.fn(),
    onInterviewEndTimeChange: vi.fn(),
    onInterviewMethodChange: vi.fn(),
    onParticipantsChange: vi.fn(),
    ...overrides,
  };
}

describe('StepBasicInfoRoadmap', () => {
  it('제목 "Ⅰ-2. 주요 활동" + 수행 차수/방법/일자/시작·종료 시간 필드 렌더', () => {
    render(<StepBasicInfoRoadmap {...baseProps()} />);
    expect(screen.getByRole('heading', { name: /주요 활동/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/수행 차수/)).toBeInTheDocument();
    expect(screen.getByLabelText(/수행 방법/)).toBeInTheDocument();
    expect(screen.getByLabelText(/수행 일자/)).toBeInTheDocument();
    // ISSUE-10 Step C-2: 단일 "수행 시간" → 시작/종료 두 input
    expect(screen.getByLabelText(/수행 시간 \(시작\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/수행 시간 \(종료\)/)).toBeInTheDocument();
  });

  it('수행 방법 Select 트리거가 현재 값의 라벨을 표시', () => {
    render(<StepBasicInfoRoadmap {...baseProps({ interviewMethod: 'VIDEO' })} />);
    // SelectValue 렌더: 현재 선택 값에 해당하는 텍스트가 표시됨
    expect(screen.getByText(/비대면\(화상회의\)/)).toBeInTheDocument();
  });

  it('참석자 추가 버튼 클릭 시 onParticipantsChange에 새 행 전달', async () => {
    const onParticipantsChange = vi.fn();
    const props = baseProps({ onParticipantsChange });
    render(<StepBasicInfoRoadmap {...props} />);

    await userEvent.click(screen.getByRole('button', { name: /참석자 추가/ }));
    const [next] = onParticipantsChange.mock.calls[0];
    expect(next).toHaveLength(2);
  });

  it('참석자가 1명이면 삭제 버튼이 렌더되지 않음', () => {
    render(<StepBasicInfoRoadmap {...baseProps()} />);
    expect(screen.queryByRole('button', { name: /참석자 1 삭제/ })).not.toBeInTheDocument();
  });

  // =====================================================================
  // 추가: 내부 함수 커버리지 확보
  // =====================================================================

  describe('updateParticipant — 참석자 필드 변경', () => {
    it('참석자 성명 입력 시 onParticipantsChange 호출', async () => {
      const user = userEvent.setup();
      const onParticipantsChange = vi.fn();
      const props = baseProps({ onParticipantsChange });
      render(<StepBasicInfoRoadmap {...props} />);
      const nameInput = screen.getByLabelText(/참석자 1 성명/);
      await user.type(nameInput, '홍');
      const last = onParticipantsChange.mock.calls[onParticipantsChange.mock.calls.length - 1][0];
      expect(last[0].name).toBe('홍');
    });

    it('참석자 소속/직급 입력 시 onParticipantsChange 호출', async () => {
      const user = userEvent.setup();
      const onParticipantsChange = vi.fn();
      const props = baseProps({ onParticipantsChange });
      render(<StepBasicInfoRoadmap {...props} />);
      const positionInput = screen.getByLabelText(/참석자 1 소속\/직급/);
      await user.type(positionInput, '팀');
      const last = onParticipantsChange.mock.calls[onParticipantsChange.mock.calls.length - 1][0];
      expect(last[0].position).toBe('팀');
    });
  });

  describe('removeParticipant — 참석자 삭제', () => {
    it('참석자가 2명일 때 삭제 버튼 클릭 시 onParticipantsChange에 1명 배열 전달', async () => {
      const user = userEvent.setup();
      const onParticipantsChange = vi.fn();
      const p1 = createEmptyRoadmapParticipant();
      const p2 = createEmptyRoadmapParticipant();
      const props = baseProps({ participants: [p1, p2], onParticipantsChange });
      render(<StepBasicInfoRoadmap {...props} />);
      const deleteBtn = screen.getAllByRole('button', { name: /참석자 1 삭제/ });
      await user.click(deleteBtn[0]);
      const [next] = onParticipantsChange.mock.calls[0];
      expect(next).toHaveLength(1);
    });

    it('참석자가 1명일 때는 삭제 버튼이 없어서 removeParticipant가 호출되지 않음', () => {
      const onParticipantsChange = vi.fn();
      const props = baseProps({ onParticipantsChange });
      render(<StepBasicInfoRoadmap {...props} />);
      expect(screen.queryAllByRole('button', { name: /참석자 \d+ 삭제/ })).toHaveLength(0);
    });
  });

  describe('updateParticipant — 2번째 참석자 유지 (cond-expr false 분기 커버)', () => {
    it('2명 참석자에서 첫 번째 참석자 성명 변경 시 두 번째 참석자 유지 (Line 55 false 경로)', async () => {
      // branch 0[1]: i !== index → p 그대로 반환하는 false 경로 커버
      const user = userEvent.setup();
      const onParticipantsChange = vi.fn();
      const p1 = createEmptyRoadmapParticipant();
      const p2 = { ...createEmptyRoadmapParticipant(), name: '이유지' };
      const props = baseProps({ participants: [p1, p2], onParticipantsChange });
      render(<StepBasicInfoRoadmap {...props} />);
      // 첫 번째 참석자 성명 → updateParticipant(0, 'name', ...) → i=1 false 경로
      const nameInputs = screen.getAllByPlaceholderText(/성명/);
      await user.type(nameInputs[0], '홍');
      const last = onParticipantsChange.mock.calls[onParticipantsChange.mock.calls.length - 1][0];
      expect(last[1].name).toBe('이유지');
    });
  });

  describe('이벤트 핸들러 — 날짜·시간·차수·방법 변경', () => {
    it('수행 일자 변경 시 onInterviewDateChange 호출', async () => {
      const user = userEvent.setup();
      const onInterviewDateChange = vi.fn();
      const props = baseProps({ onInterviewDateChange });
      render(<StepBasicInfoRoadmap {...props} />);
      const dateInput = screen.getByLabelText(/수행 일자/);
      await user.clear(dateInput);
      await user.type(dateInput, '2026-05-01');
      expect(onInterviewDateChange).toHaveBeenCalled();
    });

    it('수행 시간 (시작) 변경 시 onInterviewStartTimeChange 호출', async () => {
      const user = userEvent.setup();
      const onInterviewStartTimeChange = vi.fn();
      const props = baseProps({ onInterviewStartTimeChange });
      render(<StepBasicInfoRoadmap {...props} />);
      const startInput = screen.getByLabelText(/수행 시간 \(시작\)/);
      await user.clear(startInput);
      await user.type(startInput, '14:00');
      expect(onInterviewStartTimeChange).toHaveBeenCalled();
    });

    it('수행 시간 (종료) 변경 시 onInterviewEndTimeChange 호출', async () => {
      const user = userEvent.setup();
      const onInterviewEndTimeChange = vi.fn();
      const props = baseProps({ onInterviewEndTimeChange });
      render(<StepBasicInfoRoadmap {...props} />);
      const endInput = screen.getByLabelText(/수행 시간 \(종료\)/);
      await user.clear(endInput);
      await user.type(endInput, '16:00');
      expect(onInterviewEndTimeChange).toHaveBeenCalled();
    });
  });
});
