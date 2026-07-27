/**
 * ops/projects/actions/queries.ts 테스트
 *
 * 테스트 대상:
 * - fetchProjects: 프로젝트 목록 조회 (페이지네이션, 검색, 필터)
 * - fetchProjectTimeline: 프로젝트 타임라인 조회
 * - fetchProjectsWithTimeline: 타임라인 포함 프로젝트 목록 조회
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

// ─── 테스트 대상 import ──────────────────────────────────────────────────────

import {
  fetchProjects,
  fetchProjectTimeline,
  fetchProjectsWithTimeline,
  fetchRoadmapProjectsForLink,
} from './queries';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';

function createAuthSuccess() {
  const mock = createMockSupabase({ authUser: { id: TEST_USER_ID } });
  return {
    user: { id: TEST_USER_ID, email: 'ops@test.com' },
    supabase: mock.client,
    role: 'OPS_ADMIN',
    status: 'ACTIVE',
    _mock: mock,
  };
}

// ─── fetchProjects ──────────────────────────────────────────────────────────

describe('fetchProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 시 빈 결과 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '로그인이 필요합니다.' });

    const result = await fetchProjects();
    expect(result).toEqual({ projects: [], total: 0, totalPages: 0, page: 1 });
  });

  it('기본 파라미터로 프로젝트 목록 조회', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({
      data: [
        {
          id: 'p1',
          company_name: 'A사',
          industry: '제조업',
          company_size: '50-299',
          status: 'NEW',
          created_at: '2026-01-15',
          contact_email: 'a@a.com',
          assigned_consultant: null,
          created_by_user: { id: 'u1', name: '관리자A' },
        },
      ],
      error: null,
      count: 1,
    });

    const result = await fetchProjects();
    expect(result.projects).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
    expect(result.projects[0].company_name).toBe('A사');
  });

  it('검색 조건 적용 시 ilike 필터 사용', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({ data: [], error: null, count: 0 });

    await fetchProjects({ search: '테스트' });
    // or 필터가 호출되었는지 확인
    expect(auth._mock.chainable.or).toHaveBeenCalled();
  });

  it('상태 필터 적용', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({ data: [], error: null, count: 0 });

    await fetchProjects({ status: 'ASSIGNED' });
    expect(auth._mock.chainable.eq).toHaveBeenCalledWith('status', 'ASSIGNED');
  });

  it('업종 필터 적용', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({ data: [], error: null, count: 0 });

    await fetchProjects({ industry: '제조업' });
    expect(auth._mock.chainable.eq).toHaveBeenCalledWith('industry', '제조업');
  });

  it('페이지네이션 (page 2, limit 5)', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({ data: [], error: null, count: 15 });

    const result = await fetchProjects({ page: 2, limit: 5 });
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(2);
    expect(auth._mock.chainable.range).toHaveBeenCalledWith(5, 9);
  });

  it('DB 에러 시 빈 결과 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({ data: null, error: { message: 'DB Error' }, count: 0 });

    const result = await fetchProjects();
    expect(result).toEqual({ projects: [], total: 0, totalPages: 0, page: 1 });
  });

  it('조인 결과가 배열인 경우 첫 번째 요소 추출', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({
      data: [
        {
          id: 'p1',
          company_name: 'A사',
          industry: '제조업',
          company_size: '50-299',
          status: 'ASSIGNED',
          created_at: '2026-01-15',
          contact_email: 'a@a.com',
          assigned_consultant: [{ id: 'c1', name: '컨설턴트A', email: 'c@test.com' }],
          created_by_user: [{ id: 'u1', name: '관리자A' }],
        },
      ],
      error: null,
      count: 1,
    });

    const result = await fetchProjects();
    expect(result.projects[0].assigned_consultant).toEqual({
      id: 'c1',
      name: '컨설턴트A',
      email: 'c@test.com',
    });
    expect(result.projects[0].created_by_user).toEqual({ id: 'u1', name: '관리자A' });
  });
});

// ─── fetchProjectTimeline ───────────────────────────────────────────────────

describe('fetchProjectTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 시 null 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '로그인이 필요합니다.' });

    const result = await fetchProjectTimeline('p1');
    expect(result).toBeNull();
  });

  it('프로젝트 미존재 시 null 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    // 첫 번째 쿼리 (프로젝트 조회) 실패
    auth._mock.addResult({ data: null, error: { message: 'Not found' } });

    const result = await fetchProjectTimeline('non-existent');
    expect(result).toBeNull();
  });

  it('NEW 상태 프로젝트 타임라인 (최소 데이터)', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    // 1. 프로젝트 기본 정보
    auth._mock.addResult({
      data: { id: 'p1', company_name: 'A사', status: 'NEW', created_at: '2026-01-15T09:00:00Z' },
      error: null,
    });

    // 2~7. 나머지 6개 병렬 쿼리 (모두 빈 결과)
    for (let i = 0; i < 6; i++) {
      auth._mock.addResult({ data: null, error: null });
    }

    const result = await fetchProjectTimeline('p1');
    expect(result).not.toBeNull();
    expect(result!.companyName).toBe('A사');
    expect(result!.currentStatus).toBe('NEW');
    expect(result!.steps).toHaveLength(6);
    expect(result!.steps[0].isCompleted).toBe(true); // NEW는 완료
    expect(result!.steps[1].isCurrent).toBe(true); // DIAGNOSED가 현재 단계
    expect(result!.assignments).toEqual([]);
  });

  it('FINALIZED 상태 프로젝트 타임라인 (모든 단계 완료)', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    // 1. 프로젝트 기본 정보
    auth._mock.addResult({
      data: {
        id: 'p1',
        company_name: 'A사',
        status: 'FINALIZED',
        created_at: '2026-01-15T09:00:00Z',
      },
      error: null,
    });

    // Promise.all 내 큐 소비 순서: single()은 동기, thenable(.then)은 비동기로 소비
    // selfAssessment(.single), matchRec(.single), interview(.single),
    // roadmapDraft(.single), roadmapFinal(.single), allAssignments(.then)
    // 2. selfAssessment
    auth._mock.addResult({
      data: { created_at: '2026-01-16T09:00:00Z', scores: { total_score: 75 } },
      error: null,
    });
    // 3. matchingRecommendation
    auth._mock.addResult({ data: { created_at: '2026-01-17T09:00:00Z' }, error: null });
    // 4. interview (single() — consumed before allAssignments thenable)
    auth._mock.addResult({
      data: { created_at: '2026-01-20T09:00:00Z', interview_date: '2026-01-20' },
      error: null,
    });
    // 5. roadmapDraft
    auth._mock.addResult({
      data: { created_at: '2026-01-25T09:00:00Z', version_number: 2 },
      error: null,
    });
    // 6. roadmapFinal
    auth._mock.addResult({
      data: { finalized_at: '2026-02-01T09:00:00Z' },
      error: null,
    });
    // 7. allAssignments (thenable — consumed last via .then())
    auth._mock.addResult({
      data: [
        {
          id: 'a1',
          assignment_reason: '매칭',
          is_current: true,
          assigned_at: '2026-01-18T09:00:00Z',
          unassigned_at: null,
          unassignment_reason: null,
          consultant: { id: 'c1', name: '컨설턴트A', email: 'c@test.com' },
          assigned_by_user: { id: 'u1', name: '관리자A' },
        },
      ],
      error: null,
    });

    const result = await fetchProjectTimeline('p1');
    expect(result).not.toBeNull();
    expect(result!.steps.every((s) => s.isCompleted)).toBe(true);
    expect(result!.steps.every((s) => !s.isCurrent)).toBe(true);
    expect(result!.assignments).toHaveLength(1);
    expect(result!.steps[2].detail).toContain('컨설턴트A');
    expect(result!.steps[4].detail).toContain('버전 2');
  });
});

// ─── fetchProjectsWithTimeline ──────────────────────────────────────────────

describe('fetchProjectsWithTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('인증 실패 시 빈 결과 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '로그인이 필요합니다.' });

    const result = await fetchProjectsWithTimeline();
    expect(result).toEqual({ projects: [], total: 0, totalPages: 0, page: 1 });
  });

  it('DB 에러 시 빈 결과 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);
    auth._mock.addResult({ data: null, error: { message: 'DB Error' }, count: 0 });

    const result = await fetchProjectsWithTimeline();
    expect(result).toEqual({ projects: [], total: 0, totalPages: 0, page: 1 });
  });

  it('days_in_current_status 계산', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({
      data: [
        {
          id: 'p1',
          company_name: 'A사',
          industry: '제조업',
          status: 'ASSIGNED',
          created_at: '2026-01-15',
          updated_at: '2026-03-01T00:00:00Z',
          contact_email: 'a@a.com',
          assigned_consultant: null,
        },
      ],
      error: null,
      count: 1,
    });

    const result = await fetchProjectsWithTimeline();
    expect(result.projects[0].days_in_current_status).toBe(19); // 3/20 - 3/01
  });

  it('statuses 배열 필터 (다중 상태)', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);
    auth._mock.addResult({ data: [], error: null, count: 0 });

    await fetchProjectsWithTimeline({ statuses: ['NEW', 'ASSIGNED'] });
    expect(auth._mock.chainable.in).toHaveBeenCalledWith('status', ['NEW', 'ASSIGNED']);
  });

  it('statuses가 비어있으면 단일 status 사용', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);
    auth._mock.addResult({ data: [], error: null, count: 0 });

    await fetchProjectsWithTimeline({ statuses: [], status: 'NEW' });
    expect(auth._mock.chainable.eq).toHaveBeenCalledWith('status', 'NEW');
  });

  it('검색 + 업종 필터 조합', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);
    auth._mock.addResult({ data: [], error: null, count: 0 });

    await fetchProjectsWithTimeline({ search: '테스트', industry: '제조업' });
    expect(auth._mock.chainable.or).toHaveBeenCalled();
    expect(auth._mock.chainable.eq).toHaveBeenCalledWith('industry', '제조업');
  });
});

// ─── fetchRoadmapProjectsForLink (PR2) ────────────────────────────────────────

describe('fetchRoadmapProjectsForLink', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 시 빈 배열', async () => {
    mockAuthResult.mockResolvedValue({ error: '로그인이 필요합니다.' });
    const result = await fetchRoadmapProjectsForLink();
    expect(result).toEqual([]);
  });

  it('FINAL 로드맵 보유 ROADMAP 프로젝트만 필터해 매핑 반환', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    adminMock.addResult({
      data: [
        {
          id: 'r1',
          company_name: 'A사',
          business_reg_no: '111',
          roadmap_versions: [{ status: 'FINAL' }],
        },
        {
          id: 'r2',
          company_name: 'B사',
          business_reg_no: null,
          roadmap_versions: [{ status: 'FINAL' }],
        },
      ],
      error: null,
    });

    const result = await fetchRoadmapProjectsForLink();

    expect(result).toEqual([
      { id: 'r1', company_name: 'A사', business_reg_no: '111' },
      { id: 'r2', company_name: 'B사', business_reg_no: null },
    ]);
    // 인너 조인 + 필터 적용 확인
    expect(adminMock.chainable.select).toHaveBeenCalledWith(
      expect.stringContaining('roadmap_versions!inner')
    );
    expect(adminMock.chainable.eq).toHaveBeenCalledWith('track', 'ROADMAP');
    expect(adminMock.chainable.eq).toHaveBeenCalledWith('roadmap_versions.status', 'FINAL');
  });

  it('조인으로 중복된 프로젝트 id는 제거', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    adminMock.addResult({
      data: [
        {
          id: 'r1',
          company_name: 'A사',
          business_reg_no: '111',
          roadmap_versions: [{ status: 'FINAL' }],
        },
        {
          id: 'r1',
          company_name: 'A사',
          business_reg_no: '111',
          roadmap_versions: [{ status: 'FINAL' }],
        },
      ],
      error: null,
    });

    const result = await fetchRoadmapProjectsForLink();
    expect(result).toHaveLength(1);
  });

  it('쿼리 에러 시 빈 배열', async () => {
    mockAuthResult.mockResolvedValue(createAuthSuccess());
    adminMock.addResult({ data: null, error: { message: 'boom' } });

    const result = await fetchRoadmapProjectsForLink();
    expect(result).toEqual([]);
  });
});
