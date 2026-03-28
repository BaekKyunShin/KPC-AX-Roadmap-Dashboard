import { vi, describe, it, expect, afterEach } from 'vitest';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// 외부 의존성 모킹
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/cached', () => ({
  getCachedUser: vi.fn(),
  getCachedProfile: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import {
  requireAuth,
  requireAuthWithRole,
  requireConsultantRoadmapAccess,
  requireConsultantProjectAccess,
} from './auth-helpers';

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function setupAuth(
  user: { id: string; email?: string } | null,
  profile: Record<string, unknown> | null,
) {
  vi.mocked(getCachedUser).mockResolvedValue(user as never);
  vi.mocked(getCachedProfile).mockResolvedValue(profile as never);

  const mock = createMockSupabase();
  vi.mocked(createClient).mockResolvedValue(mock.client as never);
  return mock;
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// requireAuth
// ============================================================================

describe('requireAuth', () => {
  it('user가 null이면 기본 에러 메시지를 반환한다', async () => {
    setupAuth(null, null);

    const result = await requireAuth();

    expect(result).toEqual({ error: '로그인이 필요합니다.' });
  });

  it('커스텀 에러 메시지를 전달하면 해당 메시지를 반환한다', async () => {
    setupAuth(null, null);

    const result = await requireAuth('인증이 만료되었습니다.');

    expect(result).toEqual({ error: '인증이 만료되었습니다.' });
  });

  it('user와 profile이 정상이면 AuthSuccess를 반환한다', async () => {
    const mock = setupAuth(
      { id: 'user-1', email: 'test@example.com' },
      { role: 'OPS_ADMIN', status: 'ACTIVE' },
    );

    const result = await requireAuth();

    expect(result).toEqual({
      user: { id: 'user-1', email: 'test@example.com' },
      supabase: mock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });
  });

  it('profile이 null이면 role과 status가 null이다', async () => {
    const mock = setupAuth({ id: 'user-2', email: 'no-profile@test.com' }, null);

    const result = await requireAuth();

    expect(result).toEqual({
      user: { id: 'user-2', email: 'no-profile@test.com' },
      supabase: mock.client,
      role: null,
      status: null,
    });
  });
});

// ============================================================================
// requireAuthWithRole
// ============================================================================

describe('requireAuthWithRole', () => {
  it('requireAuth 실패 시 error를 그대로 전파한다', async () => {
    setupAuth(null, null);

    const result = await requireAuthWithRole(['OPS_ADMIN']);

    expect(result).toEqual({ error: '로그인이 필요합니다.' });
  });

  it('role이 null이면 권한 에러를 반환한다', async () => {
    setupAuth({ id: 'user-1' }, null);

    const result = await requireAuthWithRole(['OPS_ADMIN']);

    expect(result).toEqual({ error: '권한이 없습니다.' });
  });

  it('role이 allowedRoles에 포함되지 않으면 에러를 반환한다', async () => {
    setupAuth({ id: 'user-1' }, { role: 'USER_PENDING', status: 'ACTIVE' });

    const result = await requireAuthWithRole(['OPS_ADMIN']);

    expect(result).toEqual({ error: '권한이 없습니다.' });
  });

  it('status가 ACTIVE가 아니면 에러를 반환한다', async () => {
    setupAuth({ id: 'user-1' }, { role: 'OPS_ADMIN', status: 'SUSPENDED' });

    const result = await requireAuthWithRole(['OPS_ADMIN']);

    expect(result).toEqual({ error: '권한이 없습니다.' });
  });

  it('커스텀 roleError 옵션을 전달하면 해당 메시지를 반환한다', async () => {
    setupAuth({ id: 'user-1' }, { role: 'USER_PENDING', status: 'ACTIVE' });

    const result = await requireAuthWithRole(['OPS_ADMIN'], {
      roleError: '관리자만 접근 가능합니다.',
    });

    expect(result).toEqual({ error: '관리자만 접근 가능합니다.' });
  });

  it('정상 조건이면 RoleSuccess를 반환한다', async () => {
    const mock = setupAuth(
      { id: 'user-1', email: 'admin@test.com' },
      { role: 'OPS_ADMIN', status: 'ACTIVE' },
    );

    const result = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);

    expect(result).toEqual({
      user: { id: 'user-1', email: 'admin@test.com' },
      supabase: mock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });
  });
});

// ============================================================================
// requireConsultantRoadmapAccess
// ============================================================================

describe('requireConsultantRoadmapAccess', () => {
  it('로드맵 조회 결과가 null이면 에러를 반환한다', async () => {
    const mock = createMockSupabase();
    mock.addResult({ data: null, error: null });

    const result = await requireConsultantRoadmapAccess(
      mock.client as never,
      'user-1',
      'roadmap-999',
    );

    expect(result).toEqual({ error: '로드맵을 찾을 수 없습니다.' });
  });

  it('JOIN 결과에서 assigned_consultant_id가 userId와 다르면 접근 권한 에러를 반환한다', async () => {
    const mock = createMockSupabase();
    mock.addResult({
      data: { project_id: 'proj-1', projects: { assigned_consultant_id: 'other-user' } },
      error: null,
    });

    const result = await requireConsultantRoadmapAccess(
      mock.client as never,
      'user-1',
      'roadmap-1',
    );

    expect(result).toEqual({ error: '해당 프로젝트에 대한 접근 권한이 없습니다.' });
  });

  it('정상이면 projectId를 반환한다', async () => {
    const mock = createMockSupabase();
    mock.addResult({
      data: { project_id: 'proj-1', projects: { assigned_consultant_id: 'user-1' } },
      error: null,
    });

    const result = await requireConsultantRoadmapAccess(
      mock.client as never,
      'user-1',
      'roadmap-1',
    );

    expect(result).toEqual({ projectId: 'proj-1' });
  });
});

// ============================================================================
// requireConsultantProjectAccess
// ============================================================================

describe('requireConsultantProjectAccess', () => {
  it('프로젝트가 존재하지 않거나 미배정이면 에러를 반환한다', async () => {
    const mock = createMockSupabase();
    mock.addResult({ data: null, error: null });

    const result = await requireConsultantProjectAccess(
      mock.client as never,
      'user-1',
      'proj-999',
    );

    expect(result).toEqual({ error: '배정되지 않은 프로젝트입니다.' });
  });

  it('정상이면 true를 반환한다', async () => {
    const mock = createMockSupabase();
    mock.addResult({ data: { id: 'proj-1' }, error: null });

    const result = await requireConsultantProjectAccess(
      mock.client as never,
      'user-1',
      'proj-1',
    );

    expect(result).toBe(true);
  });
});
