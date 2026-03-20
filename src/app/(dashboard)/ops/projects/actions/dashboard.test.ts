/**
 * ops/projects/actions/dashboard.ts 테스트
 *
 * 테스트 대상:
 * - fetchProjectStats: 상태별 프로젝트 통계
 * - fetchMonthlyCompletions: 월별 로드맵 확정 현황
 * - fetchConsultantProgress: 컨설턴트별 프로젝트 진행 현황
 * - fetchStalledProjects: 정체 프로젝트 조회
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
  fetchProjectStats,
  fetchMonthlyCompletions,
  fetchConsultantProgress,
  fetchStalledProjects,
} from './dashboard';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';

function createAuthSuccess() {
  const mock = createMockSupabase({ authUser: { id: TEST_USER_ID } });
  return { user: { id: TEST_USER_ID, email: 'ops@test.com' }, supabase: mock.client, role: 'OPS_ADMIN', status: 'ACTIVE', _mock: mock };
}

// ─── fetchProjectStats ──────────────────────────────────────────────────────

describe('fetchProjectStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 시 빈 통계 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '로그인이 필요합니다.' });

    const result = await fetchProjectStats();
    expect(result).toEqual({ total: 0, byStatus: {} });
  });

  it('프로젝트 데이터로 상태별 통계 계산', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);
    auth._mock.addResult({
      data: [
        { status: 'NEW' },
        { status: 'NEW' },
        { status: 'ASSIGNED' },
        { status: 'FINALIZED' },
      ],
      error: null,
    });

    const result = await fetchProjectStats();
    expect(result.total).toBe(4);
    expect(result.byStatus).toEqual({ NEW: 2, ASSIGNED: 1, FINALIZED: 1 });
  });

  it('DB 에러 시 빈 통계 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);
    auth._mock.addResult({ data: null, error: { message: 'DB Error' } });

    const result = await fetchProjectStats();
    expect(result).toEqual({ total: 0, byStatus: {} });
  });

  it('프로젝트 없을 때 빈 통계', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);
    auth._mock.addResult({ data: [], error: null });

    const result = await fetchProjectStats();
    expect(result).toEqual({ total: 0, byStatus: {} });
  });
});

// ─── fetchMonthlyCompletions ────────────────────────────────────────────────

describe('fetchMonthlyCompletions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 시 빈 배열 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '로그인이 필요합니다.' });

    const result = await fetchMonthlyCompletions();
    expect(result).toEqual([]);
  });

  it('DB 에러 시 빈 배열 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);
    auth._mock.addResult({ data: null, error: { message: 'DB Error' } });

    const result = await fetchMonthlyCompletions();
    expect(result).toEqual([]);
  });

  it('월별 확정 현황 집계 (6개월)', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    auth._mock.addResult({
      data: [
        { finalized_at: now.toISOString() },
        { finalized_at: now.toISOString() },
      ],
      error: null,
    });

    const result = await fetchMonthlyCompletions();
    expect(result).toHaveLength(6);

    // 현재 월의 count 확인
    const currentMonthEntry = result.find(r => r.month === currentMonth);
    expect(currentMonthEntry?.count).toBe(2);
  });

  it('finalized_at이 null인 항목은 무시', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);
    auth._mock.addResult({
      data: [{ finalized_at: null }],
      error: null,
    });

    const result = await fetchMonthlyCompletions();
    expect(result).toHaveLength(6);
    expect(result.every(r => r.count === 0)).toBe(true);
  });

  it('빈 데이터 시 모든 월 0', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);
    auth._mock.addResult({ data: [], error: null });

    const result = await fetchMonthlyCompletions();
    expect(result).toHaveLength(6);
    expect(result.every(r => r.count === 0)).toBe(true);
  });
});

// ─── fetchConsultantProgress ────────────────────────────────────────────────

describe('fetchConsultantProgress', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 시 빈 배열 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '로그인이 필요합니다.' });

    const result = await fetchConsultantProgress();
    expect(result).toEqual([]);
  });

  it('컨설턴트 조회 에러 시 빈 배열', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    // adminMock에 두 결과 추가 (병렬 Promise.all)
    adminMock.addResult({ data: null, error: { message: 'Error' } });
    adminMock.addResult({ data: [], error: null });

    const result = await fetchConsultantProgress();
    expect(result).toEqual([]);
  });

  it('프로젝트 조회 에러 시 빈 배열', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({ data: [{ id: 'c1', name: '컨설턴트A', email: 'a@test.com' }], error: null });
    adminMock.addResult({ data: null, error: { message: 'Error' } });

    const result = await fetchConsultantProgress();
    expect(result).toEqual([]);
  });

  it('컨설턴트별 상태 통계 정상 계산', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({
      data: [
        { id: 'c1', name: '컨설턴트A', email: 'a@test.com' },
        { id: 'c2', name: '컨설턴트B', email: 'b@test.com' },
      ],
      error: null,
    });
    adminMock.addResult({
      data: [
        { assigned_consultant_id: 'c1', status: 'ASSIGNED' },
        { assigned_consultant_id: 'c1', status: 'INTERVIEWED' },
        { assigned_consultant_id: 'c1', status: 'FINALIZED' },
        { assigned_consultant_id: 'c2', status: 'ROADMAP_DRAFTED' },
      ],
      error: null,
    });

    const result = await fetchConsultantProgress();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('c1'); // total 3, 가장 많음
    expect(result[0].assigned).toBe(1);
    expect(result[0].interviewing).toBe(1);
    expect(result[0].completed).toBe(1);
    expect(result[0].total).toBe(3);
    expect(result[1].id).toBe('c2');
    expect(result[1].drafting).toBe(1);
    expect(result[1].total).toBe(1);
  });

  it('담당 프로젝트 없는 컨설턴트는 제외', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({
      data: [
        { id: 'c1', name: '컨설턴트A', email: 'a@test.com' },
        { id: 'c2', name: '컨설턴트B', email: 'b@test.com' },
      ],
      error: null,
    });
    adminMock.addResult({
      data: [{ assigned_consultant_id: 'c1', status: 'ASSIGNED' }],
      error: null,
    });

    const result = await fetchConsultantProgress();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c1');
  });

  it('알 수 없는 상태는 카운팅되지 않음 (total에만 포함)', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({
      data: [{ id: 'c1', name: '컨설턴트A', email: 'a@test.com' }],
      error: null,
    });
    adminMock.addResult({
      data: [{ assigned_consultant_id: 'c1', status: 'NEW' }],
      error: null,
    });

    const result = await fetchConsultantProgress();
    expect(result).toHaveLength(1);
    expect(result[0].total).toBe(1);
    expect(result[0].assigned).toBe(0);
    expect(result[0].interviewing).toBe(0);
    expect(result[0].drafting).toBe(0);
    expect(result[0].completed).toBe(0);
  });
});

// ─── fetchStalledProjects ───────────────────────────────────────────────────

describe('fetchStalledProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('인증 실패 시 빈 배열 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '로그인이 필요합니다.' });

    const result = await fetchStalledProjects();
    expect(result).toEqual([]);
  });

  it('DB 에러 시 빈 배열 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);
    auth._mock.addResult({ data: null, error: { message: 'DB Error' } });

    const result = await fetchStalledProjects();
    expect(result).toEqual([]);
  });

  it('정체 프로젝트 필터링 (minDays 기준)', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({
      data: [
        {
          id: 'p1', company_name: 'A사', contact_email: 'a@a.com',
          status: 'ASSIGNED', updated_at: '2026-02-01T00:00:00Z',
          assigned_consultant: { id: 'c1', name: '컨설턴트A' },
        },
        {
          id: 'p2', company_name: 'B사', contact_email: 'b@b.com',
          status: 'NEW', updated_at: '2026-03-15T00:00:00Z', // 5일 전
          assigned_consultant: null,
        },
      ],
      error: null,
    });

    const result = await fetchStalledProjects(20);
    // p1: 47일 정체 (>=20), p2: 5일 (< 20)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
    expect(result[0].days_stalled).toBe(47);
  });

  it('severity 구분: 30일 이상 high, 미만 medium', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({
      data: [
        {
          id: 'p1', company_name: 'A사', contact_email: 'a@a.com',
          status: 'ASSIGNED', updated_at: '2026-02-01T00:00:00Z', // 47일
          assigned_consultant: null,
        },
        {
          id: 'p2', company_name: 'B사', contact_email: 'b@b.com',
          status: 'NEW', updated_at: '2026-02-28T00:00:00Z', // 20일
          assigned_consultant: null,
        },
      ],
      error: null,
    });

    const result = await fetchStalledProjects(20);
    expect(result).toHaveLength(2);
    expect(result[0].severity).toBe('high'); // 47일 >= 30
    expect(result[1].severity).toBe('medium'); // 20일 < 30
  });

  it('정체 일수 기준 내림차순 정렬', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({
      data: [
        {
          id: 'p1', company_name: 'A사', contact_email: 'a@a.com',
          status: 'ASSIGNED', updated_at: '2026-02-28T00:00:00Z', // 20일
          assigned_consultant: null,
        },
        {
          id: 'p2', company_name: 'B사', contact_email: 'b@b.com',
          status: 'NEW', updated_at: '2026-01-01T00:00:00Z', // 78일
          assigned_consultant: null,
        },
      ],
      error: null,
    });

    const result = await fetchStalledProjects(20);
    expect(result[0].id).toBe('p2');
    expect(result[1].id).toBe('p1');
  });

  it('assigned_consultant가 배열인 경우 첫 번째 요소 추출', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({
      data: [
        {
          id: 'p1', company_name: 'A사', contact_email: 'a@a.com',
          status: 'ASSIGNED', updated_at: '2026-02-01T00:00:00Z',
          assigned_consultant: [{ id: 'c1', name: '컨설턴트A' }],
        },
      ],
      error: null,
    });

    const result = await fetchStalledProjects(20);
    expect(result[0].assigned_consultant).toEqual({ id: 'c1', name: '컨설턴트A' });
  });

  it('빈 배열 assigned_consultant는 null 변환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    auth._mock.addResult({
      data: [
        {
          id: 'p1', company_name: 'A사', contact_email: 'a@a.com',
          status: 'ASSIGNED', updated_at: '2026-02-01T00:00:00Z',
          assigned_consultant: [],
        },
      ],
      error: null,
    });

    const result = await fetchStalledProjects(20);
    expect(result[0].assigned_consultant).toBeNull();
  });
});
