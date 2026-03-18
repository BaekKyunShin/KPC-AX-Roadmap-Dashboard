/**
 * gallery/actions/interactions.ts 테스트
 *
 * toggleLike:
 *   - 미인증 → error
 *   - UUID 검증 실패 → error
 *   - 기존 좋아요 있음 → 삭제 (unlike)
 *   - 기존 좋아요 없음 → 추가 (like)
 *   - 추가 실패 → error
 *   - count 반환 확인
 *   - revalidatePath('/gallery') 호출
 *
 * toggleShare:
 *   - 미인증 → error
 *   - 비컨설턴트 → error
 *   - UUID 검증 실패 → error
 *   - 로드맵 미존재 → error
 *   - 본인 아님 → error
 *   - FINAL 아님 → error
 *   - true → false 토글
 *   - false → true 토글
 *   - DB update 실패 → error
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toggleLike, toggleShare } from './interactions';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockRequireAuth = vi.fn();
const mockRequireAuthWithRole = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireAuthWithRole: (...args: unknown[]) => mockRequireAuthWithRole(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ─── 테스트 상수 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_ROADMAP_ID = '550e8400-e29b-41d4-a716-446655440010';
const INVALID_UUID = 'not-a-uuid';

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────────────

let serverMock: ReturnType<typeof createMockSupabase>;
let adminMock: ReturnType<typeof createMockSupabase>;

function setupAuth(overrides?: { userId?: string; role?: string }) {
  mockRequireAuth.mockResolvedValue({
    user: { id: overrides?.userId ?? TEST_USER_ID, email: 'test@test.com' },
    supabase: serverMock.client,
    role: overrides?.role ?? 'CONSULTANT_APPROVED',
    status: 'ACTIVE',
  });
}

function setupAuthWithRole(overrides?: { userId?: string; role?: string }) {
  mockRequireAuthWithRole.mockResolvedValue({
    user: { id: overrides?.userId ?? TEST_USER_ID, email: 'test@test.com' },
    supabase: serverMock.client,
    role: overrides?.role ?? 'CONSULTANT_APPROVED',
    status: 'ACTIVE',
  });
}

beforeEach(async () => {
  serverMock = createMockSupabase();
  adminMock = createMockSupabase();

  const { createAdminClient } = await import('@/lib/supabase/admin');
  vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── toggleLike ──────────────────────────────────────────────────────────────

describe('toggleLike', () => {
  it('미인증 → error 반환', async () => {
    mockRequireAuth.mockResolvedValue({ error: '인증이 필요합니다.' });

    const result = await toggleLike(TEST_ROADMAP_ID);

    expect(result).toEqual({ success: false, error: '인증이 필요합니다.' });
  });

  it('UUID 검증 실패 → error 반환', async () => {
    setupAuth();

    const result = await toggleLike(INVALID_UUID);

    expect(result).toEqual({ success: false, error: '유효하지 않은 요청입니다.' });
  });

  it('기존 좋아요 있음 → 삭제 (unlike)', async () => {
    const { revalidatePath } = await import('next/cache');
    setupAuth();

    // 1. maybeSingle: 기존 좋아요 존재
    serverMock.addResult({ data: { id: 'like-1' }, error: null });
    // 2. delete → then (await)
    serverMock.addResult({ data: null, error: null });
    // 3. count 조회 → then
    serverMock.addResult({ data: null, error: null, count: 5 });

    const result = await toggleLike(TEST_ROADMAP_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.liked).toBe(false); // 기존 있었으므로 삭제 = !existing = false
      expect(result.data.count).toBe(5);
    }
    expect(serverMock.chainable.delete).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/gallery');
  });

  it('기존 좋아요 없음 → 추가 (like)', async () => {
    const { revalidatePath } = await import('next/cache');
    setupAuth();

    // 1. maybeSingle: 기존 좋아요 없음
    serverMock.addResult({ data: null, error: null });
    // 2. insert → then (await)
    serverMock.addResult({ data: null, error: null });
    // 3. count 조회 → then
    serverMock.addResult({ data: null, error: null, count: 10 });

    const result = await toggleLike(TEST_ROADMAP_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.liked).toBe(true); // 기존 없었으므로 추가 = !existing = true
      expect(result.data.count).toBe(10);
    }
    expect(serverMock.chainable.insert).toHaveBeenCalledWith({
      user_id: TEST_USER_ID,
      roadmap_version_id: TEST_ROADMAP_ID,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/gallery');
  });

  it('좋아요 추가 실패 → error 반환', async () => {
    setupAuth();

    // 1. maybeSingle: 기존 없음
    serverMock.addResult({ data: null, error: null });
    // 2. insert → then: 에러
    serverMock.addResult({ data: null, error: { message: 'insert failed' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await toggleLike(TEST_ROADMAP_ID);

    expect(result).toEqual({
      success: false,
      error: '좋아요 처리 중 오류가 발생했습니다.',
    });
    consoleSpy.mockRestore();
  });

  it('count null일 때 0 반환', async () => {
    setupAuth();

    // 1. maybeSingle: 기존 없음
    serverMock.addResult({ data: null, error: null });
    // 2. insert → 성공
    serverMock.addResult({ data: null, error: null });
    // 3. count → null
    serverMock.addResult({ data: null, error: null, count: null });

    const result = await toggleLike(TEST_ROADMAP_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(0);
    }
  });
});

// ─── toggleShare ─────────────────────────────────────────────────────────────

describe('toggleShare', () => {
  it('미인증 → error 반환', async () => {
    mockRequireAuthWithRole.mockResolvedValue({ error: '인증이 필요합니다.' });

    const result = await toggleShare(TEST_ROADMAP_ID);

    expect(result).toEqual({ success: false, error: '인증이 필요합니다.' });
  });

  it('비컨설턴트 → error 반환', async () => {
    mockRequireAuthWithRole.mockResolvedValue({
      error: '컨설턴트만 공유 설정을 변경할 수 있습니다.',
    });

    const result = await toggleShare(TEST_ROADMAP_ID);

    expect(result).toEqual({
      success: false,
      error: '컨설턴트만 공유 설정을 변경할 수 있습니다.',
    });
  });

  it('UUID 검증 실패 → error 반환', async () => {
    setupAuthWithRole();

    const result = await toggleShare(INVALID_UUID);

    expect(result).toEqual({ success: false, error: '유효하지 않은 요청입니다.' });
  });

  it('로드맵 미존재 → error 반환', async () => {
    setupAuthWithRole();
    // adminClient.single() → null
    adminMock.addResult({ data: null, error: null });

    const result = await toggleShare(TEST_ROADMAP_ID);

    expect(result).toEqual({ success: false, error: '로드맵을 찾을 수 없습니다.' });
  });

  it('본인 아님 → error 반환', async () => {
    setupAuthWithRole({ userId: TEST_USER_ID });
    adminMock.addResult({
      data: {
        id: TEST_ROADMAP_ID,
        is_shared: false,
        status: 'FINAL',
        created_by: 'another-user-id', // 다른 사람
      },
      error: null,
    });

    const result = await toggleShare(TEST_ROADMAP_ID);

    expect(result).toEqual({
      success: false,
      error: '본인이 작성한 로드맵만 공유할 수 있습니다.',
    });
  });

  it('FINAL 아님 → error 반환', async () => {
    setupAuthWithRole({ userId: TEST_USER_ID });
    adminMock.addResult({
      data: {
        id: TEST_ROADMAP_ID,
        is_shared: false,
        status: 'DRAFT',
        created_by: TEST_USER_ID,
      },
      error: null,
    });

    const result = await toggleShare(TEST_ROADMAP_ID);

    expect(result).toEqual({
      success: false,
      error: '확정된 로드맵만 공유할 수 있습니다.',
    });
  });

  it('is_shared=true → false 토글', async () => {
    const { revalidatePath } = await import('next/cache');
    setupAuthWithRole({ userId: TEST_USER_ID });

    // 1. single: 기존 공유 상태
    adminMock.addResult({
      data: {
        id: TEST_ROADMAP_ID,
        is_shared: true,
        status: 'FINAL',
        created_by: TEST_USER_ID,
      },
      error: null,
    });
    // 2. update → then
    adminMock.addResult({ data: null, error: null });

    const result = await toggleShare(TEST_ROADMAP_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isShared).toBe(false);
    }
    expect(adminMock.chainable.update).toHaveBeenCalledWith({ is_shared: false });
    expect(revalidatePath).toHaveBeenCalledWith('/gallery');
  });

  it('is_shared=false → true 토글', async () => {
    const { revalidatePath } = await import('next/cache');
    setupAuthWithRole({ userId: TEST_USER_ID });

    // 1. single: 기존 비공유 상태
    adminMock.addResult({
      data: {
        id: TEST_ROADMAP_ID,
        is_shared: false,
        status: 'FINAL',
        created_by: TEST_USER_ID,
      },
      error: null,
    });
    // 2. update → then
    adminMock.addResult({ data: null, error: null });

    const result = await toggleShare(TEST_ROADMAP_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isShared).toBe(true);
    }
    expect(adminMock.chainable.update).toHaveBeenCalledWith({ is_shared: true });
    expect(revalidatePath).toHaveBeenCalledWith('/gallery');
  });

  it('DB update 실패 → error 반환', async () => {
    setupAuthWithRole({ userId: TEST_USER_ID });

    // 1. single: 유효한 로드맵
    adminMock.addResult({
      data: {
        id: TEST_ROADMAP_ID,
        is_shared: false,
        status: 'FINAL',
        created_by: TEST_USER_ID,
      },
      error: null,
    });
    // 2. update → 실패
    adminMock.addResult({ data: null, error: { message: 'update failed' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await toggleShare(TEST_ROADMAP_ID);

    expect(result).toEqual({
      success: false,
      error: '공유 설정 변경 중 오류가 발생했습니다.',
    });
    consoleSpy.mockRestore();
  });
});
