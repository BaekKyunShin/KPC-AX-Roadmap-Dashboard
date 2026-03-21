import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// cmdk 모킹 — CommandPalette.test.tsx와 동일한 패턴 사용
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
    forceMount: _forceMount,
    ...props
  }: {
    children: React.ReactNode;
    heading?: React.ReactNode;
    forceMount?: boolean;
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
    forceMount: _forceMount,
    ...props
  }: {
    children: React.ReactNode;
    onSelect?: (value: string) => void;
    value?: string;
    keywords?: string[];
    forceMount?: boolean;
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

// lucide-react 아이콘 모킹
vi.mock('lucide-react', () => ({
  FolderKanban: (props: Record<string, unknown>) => (
    <span data-testid="icon-folder-kanban" {...props} />
  ),
  Users: (props: Record<string, unknown>) => <span data-testid="icon-users" {...props} />,
  Library: (props: Record<string, unknown>) => <span data-testid="icon-library" {...props} />,
  Loader2: (props: Record<string, unknown>) => <span data-testid="icon-loader2" {...props} />,
}));

// ─── Import ──────────────────────────────────────────────────────────────────

import CommandSearchResults from './CommandSearchResults';
import type { SearchResults } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockOnSelect = vi.fn();

function makeSearchResults(overrides: Partial<SearchResults> = {}): SearchResults {
  return {
    projects: [],
    users: [],
    gallery: [],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CommandSearchResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('검색 중 상태 (isSearching=true)', () => {
    it('isSearching=true일 때 "검색 중..." 텍스트를 표시한다', () => {
      render(
        <CommandSearchResults
          dbResults={null}
          isSearching={true}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('검색 중...')).toBeInTheDocument();
    });

    it('isSearching=true일 때 로딩 스피너 아이콘이 렌더링된다', () => {
      render(
        <CommandSearchResults
          dbResults={null}
          isSearching={true}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByTestId('icon-loader2')).toBeInTheDocument();
    });

    it('isSearching=true일 때 결과 그룹을 렌더링하지 않는다', () => {
      render(
        <CommandSearchResults
          dbResults={makeSearchResults({
            projects: [
              { id: 'p1', label: '테스트 프로젝트', href: '/ops/projects/p1', category: 'project' },
            ],
          })}
          isSearching={true}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.queryByTestId('cmdk-group')).not.toBeInTheDocument();
    });
  });

  describe('dbResults=null 상태', () => {
    it('isSearching=false이고 dbResults=null이면 아무것도 렌더링하지 않는다', () => {
      const { container } = render(
        <CommandSearchResults
          dbResults={null}
          isSearching={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('결과 없음 상태', () => {
    it('모든 카테고리가 비어있으면 그룹이 렌더링되지 않는다', () => {
      render(
        <CommandSearchResults
          dbResults={makeSearchResults()}
          isSearching={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.queryByTestId('cmdk-group')).not.toBeInTheDocument();
    });
  });

  describe('카테고리별 결과 렌더링', () => {
    it('projects 결과가 있으면 "프로젝트" 그룹 헤딩이 표시된다', () => {
      render(
        <CommandSearchResults
          dbResults={makeSearchResults({
            projects: [
              { id: 'p1', label: 'ABC 기업', href: '/ops/projects/p1', category: 'project' },
            ],
          })}
          isSearching={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('프로젝트')).toBeInTheDocument();
    });

    it('users 결과가 있으면 "사용자" 그룹 헤딩이 표시된다', () => {
      render(
        <CommandSearchResults
          dbResults={makeSearchResults({
            users: [{ id: 'u1', label: '홍길동', href: '/ops/users', category: 'user' }],
          })}
          isSearching={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('사용자')).toBeInTheDocument();
    });

    it('gallery 결과가 있으면 "갤러리" 그룹 헤딩이 표시된다', () => {
      render(
        <CommandSearchResults
          dbResults={makeSearchResults({
            gallery: [
              { id: 'g1', label: '갤러리 항목', href: '/gallery/g1', category: 'gallery' },
            ],
          })}
          isSearching={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('갤러리')).toBeInTheDocument();
    });

    it('여러 카테고리에 결과가 있으면 모두 렌더링된다', () => {
      render(
        <CommandSearchResults
          dbResults={makeSearchResults({
            projects: [
              { id: 'p1', label: 'ABC 기업', href: '/ops/projects/p1', category: 'project' },
            ],
            users: [{ id: 'u1', label: '홍길동', href: '/ops/users', category: 'user' }],
            gallery: [
              { id: 'g1', label: '갤러리 항목', href: '/gallery/g1', category: 'gallery' },
            ],
          })}
          isSearching={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('프로젝트')).toBeInTheDocument();
      expect(screen.getByText('사용자')).toBeInTheDocument();
      expect(screen.getByText('갤러리')).toBeInTheDocument();
    });

    it('항목 레이블이 렌더링된다', () => {
      render(
        <CommandSearchResults
          dbResults={makeSearchResults({
            projects: [
              { id: 'p1', label: 'ABC 기업', href: '/ops/projects/p1', category: 'project' },
            ],
          })}
          isSearching={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('ABC 기업')).toBeInTheDocument();
    });

    it('description이 있으면 설명 텍스트도 렌더링된다', () => {
      render(
        <CommandSearchResults
          dbResults={makeSearchResults({
            projects: [
              {
                id: 'p1',
                label: 'ABC 기업',
                href: '/ops/projects/p1',
                category: 'project',
                description: 'IT · DIAGNOSED',
              },
            ],
          })}
          isSearching={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.getByText('IT · DIAGNOSED')).toBeInTheDocument();
    });

    it('description이 없으면 설명 텍스트가 없다', () => {
      render(
        <CommandSearchResults
          dbResults={makeSearchResults({
            projects: [
              { id: 'p1', label: 'ABC 기업', href: '/ops/projects/p1', category: 'project' },
            ],
          })}
          isSearching={false}
          onSelect={mockOnSelect}
        />,
      );
      // description이 없는 경우 설명 영역이 없어야 함
      expect(screen.queryByText('IT · DIAGNOSED')).not.toBeInTheDocument();
    });

    it('빈 카테고리는 그룹을 렌더링하지 않는다', () => {
      render(
        <CommandSearchResults
          dbResults={makeSearchResults({
            projects: [],
            users: [],
            gallery: [
              { id: 'g1', label: '갤러리 항목', href: '/gallery/g1', category: 'gallery' },
            ],
          })}
          isSearching={false}
          onSelect={mockOnSelect}
        />,
      );
      expect(screen.queryByText('프로젝트')).not.toBeInTheDocument();
      expect(screen.queryByText('사용자')).not.toBeInTheDocument();
      expect(screen.getByText('갤러리')).toBeInTheDocument();
    });
  });

  describe('항목 선택 콜백', () => {
    it('항목 클릭 시 onSelect가 해당 href와 함께 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <CommandSearchResults
          dbResults={makeSearchResults({
            projects: [
              { id: 'p1', label: 'ABC 기업', href: '/ops/projects/p1', category: 'project' },
            ],
          })}
          isSearching={false}
          onSelect={mockOnSelect}
        />,
      );

      const item = screen.getByRole('option');
      await user.click(item);

      expect(mockOnSelect).toHaveBeenCalledWith('/ops/projects/p1');
    });

    it('여러 항목이 있을 때 클릭한 항목의 href로만 호출된다', async () => {
      const user = userEvent.setup();
      render(
        <CommandSearchResults
          dbResults={makeSearchResults({
            projects: [
              { id: 'p1', label: 'ABC 기업', href: '/ops/projects/p1', category: 'project' },
              { id: 'p2', label: 'XYZ 기업', href: '/ops/projects/p2', category: 'project' },
            ],
          })}
          isSearching={false}
          onSelect={mockOnSelect}
        />,
      );

      const items = screen.getAllByRole('option');
      await user.click(items[1]);

      expect(mockOnSelect).toHaveBeenCalledWith('/ops/projects/p2');
    });
  });
});
