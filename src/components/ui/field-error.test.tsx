import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

// lucide-react 아이콘은 SVG로 렌더링하면 충분하므로 실제 구현 사용
// (필요 시 아래 mock으로 교체 가능)

import { FieldError } from './field-error';

// =============================================================================
// 테스트
// =============================================================================

describe('FieldError', () => {
  describe('message가 없을 때', () => {
    it('message가 undefined이면 null을 반환한다 (아무것도 렌더링되지 않음)', () => {
      const { container } = render(<FieldError />);
      expect(container.firstChild).toBeNull();
    });

    it('message가 빈 문자열이면 null을 반환한다', () => {
      const { container } = render(<FieldError message="" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('message가 있을 때', () => {
    it('에러 메시지 텍스트를 렌더링한다', () => {
      render(<FieldError message="필수 입력 항목입니다" />);
      expect(screen.getByText('필수 입력 항목입니다')).toBeInTheDocument();
    });

    it('p 태그로 렌더링된다', () => {
      const { container } = render(<FieldError message="오류 발생" />);
      expect(container.querySelector('p')).toBeInTheDocument();
    });

    it('text-destructive 클래스를 가진다', () => {
      const { container } = render(<FieldError message="오류" />);
      const p = container.querySelector('p');
      expect(p?.className).toContain('text-destructive');
    });

    it('text-sm 클래스를 가진다', () => {
      const { container } = render(<FieldError message="오류" />);
      const p = container.querySelector('p');
      expect(p?.className).toContain('text-sm');
    });

    it('AlertCircle 아이콘 SVG가 포함된다', () => {
      const { container } = render(<FieldError message="오류" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('다양한 에러 메시지를 정확히 렌더링한다', () => {
      const messages = [
        '이메일 형식이 올바르지 않습니다',
        '비밀번호는 8자 이상이어야 합니다',
        '이미 사용 중인 이름입니다',
      ];
      messages.forEach((message) => {
        const { unmount } = render(<FieldError message={message} />);
        expect(screen.getByText(message)).toBeInTheDocument();
        unmount();
      });
    });
  });
});
