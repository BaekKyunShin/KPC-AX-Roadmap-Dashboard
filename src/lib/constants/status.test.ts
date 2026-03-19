import { describe, expect, it } from 'vitest';
import type { ProjectStatus, UserRole } from '@/types/database';
import {
  validateStatusTransition,
  ALLOWED_STATUS_TRANSITIONS,
  isOpsManager,
  getManageableRoles,
  canManageUser,
  getWorkflowStepIndex,
  getWorkflowStepLabel,
  getProjectStatusBadge,
  getConsultantProjectStatusBadge,
  PROJECT_WORKFLOW_STEPS,
  PROJECT_STATUS_CONFIG,
  CONSULTANT_PROJECT_STATUS_CONFIG,
  OPS_MANAGER_ROLES,
  CONSULTANT_ROLES,
  OPS_ADMIN_ROLES,
  SYSTEM_ADMIN_MANAGEABLE_ROLES,
  OPS_ADMIN_MANAGEABLE_ROLES,
} from './status';

describe('ALLOWED_STATUS_TRANSITIONS', () => {
  it('모든 ProjectStatus에 대한 전이 맵이 정의되어 있다', () => {
    const allStatuses: ProjectStatus[] = [
      'NEW',
      'DIAGNOSED',
      'MATCH_RECOMMENDED',
      'ASSIGNED',
      'INTERVIEWED',
      'ROADMAP_DRAFTED',
      'FINALIZED',
    ];
    for (const status of allStatuses) {
      expect(ALLOWED_STATUS_TRANSITIONS).toHaveProperty(status);
    }
  });

  it('FINALIZED는 종료 상태 — 허용된 전이가 없다', () => {
    expect(ALLOWED_STATUS_TRANSITIONS.FINALIZED).toEqual([]);
  });
});

describe('validateStatusTransition', () => {
  // ── 허용되는 전이 ──

  it.each<[ProjectStatus, ProjectStatus, string]>([
    // 정방향 (메인 워크플로우)
    ['NEW', 'DIAGNOSED', '정방향'],
    ['DIAGNOSED', 'MATCH_RECOMMENDED', '정방향'],
    ['MATCH_RECOMMENDED', 'ASSIGNED', '정방향'],
    ['ASSIGNED', 'INTERVIEWED', '정방향'],
    ['INTERVIEWED', 'ROADMAP_DRAFTED', '정방향'],
    ['ROADMAP_DRAFTED', 'FINALIZED', '정방향'],
    // 스킵 전이
    ['NEW', 'MATCH_RECOMMENDED', '자가진단 없이 매칭 추천'],
    ['DIAGNOSED', 'ASSIGNED', '매칭 추천 없이 직접 배정'],
    // 동일 상태 재실행
    ['ASSIGNED', 'ASSIGNED', '컨설턴트 재배정'],
    ['ROADMAP_DRAFTED', 'ROADMAP_DRAFTED', '로드맵 재생성'],
  ])('%s → %s 허용 (%s)', (from, to) => {
    expect(validateStatusTransition(from, to)).toBe(true);
  });

  // ── 차단되는 전이 ──

  it.each<[ProjectStatus, ProjectStatus, string]>([
    // 동일 상태 (명시적 허용 외)
    ['NEW', 'NEW', '동일 상태'],
    ['DIAGNOSED', 'DIAGNOSED', '동일 상태'],
    ['FINALIZED', 'FINALIZED', '동일 상태'],
    // 역방향
    ['DIAGNOSED', 'NEW', '역방향'],
    ['ASSIGNED', 'DIAGNOSED', '역방향'],
    ['FINALIZED', 'ROADMAP_DRAFTED', '역방향'],
    ['INTERVIEWED', 'ASSIGNED', '역방향'],
    // 비인접
    ['NEW', 'FINALIZED', '비인접'],
    ['NEW', 'INTERVIEWED', '비인접'],
    ['ASSIGNED', 'FINALIZED', '비인접'],
  ])('%s → %s 차단 (%s)', (from, to) => {
    expect(validateStatusTransition(from, to)).toBe(false);
  });
});

// =============================================================================
// isOpsManager
// =============================================================================

describe('isOpsManager', () => {
  it.each<[UserRole, boolean]>([
    ['OPS_ADMIN', true],
    ['SYSTEM_ADMIN', true],
    ['CONSULTANT_APPROVED', false],
    ['PUBLIC', false],
    ['USER_PENDING', false],
    ['OPS_ADMIN_PENDING', false],
  ])('역할 "%s" → %s', (role, expected) => {
    expect(isOpsManager(role)).toBe(expected);
  });
});

// =============================================================================
// getManageableRoles
// =============================================================================

describe('getManageableRoles', () => {
  it('SYSTEM_ADMIN은 컨설턴트 + 운영관리자 역할 모두 관리 가능', () => {
    const roles = getManageableRoles('SYSTEM_ADMIN');
    expect(roles).toEqual(SYSTEM_ADMIN_MANAGEABLE_ROLES);
    expect(roles).toContain('USER_PENDING');
    expect(roles).toContain('CONSULTANT_APPROVED');
    expect(roles).toContain('OPS_ADMIN_PENDING');
    expect(roles).toContain('OPS_ADMIN');
  });

  it('OPS_ADMIN은 컨설턴트 역할만 관리 가능', () => {
    const roles = getManageableRoles('OPS_ADMIN');
    expect(roles).toEqual(OPS_ADMIN_MANAGEABLE_ROLES);
    expect(roles).toContain('USER_PENDING');
    expect(roles).toContain('CONSULTANT_APPROVED');
    expect(roles).not.toContain('OPS_ADMIN');
    expect(roles).not.toContain('SYSTEM_ADMIN');
  });

  it.each<UserRole>([
    'PUBLIC', 'USER_PENDING', 'OPS_ADMIN_PENDING', 'CONSULTANT_APPROVED',
  ])('"%s" 역할은 빈 배열을 반환한다', (role) => {
    expect(getManageableRoles(role)).toEqual([]);
  });
});

// =============================================================================
// canManageUser
// =============================================================================

describe('canManageUser', () => {
  it.each<[UserRole, UserRole, boolean]>([
    // SYSTEM_ADMIN은 컨설턴트/운영관리자 역할 관리 가능
    ['SYSTEM_ADMIN', 'USER_PENDING', true],
    ['SYSTEM_ADMIN', 'CONSULTANT_APPROVED', true],
    ['SYSTEM_ADMIN', 'OPS_ADMIN_PENDING', true],
    ['SYSTEM_ADMIN', 'OPS_ADMIN', true],
    // SYSTEM_ADMIN도 다른 SYSTEM_ADMIN은 관리 불가
    ['SYSTEM_ADMIN', 'SYSTEM_ADMIN', false],
    ['SYSTEM_ADMIN', 'PUBLIC', false],
    // OPS_ADMIN은 컨설턴트만 관리 가능
    ['OPS_ADMIN', 'USER_PENDING', true],
    ['OPS_ADMIN', 'CONSULTANT_APPROVED', true],
    ['OPS_ADMIN', 'OPS_ADMIN', false],
    ['OPS_ADMIN', 'SYSTEM_ADMIN', false],
    // 일반 역할은 관리 불가
    ['CONSULTANT_APPROVED', 'USER_PENDING', false],
    ['PUBLIC', 'USER_PENDING', false],
  ])('현재 "%s"가 대상 "%s"를 관리: %s', (current, target, expected) => {
    expect(canManageUser(current, target)).toBe(expected);
  });
});

// =============================================================================
// getWorkflowStepIndex
// =============================================================================

describe('getWorkflowStepIndex', () => {
  it.each<[ProjectStatus, number]>([
    ['NEW', 0],
    ['DIAGNOSED', 1],
    ['MATCH_RECOMMENDED', 1],
    ['ASSIGNED', 2],
    ['INTERVIEWED', 3],
    ['ROADMAP_DRAFTED', 4],
    ['FINALIZED', 5],
  ])('상태 "%s" → 인덱스 %d', (status, expected) => {
    expect(getWorkflowStepIndex(status)).toBe(expected);
  });
});

// =============================================================================
// getWorkflowStepLabel
// =============================================================================

describe('getWorkflowStepLabel', () => {
  it.each<[ProjectStatus, string]>([
    ['NEW', '신규 등록 완료'],
    ['DIAGNOSED', '진단결과 입력 완료'],
    ['MATCH_RECOMMENDED', '진단결과 입력 완료'],
    ['ASSIGNED', '컨설턴트 배정 완료'],
    ['INTERVIEWED', '현장 인터뷰 완료'],
    ['ROADMAP_DRAFTED', '로드맵 초안 완료'],
    ['FINALIZED', '로드맵 최종 확정'],
  ])('상태 "%s" → 라벨 "%s"', (status, expected) => {
    expect(getWorkflowStepLabel(status)).toBe(expected);
  });
});

// =============================================================================
// getProjectStatusBadge
// =============================================================================

describe('getProjectStatusBadge', () => {
  it.each<ProjectStatus>([
    'NEW', 'DIAGNOSED', 'MATCH_RECOMMENDED', 'ASSIGNED',
    'INTERVIEWED', 'ROADMAP_DRAFTED', 'FINALIZED',
  ])('상태 "%s"에 대해 label과 color를 포함한 객체를 반환한다', (status) => {
    const badge = getProjectStatusBadge(status);
    expect(badge).toHaveProperty('label');
    expect(badge).toHaveProperty('color');
    expect(badge.label).toBe(PROJECT_STATUS_CONFIG[status].label);
    expect(badge.color).toBe(PROJECT_STATUS_CONFIG[status].color);
  });

  it('알 수 없는 상태는 원본 문자열과 기본 색상을 반환한다', () => {
    const badge = getProjectStatusBadge('UNKNOWN' as ProjectStatus);
    expect(badge.label).toBe('UNKNOWN');
    expect(badge.color).toBe('bg-gray-100 text-gray-800');
  });
});

// =============================================================================
// getConsultantProjectStatusBadge
// =============================================================================

describe('getConsultantProjectStatusBadge', () => {
  it.each<[string, string]>([
    ['ASSIGNED', '인터뷰 대기'],
    ['INTERVIEWED', '인터뷰 완료'],
    ['ROADMAP_DRAFTED', '로드맵 작성 중'],
    ['FINALIZED', '로드맵 완료'],
  ])('상태 "%s" → 라벨 "%s"', (status, expectedLabel) => {
    const badge = getConsultantProjectStatusBadge(status);
    expect(badge.label).toBe(expectedLabel);
  });

  it('ASSIGNED 상태에서 인터뷰 완료 시 INTERVIEWED 배지를 반환한다', () => {
    const badge = getConsultantProjectStatusBadge('ASSIGNED', true);
    expect(badge.label).toBe(CONSULTANT_PROJECT_STATUS_CONFIG['INTERVIEWED'].label);
    expect(badge.color).toBe(CONSULTANT_PROJECT_STATUS_CONFIG['INTERVIEWED'].color);
  });

  it('ASSIGNED 상태에서 hasInterview=false면 ASSIGNED 배지를 반환한다', () => {
    const badge = getConsultantProjectStatusBadge('ASSIGNED', false);
    expect(badge.label).toBe(CONSULTANT_PROJECT_STATUS_CONFIG['ASSIGNED'].label);
  });

  it('ASSIGNED 상태에서 hasInterview=undefined이면 ASSIGNED 배지를 반환한다', () => {
    const badge = getConsultantProjectStatusBadge('ASSIGNED');
    expect(badge.label).toBe(CONSULTANT_PROJECT_STATUS_CONFIG['ASSIGNED'].label);
  });

  it('알 수 없는 상태는 원본 문자열과 기본 색상을 반환한다', () => {
    const badge = getConsultantProjectStatusBadge('UNKNOWN_STATUS');
    expect(badge.label).toBe('UNKNOWN_STATUS');
    expect(badge.color).toBe('bg-gray-100 text-gray-800');
  });
});

// =============================================================================
// 상수 일관성 검증
// =============================================================================

describe('상수 일관성', () => {
  it('OPS_MANAGER_ROLES는 OPS_ADMIN과 SYSTEM_ADMIN만 포함한다', () => {
    expect(OPS_MANAGER_ROLES).toEqual(['OPS_ADMIN', 'SYSTEM_ADMIN']);
  });

  it('CONSULTANT_ROLES는 USER_PENDING과 CONSULTANT_APPROVED만 포함한다', () => {
    expect(CONSULTANT_ROLES).toEqual(['USER_PENDING', 'CONSULTANT_APPROVED']);
  });

  it('OPS_ADMIN_ROLES는 OPS_ADMIN_PENDING과 OPS_ADMIN만 포함한다', () => {
    expect(OPS_ADMIN_ROLES).toEqual(['OPS_ADMIN_PENDING', 'OPS_ADMIN']);
  });

  it('PROJECT_WORKFLOW_STEPS는 6단계이다', () => {
    expect(PROJECT_WORKFLOW_STEPS).toHaveLength(6);
  });

  it('DIAGNOSED와 MATCH_RECOMMENDED는 같은 워크플로우 단계에 속한다', () => {
    const diagnosedIdx = getWorkflowStepIndex('DIAGNOSED');
    const matchIdx = getWorkflowStepIndex('MATCH_RECOMMENDED');
    expect(diagnosedIdx).toBe(matchIdx);
  });
});
