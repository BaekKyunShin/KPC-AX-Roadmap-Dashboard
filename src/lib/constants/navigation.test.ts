import { describe, test, expect } from 'vitest';
import {
  CONSULTANT_NAV_ITEMS,
  ADMIN_NAV_GROUPS,
  ROLE_BADGE_CONFIG,
  getInitials,
  getRoleBadgeConfig,
  isGroupActive,
} from './navigation';

// =============================================================================
// 상수 구조 검증
// =============================================================================

describe('CONSULTANT_NAV_ITEMS', () => {
  test('4개 메뉴 항목을 포함한다', () => {
    expect(CONSULTANT_NAV_ITEMS).toHaveLength(4);
  });

  test('대시보드, 담당 프로젝트, 테스트 로드맵, 로드맵 갤러리 순서이다', () => {
    const labels = CONSULTANT_NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual(['대시보드', '담당 프로젝트', '테스트 로드맵', '로드맵 갤러리']);
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

  test('운영관리 그룹에 사용자 관리, 쿼터 관리, 감사로그가 있다', () => {
    const ops = ADMIN_NAV_GROUPS[1];
    const labels = ops.items.map((item) => item.label);
    expect(labels).toEqual(['사용자 관리', '쿼터 관리', '감사로그']);
  });

  test('라이브러리 그룹에 로드맵 갤러리와 사전진단 템플릿이 있다', () => {
    const library = ADMIN_NAV_GROUPS[2];
    const labels = library.items.map((item) => item.label);
    expect(labels).toEqual(['로드맵 갤러리', '사전진단 템플릿']);
  });

  test('사전진단 템플릿 경로는 /ops/templates이다', () => {
    const library = ADMIN_NAV_GROUPS[2];
    const template = library.items.find((item) => item.label === '사전진단 템플릿');
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

  test('사전진단 템플릿 경로에서 라이브러리 그룹이 active이다', () => {
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
