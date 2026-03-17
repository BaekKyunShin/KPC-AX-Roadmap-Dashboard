/**
 * ops/projects/actions.ts 테스트
 * Phase 1 테스트 안전망 — Phase 2 파일 분리 시 기능 보존 검증용
 *
 * 테스트 대상:
 * - createProject: 프로젝트 생성 (인증/역할/검증/DB)
 * - assignConsultant: 컨설턴트 배정 (인증/역할/검증/기존배정해제/신규배정)
 * - createSelfAssessment: 자가진단 입력 (인증/역할/검증/점수계산/상태변경)
 * - fetchProjectStats: 상태별 프로젝트 통계
 * - fetchStalledProjects: 정체 프로젝트 조회
 * - fetchConsultantProgress: 컨설턴트별 진행 현황
 * - fetchProjects: 프로젝트 목록 조회 (페이지네이션/필터)
 * - fetchProjectsWithTimeline: 타임라인 포함 프로젝트 목록
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createProject,
  assignConsultant,
  createSelfAssessment,
  fetchProjectStats,
  fetchStalledProjects,
  fetchConsultantProgress,
  fetchProjects,
  fetchProjectsWithTimeline,
} from './actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('@/lib/services/notification', () => ({
  createNotification: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}));

const pendingAfterCallbacks: Promise<unknown>[] = [];
vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void | Promise<unknown>) => {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      pendingAfterCallbacks.push(result as Promise<unknown>);
    }
  }),
}));
async function flushAfterCallbacks() {
  await Promise.all(pendingAfterCallbacks);
  pendingAfterCallbacks.length = 0;
}

// after() 콜백 추적 배열을 테스트 간에 정리하여 격리 보장
afterEach(() => {
  pendingAfterCallbacks.length = 0;
});

// ─── 테스트 헬퍼 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440002';
const TEST_CONSULTANT_ID = '550e8400-e29b-41d4-a716-446655440003';
const TEST_TEMPLATE_ID = '550e8400-e29b-41d4-a716-446655440004';

/**
 * Supabase 체인 모킹 팩토리
 * - 큐 기반: addResult()로 순서대로 결과 추가, single()/thenable에서 순서대로 소비
 * - auth 지원: authUser 옵션으로 getUser() 결과 설정
 */
function createMockClient(options?: { authUser?: { id: string } | null }) {
  const results: Array<{ data: unknown; error: unknown; count?: number | null }> = [];
  let resultIndex = 0;

  function nextResult() {
    if (resultIndex < results.length) {
      const r = results[resultIndex++];
      return { data: r.data, error: r.error, count: r.count ?? null };
    }
    return { data: null, error: null, count: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainable: Record<string, any> = {};

  for (const method of [
    'select', 'eq', 'neq', 'in', 'not', 'or', 'gte', 'lte',
    'ilike', 'order', 'range', 'limit',
  ]) {
    chainable[method] = vi.fn(() => chainable);
  }

  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);
  chainable.single = vi.fn(() => nextResult());

  // thenable for await without .single() (e.g., insert/update/select chains)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chainable.then = (resolve: (v: any) => void, reject?: (e: any) => void) => {
    return Promise.resolve(nextResult()).then(resolve, reject);
  };

  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options?.authUser ?? null },
        error: null,
      }),
    },
    from: vi.fn(() => chainable),
    rpc: vi.fn(() => nextResult()),
  };

  return {
    mockClient,
    chainable,
    addResult: (result: { data: unknown; error: unknown; count?: number | null }) => {
      results.push(result);
    },
  };
}

/** FormData 편의 생성기 */
function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

/** createProject용 유효한 FormData */
function validProjectFormData(): FormData {
  return makeFormData({
    company_name: '테스트 기업',
    industry: '제조업',
    company_size: '50-299',
    contact_name: '홍길동',
    contact_email: 'test@example.com',
  });
}

/** assignConsultant용 유효한 FormData */
function validAssignFormData(): FormData {
  return makeFormData({
    project_id: TEST_PROJECT_ID,
    consultant_id: TEST_CONSULTANT_ID,
    assignment_reason: '제조업 전문 컨설턴트로 가장 적합합니다.',
  });
}

/** createSelfAssessment용 유효한 FormData */
function validSelfAssessmentFormData(): FormData {
  return makeFormData({
    project_id: TEST_PROJECT_ID,
    template_id: TEST_TEMPLATE_ID,
    answers: JSON.stringify([
      { question_id: 'q1', answer_value: 4 },
      { question_id: 'q2', answer_value: 3 },
    ]),
  });
}

// ─── createProject ──────────────────────────────────────────────────────────

describe('createProject', () => {
  let serverMock: ReturnType<typeof createMockClient>;
  let adminMock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    serverMock = createMockClient({ authUser: { id: TEST_USER_ID } });
    adminMock = createMockClient();
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockClient({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);

    const result = await createProject(validProjectFormData());

    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('OPS_ADMIN/SYSTEM_ADMIN 아닌 역할 → 권한 없음', async () => {
    // role check → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await createProject(validProjectFormData());

    expect(result).toEqual({ success: false, error: '권한이 없습니다.' });
  });

  it('role 조회 실패 (null) → 권한 없음', async () => {
    serverMock.addResult({ data: null, error: null });

    const result = await createProject(validProjectFormData());

    expect(result).toEqual({ success: false, error: '권한이 없습니다.' });
  });

  it('Zod 검증 실패 시 validation error 반환 (회사명 누락)', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const fd = makeFormData({
      company_name: '', // 빈 값
      industry: '제조업',
      company_size: '50-299',
      contact_name: '홍길동',
      contact_email: 'test@example.com',
    });

    const result = await createProject(fd);

    expect(result).toMatchObject({ success: false, error: expect.any(String) });
  });

  it('DB insert 실패 → error + audit log 기록', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: null, error: { message: 'unique_violation' } });

    const result = await createProject(validProjectFormData());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('프로젝트 생성에 실패했습니다.');
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_CREATE',
        success: false,
        errorMessage: 'unique_violation',
      }),
    );
  });

  it('성공 → projectId 반환 + audit log 기록', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    const { revalidatePath } = await import('next/cache');

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: { id: 'new-project-id' }, error: null });

    const result = await createProject(validProjectFormData());

    expect(result).toEqual({ success: true, data: { projectId: 'new-project-id' } });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'PROJECT_CREATE',
        targetType: 'project',
        targetId: 'new-project-id',
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/ops/projects');
  });

  it('SYSTEM_ADMIN 역할도 프로젝트 생성 가능', async () => {
    serverMock.addResult({ data: { role: 'SYSTEM_ADMIN', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: { id: 'proj-sys-admin' }, error: null });

    const result = await createProject(validProjectFormData());

    expect(result.success).toBe(true);
  });

  it('sub_industries JSON 파싱 실패 시 빈 배열로 처리', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: { id: 'proj-bad-json' }, error: null });

    const fd = validProjectFormData();
    fd.set('sub_industries', 'invalid-json');

    const result = await createProject(fd);

    // sub_industries 파싱 실패해도 프로젝트 생성 진행됨
    expect(result.success).toBe(true);
  });
});

// ─── assignConsultant ───────────────────────────────────────────────────────

describe('assignConsultant', () => {
  let serverMock: ReturnType<typeof createMockClient>;
  let adminMock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    serverMock = createMockClient({ authUser: { id: TEST_USER_ID } });
    adminMock = createMockClient();
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockClient({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);

    const result = await assignConsultant(validAssignFormData());

    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('권한 없는 역할 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await assignConsultant(validAssignFormData());

    expect(result).toEqual({ success: false, error: '권한이 없습니다.' });
  });

  it('Zod 검증 실패 (사유 10자 미만) → error 반환', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const fd = makeFormData({
      project_id: TEST_PROJECT_ID,
      consultant_id: TEST_CONSULTANT_ID,
      assignment_reason: '짧은사유',  // 10자 미만
    });

    const result = await assignConsultant(fd);

    expect(result).toMatchObject({ success: false, error: expect.any(String) });
  });

  it('신규 배정 성공 (RPC 성공)', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    const { createNotification } = await import('@/lib/services/notification');
    const { revalidatePath } = await import('next/cache');

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    // RPC 성공
    vi.mocked(adminMock.mockClient.rpc).mockReturnValueOnce(
      { data: { success: true }, error: null } as never,
    );
    // after() 콜백: 프로젝트 company_name 조회
    adminMock.addResult({ data: { company_name: '테스트 기업' }, error: null });

    const result = await assignConsultant(validAssignFormData());
    await flushAfterCallbacks();

    expect(result).toEqual({ success: true });
    expect(adminMock.mockClient.rpc).toHaveBeenCalledWith('assign_consultant', expect.objectContaining({
      p_project_id: TEST_PROJECT_ID,
      p_consultant_id: TEST_CONSULTANT_ID,
    }));
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_ASSIGN',
        targetId: TEST_PROJECT_ID,
        meta: expect.objectContaining({ consultant_id: TEST_CONSULTANT_ID }),
      }),
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_CONSULTANT_ID,
        type: 'assignment',
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/ops/projects/${TEST_PROJECT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith('/ops/projects');
  });

  it.each([
    { status: 'NEW', label: '진단 미완료' },
    { status: 'INTERVIEWED', label: '이미 진행된 프로젝트' },
  ])('배정 불가 상태 $status → RPC 비즈니스 에러 ($label)', async ({ status }) => {
    const { createAuditLog } = await import('@/lib/services/audit');

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    // RPC가 비즈니스 에러 반환
    vi.mocked(adminMock.mockClient.rpc).mockReturnValueOnce(
      { data: { success: false, error: `현재 프로젝트 상태(${status})에서는 컨설턴트를 배정할 수 없습니다.` }, error: null } as never,
    );

    const result = await assignConsultant(validAssignFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain(status);
      expect(result.error).toContain('배정할 수 없습니다');
    }
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_ASSIGN',
        success: false,
      }),
    );
  });

  it('RPC 호출 실패 → error + audit log 기록', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    // RPC 에러
    vi.mocked(adminMock.mockClient.rpc).mockReturnValueOnce(
      { data: null, error: { message: 'fk_violation' } } as never,
    );

    const result = await assignConsultant(validAssignFormData());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('컨설턴트 배정에 실패했습니다.');
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_ASSIGN',
        success: false,
        errorMessage: 'fk_violation',
      }),
    );
  });
});

// ─── createSelfAssessment ───────────────────────────────────────────────────

describe('createSelfAssessment', () => {
  let serverMock: ReturnType<typeof createMockClient>;
  let adminMock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    serverMock = createMockClient({ authUser: { id: TEST_USER_ID } });
    adminMock = createMockClient();
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockClient({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);

    const result = await createSelfAssessment(validSelfAssessmentFormData());

    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('권한 없는 역할 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });

    const result = await createSelfAssessment(validSelfAssessmentFormData());

    expect(result).toEqual({ success: false, error: '권한이 없습니다.' });
  });

  it('answers JSON 파싱 실패 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const fd = makeFormData({
      project_id: TEST_PROJECT_ID,
      template_id: TEST_TEMPLATE_ID,
      answers: 'invalid-json',
    });

    const result = await createSelfAssessment(fd);

    expect(result).toEqual({ success: false, error: '응답 데이터 형식이 올바르지 않습니다.' });
  });

  it('Zod 검증 실패 (빈 answers 배열) → error 반환', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const fd = makeFormData({
      project_id: TEST_PROJECT_ID,
      template_id: TEST_TEMPLATE_ID,
      answers: JSON.stringify([]),
    });

    const result = await createSelfAssessment(fd);

    expect(result).toMatchObject({ success: false, error: expect.any(String) });
  });

  it('템플릿 없음 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    // 템플릿 조회 → 없음
    adminMock.addResult({ data: null, error: null });

    const result = await createSelfAssessment(validSelfAssessmentFormData());

    expect(result).toEqual({ success: false, error: '템플릿을 찾을 수 없습니다.' });
  });

  it('성공 → 점수 계산 + 상태 DIAGNOSED로 변경 + audit log', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    const { revalidatePath } = await import('next/cache');

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    // 템플릿 조회
    adminMock.addResult({
      data: {
        version: 1,
        questions: [
          { id: 'q1', dimension: 'infra', weight: 2 },
          { id: 'q2', dimension: 'people', weight: 1 },
        ],
      },
      error: null,
    });
    // self_assessments insert → 성공
    adminMock.addResult({ data: null, error: null });
    // projects status update → 성공
    adminMock.addResult({ data: null, error: null });

    const result = await createSelfAssessment(validSelfAssessmentFormData());

    expect(result).toEqual({ success: true });
    // 점수 계산 검증: q1(4*2=8, max 5*2=10), q2(3*1=3, max 5*1=5) → total=11
    expect(adminMock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: TEST_PROJECT_ID,
        template_id: TEST_TEMPLATE_ID,
        scores: expect.objectContaining({
          total_score: 11,
          max_possible_score: 15,
        }),
      }),
    );
    // 상태 변경 확인
    expect(adminMock.chainable.update).toHaveBeenCalledWith({ status: 'DIAGNOSED' });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SELF_ASSESSMENT_CREATE',
        meta: expect.objectContaining({ total_score: 11 }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/ops/projects/${TEST_PROJECT_ID}`);
  });

  it('NEW 상태에서만 DIAGNOSED로 전이 — status=NEW 조건이 update에 포함됨', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    // 템플릿 조회
    adminMock.addResult({
      data: {
        version: 1,
        questions: [
          { id: 'q1', dimension: 'infra', weight: 2 },
          { id: 'q2', dimension: 'people', weight: 1 },
        ],
      },
      error: null,
    });
    // self_assessments insert → 성공
    adminMock.addResult({ data: null, error: null });
    // projects conditional update → 성공
    adminMock.addResult({ data: null, error: null });

    await createSelfAssessment(validSelfAssessmentFormData());

    // status='NEW' 가드가 update 쿼리에 포함되어야 함 (역방향 전이 방지)
    expect(adminMock.chainable.eq).toHaveBeenCalledWith('status', 'NEW');
  });

  it('DB insert 실패 → error + 실패 audit log 기록', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    // 템플릿 조회
    adminMock.addResult({
      data: { version: 1, questions: [{ id: 'q1', dimension: 'infra', weight: 1 }] },
      error: null,
    });
    // insert 실패
    adminMock.addResult({ data: null, error: { message: 'constraint_violation' } });

    const result = await createSelfAssessment(validSelfAssessmentFormData());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('자가진단 저장에 실패했습니다.');
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorMessage: 'constraint_violation',
      }),
    );
  });
});

// ─── fetchProjectStats ──────────────────────────────────────────────────────

describe('fetchProjectStats', () => {
  let serverMock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    serverMock = createMockClient({ authUser: { id: TEST_USER_ID } });
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('상태별 통계를 올바르게 집계한다', async () => {
    serverMock.addResult({
      data: [
        { status: 'NEW' },
        { status: 'NEW' },
        { status: 'ASSIGNED' },
        { status: 'FINALIZED' },
        { status: 'FINALIZED' },
        { status: 'FINALIZED' },
      ],
      error: null,
    });

    const result = await fetchProjectStats();

    expect(result.total).toBe(6);
    expect(result.byStatus).toEqual({
      NEW: 2,
      ASSIGNED: 1,
      FINALIZED: 3,
    });
  });

  it('프로젝트 없음 → total 0, 빈 byStatus', async () => {
    serverMock.addResult({ data: [], error: null });

    const result = await fetchProjectStats();

    expect(result).toEqual({ total: 0, byStatus: {} });
  });

  it('DB 에러 → 빈 결과 반환', async () => {
    serverMock.addResult({ data: null, error: { message: 'DB error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchProjectStats();

    expect(result).toEqual({ total: 0, byStatus: {} });
    expect(consoleSpy).toHaveBeenCalledWith('[fetchProjectStats Error]', expect.anything());
    consoleSpy.mockRestore();
  });
});

// ─── fetchStalledProjects ───────────────────────────────────────────────────

describe('fetchStalledProjects', () => {
  let serverMock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    serverMock = createMockClient({ authUser: { id: TEST_USER_ID } });
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('minDays 이상 정체된 프로젝트를 반환한다', async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000);

    serverMock.addResult({
      data: [
        {
          id: 'proj-stalled',
          company_name: '정체 기업',
          contact_email: 'stalled@example.com',
          status: 'ASSIGNED',
          updated_at: thirtyDaysAgo.toISOString(),
          assigned_consultant: { id: 'cons-1', name: '김컨설턴트' },
        },
        {
          id: 'proj-active',
          company_name: '활발 기업',
          contact_email: 'active@example.com',
          status: 'NEW',
          updated_at: fiveDaysAgo.toISOString(),
          assigned_consultant: null,
        },
      ],
      error: null,
    });

    const result = await fetchStalledProjects(20);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('proj-stalled');
    expect(result[0].days_stalled).toBeGreaterThanOrEqual(30);
    expect(result[0].severity).toBe('high'); // 30일+ → high
  });

  it('severity: 20~29일 → medium, 30일+ → high', async () => {
    const now = new Date();
    const twentyFiveDaysAgo = new Date(now.getTime() - 25 * 86400000);
    const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 86400000);

    serverMock.addResult({
      data: [
        {
          id: 'proj-medium',
          company_name: '중간 기업',
          contact_email: 'medium@example.com',
          status: 'DIAGNOSED',
          updated_at: twentyFiveDaysAgo.toISOString(),
          assigned_consultant: null,
        },
        {
          id: 'proj-high',
          company_name: '심각 기업',
          contact_email: 'high@example.com',
          status: 'ASSIGNED',
          updated_at: thirtyFiveDaysAgo.toISOString(),
          assigned_consultant: { id: 'cons-1', name: '이컨설턴트' },
        },
      ],
      error: null,
    });

    const result = await fetchStalledProjects(20);

    expect(result).toHaveLength(2);
    // 정체 일수 내림차순 정렬
    expect(result[0].id).toBe('proj-high');
    expect(result[0].severity).toBe('high');
    expect(result[1].id).toBe('proj-medium');
    expect(result[1].severity).toBe('medium');
  });

  it('DB 에러 → 빈 배열', async () => {
    serverMock.addResult({ data: null, error: { message: 'DB error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchStalledProjects();

    expect(result).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('배열 형태의 assigned_consultant 조인 결과를 처리', async () => {
    const now = new Date();
    const fortyDaysAgo = new Date(now.getTime() - 40 * 86400000);

    serverMock.addResult({
      data: [
        {
          id: 'proj-array',
          company_name: '배열 기업',
          contact_email: 'array@example.com',
          status: 'ASSIGNED',
          updated_at: fortyDaysAgo.toISOString(),
          assigned_consultant: [{ id: 'cons-1', name: '박컨설턴트' }], // 배열 형태
        },
      ],
      error: null,
    });

    const result = await fetchStalledProjects(20);

    expect(result).toHaveLength(1);
    expect(result[0].assigned_consultant).toEqual({ id: 'cons-1', name: '박컨설턴트' });
  });
});

// ─── fetchConsultantProgress ────────────────────────────────────────────────

describe('fetchConsultantProgress', () => {
  let serverMock: ReturnType<typeof createMockClient>;
  let adminMock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    // requireAuthWithRole 내부에서 createClient → getUser → role 조회
    serverMock = createMockClient({ authUser: { id: TEST_USER_ID } });
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);

    adminMock = createMockClient();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('컨설턴트별 상태 통계를 올바르게 집계한다', async () => {
    // 컨설턴트 목록
    adminMock.addResult({
      data: [
        { id: 'cons-1', name: '김컨설턴트', email: 'kim@example.com' },
        { id: 'cons-2', name: '이컨설턴트', email: 'lee@example.com' },
      ],
      error: null,
    });
    // 프로젝트 목록
    adminMock.addResult({
      data: [
        { assigned_consultant_id: 'cons-1', status: 'ASSIGNED' },
        { assigned_consultant_id: 'cons-1', status: 'FINALIZED' },
        { assigned_consultant_id: 'cons-1', status: 'FINALIZED' },
        { assigned_consultant_id: 'cons-2', status: 'INTERVIEWED' },
      ],
      error: null,
    });

    const result = await fetchConsultantProgress();

    expect(result).toHaveLength(2);
    // total 내림차순
    expect(result[0].id).toBe('cons-1');
    expect(result[0]).toEqual(expect.objectContaining({
      assigned: 1,
      interviewing: 0,
      drafting: 0,
      completed: 2,
      total: 3,
    }));
    expect(result[1].id).toBe('cons-2');
    expect(result[1]).toEqual(expect.objectContaining({
      assigned: 0,
      interviewing: 1,
      drafting: 0,
      completed: 0,
      total: 1,
    }));
  });

  it('담당 프로젝트 없는 컨설턴트는 제외', async () => {
    adminMock.addResult({
      data: [
        { id: 'cons-1', name: '김컨설턴트', email: 'kim@example.com' },
        { id: 'cons-2', name: '이컨설턴트', email: 'lee@example.com' },
      ],
      error: null,
    });
    adminMock.addResult({
      data: [
        { assigned_consultant_id: 'cons-1', status: 'ASSIGNED' },
      ],
      error: null,
    });

    const result = await fetchConsultantProgress();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('cons-1');
  });

  it('컨설턴트 조회 실패 → 빈 배열', async () => {
    adminMock.addResult({ data: null, error: { message: 'error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchConsultantProgress();

    expect(result).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('프로젝트 조회 실패 → 빈 배열', async () => {
    adminMock.addResult({
      data: [{ id: 'cons-1', name: '김', email: 'kim@x.com' }],
      error: null,
    });
    adminMock.addResult({ data: null, error: { message: 'error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchConsultantProgress();

    expect(result).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('ROADMAP_DRAFTED 상태는 drafting으로 집계', async () => {
    adminMock.addResult({
      data: [{ id: 'cons-1', name: '김', email: 'kim@x.com' }],
      error: null,
    });
    adminMock.addResult({
      data: [
        { assigned_consultant_id: 'cons-1', status: 'ROADMAP_DRAFTED' },
      ],
      error: null,
    });

    const result = await fetchConsultantProgress();

    expect(result[0].drafting).toBe(1);
  });
});

// ─── fetchProjects ──────────────────────────────────────────────────────────

describe('fetchProjects', () => {
  let serverMock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    serverMock = createMockClient({ authUser: { id: TEST_USER_ID } });
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('기본 파라미터로 프로젝트 목록 반환', async () => {
    serverMock.addResult({
      data: [
        {
          id: 'proj-1',
          company_name: '기업1',
          industry: '제조업',
          company_size: 'LARGE',
          status: 'NEW',
          created_at: '2025-01-01T00:00:00Z',
          contact_email: 'a@test.com',
          assigned_consultant: null,
          created_by_user: { id: 'u1', name: '관리자' },
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
    expect(result.projects[0].company_name).toBe('기업1');
  });

  it('DB 에러 → 빈 결과 반환', async () => {
    serverMock.addResult({ data: null, error: { message: 'error' }, count: null });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchProjects();

    expect(result).toEqual({ projects: [], total: 0, totalPages: 0, page: 1 });
    consoleSpy.mockRestore();
  });

  it('페이지네이션 파라미터를 올바르게 적용', async () => {
    serverMock.addResult({ data: [], error: null, count: 50 });

    const result = await fetchProjects({ page: 3, limit: 5 });

    expect(serverMock.chainable.range).toHaveBeenCalledWith(10, 14); // (3-1)*5=10, 10+5-1=14
    expect(result.totalPages).toBe(10); // ceil(50/5)
    expect(result.page).toBe(3);
  });

  it('검색 조건을 적용', async () => {
    serverMock.addResult({ data: [], error: null, count: 0 });

    await fetchProjects({ search: '테스트' });

    expect(serverMock.chainable.or).toHaveBeenCalledWith(
      'company_name.ilike.%테스트%,contact_email.ilike.%테스트%',
    );
  });

  it('상태 필터를 적용', async () => {
    serverMock.addResult({ data: [], error: null, count: 0 });

    await fetchProjects({ status: 'NEW' });

    expect(serverMock.chainable.eq).toHaveBeenCalledWith('status', 'NEW');
  });

  it('업종 필터를 적용', async () => {
    serverMock.addResult({ data: [], error: null, count: 0 });

    await fetchProjects({ industry: '제조업' });

    expect(serverMock.chainable.eq).toHaveBeenCalledWith('industry', '제조업');
  });

  it('배열 형태의 조인 결과를 단일 객체로 변환', async () => {
    serverMock.addResult({
      data: [
        {
          id: 'proj-1',
          company_name: '기업1',
          industry: '제조업',
          company_size: 'SMALL',
          status: 'ASSIGNED',
          created_at: '2025-01-01T00:00:00Z',
          contact_email: 'a@test.com',
          assigned_consultant: [{ id: 'cons-1', name: '김', email: 'kim@x.com' }],
          created_by_user: [{ id: 'u1', name: '관리자' }],
        },
      ],
      error: null,
      count: 1,
    });

    const result = await fetchProjects();

    expect(result.projects[0].assigned_consultant).toEqual({ id: 'cons-1', name: '김', email: 'kim@x.com' });
    expect(result.projects[0].created_by_user).toEqual({ id: 'u1', name: '관리자' });
  });
});

// ─── fetchProjectsWithTimeline ──────────────────────────────────────────────

describe('fetchProjectsWithTimeline', () => {
  let serverMock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    serverMock = createMockClient({ authUser: { id: TEST_USER_ID } });
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('days_in_current_status를 올바르게 계산', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();

    serverMock.addResult({
      data: [
        {
          id: 'proj-1',
          company_name: '기업1',
          industry: '제조업',
          status: 'ASSIGNED',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: tenDaysAgo,
          contact_email: 'a@test.com',
          assigned_consultant: null,
        },
      ],
      error: null,
      count: 1,
    });

    const result = await fetchProjectsWithTimeline();

    expect(result.projects[0].days_in_current_status).toBeGreaterThanOrEqual(10);
    expect(result.projects[0].days_in_current_status).toBeLessThanOrEqual(11);
  });

  it('다중 상태 필터 (statuses 배열) 적용', async () => {
    serverMock.addResult({ data: [], error: null, count: 0 });

    await fetchProjectsWithTimeline({ statuses: ['NEW', 'DIAGNOSED'] });

    expect(serverMock.chainable.in).toHaveBeenCalledWith('status', ['NEW', 'DIAGNOSED']);
  });

  it('statuses 미지정 시 단일 status 필터 사용', async () => {
    serverMock.addResult({ data: [], error: null, count: 0 });

    await fetchProjectsWithTimeline({ status: 'FINALIZED' });

    expect(serverMock.chainable.eq).toHaveBeenCalledWith('status', 'FINALIZED');
  });

  it('DB 에러 → 빈 결과', async () => {
    serverMock.addResult({ data: null, error: { message: 'error' }, count: null });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchProjectsWithTimeline();

    expect(result).toEqual({ projects: [], total: 0, totalPages: 0, page: 1 });
    consoleSpy.mockRestore();
  });
});
