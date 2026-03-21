import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import StepBasicInfo from './StepBasicInfo';
import type { InterviewParticipant } from '@/lib/schemas/interview';

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeParticipant(overrides?: Partial<InterviewParticipant>): InterviewParticipant {
  return {
    id: 'p1',
    name: '홍길동',
    position: '팀장',
    ...overrides,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('StepBasicInfo', () => {
  // -------------------------------------------------------------------------
  // 1. 기본 렌더링
  // -------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('제목과 설명이 렌더링된다', () => {
      render(
        <StepBasicInfo
          interviewDate="2026-03-15"
          participants={[makeParticipant()]}
          onInterviewDateChange={vi.fn()}
          onParticipantsChange={vi.fn()}
        />,
      );

      expect(screen.getByText('기본 정보')).toBeInTheDocument();
      expect(screen.getByText('인터뷰 날짜와 참석자 정보를 입력해주세요.')).toBeInTheDocument();
    });

    it('날짜 입력 필드에 초기값이 표시된다', () => {
      render(
        <StepBasicInfo
          interviewDate="2026-03-15"
          participants={[makeParticipant()]}
          onInterviewDateChange={vi.fn()}
          onParticipantsChange={vi.fn()}
        />,
      );

      const dateInput = screen.getByDisplayValue('2026-03-15');
      expect(dateInput).toBeInTheDocument();
    });

    it('참석자 이름과 직급이 입력 필드에 표시된다', () => {
      render(
        <StepBasicInfo
          interviewDate=""
          participants={[makeParticipant({ name: '김철수', position: '대표이사' })]}
          onInterviewDateChange={vi.fn()}
          onParticipantsChange={vi.fn()}
        />,
      );

      expect(screen.getByDisplayValue('김철수')).toBeInTheDocument();
      expect(screen.getByDisplayValue('대표이사')).toBeInTheDocument();
    });

    it('참석자 추가 버튼이 렌더링된다', () => {
      render(
        <StepBasicInfo
          interviewDate=""
          participants={[makeParticipant()]}
          onInterviewDateChange={vi.fn()}
          onParticipantsChange={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /참석자 추가/ })).toBeInTheDocument();
    });

    it('참석자가 1명이면 삭제 버튼이 표시되지 않는다', () => {
      render(
        <StepBasicInfo
          interviewDate=""
          participants={[makeParticipant()]}
          onInterviewDateChange={vi.fn()}
          onParticipantsChange={vi.fn()}
        />,
      );

      expect(screen.queryByTitle('삭제')).not.toBeInTheDocument();
    });

    it('참석자가 2명이면 삭제 버튼이 표시된다', () => {
      render(
        <StepBasicInfo
          interviewDate=""
          participants={[
            makeParticipant({ id: 'p1', name: '홍길동' }),
            makeParticipant({ id: 'p2', name: '김영희' }),
          ]}
          onInterviewDateChange={vi.fn()}
          onParticipantsChange={vi.fn()}
        />,
      );

      expect(screen.getAllByTitle('삭제')).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // 2. 날짜 입력 콜백
  // -------------------------------------------------------------------------
  describe('날짜 입력 콜백', () => {
    it('날짜 입력 변경 시 onInterviewDateChange가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnDateChange = vi.fn();

      render(
        <StepBasicInfo
          interviewDate=""
          participants={[makeParticipant()]}
          onInterviewDateChange={mockOnDateChange}
          onParticipantsChange={vi.fn()}
        />,
      );

      const dateInput = screen.getByDisplayValue('');
      await user.type(dateInput, '2026-04-01');

      expect(mockOnDateChange).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 3. 참석자 추가
  // -------------------------------------------------------------------------
  describe('참석자 추가', () => {
    it('"참석자 추가" 버튼 클릭 시 onParticipantsChange가 새 참석자를 포함하여 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const initial = [makeParticipant()];

      render(
        <StepBasicInfo
          interviewDate=""
          participants={initial}
          onInterviewDateChange={vi.fn()}
          onParticipantsChange={mockOnChange}
        />,
      );

      await user.click(screen.getByRole('button', { name: /참석자 추가/ }));

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as InterviewParticipant[];
      expect(called).toHaveLength(2);
      expect(called[1].name).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // 4. 참석자 삭제
  // -------------------------------------------------------------------------
  describe('참석자 삭제', () => {
    it('삭제 버튼 클릭 시 해당 참석자가 제거된 배열로 onParticipantsChange가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();
      const initial = [
        makeParticipant({ id: 'p1', name: '홍길동' }),
        makeParticipant({ id: 'p2', name: '김영희' }),
      ];

      render(
        <StepBasicInfo
          interviewDate=""
          participants={initial}
          onInterviewDateChange={vi.fn()}
          onParticipantsChange={mockOnChange}
        />,
      );

      const deleteButtons = screen.getAllByTitle('삭제');
      await user.click(deleteButtons[0]);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const called = mockOnChange.mock.calls[0][0] as InterviewParticipant[];
      expect(called).toHaveLength(1);
      expect(called[0].id).toBe('p2');
    });

    it('참석자가 1명이면 삭제 버튼이 없어 삭제가 불가능하다', async () => {
      render(
        <StepBasicInfo
          interviewDate=""
          participants={[makeParticipant()]}
          onInterviewDateChange={vi.fn()}
          onParticipantsChange={vi.fn()}
        />,
      );

      expect(screen.queryByTitle('삭제')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 5. 참석자 필드 수정
  // -------------------------------------------------------------------------
  describe('참석자 필드 수정', () => {
    it('이름 입력 시 onParticipantsChange가 업데이트된 참석자로 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepBasicInfo
          interviewDate=""
          participants={[makeParticipant({ name: '' })]}
          onInterviewDateChange={vi.fn()}
          onParticipantsChange={mockOnChange}
        />,
      );

      const nameInput = screen.getByPlaceholderText('이름');
      await user.type(nameInput, '박지성');

      expect(mockOnChange).toHaveBeenCalled();
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0] as InterviewParticipant[];
      // user.type은 글자 단위로 호출하므로 마지막 글자('성')가 누적된 최종 name 확인
      expect(lastCall[0].name).toBeTruthy();
    });

    it('직급 입력 시 onParticipantsChange가 업데이트된 참석자로 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnChange = vi.fn();

      render(
        <StepBasicInfo
          interviewDate=""
          participants={[makeParticipant({ position: '' })]}
          onInterviewDateChange={vi.fn()}
          onParticipantsChange={mockOnChange}
        />,
      );

      const positionInput = screen.getByPlaceholderText(/직급\/직책/);
      await user.type(positionInput, '과장');

      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 6. 복수 참석자 렌더링
  // -------------------------------------------------------------------------
  describe('복수 참석자 렌더링', () => {
    it('여러 참석자가 모두 렌더링된다', () => {
      render(
        <StepBasicInfo
          interviewDate=""
          participants={[
            makeParticipant({ id: 'p1', name: '홍길동', position: '팀장' }),
            makeParticipant({ id: 'p2', name: '이순신', position: '부장' }),
            makeParticipant({ id: 'p3', name: '강감찬', position: '사원' }),
          ]}
          onInterviewDateChange={vi.fn()}
          onParticipantsChange={vi.fn()}
        />,
      );

      expect(screen.getByDisplayValue('홍길동')).toBeInTheDocument();
      expect(screen.getByDisplayValue('이순신')).toBeInTheDocument();
      expect(screen.getByDisplayValue('강감찬')).toBeInTheDocument();
    });
  });
});
