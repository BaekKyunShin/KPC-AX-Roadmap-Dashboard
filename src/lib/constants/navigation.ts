import {
  FolderKanban,
  Users,
  ScrollText,
  Gauge,
  Briefcase,
  FlaskConical,
  ClipboardList,
  Home,
  Library,
  Settings,
  MessageSquare,
  UserCircle,
  Megaphone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface RoleBadgeConfig {
  label: string;
  className: string;
}

// =============================================================================
// Constants
// =============================================================================

/** 역할별 배지 스타일 설정 */
export const ROLE_BADGE_CONFIG: Record<string, RoleBadgeConfig> = {
  USER_PENDING: {
    label: '승인 대기',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  SYSTEM_ADMIN: {
    label: '시스템관리자',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  OPS_ADMIN: {
    label: '운영관리자',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  CONSULTANT_APPROVED: {
    label: '컨설턴트',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

/** 컨설턴트 메뉴 (플랫 6개) */
export const CONSULTANT_NAV_ITEMS: NavItem[] = [
  { href: '/notices', label: '공지사항', icon: Megaphone },
  { href: '/consultant/home', label: '대시보드', icon: Home },
  { href: '/consultant/projects', label: '담당 프로젝트', icon: Briefcase },
  { href: '/test-roadmap', label: '테스트 로드맵', icon: FlaskConical },
  { href: '/test-pbl', label: 'PBL 테스트', icon: FlaskConical },
  { href: '/gallery', label: '로드맵·PBL 갤러리', icon: Library },
];

/** 관리자 메뉴 (드롭다운 3그룹) — 운영관리자와 시스템관리자 동일 */
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: '워크스페이스',
    items: [
      { href: '/ops/projects', label: '프로젝트 관리', icon: FolderKanban },
      { href: '/test-roadmap', label: '테스트 로드맵', icon: FlaskConical },
      { href: '/test-pbl', label: 'PBL 테스트', icon: FlaskConical },
    ],
  },
  {
    label: '운영관리',
    items: [
      { href: '/ops/notices', label: '공지 관리', icon: Megaphone },
      { href: '/ops/users', label: '사용자 관리', icon: Users },
      { href: '/ops/quota', label: '쿼터 관리', icon: Gauge },
      { href: '/ops/audit', label: '감사로그', icon: ScrollText },
    ],
  },
  {
    label: '라이브러리',
    items: [
      { href: '/gallery', label: '로드맵·PBL 갤러리', icon: Library },
      { href: '/ops/templates', label: '자가진단 템플릿', icon: ClipboardList },
    ],
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/** 이름에서 이니셜 추출 (최대 2글자) */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** 역할에 해당하는 배지 설정 반환 */
export function getRoleBadgeConfig(role: string): RoleBadgeConfig | null {
  return ROLE_BADGE_CONFIG[role] || null;
}

/** 그룹 내 아이템 중 하나라도 현재 경로와 매칭되는지 확인 */
export function isGroupActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => pathname.startsWith(item.href));
}

// =============================================================================
// 커맨드 팔레트용 헬퍼
// =============================================================================

/** 공통 추가 메뉴 (계정 설정, 메시지) */
const COMMON_EXTRA_ITEMS: NavItem[] = [
  { href: '/dashboard/settings', label: '계정 설정', icon: Settings },
  { href: '/dashboard/messages', label: '메시지', icon: MessageSquare },
];

/** 컨설턴트 전용 추가 메뉴 */
const CONSULTANT_EXTRA_ITEMS: NavItem[] = [
  { href: '/consultant/profile', label: '프로필 관리', icon: UserCircle },
];

type CommandPaletteRole = 'CONSULTANT_APPROVED' | 'OPS_ADMIN' | 'SYSTEM_ADMIN';

/** 역할별 메뉴를 플랫 배열로 반환 */
export function getNavItemsForRole(role: CommandPaletteRole): NavItem[] {
  if (role === 'CONSULTANT_APPROVED') {
    return [
      ...CONSULTANT_NAV_ITEMS,
      ...CONSULTANT_EXTRA_ITEMS,
      ...COMMON_EXTRA_ITEMS,
    ];
  }

  // OPS_ADMIN, SYSTEM_ADMIN
  const groupItems = ADMIN_NAV_GROUPS.flatMap((group) => group.items);
  return [...groupItems, ...COMMON_EXTRA_ITEMS];
}

export interface NavItemWithKeywords extends NavItem {
  keywords: string[];
}

/** NavItem에 label 키워드를 추가하는 헬퍼 */
function withLabelKeyword(item: NavItem): NavItemWithKeywords {
  return { ...item, keywords: [item.label] };
}

/** 그룹명도 검색 키워드에 포함한 아이템 배열 반환 */
export function getNavItemsWithKeywords(
  role: CommandPaletteRole,
): NavItemWithKeywords[] {
  if (role === 'CONSULTANT_APPROVED') {
    return getNavItemsForRole(role).map(withLabelKeyword);
  }

  // OPS_ADMIN, SYSTEM_ADMIN — 그룹명을 키워드에 포함
  const groupItems: NavItemWithKeywords[] = ADMIN_NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      keywords: [item.label, group.label],
    })),
  );

  return [...groupItems, ...COMMON_EXTRA_ITEMS.map(withLabelKeyword)];
}
