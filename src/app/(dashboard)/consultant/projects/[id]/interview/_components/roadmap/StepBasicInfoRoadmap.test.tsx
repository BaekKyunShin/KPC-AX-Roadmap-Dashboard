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
    interviewTime: '10:00',
    interviewMethod: 'ONSITE' as const,
    participants,
    onInterviewDateChange: vi.fn(),
    onInterviewRoundChange: vi.fn(),
    onInterviewTimeChange: vi.fn(),
    onInterviewMethodChange: vi.fn(),
    onParticipantsChange: vi.fn(),
    ...overrides,
  };
}

describe('StepBasicInfoRoadmap', () => {
  it('제목 "기본 정보 · 참석자" + 수행 차수/방법/일자/시간 필드 렌더', () => {
    render(<StepBasicInfoRoadmap {...baseProps()} />);
    expect(screen.getByRole('heading', { name: /기본 정보 · 참석자/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/수행 차수/)).toBeInTheDocument();
    expect(screen.getByLabelText(/수행 방법/)).toBeInTheDocument();
    expect(screen.getByLabelText(/수행 일자/)).toBeInTheDocument();
    expect(screen.getByLabelText(/수행 시간/)).toBeInTheDocument();
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
});
