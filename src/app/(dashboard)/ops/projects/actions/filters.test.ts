/**
 * ops/projects/actions/filters.ts 테스트
 *
 * 테스트 대상:
 * - fetchProjectFilters: 프로젝트 상태 및 업종 필터 옵션 조회
 * - fetchConsultantCandidates: 수동 배정용 컨설턴트 후보 목록 조회
 * - fetchConsultantFilterOptions: 컨설턴트 필터 옵션 (업종, 스킬) 조회
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

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
  revalidateTag: vi.fn(),
}));

// ─── 테스트 대상 import ──────────────────────────────────────────────────────

import {
  fetchProjectFilters,
  fetchConsultantCandidates,
  fetchConsultantFilterOptions,
} from './filters';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';

// ─── fetchProjectFilters ─────────────────────────────────────────────────────

describe('fetchProjectFilters', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 → 빈 결과 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '권한이 없습니다.' });

    const result = await fetchProjectFilters();

    expect(result).toEqual({ statuses: [], industries: [] });
  });

  it('정상 반환 — 상태 목록 + 업종 목록', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    // getCachedProjectIndustries → admin.from('projects').select().not() → thenable
    adminMock.addResult({
      data: [
        { industry: '제조업' },
        { industry: 'IT/소프트웨어' },
        { industry: '제조업' }, // 중복 — Set으로 제거됨
      ],
      error: null,
    });

    const result = await fetchProjectFilters();

    expect(result.statuses).toBeDefined();
    expect(result.statuses.length).toBeGreaterThan(0);
    expect(result.industries).toEqual(
      expect.arrayContaining(['제조업', 'IT/소프트웨어']),
    );
    // 중복 제거 확인
    expect(result.industries.filter((i) => i === '제조업')).toHaveLength(1);
  });

  it('DB 에러 → 빈 업종 목록', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    // getCachedProjectIndustries → DB 에러 → data=null
    adminMock.addResult({ data: null, error: { message: 'DB error' } });

    const result = await fetchProjectFilters();

    // data가 null이면 빈 배열 반환 (필터 처리)
    expect(result.industries).toEqual([]);
    expect(result.statuses.length).toBeGreaterThan(0);
  });
});

// ─── fetchConsultantCandidates ───────────────────────────────────────────────

describe('fetchConsultantCandidates', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 → 빈 결과 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '권한이 없습니다.' });

    const result = await fetchConsultantCandidates();

    expect(result).toEqual({ consultants: [], total: 0, totalPages: 0, page: 1 });
  });

  it('기본 조회 — 컨설턴트 목록 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    // adminSupabase.from('users').select(..., { count: 'exact' }).eq().eq().order().range() → thenable
    adminMock.addResult({
      data: [
        {
          id: 'cons-1',
          name: '김컨설턴트',
          email: 'kim@example.com',
          consultant_profile: {
            expertise_domains: ['AI'],
            available_industries: ['제조업'],
            teaching_levels: ['초급'],
            skill_tags: ['Python'],
            years_of_experience: 5,
            representative_experience: '제조 AI 도입',
          },
        },
      ],
      error: null,
      count: 1,
    });

    const result = await fetchConsultantCandidates();

    expect(result.consultants).toHaveLength(1);
    expect(result.consultants[0].name).toBe('김컨설턴트');
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });

  it('검색 조건 적용 — or 필터 호출', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    adminMock.addResult({ data: [], error: null, count: 0 });

    await fetchConsultantCandidates({ search: '김' });

    expect(adminMock.chainable.or).toHaveBeenCalledWith(
      'name.ilike.%김%,email.ilike.%김%',
    );
  });

  it('업종/스킬 필터 — DB 레벨 overlaps 필터링', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    // DB 레벨에서 필터링된 결과 (overlaps로 매칭된 항목만 반환)
    adminMock.addResult({
      data: [
        {
          id: 'cons-1',
          name: '김컨설턴트',
          email: 'kim@example.com',
          consultant_profile: {
            expertise_domains: ['AI'],
            available_industries: ['제조업'],
            teaching_levels: ['초급'],
            skill_tags: ['Python'],
            years_of_experience: 5,
          },
        },
      ],
      error: null,
      count: 1,
    });

    const result = await fetchConsultantCandidates({
      industries: ['제조업'],
      skills: ['Python'],
    });

    // overlaps 쿼리가 올바른 인자로 호출되었는지 검증
    expect(adminMock.chainable.overlaps).toHaveBeenCalledWith(
      'consultant_profiles.available_industries',
      ['제조업'],
    );
    expect(adminMock.chainable.overlaps).toHaveBeenCalledWith(
      'consultant_profiles.skill_tags',
      ['Python'],
    );

    // DB에서 필터링된 결과가 그대로 반환됨
    expect(result.consultants).toHaveLength(1);
    expect(result.consultants[0].id).toBe('cons-1');
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('페이지네이션 — range 호출 확인', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    adminMock.addResult({ data: [], error: null, count: 30 });

    const result = await fetchConsultantCandidates({ page: 2, limit: 10 });

    expect(adminMock.chainable.range).toHaveBeenCalledWith(10, 19); // (2-1)*10=10, 10+10-1=19
    expect(result.totalPages).toBe(3); // ceil(30/10)
    expect(result.page).toBe(2);
  });

  it('DB 에러 → 빈 결과 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    adminMock.addResult({ data: null, error: { message: 'DB error' }, count: null });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchConsultantCandidates();

    expect(result).toEqual({ consultants: [], total: 0, totalPages: 0, page: 1 });
    consoleSpy.mockRestore();
  });

  it('배열 형태의 consultant_profile 조인 결과를 단일 객체로 변환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    adminMock.addResult({
      data: [
        {
          id: 'cons-1',
          name: '김컨설턴트',
          email: 'kim@example.com',
          consultant_profile: [
            {
              expertise_domains: ['AI'],
              available_industries: ['제조업'],
              teaching_levels: ['초급'],
              skill_tags: ['Python'],
              years_of_experience: 5,
            },
          ],
        },
      ],
      error: null,
      count: 1,
    });

    const result = await fetchConsultantCandidates();

    expect(result.consultants[0].consultant_profile).toEqual({
      expertise_domains: ['AI'],
      available_industries: ['제조업'],
      teaching_levels: ['초급'],
      skill_tags: ['Python'],
      years_of_experience: 5,
      representative_experience: undefined,
    });
  });
});

// ─── fetchConsultantFilterOptions ────────────────────────────────────────────

describe('fetchConsultantFilterOptions', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 → 빈 결과 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '권한이 없습니다.' });

    const result = await fetchConsultantFilterOptions();

    expect(result).toEqual({ industries: [], skills: [] });
  });

  it('정상 반환 — 업종 + 스킬 목록 (정렬, 중복 제거)', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    // getCachedConsultantFilterOptions → admin.from('users').select().eq().eq() → thenable
    adminMock.addResult({
      data: [
        {
          consultant_profile: {
            available_industries: ['제조업', '금융업'],
            skill_tags: ['Python', 'R'],
          },
        },
        {
          consultant_profile: {
            available_industries: ['제조업', 'IT'],
            skill_tags: ['Python', 'Java'],
          },
        },
      ],
      error: null,
    });

    const result = await fetchConsultantFilterOptions();

    // 중복 제거 + 정렬
    expect(result.industries).toEqual(['IT', '금융업', '제조업']);
    expect(result.skills).toEqual(['Java', 'Python', 'R']);
  });

  it('DB 에러 (data=null) → 빈 결과 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: adminMock.client,
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    adminMock.addResult({ data: null, error: { message: 'DB error' } });

    const result = await fetchConsultantFilterOptions();

    expect(result).toEqual({ industries: [], skills: [] });
  });
});
