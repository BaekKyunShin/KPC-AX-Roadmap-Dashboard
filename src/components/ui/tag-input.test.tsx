import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('./button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: string;
    className?: string;
  }) => (
    <button type={(type as 'button') || 'button'} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

vi.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Plus: () => <span data-testid="plus-icon">+</span>,
}));

import { TagInput } from './tag-input';

// =============================================================================
// 헬퍼
// =============================================================================

function setup(value: string[] = [], onChange = vi.fn(), props = {}) {
  const user = userEvent.setup();
  const result = render(<TagInput value={value} onChange={onChange} {...props} />);
  const input = result.getByRole('textbox');
  const addButton = result.getByRole('button', { name: /추가/ });
  return { user, input, addButton, onChange, ...result };
}

// =============================================================================
// 테스트
// =============================================================================

describe('TagInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('텍스트 입력 필드가 렌더링된다', () => {
      setup();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('추가 버튼이 렌더링된다', () => {
      setup();
      expect(screen.getByRole('button', { name: /추가/ })).toBeInTheDocument();
    });

    it('기본 placeholder를 표시한다', () => {
      setup();
      expect(screen.getByPlaceholderText('입력 후 Enter 또는 추가 버튼')).toBeInTheDocument();
    });

    it('커스텀 placeholder를 표시한다', () => {
      setup([], vi.fn(), { placeholder: '태그를 입력하세요' });
      expect(screen.getByPlaceholderText('태그를 입력하세요')).toBeInTheDocument();
    });

    it('초기 태그들을 렌더링한다', () => {
      setup(['태그1', '태그2']);
      expect(screen.getByText('태그1')).toBeInTheDocument();
      expect(screen.getByText('태그2')).toBeInTheDocument();
    });

    it('태그가 있을 때 카운트 텍스트를 표시한다', () => {
      setup(['태그1', '태그2'], vi.fn(), { maxTags: 10 });
      expect(screen.getByText('2/10개 입력됨')).toBeInTheDocument();
    });

    it('태그가 없으면 카운트 텍스트를 표시하지 않는다', () => {
      setup();
      expect(screen.queryByText(/개 입력됨/)).not.toBeInTheDocument();
    });
  });

  describe('태그 추가 - Enter 키', () => {
    it('Enter 키 입력으로 태그가 추가된다', async () => {
      const onChange = vi.fn();
      const { user, input } = setup([], onChange);
      await user.type(input, '새태그');
      await user.keyboard('{Enter}');
      expect(onChange).toHaveBeenCalledWith(['새태그']);
    });

    it('Enter 후 입력 필드가 초기화된다', async () => {
      const { user, input } = setup([], vi.fn());
      await user.type(input, '태그');
      await user.keyboard('{Enter}');
      expect(input).toHaveValue('');
    });

    it('공백만 있는 입력은 추가되지 않는다', async () => {
      const onChange = vi.fn();
      const { user, input } = setup([], onChange);
      await user.type(input, '   ');
      await user.keyboard('{Enter}');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('앞뒤 공백이 제거된 태그가 추가된다', async () => {
      const onChange = vi.fn();
      const { user, input } = setup([], onChange);
      await user.type(input, '  태그  ');
      await user.keyboard('{Enter}');
      expect(onChange).toHaveBeenCalledWith(['태그']);
    });
  });

  describe('태그 추가 - 추가 버튼 클릭', () => {
    it('추가 버튼 클릭으로 태그가 추가된다', async () => {
      const onChange = vi.fn();
      const { user, input, addButton } = setup([], onChange);
      await user.type(input, '버튼태그');
      await user.click(addButton);
      expect(onChange).toHaveBeenCalledWith(['버튼태그']);
    });

    it('입력이 비어있으면 추가 버튼이 disabled 상태이다', () => {
      const { addButton } = setup([], vi.fn());
      expect(addButton).toBeDisabled();
    });

    it('입력이 있으면 추가 버튼이 활성화된다', async () => {
      const { user, input, addButton } = setup([], vi.fn());
      await user.type(input, '태그');
      expect(addButton).not.toBeDisabled();
    });
  });

  describe('태그 삭제', () => {
    it('X 버튼 클릭으로 태그가 삭제된다', async () => {
      const onChange = vi.fn();
      const { user } = setup(['태그1', '태그2'], onChange);
      const deleteButton = screen.getByRole('button', { name: '태그1 삭제' });
      await user.click(deleteButton);
      expect(onChange).toHaveBeenCalledWith(['태그2']);
    });

    it('삭제 버튼에 aria-label이 설정된다', () => {
      setup(['테스트']);
      expect(screen.getByRole('button', { name: '테스트 삭제' })).toBeInTheDocument();
    });

    it('Backspace 키로 마지막 태그를 삭제할 수 있다', async () => {
      const onChange = vi.fn();
      const { user, input } = setup(['태그1', '태그2'], onChange);
      // 입력 필드가 비어있을 때 Backspace
      await user.click(input);
      await user.keyboard('{Backspace}');
      expect(onChange).toHaveBeenCalledWith(['태그1']);
    });

    it('입력값이 있을 때 Backspace는 태그를 삭제하지 않는다', async () => {
      const onChange = vi.fn();
      const { user, input } = setup(['태그1'], onChange);
      await user.type(input, '입력중');
      await user.keyboard('{Backspace}');
      // Backspace는 입력 글자만 지우고 태그를 삭제하지 않음
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('maxTags 제한', () => {
    it('maxTags에 도달하면 입력 필드가 disabled 된다', () => {
      const { input } = setup(['태그1', '태그2'], vi.fn(), { maxTags: 2 });
      expect(input).toBeDisabled();
    });

    it('maxTags에 도달하면 추가 버튼이 disabled 된다', () => {
      const { addButton } = setup(['태그1', '태그2'], vi.fn(), { maxTags: 2 });
      expect(addButton).toBeDisabled();
    });

    it('maxTags에 도달하면 placeholder가 최대 개수 안내로 변경된다', () => {
      setup(['태그1', '태그2'], vi.fn(), { maxTags: 2 });
      expect(screen.getByPlaceholderText('최대 2개까지 입력 가능')).toBeInTheDocument();
    });

    it('Enter 키로도 maxTags 초과 추가가 되지 않는다', async () => {
      const onChange = vi.fn();
      const { input } = setup(['태그1', '태그2'], onChange, { maxTags: 2 });
      // disabled 상태이므로 type이 안되지만, 로직 검증
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('중복 태그 방지', () => {
    it('이미 있는 태그를 추가하면 onChange가 호출되지 않는다', async () => {
      const onChange = vi.fn();
      const { user, input } = setup(['기존태그'], onChange);
      await user.type(input, '기존태그');
      await user.keyboard('{Enter}');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('중복 입력 시 입력 필드가 초기화된다', async () => {
      const { user, input } = setup(['기존태그'], vi.fn());
      await user.type(input, '기존태그');
      await user.keyboard('{Enter}');
      expect(input).toHaveValue('');
    });
  });

  describe('IME 조합 처리 (한글 입력)', () => {
    it('IME 조합 중에는 Enter 키가 무시된다', () => {
      const onChange = vi.fn();
      const { input } = setup([], onChange);
      // compositionStart → keyDown Enter → compositionEnd 순서 시뮬레이션
      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: '한' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      // IME 조합 중이므로 onChange 미호출
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.compositionEnd(input);
    });

    it('IME 조합 종료 후에는 Enter 키가 동작한다', () => {
      const onChange = vi.fn();
      const { input } = setup([], onChange);
      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: '한글' } });
      fireEvent.compositionEnd(input);
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith(['한글']);
    });
  });

  describe('disabled 상태', () => {
    it('disabled이면 입력 필드가 비활성화된다', () => {
      const { input } = setup([], vi.fn(), { disabled: true });
      expect(input).toBeDisabled();
    });

    it('disabled이면 추가 버튼이 비활성화된다', () => {
      const { addButton } = setup([], vi.fn(), { disabled: true });
      expect(addButton).toBeDisabled();
    });

    it('disabled이면 태그의 삭제 버튼이 표시되지 않는다', () => {
      setup(['태그1'], vi.fn(), { disabled: true });
      expect(screen.queryByRole('button', { name: '태그1 삭제' })).not.toBeInTheDocument();
    });
  });

  describe('maxLength 제한', () => {
    it('maxLength를 초과하는 입력은 잘린다', async () => {
      const { user, input } = setup([], vi.fn(), { maxLength: 5 });
      await user.type(input, '123456789');
      expect((input as HTMLInputElement).value.length).toBeLessThanOrEqual(5);
    });
  });
});
