/**
 * gallery/actions/queries.ts 테스트
 *
 * fetchGalleryRoadmaps:
 *   - 미인증 → error
 *   - role null → error
 *   - Zod 검증 실패 → error
 *   - 컨설턴트 → is_shared=true + status=FINAL 필터 확인
 *   - 관리자 → 전체 조회 (필터 없이)
 *   - 관리자 필터: status, isShared=true, isShared=false, consultantId
 *   - industry 필터
 *   - search 필터
 *   - sort=latest → order(created_at, desc)
 *   - sort=popular → 클라이언트 정렬
 *   - 데이터 변환 + isLiked 판정
 *   - DB 에러
 *
 * fetchRoadmapDetail:
 *   - 미인증 → error
 *   - 미존재/DB에러 → error
 *   - 컨설턴트 비공유 차단
 *   - 컨설턴트 비FINAL 차단
 *   - 관리자 전체 접근
 *   - 성공 + 데이터 변환
 *
 * fetchEligibleProjects:
 *   - 미인증 → error
 *   - 배정 프로젝트 + 적격 상태만
 *   - DB 에러
 *   - 빈 결과
 *
 * fetchConsultantOptions:
 *   - 미인증 → error
 *   - 비관리자 차단
 *   - 관리자 → CONSULTANT_APPROVED 목록
 *   - DB 에러
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchGalleryRoadmaps,
  fetchRoadmapDetail,
  fetchEligibleProjects,
  fetchConsultantOptions,
} from './queries';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockRequireAuth = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
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

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────────────

let serverMock: ReturnType<typeof createMockSupabase>;
let adminMock: ReturnType<typeof createMockSupabase>;

function setupAuth(overrides?: { role?: string | null; userId?: string }) {
  mockRequireAuth.mockResolvedValue({
    user: { id: overrides?.userId ?? TEST_USER_ID, email: 'test@test.com' },
    supabase: serverMock.client,
    role: overrides?.role !== undefined ? overrides.role : 'OPS_ADMIN',
    status: 'ACTIVE',
  });
}

function setupAuthFailure() {
  mockRequireAuth.mockResolvedValue({ error: '로그인이 필요합니다.' });
}

/** 갤러리 조회용 mock 데이터 1행 (roadmap_likes는 aggregate count 형식) */
function makeRoadmapRow(overrides?: Record<string, unknown>) {
  return {
    id: TEST_ROADMAP_ID,
    status: 'FINAL',
    is_shared: true,
    diagnosis_summary: '테스트 진단 요약',
    pbl_course: { course_name: 'AI 실습', total_hours: 40 },
    courses: [{ topic: '머신러닝 데이터분석' }],
    version_number: 1,
    created_at: '2026-01-01T00:00:00Z',
    created_by: TEST_USER_ID,
    projects: {
      company_name: '테스트기업',
      industry: '제조/생산',
      company_size: '중소기업',
    },
    users: { name: '홍길동' },
    roadmap_likes: [{ count: 1 }],
    ...overrides,
  };
}

beforeEach(async () => {
  serverMock = createMockSupabase();
  adminMock = createMockSupabase();

  const { createAdminClient } = await import('@/lib/supabase/admin');
  vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── fetchGalleryRoadmaps ────────────────────────────────────────────────────

describe('fetchGalleryRoadmaps', () => {
  it('미인증 → error 반환', async () => {
    setupAuthFailure();

    const result = await fetchGalleryRoadmaps();

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('role null → error 반환', async () => {
    setupAuth({ role: null });

    const result = await fetchGalleryRoadmaps();

    expect(result).toEqual({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
  });

  it('Zod 검증 실패 → error 반환', async () => {
    setupAuth();

    // sort에 유효하지 않은 값
    const result = await fetchGalleryRoadmaps({ sort: 'invalid_sort_value' });

    expect(result).toEqual({ success: false, error: '잘못된 필터 값입니다.' });
  });

  it('컨설턴트 → is_shared=true, status=FINAL 필터 확인', async () => {
    setupAuth({ role: 'CONSULTANT_APPROVED' });
    adminMock.addResult({ data: [], error: null });

    await fetchGalleryRoadmaps();

    expect(adminMock.chainable.eq).toHaveBeenCalledWith('is_shared', true);
    expect(adminMock.chainable.eq).toHaveBeenCalledWith('status', 'FINAL');
  });

  it('관리자 → 필터 없이 전체 조회', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    adminMock.addResult({ data: [], error: null });

    await fetchGalleryRoadmaps();

    // 컨설턴트 전용 필터가 호출되지 않아야 함
    // eq가 호출되지 않았는지 확인 (is_shared, status 컨설턴트 필터)
    const eqCalls = adminMock.chainable.eq.mock.calls;
    const hasSharedFilter = eqCalls.some(
      (c: unknown[]) => c[0] === 'is_shared' && c[1] === true,
    );
    expect(hasSharedFilter).toBe(false);
  });

  it('관리자 status 필터 적용', async () => {
    setupAuth({ role: 'SYSTEM_ADMIN' });
    adminMock.addResult({ data: [], error: null });

    await fetchGalleryRoadmaps({ status: 'DRAFT' });

    expect(adminMock.chainable.eq).toHaveBeenCalledWith('status', 'DRAFT');
  });

  it('관리자 isShared=true 필터 적용', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    adminMock.addResult({ data: [], error: null });

    await fetchGalleryRoadmaps({ isShared: 'true' });

    expect(adminMock.chainable.eq).toHaveBeenCalledWith('is_shared', true);
  });

  it('관리자 isShared=false 필터 적용', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    adminMock.addResult({ data: [], error: null });

    await fetchGalleryRoadmaps({ isShared: 'false' });

    expect(adminMock.chainable.eq).toHaveBeenCalledWith('is_shared', false);
  });

  it('관리자 consultantId 필터 적용', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    adminMock.addResult({ data: [], error: null });

    const consultantId = '550e8400-e29b-41d4-a716-446655440099';
    await fetchGalleryRoadmaps({ consultantId });

    expect(adminMock.chainable.eq).toHaveBeenCalledWith('created_by', consultantId);
  });

  it('industry 필터 적용', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    adminMock.addResult({ data: [], error: null });

    await fetchGalleryRoadmaps({ industry: '제조' });

    expect(adminMock.chainable.eq).toHaveBeenCalledWith('projects.industry', '제조');
  });

  it('search 필터 → or ilike 호출', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    adminMock.addResult({ data: [], error: null });

    await fetchGalleryRoadmaps({ search: '테스트' });

    expect(adminMock.chainable.or).toHaveBeenCalled();
  });

  it('sort=latest → order(created_at, desc)', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    adminMock.addResult({ data: [], error: null });

    await fetchGalleryRoadmaps({ sort: 'latest' });

    expect(adminMock.chainable.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('sort=popular → 클라이언트 정렬 (likeCount 내림차순)', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    const row1 = makeRoadmapRow({ id: 'r-1', roadmap_likes: [{ count: 0 }] });
    const row2 = makeRoadmapRow({ id: 'r-2', roadmap_likes: [{ count: 2 }] });
    // 1차: 메인 쿼리 결과
    adminMock.addResult({ data: [row1, row2], error: null });
    // 2차: 사용자 좋아요 일괄 조회 결과
    adminMock.addResult({ data: [], error: null });

    const result = await fetchGalleryRoadmaps({ sort: 'popular' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].id).toBe('r-2'); // likeCount=2가 먼저
      expect(result.data[1].id).toBe('r-1'); // likeCount=0이 나중
    }
  });

  it('데이터 변환 + isLiked 판정', async () => {
    setupAuth({ role: 'OPS_ADMIN', userId: TEST_USER_ID });
    const row = makeRoadmapRow();
    // 1차: 메인 쿼리 결과
    adminMock.addResult({ data: [row], error: null });
    // 2차: 사용자 좋아요 일괄 조회 — 현재 유저가 이 로드맵에 좋아요함
    adminMock.addResult({ data: [{ roadmap_version_id: TEST_ROADMAP_ID }], error: null });

    const result = await fetchGalleryRoadmaps();

    expect(result.success).toBe(true);
    if (result.success) {
      const item = result.data[0];
      expect(item.id).toBe(TEST_ROADMAP_ID);
      expect(item.title).toBe('테스트기업 — AI 실습');
      expect(item.industry).toBe('제조/생산');
      expect(item.companySize).toBe('중소기업');
      expect(item.companyName).toBe('테스트기업');
      expect(item.diagnosisSummary).toBe('테스트 진단 요약');
      expect(item.pblCourseName).toBe('AI 실습');
      expect(item.pblTotalHours).toBe(40);
      expect(item.createdByName).toBe('홍길동');
      expect(item.likeCount).toBe(1);
      expect(item.isLiked).toBe(true); // 사용자 좋아요 일괄 조회에서 확인
      expect(item.isShared).toBe(true);
      expect(item.status).toBe('FINAL');
    }
  });

  it('pbl_course 없을 때 title 포맷 — "회사명 로드맵"', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    const row = makeRoadmapRow({ pbl_course: null });
    adminMock.addResult({ data: [row], error: null });
    // 사용자 좋아요 일괄 조회
    adminMock.addResult({ data: [], error: null });

    const result = await fetchGalleryRoadmaps();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].title).toBe('테스트기업 로드맵');
    }
  });

  it('creator 없을 때 createdByName → "알 수 없음"', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    const row = makeRoadmapRow({ users: null });
    adminMock.addResult({ data: [row], error: null });
    // 사용자 좋아요 일괄 조회
    adminMock.addResult({ data: [], error: null });

    const result = await fetchGalleryRoadmaps();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].createdByName).toBe('알 수 없음');
    }
  });

  it('DB 에러 → error 반환', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    adminMock.addResult({ data: null, error: { message: 'DB error' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await fetchGalleryRoadmaps();

    expect(result).toEqual({
      success: false,
      error: '갤러리를 불러오는 중 오류가 발생했습니다.',
    });
    consoleSpy.mockRestore();
  });
});

// ─── fetchRoadmapDetail ──────────────────────────────────────────────────────

describe('fetchRoadmapDetail', () => {
  it('미인증 → error 반환', async () => {
    setupAuthFailure();

    const result = await fetchRoadmapDetail(TEST_ROADMAP_ID);

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('role null → error 반환', async () => {
    setupAuth({ role: null });

    const result = await fetchRoadmapDetail(TEST_ROADMAP_ID);

    expect(result).toEqual({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
  });

  it('미존재(DB에러) → error 반환', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    adminMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await fetchRoadmapDetail(TEST_ROADMAP_ID);

    expect(result).toEqual({ success: false, error: '로드맵을 찾을 수 없습니다.' });
  });

  it('컨설턴트 비공유 차단', async () => {
    setupAuth({ role: 'CONSULTANT_APPROVED' });
    const row = makeRoadmapRow({
      is_shared: false,
      status: 'FINAL',
      roadmap_matrix: [],
    });
    adminMock.addResult({ data: row, error: null });

    const result = await fetchRoadmapDetail(TEST_ROADMAP_ID);

    expect(result).toEqual({ success: false, error: '접근 권한이 없습니다.' });
  });

  it('컨설턴트 비FINAL 차단', async () => {
    setupAuth({ role: 'CONSULTANT_APPROVED' });
    const row = makeRoadmapRow({
      is_shared: true,
      status: 'DRAFT',
      roadmap_matrix: [],
    });
    adminMock.addResult({ data: row, error: null });

    const result = await fetchRoadmapDetail(TEST_ROADMAP_ID);

    expect(result).toEqual({ success: false, error: '접근 권한이 없습니다.' });
  });

  it('관리자 → 비공유도 접근 가능', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    const row = makeRoadmapRow({
      is_shared: false,
      status: 'DRAFT',
      roadmap_matrix: [{ module: 'A' }],
    });
    adminMock.addResult({ data: row, error: null });
    // 사용자 좋아요 확인 (.maybeSingle())
    adminMock.addResult({ data: null, error: null });

    const result = await fetchRoadmapDetail(TEST_ROADMAP_ID);

    expect(result.success).toBe(true);
  });

  it('성공 + 데이터 변환', async () => {
    setupAuth({ role: 'OPS_ADMIN', userId: TEST_USER_ID });
    const row = makeRoadmapRow({ roadmap_matrix: [{ m: 1 }] });
    // 1차: 메인 쿼리 (.single())
    adminMock.addResult({ data: row, error: null });
    // 2차: 사용자 좋아요 확인 (.maybeSingle()) — 좋아요함
    adminMock.addResult({ data: { id: 'like-1' }, error: null });

    const result = await fetchRoadmapDetail(TEST_ROADMAP_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(TEST_ROADMAP_ID);
      expect(result.data.title).toBe('테스트기업 — AI 실습');
      expect(result.data.industry).toBe('제조/생산');
      expect(result.data.companySize).toBe('중소기업');
      expect(result.data.companyName).toBe('테스트기업');
      expect(result.data.createdByName).toBe('홍길동');
      expect(result.data.roadmapMatrix).toEqual([{ m: 1 }]);
      expect(result.data.likeCount).toBe(1);
      expect(result.data.isLiked).toBe(true);
      expect(result.data.versionNumber).toBe(1);
    }
  });
});

// ─── fetchEligibleProjects ───────────────────────────────────────────────────

describe('fetchEligibleProjects', () => {
  it('미인증 → error 반환', async () => {
    setupAuthFailure();

    const result = await fetchEligibleProjects();

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('배정 프로젝트 + 적격 상태만 조회 + 변환', async () => {
    setupAuth({ role: 'CONSULTANT_APPROVED' });
    serverMock.addResult({
      data: [
        { id: 'p-1', company_name: '기업A', status: 'INTERVIEWED' },
        { id: 'p-2', company_name: '기업B', status: 'FINALIZED' },
      ],
      error: null,
    });

    const result = await fetchEligibleProjects();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([
        { id: 'p-1', companyName: '기업A', status: 'INTERVIEWED' },
        { id: 'p-2', companyName: '기업B', status: 'FINALIZED' },
      ]);
    }

    // eq 호출 확인: assigned_consultant_id 필터
    expect(serverMock.chainable.eq).toHaveBeenCalledWith('assigned_consultant_id', TEST_USER_ID);
  });

  it('DB 에러 → error 반환', async () => {
    setupAuth({ role: 'CONSULTANT_APPROVED' });
    serverMock.addResult({ data: null, error: { message: 'DB error' } });

    const result = await fetchEligibleProjects();

    expect(result).toEqual({
      success: false,
      error: '프로젝트 목록을 불러오는 중 오류가 발생했습니다.',
    });
  });

  it('빈 결과 → 빈 배열 반환', async () => {
    setupAuth({ role: 'CONSULTANT_APPROVED' });
    serverMock.addResult({ data: [], error: null });

    const result = await fetchEligibleProjects();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });
});

// ─── fetchConsultantOptions ──────────────────────────────────────────────────

describe('fetchConsultantOptions', () => {
  it('미인증 → error 반환', async () => {
    setupAuthFailure();

    const result = await fetchConsultantOptions();

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('비관리자(컨설턴트) → 차단', async () => {
    setupAuth({ role: 'CONSULTANT_APPROVED' });

    const result = await fetchConsultantOptions();

    expect(result).toEqual({ success: false, error: '관리자만 접근할 수 있습니다.' });
  });

  it('role null → 차단', async () => {
    setupAuth({ role: null });

    const result = await fetchConsultantOptions();

    expect(result).toEqual({ success: false, error: '관리자만 접근할 수 있습니다.' });
  });

  it('관리자 → CONSULTANT_APPROVED 목록 반환', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    serverMock.addResult({
      data: [
        { id: 'c-1', name: '컨설턴트A' },
        { id: 'c-2', name: '컨설턴트B' },
      ],
      error: null,
    });

    const result = await fetchConsultantOptions();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([
        { id: 'c-1', name: '컨설턴트A' },
        { id: 'c-2', name: '컨설턴트B' },
      ]);
    }

    expect(serverMock.chainable.eq).toHaveBeenCalledWith('role', 'CONSULTANT_APPROVED');
  });

  it('SYSTEM_ADMIN도 관리자 접근 가능', async () => {
    setupAuth({ role: 'SYSTEM_ADMIN' });
    serverMock.addResult({ data: [], error: null });

    const result = await fetchConsultantOptions();

    expect(result.success).toBe(true);
  });

  it('DB 에러 → error 반환', async () => {
    setupAuth({ role: 'OPS_ADMIN' });
    serverMock.addResult({ data: null, error: { message: 'DB error' } });

    const result = await fetchConsultantOptions();

    expect(result).toEqual({
      success: false,
      error: '컨설턴트 목록을 불러오는 중 오류가 발생했습니다.',
    });
  });
});
