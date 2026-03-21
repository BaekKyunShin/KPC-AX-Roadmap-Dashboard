import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('cmdk', async () => {
  const React = await import('react');

  function CommandRoot({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) {
    return React.createElement('div', { 'data-testid': 'cmdk-root', ...props }, children);
  }

  function Group({
    children,
    heading,
    ...props
  }: {
    children: React.ReactNode;
    heading?: React.ReactNode;
    [key: string]: unknown;
  }) {
    return React.createElement(
      'div',
      { 'data-testid': 'cmdk-group', ...props },
      heading && React.createElement('div', { 'data-testid': 'cmdk-group-heading' }, heading),
      children,
    );
  }

  function Item({
    children,
    onSelect,
    value,
    keywords: _keywords,
    ...props
  }: {
    children: React.ReactNode;
    onSelect?: (value: string) => void;
    value?: string;
    keywords?: string[];
    [key: string]: unknown;
  }) {
    return React.createElement(
      'div',
      {
        'data-testid': 'cmdk-item',
        'data-value': value,
        role: 'option',
        onClick: () => onSelect?.(value ?? ''),
        ...props,
      },
      children,
    );
  }

  CommandRoot.Group = Group;
  CommandRoot.Item = Item;

  return {
    Command: CommandRoot,
    default: CommandRoot,
  };
});

// ─── Import ──────────────────────────────────────────────────────────────────

import CommandNavigationGroup from './CommandNavigationGroup';
import type { NavItemWithKeywords } from '@/lib/constants/navigation';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockOnSelect = vi.fn();

// 아이콘 컴포넌트 팩토리
function makeIcon(testId: string) {
  return function MockIcon(props: Record<string, unknown>) {
    return <span data-testid={testId} {...props} />;
  };
}

function makeNavItem(overrides: Partial<NavItemWithKeywords> = {}): NavItemWithKeywords {
  return {
    href: '/test',
    label: '테스트 메뉴',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: makeIcon('icon-test') as any,
    keywords: ['테스트'],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CommandNavigationGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('그룹 헤딩 렌더링', () => {
    it('"바로가기" 헤딩이 표시된다', () => {
      render(
        <CommandNavigationGroup
          navItems={[makeNavItem()]}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('바로가기')).toBeInTheDocument();
    });
  });

  describe('navItems 렌더링', () => {
    it('navItems 배열이 비어있으면 항목이 렌더링되지 않는다', () => {
      render(<CommandNavigationGroup navItems={[]} onSelect={mockOnSelect} />);
      expect(screen.queryByTestId('cmdk-item')).not.toBeInTheDocument();
    });

    it('navItems가 1개이면 1개의 항목이 렌더링된다', () => {
      render(
        <CommandNavigationGroup
          navItems={[makeNavItem({ label: '대시보드', href: '/dashboard' })]}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getAllByTestId('cmdk-item')).toHaveLength(1);
    });

    it('navItems가 3개이면 3개의 항목이 렌더링된다', () => {
      const items: NavItemWithKeywords[] = [
        makeNavItem({ href: '/a', label: '메뉴 A', keywords: ['A'] }),
        makeNavItem({ href: '/b', label: '메뉴 B', keywords: ['B'] }),
        makeNavItem({ href: '/c', label: '메뉴 C', keywords: ['C'] }),
      ];
      render(<CommandNavigationGroup navItems={items} onSelect={mockOnSelect} />);
      expect(screen.getAllByTestId('cmdk-item')).toHaveLength(3);
    });

    it('각 항목의 레이블 텍스트가 렌더링된다', () => {
      const items: NavItemWithKeywords[] = [
        makeNavItem({ href: '/a', label: '프로젝트 관리', keywords: ['프로젝트'] }),
        makeNavItem({ href: '/b', label: '사용자 관리', keywords: ['사용자'] }),
      ];
      render(<CommandNavigationGroup navItems={items} onSelect={mockOnSelect} />);
      expect(screen.getByText('프로젝트 관리')).toBeInTheDocument();
      expect(screen.getByText('사용자 관리')).toBeInTheDocument();
    });

    it('각 항목에 아이콘 컴포넌트가 렌더링된다', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: NavItemWithKeywords[] = [
        makeNavItem({ href: '/a', label: '메뉴 A', icon: makeIcon('icon-a') as any, keywords: ['A'] }),
        makeNavItem({ href: '/b', label: '메뉴 B', icon: makeIcon('icon-b') as any, keywords: ['B'] }),
      ];
      render(<CommandNavigationGroup navItems={items} onSelect={mockOnSelect} />);
      expect(screen.getByTestId('icon-a')).toBeInTheDocument();
      expect(screen.getByTestId('icon-b')).toBeInTheDocument();
    });
  });

  describe('항목 선택 콜백', () => {
    it('항목 클릭 시 onSelect가 해당 href와 함께 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <CommandNavigationGroup
          navItems={[makeNavItem({ href: '/ops/projects', label: '프로젝트 관리', keywords: ['프로젝트'] })]}
          onSelect={mockOnSelect}
        />,
      );

      await user.click(screen.getByRole('option'));
      expect(mockOnSelect).toHaveBeenCalledWith('/ops/projects');
    });

    it('여러 항목 중 두 번째 항목 클릭 시 두 번째 href로 호출된다', async () => {
      const user = userEvent.setup();
      const items: NavItemWithKeywords[] = [
        makeNavItem({ href: '/first', label: '첫 번째', keywords: ['first'] }),
        makeNavItem({ href: '/second', label: '두 번째', keywords: ['second'] }),
      ];
      render(<CommandNavigationGroup navItems={items} onSelect={mockOnSelect} />);

      const options = screen.getAllByRole('option');
      await user.click(options[1]);
      expect(mockOnSelect).toHaveBeenCalledWith('/second');
    });
  });
});
