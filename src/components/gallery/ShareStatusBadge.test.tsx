import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ShareStatusBadge } from './ShareStatusBadge';

describe('ShareStatusBadge', () => {
  describe('라벨', () => {
    it('isShared=true 이면 "갤러리 공유됨" 을 표시한다', () => {
      render(<ShareStatusBadge isShared />);
      expect(screen.getByText('갤러리 공유됨')).toBeInTheDocument();
    });

    it('isShared=false 이면 "갤러리 미공유" 를 표시한다', () => {
      render(<ShareStatusBadge isShared={false} />);
      expect(screen.getByText('갤러리 미공유')).toBeInTheDocument();
    });
  });

  describe('읽기 전용', () => {
    it('클릭 가능한 요소를 렌더하지 않는다 (ShareToggle 과 달리 상태 표시 전용)', () => {
      const { container } = render(<ShareStatusBadge isShared />);

      expect(screen.queryByRole('switch')).toBeNull();
      expect(screen.queryByRole('button')).toBeNull();
      expect(container.querySelector('button')).toBeNull();
    });
  });

  describe('className 병합', () => {
    it('전달한 className 이 기본 클래스와 함께 적용된다', () => {
      render(<ShareStatusBadge isShared className="ml-2" />);
      expect(screen.getByText('갤러리 공유됨').closest('span')).toHaveClass('ml-2');
    });
  });
});
