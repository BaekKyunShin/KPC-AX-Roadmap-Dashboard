import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockHandleSelect = vi.fn();
const mockSetOpen = vi.fn();
const mockSetQuery = vi.fn();
const mockHandleOpenChange = vi.fn();

// Radix 모킹 — cmdk가 mocked이므로 Radix Dialog context 없이 동작하도록 처리
vi.mock('@radix-ui/react-dialog', async () => {
  const React = await import('react');
  return {
    DialogTitle: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('h2', props, children),
    DialogDescription: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('p', props, children),
  };
});

vi.mock('@radix-ui/react-visually-hidden', async () => {
  const React = await import('react');
  return {
    VisuallyHidden: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
      React.createElement('span', props, children),
  };
});

// cmdk 모킹 — Command.Dialog를 간단한 div로 대체
vi.mock('cmdk', async () => {
  const React = await import('react');

  function CommandRoot({
    children,
    filter: _filter,
    ...props
  }: {
    children: React.ReactNode;
    filter?: unknown;
    label?: string;
    loop?: boolean;
    shouldFilter?: boolean;
    [key: string]: unknown;
  }) {
    return React.createElement('div', { 'data-testid': 'cmdk-root', ...props }, children);
  }

  function Dialog({
    children,
    open,
    onOpenChange: _onOpenChange,
    filter: _filter,
    ...props
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    filter?: unknown;
    label?: string;
    loop?: boolean;
    shouldFilter?: boolean;
    overlayClassName?: string;
    contentClassName?: string;
    [key: string]: unknown;
  }) {
    if (!open) return null;
    return React.createElement('div', { 'data-testid': 'cmdk-dialog', role: 'dialog', ...props }, children);
  }

  function Input(props: Record<string, unknown>) {
    return React.createElement('input', {
      'data-testid': 'cmdk-input',
      ...props,
    });
  }

  function List({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) {
    return React.createElement('div', { 'data-testid': 'cmdk-list', ...props }, children);
  }

  function Empty({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) {
    return React.createElement('div', { 'data-testid': 'cmdk-empty', ...props }, children);
  }

  function Group({
    children,
    heading,
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

  function Separator(props: Record<string, unknown>) {
    return React.createElement('hr', { 'data-testid': 'cmdk-separator', ...props });
  }

  function Loading({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) {
    return React.createElement('div', { 'data-testid': 'cmdk-loading', ...props }, children);
  }

  // Command + subcomponents
  CommandRoot.Dialog = Dialog;
  CommandRoot.Input = Input;
  CommandRoot.List = List;
  CommandRoot.Empty = Empty;
  CommandRoot.Group = Group;
  CommandRoot.Item = Item;
  CommandRoot.Separator = Separator;
  CommandRoot.Loading = Loading;

  return {
    Command: CommandRoot,
    CommandDialog: Dialog,
    CommandInput: Input,
    CommandList: List,
    CommandEmpty: Empty,
    CommandGroup: Group,
    CommandItem: Item,
    CommandSeparator: Separator,
    CommandLoading: Loading,
    default: CommandRoot,
  };
});

// navigation 모킹
vi.mock('@/lib/constants/navigation', () => ({
  getNavItemsWithKeywords: (role: string) => {
    if (role === 'CONSULTANT_APPROVED') {
      return [
        { href: '/consultant/home', label: '대시보드', icon: () => null, keywords: ['대시보드'] },
        { href: '/consultant/projects', label: '담당 프로젝트', icon: () => null, keywords: ['담당 프로젝트'] },
        { href: '/gallery', label: '로드맵 갤러리', icon: () => null, keywords: ['로드맵 갤러리'] },
      ];
    }
    return [
      { href: '/ops/projects', label: '프로젝트 관리', icon: () => null, keywords: ['프로젝트 관리', '워크스페이스'] },
      { href: '/ops/users', label: '사용자 관리', icon: () => null, keywords: ['사용자 관리', '운영관리'] },
      { href: '/gallery', label: '로드맵 갤러리', icon: () => null, keywords: ['로드맵 갤러리', '라이브러리'] },
    ];
  },
}));

// fuzzyMatch 모킹
vi.mock('@/lib/utils/fuzzy-match', () => ({
  fuzzyMatch: (query: string, target: string) => {
    if (!query) return 1;
    return target.toLowerCase().includes(query.toLowerCase()) ? 1 : 0;
  },
}));

// lucide-react 아이콘 모킹
vi.mock('lucide-react', () => ({
  Search: (props: Record<string, unknown>) => <span data-testid="icon-search" {...props} />,
  Clock: (props: Record<string, unknown>) => <span data-testid="icon-clock" {...props} />,
  ArrowRight: (props: Record<string, unknown>) => <span data-testid="icon-arrow-right" {...props} />,
  Loader2: (props: Record<string, unknown>) => <span data-testid="icon-loader" {...props} />,
  FolderKanban: (props: Record<string, unknown>) => <span data-testid="icon-folder" {...props} />,
  Users: (props: Record<string, unknown>) => <span data-testid="icon-users" {...props} />,
  Library: (props: Record<string, unknown>) => <span data-testid="icon-library" {...props} />,
  CornerDownLeft: (props: Record<string, unknown>) => <span data-testid="icon-enter" {...props} />,
}));

// ─── Import (mocks must be before import) ───────────────────────────────────

import CommandPalette from './CommandPalette';

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderPalette(overrides: Record<string, unknown> = {}) {
  const defaultProps = {
    userRole: 'OPS_ADMIN' as const,
    open: true,
    setOpen: mockSetOpen,
    query: '',
    setQuery: mockSetQuery,
    dbResults: null,
    isSearching: false,
    handleSelect: mockHandleSelect,
    handleOpenChange: mockHandleOpenChange,
    recentVisits: [],
  };

  return render(<CommandPalette {...defaultProps} {...overrides} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('열림/닫힘', () => {
    it('open=true일 때 다이얼로그가 표시된다', () => {
      renderPalette({ open: true });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('open=false일 때 다이얼로그가 렌더링되지 않는다', () => {
      renderPalette({ open: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('빈 상태 (query 없음)', () => {
    it('최근 방문이 있으면 최근 방문 그룹이 표시된다', () => {
      renderPalette({
        recentVisits: [
          { href: '/ops/projects', label: '프로젝트 관리', visitedAt: Date.now() },
          { href: '/ops/users', label: '사용자 관리', visitedAt: Date.now() - 1000 },
        ],
      });

      expect(screen.getByText('최근 방문')).toBeInTheDocument();
      // 최근 방문 + 바로가기에 모두 표시되므로 2개씩 존재
      expect(screen.getAllByText('프로젝트 관리')).toHaveLength(2);
      expect(screen.getAllByText('사용자 관리')).toHaveLength(2);
    });

    it('바로가기 그룹이 표시된다', () => {
      renderPalette();
      expect(screen.getByText('바로가기')).toBeInTheDocument();
    });

    it('검색 입력 필드가 표시된다', () => {
      renderPalette();
      expect(screen.getByTestId('cmdk-input')).toBeInTheDocument();
    });
  });

  describe('바로가기 (역할별)', () => {
    it('관리자는 관리자용 메뉴가 표시된다', () => {
      renderPalette({ userRole: 'OPS_ADMIN' });
      expect(screen.getByText('프로젝트 관리')).toBeInTheDocument();
      expect(screen.getByText('사용자 관리')).toBeInTheDocument();
    });

    it('컨설턴트는 컨설턴트용 메뉴가 표시된다', () => {
      renderPalette({ userRole: 'CONSULTANT_APPROVED' });
      expect(screen.getByText('대시보드')).toBeInTheDocument();
      expect(screen.getByText('담당 프로젝트')).toBeInTheDocument();
    });
  });

  describe('항목 선택', () => {
    it('바로가기 항목 클릭 시 handleSelect가 호출된다', async () => {
      const user = userEvent.setup();
      renderPalette({ userRole: 'OPS_ADMIN' });

      const items = screen.getAllByTestId('cmdk-item');
      const projectItem = items.find((item) => item.textContent?.includes('프로젝트 관리'));
      expect(projectItem).toBeTruthy();

      await user.click(projectItem!);
      expect(mockHandleSelect).toHaveBeenCalledWith('/ops/projects');
    });
  });

  describe('DB 검색 결과', () => {
    it('검색 중일 때 로딩 표시가 나타난다', () => {
      renderPalette({
        query: '테스트',
        isSearching: true,
      });

      expect(screen.getByText('검색 중...')).toBeInTheDocument();
    });

    it('DB 결과가 있으면 카테고리별로 표시된다', () => {
      renderPalette({
        query: '테스트',
        dbResults: {
          projects: [
            { id: 'p1', label: 'ABC 기업', href: '/ops/projects/p1', category: 'project', description: 'IT · DIAGNOSED' },
          ],
          users: [
            { id: 'u1', label: '홍길동', href: '/ops/users', category: 'user', description: 'hong@test.com · OPS_ADMIN' },
          ],
          gallery: [],
        },
      });

      expect(screen.getByText('프로젝트')).toBeInTheDocument();
      expect(screen.getByText('ABC 기업')).toBeInTheDocument();
      expect(screen.getByText('사용자')).toBeInTheDocument();
      expect(screen.getByText('홍길동')).toBeInTheDocument();
    });

    it('DB 결과 항목 클릭 시 handleSelect가 호출된다', async () => {
      const user = userEvent.setup();
      renderPalette({
        query: '테스트',
        dbResults: {
          projects: [
            { id: 'p1', label: 'ABC 기업', href: '/ops/projects/p1', category: 'project', description: 'IT · DIAGNOSED' },
          ],
          users: [],
          gallery: [],
        },
      });

      const items = screen.getAllByTestId('cmdk-item');
      const projectItem = items.find((item) => item.textContent?.includes('ABC 기업'));
      await user.click(projectItem!);

      expect(mockHandleSelect).toHaveBeenCalledWith('/ops/projects/p1');
    });

    it('DB 결과가 있으면 "검색 결과가 없습니다" 메시지가 표시되지 않는다', () => {
      renderPalette({
        query: '현대',
        dbResults: {
          projects: [
            { id: 'p1', label: '현대엔지니어링', href: '/ops/projects/p1', category: 'project', description: '제조업 · ROADMAP_DRAFTED' },
          ],
          users: [],
          gallery: [],
        },
      });

      expect(screen.queryByText('검색 결과가 없습니다')).not.toBeInTheDocument();
      expect(screen.getByText('현대엔지니어링')).toBeInTheDocument();
    });

    it('검색 중일 때 "검색 결과가 없습니다" 메시지가 표시되지 않는다', () => {
      renderPalette({
        query: '현대',
        isSearching: true,
      });

      expect(screen.queryByText('검색 결과가 없습니다')).not.toBeInTheDocument();
      expect(screen.getByText('검색 중...')).toBeInTheDocument();
    });

    it('빈 카테고리는 표시되지 않는다', () => {
      renderPalette({
        query: '테스트',
        dbResults: {
          projects: [],
          users: [],
          gallery: [
            { id: 'g1', label: '갤러리 항목', href: '/gallery/g1', category: 'gallery', description: 'FINAL · 공유' },
          ],
        },
      });

      expect(screen.queryByText('프로젝트')).not.toBeInTheDocument();
      expect(screen.queryByText('사용자')).not.toBeInTheDocument();
      expect(screen.getByText('갤러리')).toBeInTheDocument();
    });
  });

  describe('하단 힌트 바', () => {
    it('키보드 힌트가 표시된다', () => {
      renderPalette();
      expect(screen.getByText('탐색')).toBeInTheDocument();
      expect(screen.getByText('이동')).toBeInTheDocument();
    });
  });
});
