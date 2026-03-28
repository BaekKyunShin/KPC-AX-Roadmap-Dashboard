/**
 * gallery/actions/copy.ts 테스트
 *
 * copyRoadmapToProject:
 *   - 미인증 → error
 *   - UUID 검증 실패 → error
 *   - 비컨설턴트 → error
 *   - 미배정 프로젝트 → error
 *   - 원본 로드맵 미존재 → error
 *   - 기존 버전 존재 → 다음 버전 번호
 *   - 기존 버전 없음 → 버전 1
 *   - 성공 + 감사로그 + revalidatePath
 *   - DB insert 실패 → error
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyRoadmapToProject } from './copy';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockRequireAuth = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ─── 테스트 상수 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const SOURCE_ROADMAP_ID = '550e8400-e29b-41d4-a716-446655440010';
const TARGET_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';
const NEW_VERSION_ID = '550e8400-e29b-41d4-a716-446655440030';
const INVALID_UUID = 'not-a-uuid';

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────────────

let serverMock: ReturnType<typeof createMockSupabase>;
let adminMock: ReturnType<typeof createMockSupabase>;

function setupAuth(overrides?: { role?: string; userId?: string }) {
  mockRequireAuth.mockResolvedValue({
    user: { id: overrides?.userId ?? TEST_USER_ID, email: 'test@test.com' },
    supabase: serverMock.client,
    role: overrides?.role ?? 'CONSULTANT_APPROVED',
    status: 'ACTIVE',
  });
}

function setupAuthFailure() {
  mockRequireAuth.mockResolvedValue({ error: '로그인이 필요합니다.' });
}

const defaultParams = {
  sourceRoadmapVersionId: SOURCE_ROADMAP_ID,
  targetProjectId: TARGET_PROJECT_ID,
};

beforeEach(async () => {
  serverMock = createMockSupabase();
  adminMock = createMockSupabase();

  const { createAdminClient } = await import('@/lib/supabase/admin');
  vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── copyRoadmapToProject ────────────────────────────────────────────────────

describe('copyRoadmapToProject', () => {
  it('미인증 → error 반환', async () => {
    setupAuthFailure();

    const result = await copyRoadmapToProject(defaultParams);

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('UUID 검증 실패 → error 반환', async () => {
    setupAuth();

    const result = await copyRoadmapToProject({
      sourceRoadmapVersionId: INVALID_UUID,
      targetProjectId: TARGET_PROJECT_ID,
    });

    expect(result).toEqual({ success: false, error: '유효하지 않은 요청입니다.' });
  });

  it('비컨설턴트 → error 반환', async () => {
    setupAuth({ role: 'OPS_ADMIN' });

    const result = await copyRoadmapToProject(defaultParams);

    expect(result).toEqual({
      success: false,
      error: '컨설턴트만 로드맵을 가져올 수 있습니다.',
    });
  });

  it('미배정 프로젝트 → error 반환', async () => {
    setupAuth();
    // supabase.from('projects').select().eq().single() → 프로젝트 없음
    serverMock.addResult({ data: null, error: null });
    // adminClient: 원본 로드맵 조회 (병렬 실행되므로 결과 필요)
    adminMock.addResult({ data: null, error: null });

    const result = await copyRoadmapToProject(defaultParams);

    expect(result).toEqual({ success: false, error: '배정되지 않은 프로젝트입니다.' });
  });

  it('프로젝트는 있으나 다른 컨설턴트에게 배정 → error 반환', async () => {
    setupAuth({ userId: TEST_USER_ID });
    serverMock.addResult({
      data: {
        id: TARGET_PROJECT_ID,
        assigned_consultant_id: 'another-user-id',
        company_name: '기업A',
      },
      error: null,
    });
    // adminClient: 원본 로드맵 조회 (병렬 실행되므로 결과 필요)
    adminMock.addResult({ data: null, error: null });

    const result = await copyRoadmapToProject(defaultParams);

    expect(result).toEqual({ success: false, error: '배정되지 않은 프로젝트입니다.' });
  });

  it('원본 로드맵 미존재 → error 반환', async () => {
    setupAuth();
    // 1. supabase: 프로젝트 배정 확인 → 성공
    serverMock.addResult({
      data: {
        id: TARGET_PROJECT_ID,
        assigned_consultant_id: TEST_USER_ID,
        company_name: '기업A',
      },
      error: null,
    });
    // 2. adminClient: 원본 로드맵 조회 → 없음
    adminMock.addResult({ data: null, error: null });

    const result = await copyRoadmapToProject(defaultParams);

    expect(result).toEqual({ success: false, error: '원본 로드맵을 찾을 수 없습니다.' });
  });

  it('기존 버전 존재 → 다음 버전 번호 (version_number + 1)', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    const { revalidatePath } = await import('next/cache');
    setupAuth();

    // 1. supabase: 프로젝트 배정 확인
    serverMock.addResult({
      data: {
        id: TARGET_PROJECT_ID,
        assigned_consultant_id: TEST_USER_ID,
        company_name: '기업A',
      },
      error: null,
    });
    // 2. adminClient: 원본 로드맵 조회
    adminMock.addResult({
      data: {
        diagnosis_summary: '진단 요약',
        roadmap_matrix: [{ m: 1 }],
        pbl_course: { course_name: 'PBL' },
        courses: [{ topic: '토픽' }],
        projects: { company_name: '원본기업' },
      },
      error: null,
    });
    // 3. adminClient: 기존 버전 조회 → 버전 3 존재
    adminMock.addResult({
      data: [{ version_number: 3 }],
      error: null,
    });
    // 4. adminClient: insert 새 버전 → 성공 (version_number=4)
    adminMock.addResult({
      data: { id: NEW_VERSION_ID, version_number: 4 },
      error: null,
    });

    const result = await copyRoadmapToProject(defaultParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.newVersionId).toBe(NEW_VERSION_ID);
      expect(result.data.versionNumber).toBe(4);
    }

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'ROADMAP_COPY',
        targetType: 'roadmap_version',
        targetId: NEW_VERSION_ID,
        meta: expect.objectContaining({
          sourceRoadmapVersionId: SOURCE_ROADMAP_ID,
          sourceCompany: '원본기업',
          targetProjectId: TARGET_PROJECT_ID,
          targetCompany: '기업A',
          newVersionNumber: 4,
        }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/consultant/projects/${TARGET_PROJECT_ID}/roadmap`);
    expect(revalidatePath).toHaveBeenCalledWith('/gallery');
  });

  it('기존 버전 없음 → 버전 1', async () => {
    setupAuth();

    // 1. supabase: 프로젝트 배정 확인
    serverMock.addResult({
      data: {
        id: TARGET_PROJECT_ID,
        assigned_consultant_id: TEST_USER_ID,
        company_name: '기업B',
      },
      error: null,
    });
    // 2. adminClient: 원본 로드맵 조회
    adminMock.addResult({
      data: {
        diagnosis_summary: '진단',
        roadmap_matrix: [],
        pbl_course: null,
        courses: [],
        projects: { company_name: '원본기업' },
      },
      error: null,
    });
    // 3. adminClient: 기존 버전 조회 → 빈 배열
    adminMock.addResult({ data: [], error: null });
    // 4. adminClient: insert → 성공 (version_number=1)
    adminMock.addResult({
      data: { id: NEW_VERSION_ID, version_number: 1 },
      error: null,
    });

    const result = await copyRoadmapToProject(defaultParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.versionNumber).toBe(1);
    }
  });

  it('DB insert 실패 → error 반환', async () => {
    setupAuth();

    // 1. supabase: 프로젝트 배정 확인
    serverMock.addResult({
      data: {
        id: TARGET_PROJECT_ID,
        assigned_consultant_id: TEST_USER_ID,
        company_name: '기업C',
      },
      error: null,
    });
    // 2. adminClient: 원본 로드맵 조회
    adminMock.addResult({
      data: {
        diagnosis_summary: '진단',
        roadmap_matrix: [],
        pbl_course: null,
        courses: [],
        projects: { company_name: '원본기업' },
      },
      error: null,
    });
    // 3. adminClient: 기존 버전 조회
    adminMock.addResult({ data: [], error: null });
    // 4. adminClient: insert → 실패
    adminMock.addResult({ data: null, error: { message: 'insert failed' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await copyRoadmapToProject(defaultParams);

    expect(result).toEqual({
      success: false,
      error: '로드맵 복제 중 오류가 발생했습니다.',
    });
    consoleSpy.mockRestore();
  });

  it('targetProjectId UUID 검증 실패 → error 반환', async () => {
    setupAuth();

    const result = await copyRoadmapToProject({
      sourceRoadmapVersionId: SOURCE_ROADMAP_ID,
      targetProjectId: INVALID_UUID,
    });

    expect(result).toEqual({ success: false, error: '유효하지 않은 요청입니다.' });
  });

  it('USER_PENDING 역할 → 비컨설턴트 에러', async () => {
    setupAuth({ role: 'USER_PENDING' });

    const result = await copyRoadmapToProject(defaultParams);

    expect(result).toEqual({
      success: false,
      error: '컨설턴트만 로드맵을 가져올 수 있습니다.',
    });
  });

  it('SYSTEM_ADMIN 역할 → 비컨설턴트 에러', async () => {
    setupAuth({ role: 'SYSTEM_ADMIN' });

    const result = await copyRoadmapToProject(defaultParams);

    expect(result).toEqual({
      success: false,
      error: '컨설턴트만 로드맵을 가져올 수 있습니다.',
    });
  });

  it('기존 버전 조회 결과가 null → 버전 1', async () => {
    setupAuth();

    serverMock.addResult({
      data: {
        id: TARGET_PROJECT_ID,
        assigned_consultant_id: TEST_USER_ID,
        company_name: '기업D',
      },
      error: null,
    });
    adminMock.addResult({
      data: {
        diagnosis_summary: '진단',
        roadmap_matrix: [],
        pbl_course: null,
        courses: [],
        projects: { company_name: '원본기업' },
      },
      error: null,
    });
    // null data (no versions)
    adminMock.addResult({ data: null, error: null });
    // insert → 성공
    adminMock.addResult({
      data: { id: NEW_VERSION_ID, version_number: 1 },
      error: null,
    });

    const result = await copyRoadmapToProject(defaultParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.versionNumber).toBe(1);
    }
  });
});
