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
    ...props
  }: {
    children: React.ReactNode;
    onSelect?: (value: string) => void;
    value?: string;
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

vi.mock('lucide-react', () => ({
  Clock: (props: Record<string, unknown>) => <span data-testid="icon-clock" {...props} />,
}));

// ─── Import ──────────────────────────────────────────────────────────────────

import CommandRecentGroup from './CommandRecentGroup';
import type { RecentVisit } from './types';

// ─── Tests ───────────────────────────────────────────────────────────────────

const mockOnSelect = vi.fn();

describe('CommandRecentGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('빈 배열인 경우', () => {
    it('recentVisits가 빈 배열이면 아무것도 렌더링하지 않는다', () => {
      const { container } = render(
        <CommandRecentGroup recentVisits={[]} onSelect={mockOnSelect} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('recentVisits가 빈 배열이면 "최근 방문" 헤딩이 표시되지 않는다', () => {
      render(<CommandRecentGroup recentVisits={[]} onSelect={mockOnSelect} />);
      expect(screen.queryByText('최근 방문')).not.toBeInTheDocument();
    });

    it('recentVisits가 빈 배열이면 cmdk-group이 렌더링되지 않는다', () => {
      render(<CommandRecentGroup recentVisits={[]} onSelect={mockOnSelect} />);
      expect(screen.queryByTestId('cmdk-group')).not.toBeInTheDocument();
    });
  });

  describe('채워진 배열인 경우', () => {
    const sampleVisits: RecentVisit[] = [
      { href: '/ops/projects', label: '프로젝트 관리', visitedAt: Date.now() - 1000 },
      { href: '/ops/users', label: '사용자 관리', visitedAt: Date.now() - 2000 },
    ];

    it('"최근 방문" 그룹 헤딩이 표시된다', () => {
      render(<CommandRecentGroup recentVisits={sampleVisits} onSelect={mockOnSelect} />);
      expect(screen.getByText('최근 방문')).toBeInTheDocument();
    });

    it('방문 항목의 레이블이 렌더링된다', () => {
      render(<CommandRecentGroup recentVisits={sampleVisits} onSelect={mockOnSelect} />);
      expect(screen.getByText('프로젝트 관리')).toBeInTheDocument();
      expect(screen.getByText('사용자 관리')).toBeInTheDocument();
    });

    it('항목 수만큼 cmdk-item이 렌더링된다', () => {
      render(<CommandRecentGroup recentVisits={sampleVisits} onSelect={mockOnSelect} />);
      expect(screen.getAllByTestId('cmdk-item')).toHaveLength(2);
    });

    it('각 항목에 Clock 아이콘이 렌더링된다', () => {
      render(<CommandRecentGroup recentVisits={sampleVisits} onSelect={mockOnSelect} />);
      expect(screen.getAllByTestId('icon-clock')).toHaveLength(2);
    });

    it('1개의 방문 항목도 올바르게 렌더링된다', () => {
      const singleVisit: RecentVisit[] = [
        { href: '/gallery', label: '로드맵 갤러리', visitedAt: Date.now() },
      ];
      render(<CommandRecentGroup recentVisits={singleVisit} onSelect={mockOnSelect} />);
      expect(screen.getByText('로드맵 갤러리')).toBeInTheDocument();
      expect(screen.getAllByTestId('cmdk-item')).toHaveLength(1);
    });
  });

  describe('항목 선택 콜백', () => {
    it('항목 클릭 시 onSelect가 해당 href와 함께 호출된다', async () => {
      const user = userEvent.setup();
      const visits: RecentVisit[] = [
        { href: '/ops/projects', label: '프로젝트 관리', visitedAt: Date.now() },
      ];
      render(<CommandRecentGroup recentVisits={visits} onSelect={mockOnSelect} />);

      await user.click(screen.getByRole('option'));
      expect(mockOnSelect).toHaveBeenCalledWith('/ops/projects');
    });

    it('여러 항목 중 두 번째 클릭 시 두 번째 href로 호출된다', async () => {
      const user = userEvent.setup();
      const visits: RecentVisit[] = [
        { href: '/first', label: '첫 번째', visitedAt: Date.now() },
        { href: '/second', label: '두 번째', visitedAt: Date.now() - 1000 },
      ];
      render(<CommandRecentGroup recentVisits={visits} onSelect={mockOnSelect} />);

      const options = screen.getAllByRole('option');
      await user.click(options[1]);
      expect(mockOnSelect).toHaveBeenCalledWith('/second');
    });
  });
});
