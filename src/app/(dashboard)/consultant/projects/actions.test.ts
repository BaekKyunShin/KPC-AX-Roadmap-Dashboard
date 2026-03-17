/**
 * consultant/projects/actions.ts 테스트
 *
 * 테스트 대상:
 * - fetchConsultantProjects: 컨설턴트 담당 프로젝트 목록 조회 (인증/역할/검색/필터/DB에러)
 * - fetchConsultantProjectFilters: 정적 필터 옵션 반환
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchConsultantProjects, fetchConsultantProjectFilters } from './actions';
import { createClient } from '@/lib/supabase/server';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// --- 외부 모듈 모킹 ---------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// --- 테스트 헬퍼 -------------------------------------------------------------

const USER_A_ID = '550e8400-e29b-41d4-a716-446655440001';

// --- fetchConsultantProjects -------------------------------------------------

describe('fetchConsultantProjects', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 -> 빈 결과 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await fetchConsultantProjects();

    expect(result).toEqual({ projects: [], total: 0, consultantName: '' });
  });

  it('CONSULTANT_APPROVED 아닌 역할 -> 빈 결과 반환', async () => {
    // getCachedProfile: users 테이블 역할 조회 -> OPS_ADMIN
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await fetchConsultantProjects();

    expect(result).toEqual({ projects: [], total: 0, consultantName: '' });
  });

  it('정상 조회 -> 프로젝트 목록 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) users 이름 조회 (supabase.from('users').select('name')...)
    serverMock.addResult({ data: { name: '김컨설턴트' }, error: null });
    // 3) projects 목록 조회
    serverMock.addResult({
      data: [
        {
          id: 'proj-1',
          company_name: '테스트 기업',
          industry: '제조업',
          company_size: '50-299',
          status: 'ASSIGNED',
          created_at: '2026-01-01',
          project_assignments: [{ assigned_at: '2026-01-02', is_current: true }],
          interviews: [],
          self_assessments: [{ id: 'sa-1' }],
        },
      ],
      error: null,
    });

    const result = await fetchConsultantProjects();

    expect(result.consultantName).toBe('김컨설턴트');
    expect(result.total).toBe(1);
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0]).toMatchObject({
      id: 'proj-1',
      company_name: '테스트 기업',
      has_interview: false,
      has_assessment: true,
      assigned_at: '2026-01-02',
    });
  });

  it('검색 조건 전달 -> from().or() 호출', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) users 이름 조회
    serverMock.addResult({ data: { name: '김컨설턴트' }, error: null });
    // 3) projects 조회 결과
    serverMock.addResult({ data: [], error: null });

    await fetchConsultantProjects({ search: '제조' });

    // or() 메서드가 호출되었는지 확인
    expect(serverMock.chainable.or).toHaveBeenCalled();
  });

  it('상태 필터 전달 -> eq() 추가 호출', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) users 이름 조회
    serverMock.addResult({ data: { name: '김컨설턴트' }, error: null });
    // 3) projects 조회 결과
    serverMock.addResult({ data: [], error: null });

    await fetchConsultantProjects({ status: 'ASSIGNED' });

    // eq()가 status 필터를 위해 호출되었는지 확인 (기본 eq 호출 + status 필터)
    const eqCalls = serverMock.chainable.eq.mock.calls as unknown[][];
    const statusFilterCall = eqCalls.find(
      (call) => call[0] === 'status' && call[1] === 'ASSIGNED',
    );
    expect(statusFilterCall).toBeTruthy();
  });

  it('DB 에러 -> 빈 프로젝트, 컨설턴트 이름 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) users 이름 조회
    serverMock.addResult({ data: { name: '김컨설턴트' }, error: null });
    // 3) projects 조회 에러
    serverMock.addResult({ data: null, error: { message: 'DB error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchConsultantProjects();

    expect(result.projects).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.consultantName).toBe('김컨설턴트');
    consoleSpy.mockRestore();
  });
});

// --- fetchConsultantProjectFilters -------------------------------------------

describe('fetchConsultantProjectFilters', () => {
  it('정상 반환 -> 4개 상태 필터 옵션', async () => {
    const result = await fetchConsultantProjectFilters();

    expect(result.statuses).toHaveLength(4);
    expect(result.statuses.map((s) => s.value)).toEqual([
      'ASSIGNED',
      'INTERVIEWED',
      'ROADMAP_DRAFTED',
      'FINALIZED',
    ]);
    // 각 항목에 label이 존재하는지 확인
    for (const status of result.statuses) {
      expect(status.label).toBeTruthy();
    }
  });
});
