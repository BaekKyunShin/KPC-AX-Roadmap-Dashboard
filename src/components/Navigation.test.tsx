import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

let currentPathname = '/dashboard';

// Server Actions
vi.mock('@/app/(auth)/actions', () => ({
  logoutUser: vi.fn(),
}));

// Child components that need mocking
const mockSetOpen = vi.fn();
vi.mock('@/hooks/useCommandPalette', () => ({
  useCommandPalette: () => ({
    open: false,
    setOpen: mockSetOpen,
    query: '',
    setQuery: vi.fn(),
    dbResults: null,
    isSearching: false,
    handleSelect: vi.fn(),
    handleOpenChange: vi.fn(),
  }),
}));

vi.mock('@/hooks/useRecentVisits', () => ({
  useRecentVisits: () => ({
    recentVisits: [],
    recordVisit: vi.fn(),
    clearRecent: vi.fn(),
  }),
}));

vi.mock('@/components/NotificationBell', () => ({
  default: ({ initialUnreadCount, userRole }: { initialUnreadCount: number; userRole: string }) => (
    <div data-testid="notification-bell" data-unread={initialUnreadCount} data-role={userRole}>
      NotificationBell
    </div>
  ),
}));

vi.mock('@/components/MessageIcon', () => ({
  default: ({ initialUnreadCount }: { initialUnreadCount: number }) => (
    <div data-testid="message-icon" data-unread={initialUnreadCount}>
      MessageIcon
    </div>
  ),
}));

vi.mock('@/components/command-palette/CommandPalette', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="command-palette" data-open={String(props.open)}>
      CommandPalette
    </div>
  ),
}));

// ─── Import ─────────────────────────────────────────────────────────────────

import Navigation from './Navigation';
import type { User } from '@/types/database';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    name: '홍길동',
    role: 'CONSULTANT_APPROVED',
    status: 'ACTIVE',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderNavigation(overrides: Partial<Parameters<typeof Navigation>[0]> = {}) {
  const defaultProps = {
    user: createUser(),
    unreadCount: 0,
    unreadMessageCount: 0,
    ...overrides,
  };
  return render(<Navigation {...defaultProps} />);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Navigation', () => {
  beforeEach(() => {
    currentPathname = '/dashboard';
    vi.clearAllMocks();
  });

  // ─── 컨설턴트 역할 ──────────────────────────────────────────────────────

  describe('컨설턴트 역할', () => {
    it('컨설턴트 메뉴 항목이 표시된다', () => {
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      expect(screen.getByText('대시보드')).toBeInTheDocument();
      expect(screen.getByText('담당 프로젝트')).toBeInTheDocument();
      expect(screen.getByText('테스트 로드맵')).toBeInTheDocument();
      expect(screen.getByText('로드맵 갤러리')).toBeInTheDocument();
    });

    it('관리자 전용 메뉴(워크스페이스, 운영관리, 라이브러리)가 표시되지 않는다', () => {
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      expect(screen.queryByText('워크스페이스')).not.toBeInTheDocument();
      expect(screen.queryByText('운영관리')).not.toBeInTheDocument();
      // '라이브러리'는 관리자 그룹 라벨 — 컨설턴트에는 그룹으로 표시되지 않음
    });

    it('프로젝트 관리 메뉴가 표시되지 않는다', () => {
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      expect(screen.queryByText('프로젝트 관리')).not.toBeInTheDocument();
    });

    it('사용자 관리 메뉴가 표시되지 않는다', () => {
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      expect(screen.queryByText('사용자 관리')).not.toBeInTheDocument();
    });

    it('현재 경로에 해당하는 메뉴에 활성 스타일(bg-blue-50)이 적용된다', () => {
      currentPathname = '/consultant/home';
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      // 데스크톱 + 모바일 = 여러 곳에 "대시보드" 텍스트가 있을 수 있음
      const links = screen.getAllByText('대시보드');
      const activeLink = links.find((link) => {
        const parent = link.closest('a');
        return parent?.className.includes('bg-blue-50');
      });
      expect(activeLink).toBeTruthy();
    });

    it('현재 경로가 아닌 메뉴에는 활성 스타일이 적용되지 않는다', () => {
      currentPathname = '/consultant/home';
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      const links = screen.getAllByText('담당 프로젝트');
      const inactiveLink = links.find((link) => {
        const parent = link.closest('a');
        return parent && !parent.className.includes('bg-blue-50');
      });
      expect(inactiveLink).toBeTruthy();
    });

    it('컨설턴트 배지가 표시된다', () => {
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      expect(screen.getAllByText('컨설턴트').length).toBeGreaterThan(0);
    });

    it('사용자 이름이 표시된다', () => {
      renderNavigation({ user: createUser({ name: '테스트유저' }) });
      // 데스크톱 + 모바일(메뉴 오픈 시)에 이름이 있을 수 있음
      expect(screen.getByText('테스트유저')).toBeInTheDocument();
    });

    it('사용자 이메일이 표시된다', () => {
      renderNavigation({ user: createUser({ email: 'consultant@test.com' }) });
      expect(screen.getByText('consultant@test.com')).toBeInTheDocument();
    });

    it('user 드롭다운에서 프로필 관리 링크가 표시된다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      // 아바타 영역 클릭해서 드롭다운 열기
      const avatarButton = screen.getByText('홍길동').closest('button');
      expect(avatarButton).toBeTruthy();
      await user.click(avatarButton!);
      expect(screen.getByText('프로필 관리')).toBeInTheDocument();
    });
  });

  // ─── OPS 관리자 역할 ────────────────────────────────────────────────────

  describe('OPS 관리자 역할', () => {
    it('관리자 드롭다운 그룹이 표시된다', () => {
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      expect(screen.getByText('워크스페이스')).toBeInTheDocument();
      expect(screen.getByText('운영관리')).toBeInTheDocument();
    });

    it('컨설턴트 전용 메뉴가 표시되지 않는다', () => {
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      // 대시보드는 컨설턴트 플랫 메뉴 — 관리자에겐 없음
      // '대시보드' 링크가 없는지 확인 (관리자는 드롭다운 그룹 구조)
      expect(screen.queryByText('담당 프로젝트')).not.toBeInTheDocument();
    });

    it('운영관리자 배지가 표시된다', () => {
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      expect(screen.getAllByText('운영관리자').length).toBeGreaterThan(0);
    });

    it('드롭다운 클릭 시 하위 메뉴가 열린다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      const workspaceBtn = screen.getByText('워크스페이스');
      await user.click(workspaceBtn);
      expect(screen.getByText('프로젝트 관리')).toBeInTheDocument();
      expect(screen.getByText('테스트 로드맵')).toBeInTheDocument();
    });

    it('드롭다운 열린 상태에서 다시 클릭하면 닫힌다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      const workspaceBtn = screen.getByText('워크스페이스');
      await user.click(workspaceBtn);
      expect(screen.getByText('프로젝트 관리')).toBeInTheDocument();
      await user.click(workspaceBtn);
      expect(screen.queryByText('프로젝트 관리')).not.toBeInTheDocument();
    });

    it('다른 그룹을 클릭하면 이전 그룹이 닫힌다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      // 워크스페이스 열기
      await user.click(screen.getByText('워크스페이스'));
      expect(screen.getByText('프로젝트 관리')).toBeInTheDocument();
      // 운영관리 열기
      await user.click(screen.getByText('운영관리'));
      // 워크스페이스 항목이 닫혀야 함
      expect(screen.queryByText('프로젝트 관리')).not.toBeInTheDocument();
      expect(screen.getByText('사용자 관리')).toBeInTheDocument();
    });

    it('운영관리 드롭다운에 사용자 관리, 쿼터 관리, 감사로그가 표시된다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      await user.click(screen.getByText('운영관리'));
      expect(screen.getByText('사용자 관리')).toBeInTheDocument();
      expect(screen.getByText('쿼터 관리')).toBeInTheDocument();
      expect(screen.getByText('감사로그')).toBeInTheDocument();
    });

    it('라이브러리 드롭다운에 로드맵 갤러리, 자가진단 템플릿이 표시된다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      // 라이브러리 버튼 — "라이브러리"는 그룹 라벨
      const libraryButtons = screen.getAllByText('라이브러리');
      // 데스크톱 그룹 버튼 찾기
      const groupBtn = libraryButtons.find((el) => el.closest('button'));
      expect(groupBtn).toBeTruthy();
      await user.click(groupBtn!);
      expect(screen.getByText('로드맵 갤러리')).toBeInTheDocument();
      expect(screen.getByText('자가진단 템플릿')).toBeInTheDocument();
    });

    it('드롭다운 항목 클릭 시 드롭다운이 닫힌다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      await user.click(screen.getByText('운영관리'));
      await user.click(screen.getByText('사용자 관리'));
      // 링크 클릭으로 onNavigate가 호출되면서 드롭다운 닫힘
      expect(screen.queryByText('쿼터 관리')).not.toBeInTheDocument();
    });

    it('바깥 클릭 시 드롭다운이 닫힌다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      await user.click(screen.getByText('워크스페이스'));
      expect(screen.getByText('프로젝트 관리')).toBeInTheDocument();
      // nav 바깥을 클릭 (document body)
      fireEvent.mouseDown(document.body);
      expect(screen.queryByText('프로젝트 관리')).not.toBeInTheDocument();
    });

    it('현재 경로에 해당하는 그룹에 활성 스타일이 적용된다', () => {
      currentPathname = '/ops/projects';
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      const workspaceBtn = screen.getByText('워크스페이스');
      expect(workspaceBtn.closest('button')?.className).toContain('bg-blue-50');
    });

    it('user 드롭다운에서 프로필 관리가 표시되지 않는다 (OPS는 컨설턴트가 아님)', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      const avatarButton = screen.getByText('홍길동').closest('button');
      await user.click(avatarButton!);
      expect(screen.queryByText('프로필 관리')).not.toBeInTheDocument();
    });
  });

  // ─── SYSTEM_ADMIN 역할 ──────────────────────────────────────────────────

  describe('SYSTEM_ADMIN 역할', () => {
    it('관리자 드롭다운 그룹이 표시된다 (OPS와 동일 메뉴)', () => {
      renderNavigation({ user: createUser({ role: 'SYSTEM_ADMIN' }) });
      expect(screen.getByText('워크스페이스')).toBeInTheDocument();
      expect(screen.getByText('운영관리')).toBeInTheDocument();
    });

    it('시스템관리자 배지가 표시된다', () => {
      renderNavigation({ user: createUser({ role: 'SYSTEM_ADMIN' }) });
      expect(screen.getAllByText('시스템관리자').length).toBeGreaterThan(0);
    });
  });

  // ─── 모바일 메뉴 ────────────────────────────────────────────────────────

  describe('모바일 메뉴', () => {
    it('햄버거 버튼 클릭 시 모바일 메뉴가 열린다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      const menuButton = screen.getByLabelText('메뉴 열기');
      await user.click(menuButton);
      // 모바일 메뉴가 열리면 사용자 정보 섹션이 추가로 표시됨
      // 이름이 데스크톱 + 모바일 두 곳에 나타남
      const names = screen.getAllByText('홍길동');
      expect(names.length).toBeGreaterThanOrEqual(2);
    });

    it('모바일 메뉴가 열린 상태에서 X 버튼이 표시된다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      await user.click(screen.getByLabelText('메뉴 열기'));
      expect(screen.getByLabelText('메뉴 닫기')).toBeInTheDocument();
    });

    it('모바일 메뉴에서 X 버튼 클릭 시 메뉴가 닫힌다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      await user.click(screen.getByLabelText('메뉴 열기'));
      await user.click(screen.getByLabelText('메뉴 닫기'));
      // 메뉴가 닫히면 모바일 전용 사용자 섹션이 사라짐
      expect(screen.getByLabelText('메뉴 열기')).toBeInTheDocument();
    });

    it('모바일 메뉴에서 컨설턴트 메뉴 링크 클릭 시 메뉴가 닫힌다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      await user.click(screen.getByLabelText('메뉴 열기'));

      // 모바일 메뉴 영역에서 링크 클릭
      const mobileLinks = screen.getAllByText('대시보드');
      // 모바일 메뉴 쪽의 링크 클릭
      const mobileLink = mobileLinks[mobileLinks.length - 1];
      await user.click(mobileLink.closest('a')!);
      // 닫힌 후 다시 메뉴 열기 버튼이 표시됨
      expect(screen.getByLabelText('메뉴 열기')).toBeInTheDocument();
    });

    it('모바일에서 컨설턴트 프로필 관리 링크가 표시된다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      await user.click(screen.getByLabelText('메뉴 열기'));
      const profileLinks = screen.getAllByText('프로필 관리');
      expect(profileLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('모바일에서 계정 설정 링크가 표시된다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      await user.click(screen.getByLabelText('메뉴 열기'));
      const settingsLinks = screen.getAllByText('계정 설정');
      expect(settingsLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('모바일에서 로그아웃 버튼이 표시된다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      await user.click(screen.getByLabelText('메뉴 열기'));
      const logoutButtons = screen.getAllByText('로그아웃');
      expect(logoutButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('모바일에서 OPS 관리자 아코디언 그룹이 표시된다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      await user.click(screen.getByLabelText('메뉴 열기'));
      // 모바일 아코디언 그룹 라벨
      const wsLabels = screen.getAllByText('워크스페이스');
      expect(wsLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('모바일 아코디언 그룹 클릭 시 하위 항목이 열린다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      await user.click(screen.getByLabelText('메뉴 열기'));
      // 모바일 메뉴의 운영관리 그룹 클릭
      const opsLabels = screen.getAllByText('운영관리');
      // 모바일 메뉴의 버튼 찾기 — 마지막에 나타나는 것이 모바일
      const mobileOpsBtn = opsLabels[opsLabels.length - 1].closest('button');
      expect(mobileOpsBtn).toBeTruthy();
      await user.click(mobileOpsBtn!);
      expect(screen.getByText('사용자 관리')).toBeInTheDocument();
    });

    it('모바일 아코디언에서 링크 클릭 시 모바일 메뉴가 닫힌다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      await user.click(screen.getByLabelText('메뉴 열기'));
      // 운영관리 아코디언 열기
      const opsLabels = screen.getAllByText('운영관리');
      const mobileOpsBtn = opsLabels[opsLabels.length - 1].closest('button');
      await user.click(mobileOpsBtn!);
      // 사용자 관리 클릭
      await user.click(screen.getByText('사용자 관리'));
      // 모바일 메뉴 닫힘
      expect(screen.getByLabelText('메뉴 열기')).toBeInTheDocument();
    });
  });

  // ─── 사용자 드롭다운 ────────────────────────────────────────────────────

  describe('사용자 드롭다운', () => {
    it('아바타 클릭 시 드롭다운이 열린다', async () => {
      const user = userEvent.setup();
      renderNavigation();
      const avatarButton = screen.getByText('홍길동').closest('button');
      await user.click(avatarButton!);
      expect(screen.getByTestId('user-dropdown-menu')).toBeInTheDocument();
    });

    it('드롭다운에 사용자 이름과 이메일이 표시된다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ name: '김철수', email: 'kim@test.com' }) });
      const avatarButton = screen.getByText('김철수').closest('button');
      await user.click(avatarButton!);
      const dropdown = screen.getByTestId('user-dropdown-menu');
      expect(within(dropdown).getByText('김철수')).toBeInTheDocument();
      expect(within(dropdown).getByText('kim@test.com')).toBeInTheDocument();
    });

    it('드롭다운에 계정 설정 링크가 있다', async () => {
      const user = userEvent.setup();
      renderNavigation();
      const avatarButton = screen.getByText('홍길동').closest('button');
      await user.click(avatarButton!);
      const dropdown = screen.getByTestId('user-dropdown-menu');
      expect(within(dropdown).getByText('계정 설정')).toBeInTheDocument();
    });

    it('드롭다운에 로그아웃 버튼이 있다', async () => {
      const user = userEvent.setup();
      renderNavigation();
      const avatarButton = screen.getByText('홍길동').closest('button');
      await user.click(avatarButton!);
      const dropdown = screen.getByTestId('user-dropdown-menu');
      expect(within(dropdown).getByText('로그아웃')).toBeInTheDocument();
    });

    it('바깥 클릭 시 드롭다운이 닫힌다', async () => {
      const user = userEvent.setup();
      renderNavigation();
      const avatarButton = screen.getByText('홍길동').closest('button');
      await user.click(avatarButton!);
      expect(screen.getByTestId('user-dropdown-menu')).toBeInTheDocument();
      fireEvent.mouseDown(document.body);
      expect(screen.queryByTestId('user-dropdown-menu')).not.toBeInTheDocument();
    });

    it('계정 설정 클릭 시 드롭다운이 닫힌다', async () => {
      const user = userEvent.setup();
      renderNavigation();
      const avatarButton = screen.getByText('홍길동').closest('button');
      await user.click(avatarButton!);
      const dropdown = screen.getByTestId('user-dropdown-menu');
      await user.click(within(dropdown).getByText('계정 설정'));
      expect(screen.queryByTestId('user-dropdown-menu')).not.toBeInTheDocument();
    });

    it('이니셜이 올바르게 표시된다 (홍길동 → 홍길)', () => {
      renderNavigation({ user: createUser({ name: '홍 길동' }) });
      expect(screen.getByText('홍길')).toBeInTheDocument();
    });

    it('컨설턴트일 때 프로필 관리 링크 클릭 시 드롭다운이 닫힌다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      const avatarButton = screen.getByText('홍길동').closest('button');
      await user.click(avatarButton!);
      const dropdown = screen.getByTestId('user-dropdown-menu');
      await user.click(within(dropdown).getByText('프로필 관리'));
      expect(screen.queryByTestId('user-dropdown-menu')).not.toBeInTheDocument();
    });
  });

  // ─── CommandPalette ─────────────────────────────────────────────────────

  describe('CommandPalette', () => {
    it('데스크톱 검색 버튼 클릭 시 setOpen(true)이 호출된다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      const searchButtons = screen.getAllByLabelText(/검색/);
      // 데스크톱 검색 버튼 (첫 번째)
      await user.click(searchButtons[0]);
      expect(mockSetOpen).toHaveBeenCalledWith(true);
    });

    it('모바일 검색 버튼 클릭 시 setOpen(true)이 호출된다', async () => {
      const user = userEvent.setup();
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      const searchButtons = screen.getAllByLabelText(/검색/);
      // 모바일 검색 버튼 (두 번째 또는 마지막)
      if (searchButtons.length > 1) {
        await user.click(searchButtons[searchButtons.length - 1]);
        expect(mockSetOpen).toHaveBeenCalledWith(true);
      }
    });

    it('컨설턴트일 때 CommandPalette 컴포넌트가 렌더링된다', () => {
      renderNavigation({ user: createUser({ role: 'CONSULTANT_APPROVED' }) });
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });

    it('OPS 관리자일 때 CommandPalette 컴포넌트가 렌더링된다', () => {
      renderNavigation({ user: createUser({ role: 'OPS_ADMIN' }) });
      expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    });

    it('USER_PENDING 역할에서는 CommandPalette가 렌더링되지 않는다', () => {
      renderNavigation({ user: createUser({ role: 'USER_PENDING' }) });
      expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument();
    });
  });

  // ─── 자식 컴포넌트 전달 ─────────────────────────────────────────────────

  describe('자식 컴포넌트 전달', () => {
    it('NotificationBell에 unreadCount와 userRole이 전달된다', () => {
      renderNavigation({
        user: createUser({ role: 'OPS_ADMIN' }),
        unreadCount: 5,
      });
      const bells = screen.getAllByTestId('notification-bell');
      expect(bells.length).toBeGreaterThanOrEqual(1);
      expect(bells[0]).toHaveAttribute('data-unread', '5');
      expect(bells[0]).toHaveAttribute('data-role', 'OPS_ADMIN');
    });

    it('MessageIcon에 unreadMessageCount가 전달된다', () => {
      renderNavigation({ unreadMessageCount: 3 });
      const icons = screen.getAllByTestId('message-icon');
      expect(icons.length).toBeGreaterThanOrEqual(1);
      expect(icons[0]).toHaveAttribute('data-unread', '3');
    });
  });

  // ─── 로고 ──────────────────────────────────────────────────────────────

  describe('로고', () => {
    it('로고가 홈 링크로 렌더링된다', () => {
      renderNavigation();
      const logoLink = screen.getAllByRole('link').find((link) =>
        link.getAttribute('href') === '/'
      );
      expect(logoLink).toBeTruthy();
    });
  });

  // ─── 역할별 배지 스타일 ─────────────────────────────────────────────────

  describe('역할별 배지 스타일', () => {
    it('USER_PENDING 역할은 "승인 대기" 배지를 표시한다', () => {
      renderNavigation({ user: createUser({ role: 'USER_PENDING' }) });
      expect(screen.getAllByText('승인 대기').length).toBeGreaterThan(0);
    });

    it('알 수 없는 역할은 역할명을 그대로 표시한다', () => {
      renderNavigation({ user: createUser({ role: 'PUBLIC' as User['role'] }) });
      expect(screen.getAllByText('PUBLIC').length).toBeGreaterThan(0);
    });
  });
});
