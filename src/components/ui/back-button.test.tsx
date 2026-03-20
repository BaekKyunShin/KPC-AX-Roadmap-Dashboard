import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

const mockBack = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

import { BackButton, BACK_LINK_STYLES } from './back-button';

// ============================================================================
// 테스트
// ============================================================================

describe('BackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('버튼이 렌더링된다', () => {
      render(<BackButton label="뒤로가기" fallbackHref="/dashboard" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('label 텍스트를 표시한다', () => {
      render(<BackButton label="프로젝트 목록으로" fallbackHref="/ops/projects" />);
      expect(screen.getByText('프로젝트 목록으로')).toBeInTheDocument();
    });

    it('type="button" 속성을 가진다', () => {
      render(<BackButton label="뒤로" fallbackHref="/" />);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('ArrowLeft 아이콘 SVG가 포함된다', () => {
      render(<BackButton label="뒤로" fallbackHref="/" />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('BACK_LINK_STYLES 클래스를 가진다', () => {
      render(<BackButton label="뒤로" fallbackHref="/" />);
      const button = screen.getByRole('button');
      // BACK_LINK_STYLES의 일부 클래스 확인
      expect(button.className).toContain('inline-flex');
      expect(button.className).toContain('items-center');
    });
  });

  describe('클릭 동작', () => {
    it('히스토리가 1개 초과이면 router.back()을 호출한다', async () => {
      const user = userEvent.setup();

      // window.history.length를 2 이상으로 설정
      Object.defineProperty(window, 'history', {
        value: { length: 2 },
        configurable: true,
        writable: true,
      });

      render(<BackButton label="뒤로" fallbackHref="/dashboard" />);
      await user.click(screen.getByRole('button'));

      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('히스토리가 1개이면 router.push(fallbackHref)를 호출한다', async () => {
      const user = userEvent.setup();

      Object.defineProperty(window, 'history', {
        value: { length: 1 },
        configurable: true,
        writable: true,
      });

      render(<BackButton label="뒤로" fallbackHref="/ops/projects" />);
      await user.click(screen.getByRole('button'));

      expect(mockPush).toHaveBeenCalledWith('/ops/projects');
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('fallbackHref가 router.push에 정확히 전달된다', async () => {
      const user = userEvent.setup();

      Object.defineProperty(window, 'history', {
        value: { length: 1 },
        configurable: true,
        writable: true,
      });

      render(
        <BackButton label="뒤로" fallbackHref="/consultant/projects" />
      );
      await user.click(screen.getByRole('button'));

      expect(mockPush).toHaveBeenCalledWith('/consultant/projects');
    });
  });

  describe('BACK_LINK_STYLES 상수', () => {
    it('BACK_LINK_STYLES가 정의되어 있다', () => {
      expect(BACK_LINK_STYLES).toBeDefined();
      expect(typeof BACK_LINK_STYLES).toBe('string');
    });

    it('BACK_LINK_STYLES에 inline-flex 클래스가 포함된다', () => {
      expect(BACK_LINK_STYLES).toContain('inline-flex');
    });

    it('BACK_LINK_STYLES에 transition-colors 클래스가 포함된다', () => {
      expect(BACK_LINK_STYLES).toContain('transition-colors');
    });
  });
});
