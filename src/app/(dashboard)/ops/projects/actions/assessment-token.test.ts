/**
 * ops/projects/actions/assessment-token.ts 테스트
 *
 * 테스트 대상:
 * - createAssessmentToken: 진단 링크 토큰 생성
 * - getLatestToken: 프로젝트의 최신 토큰 조회
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockAuthResult = vi.fn();
vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockAuthResult(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

const {
  pendingCallbacks: pendingAfterCallbacks,
  flush: flushAfterCallbacks,
  mockAfter,
} = vi.hoisted(() => {
  const callbacks: Promise<unknown>[] = [];
  const mock = vi.fn((fn: () => void | Promise<unknown>) => {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      callbacks.push(result as Promise<unknown>);
    }
  });
  return {
    pendingCallbacks: callbacks,
    flush: async () => {
      await Promise.all(callbacks);
      callbacks.length = 0;
    },
    mockAfter: mock,
  };
});
vi.mock('next/server', () => ({ after: mockAfter }));

// ─── 테스트 대상 import ──────────────────────────────────────────────────────

import { createAssessmentToken, getLatestToken } from './assessment-token';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440002';

/** FormData 편의 생성기 */
function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

function validTokenFormData(): FormData {
  return makeFormData({
    project_id: TEST_PROJECT_ID,
    expires_in_days: '14',
  });
}

// ─── createAssessmentToken ───────────────────────────────────────────────────

describe('createAssessmentToken', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
    pendingAfterCallbacks.length = 0;
  });

  it('인증 실패 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });

    const result = await createAssessmentToken(validTokenFormData());

    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('프로젝트 미존재 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    // 프로젝트 조회 → null
    adminMock.addResult({ data: null, error: null });

    const result = await createAssessmentToken(validTokenFormData());

    expect(result).toEqual({ success: false, error: '프로젝트를 찾을 수 없습니다.' });
  });

  it('NEW 아닌 상태 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    // 프로젝트 조회 → status=ASSIGNED
    adminMock.addResult({
      data: { id: TEST_PROJECT_ID, status: 'ASSIGNED', company_name: '테스트 기업' },
      error: null,
    });

    const result = await createAssessmentToken(validTokenFormData());

    expect(result).toEqual({
      success: false,
      error: '진단 링크는 NEW 상태의 프로젝트에서만 생성할 수 있습니다.',
    });
  });

  it('정상 생성 → token, url, expiresAt 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    // 프로젝트 조회 → NEW
    adminMock.addResult({
      data: { id: TEST_PROJECT_ID, status: 'NEW', company_name: '테스트 기업' },
      error: null,
    });
    // 기존 토큰 무효화 update → 성공
    adminMock.addResult({ data: null, error: null });
    // 새 토큰 insert → 성공
    adminMock.addResult({ data: null, error: null });

    const result = await createAssessmentToken(validTokenFormData());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBeDefined();
      expect(result.data.token.length).toBe(64); // 32 bytes → 64 hex chars
      expect(result.data.url).toContain(`/assessment/${result.data.token}`);
      expect(result.data.expiresAt).toBeDefined();
    }
  });

  it('DB insert 에러 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    // 프로젝트 조회 → NEW
    adminMock.addResult({
      data: { id: TEST_PROJECT_ID, status: 'NEW', company_name: '테스트 기업' },
      error: null,
    });
    // 기존 토큰 무효화 → 성공
    adminMock.addResult({ data: null, error: null });
    // insert 에러
    adminMock.addResult({ data: null, error: { message: 'unique_violation' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createAssessmentToken(validTokenFormData());

    expect(result).toEqual({
      success: false,
      error: '진단 링크 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
    consoleSpy.mockRestore();
  });

  it('성공 시 after() 콜백에서 감사로그 기록', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');

    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    // 프로젝트 조회 → NEW
    adminMock.addResult({
      data: { id: TEST_PROJECT_ID, status: 'NEW', company_name: '테스트 기업' },
      error: null,
    });
    // 기존 토큰 무효화
    adminMock.addResult({ data: null, error: null });
    // insert 성공
    adminMock.addResult({ data: null, error: null });

    await createAssessmentToken(validTokenFormData());
    await flushAfterCallbacks();

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'ASSESSMENT_TOKEN_CREATE',
        targetType: 'assessment_token',
        targetId: TEST_PROJECT_ID,
        meta: expect.objectContaining({
          expires_in_days: 14,
          company_name: '테스트 기업',
        }),
      }),
    );
  });

  it('Zod 검증 실패 (유효하지 않은 project_id) → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    const fd = makeFormData({
      project_id: 'invalid-uuid',
      expires_in_days: '14',
    });

    const result = await createAssessmentToken(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});

// ─── getLatestToken ──────────────────────────────────────────────────────────

describe('getLatestToken', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증 실패 → null 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '권한이 없습니다.' });

    const result = await getLatestToken(TEST_PROJECT_ID);

    expect(result).toBeNull();
  });

  it('토큰 없음 → null 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    // maybeSingle → null
    adminMock.addResult({ data: null, error: null });

    const result = await getLatestToken(TEST_PROJECT_ID);

    expect(result).toBeNull();
  });

  it('정상 조회 → LatestTokenInfo 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    adminMock.addResult({
      data: {
        id: 'token-1',
        token: 'abc123',
        expires_at: '2026-04-01T00:00:00Z',
        is_used: false,
        used_at: null,
        created_at: '2026-03-01T00:00:00Z',
      },
      error: null,
    });

    const result = await getLatestToken(TEST_PROJECT_ID);

    expect(result).toEqual({
      id: 'token-1',
      token: 'abc123',
      expiresAt: '2026-04-01T00:00:00Z',
      isUsed: false,
      usedAt: null,
      createdAt: '2026-03-01T00:00:00Z',
    });
  });
});
