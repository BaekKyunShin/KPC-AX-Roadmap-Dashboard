import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/tag-input', () => ({
  TagInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
  }) => (
    <div data-testid="tag-input">
      <input
        data-testid="tag-input-field"
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const target = e.target as HTMLInputElement;
            if (target.value) {
              onChange([...value, target.value]);
              target.value = '';
            }
          }
        }}
      />
      {value.map((tag, i) => (
        <span key={i} data-testid={`tag-${tag}`}>
          {tag}
        </span>
      ))}
    </div>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
  }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({
    value,
    children,
    onSelect,
  }: {
    value: string;
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button data-testid={`select-item-${value}`} onClick={onSelect}>
      {children}
    </button>
  ),
}));

import React from 'react';
import TestStepBasicInfo from './TestStepBasicInfo';
import type { InterviewParticipant } from '@/lib/schemas/test-roadmap';

// ─── 테스트 데이터 ────────────────────────────────────────────────────────────

const mockParticipant: InterviewParticipant = {
  id: 'p1',
  name: '홍길동',
  position: '팀장',
};

const defaultProps = {
  companyName: '',
  industry: '',
  subIndustries: [],
  companySize: '',
  onCompanyNameChange: vi.fn(),
  onIndustryChange: vi.fn(),
  onSubIndustriesChange: vi.fn(),
  onCompanySizeChange: vi.fn(),
  interviewDate: '',
  participants: [mockParticipant],
  onInterviewDateChange: vi.fn(),
  onParticipantsChange: vi.fn(),
};

// ─── 테스트 ────────────────────────────────────────────────────────────────────

describe('TestStepBasicInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기업 기본정보 렌더링', () => {
    it('기업 기본정보 섹션 제목이 표시된다', () => {
      render(<TestStepBasicInfo {...defaultProps} />);
      expect(screen.getByText('기업 기본정보')).toBeInTheDocument();
    });

    it('회사명 입력 필드가 표시된다', () => {
      render(<TestStepBasicInfo {...defaultProps} companyName="테스트 회사" />);
      const input = screen.getByPlaceholderText('예: 테스트 제조회사');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('테스트 회사');
    });

    it('회사명 입력 시 onCompanyNameChange가 호출된다', async () => {
      const user = userEvent.setup();
      const onCompanyNameChange = vi.fn();
      render(<TestStepBasicInfo {...defaultProps} onCompanyNameChange={onCompanyNameChange} />);
      const input = screen.getByPlaceholderText('예: 테스트 제조회사');
      await user.type(input, 'A');
      expect(onCompanyNameChange).toHaveBeenCalled();
    });

    it('업종 선택 셀렉트가 표시된다', () => {
      render(<TestStepBasicInfo {...defaultProps} />);
      expect(screen.getByText('업종')).toBeInTheDocument();
    });

    it('세부 업종 TagInput이 표시된다', () => {
      render(<TestStepBasicInfo {...defaultProps} />);
      expect(screen.getByTestId('tag-input')).toBeInTheDocument();
    });
  });

  describe('인터뷰 기본정보 렌더링', () => {
    it('인터뷰 기본정보 섹션 제목이 표시된다', () => {
      render(<TestStepBasicInfo {...defaultProps} />);
      expect(screen.getByText('인터뷰 기본정보')).toBeInTheDocument();
    });

    it('인터뷰 날짜 입력 필드가 표시된다', () => {
      render(<TestStepBasicInfo {...defaultProps} interviewDate="2026-03-21" />);
      const dateInput = screen.getByDisplayValue('2026-03-21');
      expect(dateInput).toBeInTheDocument();
    });

    it('인터뷰 날짜 변경 시 onInterviewDateChange가 호출된다', async () => {
      const user = userEvent.setup();
      const onInterviewDateChange = vi.fn();
      const { container } = render(
        <TestStepBasicInfo {...defaultProps} onInterviewDateChange={onInterviewDateChange} />
      );
      const dateInputEl = container.querySelector('input[type="date"]') as HTMLInputElement;
      expect(dateInputEl).toBeTruthy();
      await user.type(dateInputEl, '2026-03-21');
      expect(onInterviewDateChange).toHaveBeenCalled();
    });

    it('참석자 정보가 표시된다', () => {
      render(<TestStepBasicInfo {...defaultProps} />);
      expect(screen.getByDisplayValue('홍길동')).toBeInTheDocument();
      expect(screen.getByDisplayValue('팀장')).toBeInTheDocument();
    });
  });

  describe('참석자 추가/삭제', () => {
    it('"참석자 추가" 버튼이 표시된다', () => {
      render(<TestStepBasicInfo {...defaultProps} />);
      expect(screen.getByRole('button', { name: /참석자 추가/ })).toBeInTheDocument();
    });

    it('참석자 추가 버튼 클릭 시 onParticipantsChange가 호출된다', async () => {
      const user = userEvent.setup();
      const onParticipantsChange = vi.fn();
      render(<TestStepBasicInfo {...defaultProps} onParticipantsChange={onParticipantsChange} />);
      await user.click(screen.getByRole('button', { name: /참석자 추가/ }));
      expect(onParticipantsChange).toHaveBeenCalledTimes(1);
      const newParticipants = onParticipantsChange.mock.calls[0][0];
      expect(newParticipants).toHaveLength(2);
    });

    it('참석자가 2명 이상일 때 삭제 버튼이 표시된다', () => {
      const twoParticipants: InterviewParticipant[] = [
        { id: 'p1', name: '홍길동', position: '팀장' },
        { id: 'p2', name: '김철수', position: '대리' },
      ];
      render(<TestStepBasicInfo {...defaultProps} participants={twoParticipants} />);
      const deleteButtons = screen.getAllByTitle('삭제');
      expect(deleteButtons).toHaveLength(2);
    });

    it('참석자가 1명일 때 삭제 버튼이 표시되지 않는다', () => {
      render(<TestStepBasicInfo {...defaultProps} />);
      expect(screen.queryByTitle('삭제')).not.toBeInTheDocument();
    });

    it('삭제 버튼 클릭 시 onParticipantsChange가 해당 참석자를 제외하고 호출된다', async () => {
      const user = userEvent.setup();
      const onParticipantsChange = vi.fn();
      const twoParticipants: InterviewParticipant[] = [
        { id: 'p1', name: '홍길동', position: '팀장' },
        { id: 'p2', name: '김철수', position: '대리' },
      ];
      render(
        <TestStepBasicInfo
          {...defaultProps}
          participants={twoParticipants}
          onParticipantsChange={onParticipantsChange}
        />
      );
      const deleteButtons = screen.getAllByTitle('삭제');
      await user.click(deleteButtons[0]);
      expect(onParticipantsChange).toHaveBeenCalledTimes(1);
      const remaining = onParticipantsChange.mock.calls[0][0];
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('p2');
    });

    it('참석자 이름 수정 시 onParticipantsChange가 호출된다', async () => {
      const user = userEvent.setup();
      const onParticipantsChange = vi.fn();
      render(
        <TestStepBasicInfo {...defaultProps} onParticipantsChange={onParticipantsChange} />
      );
      const nameInput = screen.getByDisplayValue('홍길동');
      await user.clear(nameInput);
      await user.type(nameInput, '이영희');
      expect(onParticipantsChange).toHaveBeenCalled();
    });
  });
});
