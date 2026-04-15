import { describe, test, expect } from 'vitest';
import {
  CONSULTANT_NAV_ITEMS,
  ADMIN_NAV_GROUPS,
  ROLE_BADGE_CONFIG,
  getInitials,
  getRoleBadgeConfig,
  isGroupActive,
  getNavItemsForRole,
  getNavItemsWithKeywords,
} from './navigation';

// =============================================================================
// 상수 구조 검증
// =============================================================================

describe('CONSULTANT_NAV_ITEMS', () => {
  test('5개 메뉴 항목을 포함한다', () => {
    expect(CONSULTANT_NAV_ITEMS).toHaveLength(5);
  });

  test('공지사항이 맨 앞이고 이후 대시보드, 담당 프로젝트, 테스트 로드맵, 로드맵 갤러리 순서이다', () => {
    const labels = CONSULTANT_NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual([
      '공지사항',
      '대시보드',
      '담당 프로젝트',
      '테스트 로드맵',
      '로드맵 갤러리',
    ]);
  });

  test('모든 항목에 href, label, icon이 있다', () => {
    for (const item of CONSULTANT_NAV_ITEMS) {
      expect(item.href).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.icon).toBeTruthy();
    }
  });

  test('로드맵 갤러리 경로는 /gallery이다', () => {
    const gallery = CONSULTANT_NAV_ITEMS.find((item) => item.label === '로드맵 갤러리');
    expect(gallery?.href).toBe('/gallery');
  });
});

describe('ADMIN_NAV_GROUPS', () => {
  test('3개 그룹을 포함한다', () => {
    expect(ADMIN_NAV_GROUPS).toHaveLength(3);
  });

  test('워크스페이스, 운영관리, 라이브러리 순서이다', () => {
    const labels = ADMIN_NAV_GROUPS.map((group) => group.label);
    expect(labels).toEqual(['워크스페이스', '운영관리', '라이브러리']);
  });

  test('워크스페이스 그룹에 프로젝트 관리와 테스트 로드맵이 있다', () => {
    const workspace = ADMIN_NAV_GROUPS[0];
    const labels = workspace.items.map((item) => item.label);
    expect(labels).toEqual(['프로젝트 관리', '테스트 로드맵']);
  });

  test('운영관리 그룹에서 공지 관리가 상단, 이후 사용자 관리·쿼터 관리·감사로그 순이다', () => {
    const ops = ADMIN_NAV_GROUPS[1];
    const labels = ops.items.map((item) => item.label);
    expect(labels).toEqual(['공지 관리', '사용자 관리', '쿼터 관리', '감사로그']);
  });

  test('라이브러리 그룹에 로드맵 갤러리와 자가진단 템플릿이 있다', () => {
    const library = ADMIN_NAV_GROUPS[2];
    const labels = library.items.map((item) => item.label);
    expect(labels).toEqual(['로드맵 갤러리', '자가진단 템플릿']);
  });

  test('자가진단 템플릿 경로는 /ops/templates이다', () => {
    const library = ADMIN_NAV_GROUPS[2];
    const template = library.items.find((item) => item.label === '자가진단 템플릿');
    expect(template?.href).toBe('/ops/templates');
  });

  test('모든 그룹의 모든 항목에 href, label, icon이 있다', () => {
    for (const group of ADMIN_NAV_GROUPS) {
      expect(group.label).toBeTruthy();
      expect(group.items.length).toBeGreaterThan(0);
      for (const item of group.items) {
        expect(item.href).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.icon).toBeTruthy();
      }
    }
  });
});

// =============================================================================
// 헬퍼 함수 테스트
// =============================================================================

describe('getInitials', () => {
  test('영문 이름에서 이니셜을 추출한다', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  test('한글 이름에서 이니셜을 추출한다', () => {
    expect(getInitials('김 철수')).toBe('김철');
  });

  test('단일 이름은 첫 글자만 반환한다', () => {
    expect(getInitials('Admin')).toBe('A');
  });

  test('3단어 이상이면 앞 2글자만 반환한다', () => {
    expect(getInitials('Kim Chul Soo')).toBe('KC');
  });
});

describe('getRoleBadgeConfig', () => {
  test('CONSULTANT_APPROVED 역할의 배지를 반환한다', () => {
    const config = getRoleBadgeConfig('CONSULTANT_APPROVED');
    expect(config).not.toBeNull();
    expect(config!.label).toBe('컨설턴트');
  });

  test('OPS_ADMIN 역할의 배지를 반환한다', () => {
    const config = getRoleBadgeConfig('OPS_ADMIN');
    expect(config).not.toBeNull();
    expect(config!.label).toBe('운영관리자');
  });

  test('SYSTEM_ADMIN 역할의 배지를 반환한다', () => {
    const config = getRoleBadgeConfig('SYSTEM_ADMIN');
    expect(config).not.toBeNull();
    expect(config!.label).toBe('시스템관리자');
  });

  test('알 수 없는 역할은 null을 반환한다', () => {
    expect(getRoleBadgeConfig('UNKNOWN_ROLE')).toBeNull();
  });
});

describe('isGroupActive', () => {
  const workspaceGroup = ADMIN_NAV_GROUPS[0]; // 워크스페이스: /ops/projects, /test-roadmap
  const opsGroup = ADMIN_NAV_GROUPS[1]; // 운영관리: /ops/users, /ops/quota, /ops/audit
  const libraryGroup = ADMIN_NAV_GROUPS[2]; // 라이브러리: /gallery, /ops/templates

  test('프로젝트 관리 경로에서 워크스페이스 그룹이 active이다', () => {
    expect(isGroupActive(workspaceGroup, '/ops/projects')).toBe(true);
    expect(isGroupActive(workspaceGroup, '/ops/projects/123')).toBe(true);
  });

  test('테스트 로드맵 경로에서 워크스페이스 그룹이 active이다', () => {
    expect(isGroupActive(workspaceGroup, '/test-roadmap')).toBe(true);
  });

  test('사용자 관리 경로에서 운영관리 그룹이 active이다', () => {
    expect(isGroupActive(opsGroup, '/ops/users')).toBe(true);
  });

  test('감사로그 경로에서 운영관리 그룹이 active이다', () => {
    expect(isGroupActive(opsGroup, '/ops/audit')).toBe(true);
  });

  test('자가진단 템플릿 경로에서 라이브러리 그룹이 active이다', () => {
    expect(isGroupActive(libraryGroup, '/ops/templates')).toBe(true);
    expect(isGroupActive(libraryGroup, '/ops/templates/123')).toBe(true);
  });

  test('갤러리 경로에서 라이브러리 그룹이 active이다', () => {
    expect(isGroupActive(libraryGroup, '/gallery')).toBe(true);
  });

  test('관련 없는 경로에서는 active가 아니다', () => {
    expect(isGroupActive(workspaceGroup, '/ops/users')).toBe(false);
    expect(isGroupActive(opsGroup, '/ops/projects')).toBe(false);
    expect(isGroupActive(libraryGroup, '/consultant/home')).toBe(false);
  });
});

// =============================================================================
// 커맨드 팔레트용 헬퍼 함수 테스트
// =============================================================================

describe('getNavItemsForRole', () => {
  test('컨설턴트: 기본 5개 + 프로필 관리 + 계정 설정 + 메시지 = 8개', () => {
    const items = getNavItemsForRole('CONSULTANT_APPROVED');
    expect(items.length).toBe(8);
  });

  test('컨설턴트: 프로필 관리 항목이 포함된다', () => {
    const items = getNavItemsForRole('CONSULTANT_APPROVED');
    const profile = items.find((item) => item.label === '프로필 관리');
    expect(profile).toBeDefined();
    expect(profile!.href).toBe('/consultant/profile');
  });

  test('컨설턴트: 계정 설정 항목이 포함된다', () => {
    const items = getNavItemsForRole('CONSULTANT_APPROVED');
    const settings = items.find((item) => item.label === '계정 설정');
    expect(settings).toBeDefined();
    expect(settings!.href).toBe('/dashboard/settings');
  });

  test('컨설턴트: 메시지 항목이 포함된다', () => {
    const items = getNavItemsForRole('CONSULTANT_APPROVED');
    const messages = items.find((item) => item.label === '메시지');
    expect(messages).toBeDefined();
    expect(messages!.href).toBe('/dashboard/messages');
  });

  test('관리자: 그룹 내 전체 아이템 + 계정 설정 + 메시지 = 10개', () => {
    const items = getNavItemsForRole('OPS_ADMIN');
    expect(items.length).toBe(10);
  });

  test('시스템관리자와 운영관리자 결과가 동일하다', () => {
    const ops = getNavItemsForRole('OPS_ADMIN');
    const sys = getNavItemsForRole('SYSTEM_ADMIN');
    expect(ops.map((i) => i.href)).toEqual(sys.map((i) => i.href));
  });

  test('관리자: 프로필 관리는 포함되지 않는다', () => {
    const items = getNavItemsForRole('OPS_ADMIN');
    expect(items.find((item) => item.label === '프로필 관리')).toBeUndefined();
  });

  test('모든 아이템에 href, label, icon이 있다', () => {
    for (const role of ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'] as const) {
      const items = getNavItemsForRole(role);
      for (const item of items) {
        expect(item.href).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.icon).toBeTruthy();
      }
    }
  });
});

describe('getNavItemsWithKeywords', () => {
  test('각 아이템에 keywords 배열이 포함된다', () => {
    const items = getNavItemsWithKeywords('OPS_ADMIN');
    for (const item of items) {
      expect(Array.isArray(item.keywords)).toBe(true);
      expect(item.keywords.length).toBeGreaterThan(0);
    }
  });

  test('관리자 아이템은 그룹명을 키워드에 포함한다', () => {
    const items = getNavItemsWithKeywords('OPS_ADMIN');
    const projectMgmt = items.find((item) => item.label === '프로젝트 관리');
    expect(projectMgmt).toBeDefined();
    expect(projectMgmt!.keywords).toContain('워크스페이스');
  });

  test('컨설턴트 아이템도 키워드를 가진다', () => {
    const items = getNavItemsWithKeywords('CONSULTANT_APPROVED');
    const dashboard = items.find((item) => item.label === '대시보드');
    expect(dashboard).toBeDefined();
    expect(dashboard!.keywords.length).toBeGreaterThan(0);
  });

  test('추가 아이템(계정 설정 등)도 키워드를 가진다', () => {
    const items = getNavItemsWithKeywords('CONSULTANT_APPROVED');
    const settings = items.find((item) => item.label === '계정 설정');
    expect(settings).toBeDefined();
    expect(settings!.keywords.length).toBeGreaterThan(0);
  });
});

describe('ROLE_BADGE_CONFIG', () => {
  test('4개 역할이 정의되어 있다', () => {
    expect(Object.keys(ROLE_BADGE_CONFIG)).toHaveLength(4);
  });

  test('모든 역할에 label과 className이 있다', () => {
    for (const config of Object.values(ROLE_BADGE_CONFIG)) {
      expect(config.label).toBeTruthy();
      expect(config.className).toBeTruthy();
    }
  });
});
