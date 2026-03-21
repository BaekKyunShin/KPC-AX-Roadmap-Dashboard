import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import { RevisionPromptToggle } from './RevisionPromptToggle';

describe('RevisionPromptToggle', () => {
  describe('기본 렌더링', () => {
    it('"수정 요청 사항" 버튼을 표시한다', () => {
      render(<RevisionPromptToggle prompt="로드맵을 더 상세하게 작성해주세요" />);
      expect(screen.getByText('수정 요청 사항')).toBeInTheDocument();
    });

    it('초기 상태에서 prompt 내용을 숨긴다', () => {
      render(<RevisionPromptToggle prompt="로드맵을 더 상세하게 작성해주세요" />);
      expect(screen.queryByText('로드맵을 더 상세하게 작성해주세요')).not.toBeInTheDocument();
    });

    it('버튼 역할을 가진 요소가 존재한다', () => {
      render(<RevisionPromptToggle prompt="수정 내용" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('토글 동작', () => {
    it('버튼 클릭 시 prompt 내용이 표시된다', async () => {
      const user = userEvent.setup();
      render(<RevisionPromptToggle prompt="로드맵을 더 상세하게 작성해주세요" />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText('로드맵을 더 상세하게 작성해주세요')).toBeInTheDocument();
    });

    it('버튼을 두 번 클릭하면 prompt 내용이 다시 숨겨진다', async () => {
      const user = userEvent.setup();
      render(<RevisionPromptToggle prompt="로드맵을 더 상세하게 작성해주세요" />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('로드맵을 더 상세하게 작성해주세요')).toBeInTheDocument();

      await user.click(screen.getByRole('button'));
      expect(screen.queryByText('로드맵을 더 상세하게 작성해주세요')).not.toBeInTheDocument();
    });

    it('펼친 상태에서 SVG 아이콘이 rotate-180 클래스를 가진다', async () => {
      const user = userEvent.setup();
      render(<RevisionPromptToggle prompt="수정 내용" />);

      await user.click(screen.getByRole('button'));

      const svg = screen.getByRole('button').querySelector('svg');
      expect(svg).toHaveClass('rotate-180');
    });

    it('접힌 상태에서 SVG 아이콘이 rotate-180 클래스를 가지지 않는다', () => {
      render(<RevisionPromptToggle prompt="수정 내용" />);

      const svg = screen.getByRole('button').querySelector('svg');
      expect(svg).not.toHaveClass('rotate-180');
    });
  });

  describe('prompt 내용 표시', () => {
    it('전달된 prompt 텍스트를 정확히 표시한다', async () => {
      const user = userEvent.setup();
      const promptText = '3단계 과정을 5단계로 세분화해주세요';
      render(<RevisionPromptToggle prompt={promptText} />);

      await user.click(screen.getByRole('button'));

      expect(screen.getByText(promptText)).toBeInTheDocument();
    });
  });
});
