/**
 * consultant/projects/[id]/pbl/actions.ts 테스트
 *
 * 테스트 대상:
 * - fetchPBLProjectInfo: PBL 프로젝트 정보 조회
 * - fetchPBLReport: PBL 보고서 단건 조회
 * - fetchPBLVersions: PBL 버전 목록 조회
 * - generatePBLAction: PBL 보고서 생성 (인증/역할/배정/상태/LLM)
 * - savePBLDraftAction: DRAFT 저장 (인증/역할/PBL 접근/Zod)
 * - finalizePBLAction: 확정 (인증/역할/PBL 접근/after 콜백)
 * - deletePBLAction: DRAFT 삭제 (인증/역할/PBL 접근)
 * - togglePBLShareAction: 공유 토글 (인증/역할/PBL 접근/감사로그)
 * - cancelPBLGeneration: 생성 취소 (인증/cancelAbort)
 * - exportPBLAsHwpxAction: HWPX 내보내기 (인증/역할/접근/HWPX 생성/감사로그)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchPBLProjectInfo,
  fetchPBLReport,
  fetchPBLVersions,
  generatePBLAction,
  savePBLDraftAction,
  finalizePBLAction,
  deletePBLAction,
  togglePBLShareAction,
  cancelPBLGeneration,
  exportPBLAsHwpxAction,
} from './actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMockSupabase } from '@/test/helpers/mock-supabase';
import { PBL_INTERVIEW_SAMPLE } from '@/lib/fixtures/pbl-interview-sample';

// ─── 외부 모듈 모킹 ───────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/activity-log', () => ({
  insertSystemActivityLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/llm', () => ({
  getLLMUserFriendlyError: vi.fn((err: unknown) =>
    err instanceof Error ? err.message : 'LLM 호출에 실패했습니다.',
  ),
}));

vi.mock('@/lib/services/abort-registry', () => ({
  registerAbort: vi.fn(() => new AbortController()),
  cancelAbort: vi.fn(() => true),
  cleanupAbort: vi.fn(),
}));

vi.mock('@/lib/services/pbl/pbl-generator', () => ({
  generatePBLContent: vi.fn().mockResolvedValue({
    content: {
      background: {},
      subject_profile: {},
      course_evaluation: {},
      operational_plan: {},
    },
  }),
  PBLGenerationError: class PBLGenerationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PBLGenerationError';
    }
  },
}));

vi.mock('@/lib/services/pbl/pbl-crud', () => ({
  createDraftVersion: vi.fn().mockResolvedValue({ id: 'new-pbl-id', version_number: 1 }),
  deleteDraft: vi.fn().mockResolvedValue(undefined),
  finalizePBL: vi.fn().mockResolvedValue(undefined),
  getPBLReport: vi.fn().mockResolvedValue(null),
  listVersions: vi.fn().mockResolvedValue([]),
  sharePBL: vi.fn().mockResolvedValue(undefined),
  updateDraft: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/export/hwpx', () => ({
  buildPBLHwpxPayload: vi.fn(() => ({
    track: 'PBL',
    fileName: 'PBL_v1.hwpx',
    data: {},
  })),
  generatePBLHwpx: vi.fn().mockResolvedValue(Buffer.from('dummy-pbl-hwpx-bytes')),
}));

const { mockAfter } = vi.hoisted(() => {
  const mockAfter = vi.fn((fn: () => void | Promise<unknown>) => {
    fn();
  });
  return { mockAfter };
});
vi.mock('next/server', () => ({ after: mockAfter }));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => {
      if (name === 'x-forwarded-host' || name === 'host') return 'preview.vercel.app';
      if (name === 'x-forwarded-proto') return 'https';
      return null;
    },
  })),
}));

// ─── 테스트 상수 ──────────────────────────────────────────────────────────────

const USER_A_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_B_ID = '550e8400-e29b-41d4-a716-446655440002';
const PBL_ID = '550e8400-e29b-41d4-a716-446655440010';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';

/** requireConsultantPBLReportAccess가 성공할 때 admin mock이 반환할 데이터 */
const PBL_ACCESS_SUCCESS_ROW = {
  project_id: PROJECT_ID,
  projects: {
    status: 'PBL_DRAFTED',
    track: 'PBL',
    assigned_consultant_id: USER_A_ID,
    is_test_mode: false,
    company_name: '테스트기업',
  },
};

/**
 * pbl_data: V2 (camelCase) 형태 — `PBLInterviewStrictSchema` 를 통과하는 완전한 fixture.
 * 인터뷰 제출(`submitPBLInterviewV2`)이 저장하는 모양과 동일. 실제 production DB 의
 * `interviews.pbl_data` 컬럼 구조와 일치하므로 보고서 생성 경로 회귀 테스트의 정본.
 */
const VALID_PBL_INTERVIEW_DATA = PBL_INTERVIEW_SAMPLE;

/** pblContentSchema 최소 유효 데이터 (stub) */
const VALID_PBL_CONTENT = {
  background: {},
  subject_profile: {
    course_name: '과정명',
    training_job: '직무',
    total_training_hours: 16,
    trainee_count: 10,
    target_audience: '대상',
    training_contents: [],
    total_sum_hours: 0,
  },
  course_evaluation: {
    performance_level: 3,
    evaluation_methods: [],
    satisfaction_survey: [],
    achievement_survey: [],
    external_expert_survey: [],
    practical_application_survey: [],
    training_goal_categories: [],
  },
  operational_plan: {
    ai_tool_usage_plan: [],
    difficulty_content: '내용',
    expected_outcome: '기대효과',
  },
};

// ─── fetchPBLProjectInfo ──────────────────────────────────────────────────────

describe('fetchPBLProjectInfo', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await fetchPBLProjectInfo(PROJECT_ID);
    expect(result.success).toBe(false);
  });

  it('role null → 사용자 정보 없음 error', async () => {
    // getCachedProfile → null (users 테이블 미조회)
    serverMock.addResult({ data: null, error: null });

    const result = await fetchPBLProjectInfo(PROJECT_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('사용자 정보');
  });

  it('프로젝트 미존재 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: null, error: null });

    const result = await fetchPBLProjectInfo(PROJECT_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('프로젝트');
  });

  it('CONSULTANT_APPROVED + 타 컨설턴트 프로젝트 → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { company_name: '다른기업', track: 'PBL', status: 'PBL_DRAFTED', assigned_consultant_id: USER_B_ID },
      error: null,
    });

    const result = await fetchPBLProjectInfo(PROJECT_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('권한');
  });

  it('CONSULTANT_APPROVED + 본인 프로젝트 → success', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { company_name: '테스트기업', track: 'PBL', status: 'PBL_DRAFTED', assigned_consultant_id: USER_A_ID },
      error: null,
    });

    const result = await fetchPBLProjectInfo(PROJECT_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyName).toBe('테스트기업');
      expect(result.data.track).toBe('PBL');
    }
  });

  it('OPS_ADMIN → 배정 검증 없이 success', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { company_name: '운영기업', track: 'PBL', status: 'FINALIZED', assigned_consultant_id: USER_B_ID },
      error: null,
    });

    const result = await fetchPBLProjectInfo(PROJECT_ID);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.companyName).toBe('운영기업');
  });

  it('허용되지 않은 역할(USER_PENDING) → error', async () => {
    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { company_name: '테스트기업', track: 'PBL', status: 'PBL_DRAFTED', assigned_consultant_id: USER_A_ID },
      error: null,
    });

    const result = await fetchPBLProjectInfo(PROJECT_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('권한');
  });

  it('예외 발생 → catch 블록 error', async () => {
    vi.mocked(createClient).mockRejectedValueOnce(new Error('connection error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchPBLProjectInfo(PROJECT_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('조회');
    consoleSpy.mockRestore();
  });
});

// ─── fetchPBLReport ──────────────────────────────────────────────────────────

describe('fetchPBLReport', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → null 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await fetchPBLReport(PBL_ID);
    expect(result).toBeNull();
  });

  it('role null → null 반환', async () => {
    serverMock.addResult({ data: null, error: null });

    const result = await fetchPBLReport(PBL_ID);
    expect(result).toBeNull();
  });

  it('getPBLReport → null (보고서 없음) → null 반환', async () => {
    const { getPBLReport } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(getPBLReport).mockResolvedValueOnce(null);

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await fetchPBLReport(PBL_ID);
    expect(result).toBeNull();
  });

  it('CONSULTANT_APPROVED + 타 컨설턴트 프로젝트 → null 반환', async () => {
    const { getPBLReport } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(getPBLReport).mockResolvedValueOnce({ id: PBL_ID, project_id: PROJECT_ID } as never);

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // projects 조회 → 타 컨설턴트 + PBL 트랙
    serverMock.addResult({
      data: { assigned_consultant_id: USER_B_ID, track: 'PBL' },
      error: null,
    });

    const result = await fetchPBLReport(PBL_ID);
    expect(result).toBeNull();
  });

  it('CONSULTANT_APPROVED + PBL 아닌 트랙 → null 반환', async () => {
    const { getPBLReport } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(getPBLReport).mockResolvedValueOnce({ id: PBL_ID, project_id: PROJECT_ID } as never);

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, track: 'ROADMAP' },
      error: null,
    });

    const result = await fetchPBLReport(PBL_ID);
    expect(result).toBeNull();
  });

  it('CONSULTANT_APPROVED + 본인 프로젝트 + PBL 트랙 → row 반환', async () => {
    const mockRow = { id: PBL_ID, project_id: PROJECT_ID, status: 'DRAFT' };
    const { getPBLReport } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(getPBLReport).mockResolvedValueOnce(mockRow as never);

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, track: 'PBL' },
      error: null,
    });

    const result = await fetchPBLReport(PBL_ID);
    expect(result).toMatchObject({ id: PBL_ID, status: 'DRAFT' });
  });

  it('OPS_ADMIN → 프로젝트 조회 없이 row 반환', async () => {
    const mockRow = { id: PBL_ID, project_id: PROJECT_ID, status: 'FINAL' };
    const { getPBLReport } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(getPBLReport).mockResolvedValueOnce(mockRow as never);

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await fetchPBLReport(PBL_ID);
    expect(result).toMatchObject({ id: PBL_ID, status: 'FINAL' });
  });

  it('USER_PENDING → null 반환', async () => {
    const mockRow = { id: PBL_ID, project_id: PROJECT_ID };
    const { getPBLReport } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(getPBLReport).mockResolvedValueOnce(mockRow as never);

    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });

    const result = await fetchPBLReport(PBL_ID);
    expect(result).toBeNull();
  });
});

// ─── fetchPBLVersions ─────────────────────────────────────────────────────────

describe('fetchPBLVersions', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → 빈 배열 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await fetchPBLVersions(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('role null → 빈 배열 반환', async () => {
    serverMock.addResult({ data: null, error: null });

    const result = await fetchPBLVersions(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('CONSULTANT_APPROVED + 본인 PBL 프로젝트 → 버전 목록 반환', async () => {
    const mockVersions = [{ id: 'v1', status: 'DRAFT', version_number: 1 }];
    const { listVersions } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(listVersions).mockResolvedValueOnce(mockVersions as never);

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, track: 'PBL' },
      error: null,
    });

    const result = await fetchPBLVersions(PROJECT_ID);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'v1', status: 'DRAFT' });
  });

  it('CONSULTANT_APPROVED + 타 컨설턴트 프로젝트 → 빈 배열', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { assigned_consultant_id: USER_B_ID, track: 'PBL' },
      error: null,
    });

    const result = await fetchPBLVersions(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('CONSULTANT_APPROVED + ROADMAP 트랙 → 빈 배열', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, track: 'ROADMAP' },
      error: null,
    });

    const result = await fetchPBLVersions(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('OPS_ADMIN → 버전 목록 반환 (프로젝트 검증 없이)', async () => {
    const mockVersions = [{ id: 'v1', status: 'FINAL', version_number: 1 }];
    const { listVersions } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(listVersions).mockResolvedValueOnce(mockVersions as never);

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await fetchPBLVersions(PROJECT_ID);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'v1', status: 'FINAL' });
  });

  it('USER_PENDING → 빈 배열', async () => {
    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });

    const result = await fetchPBLVersions(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('예외 발생 → 빈 배열 반환', async () => {
    const { listVersions } = await import('@/lib/services/pbl/pbl-crud');
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    vi.mocked(listVersions).mockRejectedValueOnce(new Error('DB error'));

    const result = await fetchPBLVersions(PROJECT_ID);
    expect(result).toEqual([]);
  });
});

// ─── generatePBLAction ────────────────────────────────────────────────────────

describe('generatePBLAction', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase({});
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await generatePBLAction(PROJECT_ID);
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('CONSULTANT_APPROVED 아닌 역할(OPS_ADMIN) → error', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await generatePBLAction(PROJECT_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('타 컨설턴트 프로젝트 → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        id: PROJECT_ID, status: 'INTERVIEWED', track: 'PBL',
        assigned_consultant_id: USER_B_ID, company_name: '기업', is_test_mode: false,
        industry: '제조업', sub_industries: [], company_size: 'medium', customer_comment: null,
      },
      error: null,
    });

    const result = await generatePBLAction(PROJECT_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('접근 권한');
  });

  it('ROADMAP 트랙 프로젝트 → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        id: PROJECT_ID, status: 'INTERVIEWED', track: 'ROADMAP',
        assigned_consultant_id: USER_A_ID, company_name: '기업', is_test_mode: false,
        industry: '제조업', sub_industries: [], company_size: 'medium', customer_comment: null,
      },
      error: null,
    });

    const result = await generatePBLAction(PROJECT_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('PBL 트랙');
  });

  it('PBL 생성 불가 상태(NEW) → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        id: PROJECT_ID, status: 'NEW', track: 'PBL',
        assigned_consultant_id: USER_A_ID, company_name: '기업', is_test_mode: false,
        industry: '제조업', sub_industries: [], company_size: 'medium', customer_comment: null,
      },
      error: null,
    });

    const result = await generatePBLAction(PROJECT_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('인터뷰');
  });

  it('인터뷰 pbl_data 없음 → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        id: PROJECT_ID, status: 'INTERVIEWED', track: 'PBL',
        assigned_consultant_id: USER_A_ID, company_name: '기업', is_test_mode: false,
        industry: '제조업', sub_industries: [], company_size: 'medium', customer_comment: null,
      },
      error: null,
    });
    // admin: interviews.pbl_data 없음
    adminMock.addResult({ data: null, error: null });

    const result = await generatePBLAction(PROJECT_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('인터뷰 데이터');
  });

  it('PBLInterviewStrictSchema 검증 실패 (V2 키 누락) → "완성되지 않았" 토스트', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        id: PROJECT_ID, status: 'INTERVIEWED', track: 'PBL',
        assigned_consultant_id: USER_A_ID, company_name: '기업', is_test_mode: false,
        industry: '제조업', sub_industries: [], company_size: 'medium', customer_comment: null,
      },
      error: null,
    });
    // admin: 잘못된 pbl_data (schema 검증 실패 유발)
    adminMock.addResult({ data: { pbl_data: { invalid: 'data' } }, error: null });

    const result = await generatePBLAction(PROJECT_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('완성되지 않았');
  });

  it('LLM 생성 에러 → 사용자 친화 에러 반환', async () => {
    const { generatePBLContent } = await import('@/lib/services/pbl/pbl-generator');
    vi.mocked(generatePBLContent).mockRejectedValueOnce(new Error('LLM timeout'));

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        id: PROJECT_ID, status: 'INTERVIEWED', track: 'PBL',
        assigned_consultant_id: USER_A_ID, company_name: '기업', is_test_mode: false,
        industry: '제조업', sub_industries: [], company_size: 'medium', customer_comment: null,
      },
      error: null,
    });
    adminMock.addResult({ data: { pbl_data: VALID_PBL_INTERVIEW_DATA }, error: null });
    // consultantProfile
    adminMock.addResult({ data: null, error: null });
    // self_assessments
    adminMock.addResult({ data: null, error: null });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await generatePBLAction(PROJECT_ID);
    expect(result.success).toBe(false);
    consoleSpy.mockRestore();
  });

  it('성공 → pblId 반환 + after 콜백(활동 일지) 호출', async () => {
    const { generatePBLContent } = await import('@/lib/services/pbl/pbl-generator');
    const { createDraftVersion } = await import('@/lib/services/pbl/pbl-crud');
    const { insertSystemActivityLog } = await import('@/lib/services/activity-log');
    vi.mocked(createDraftVersion).mockResolvedValueOnce({ id: 'draft-id', version_number: 1 } as never);
    vi.mocked(generatePBLContent).mockResolvedValueOnce({ content: VALID_PBL_CONTENT } as never);

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        id: PROJECT_ID, status: 'INTERVIEWED', track: 'PBL',
        assigned_consultant_id: USER_A_ID, company_name: '테스트기업', is_test_mode: false,
        industry: '제조업', sub_industries: [], company_size: 'medium', customer_comment: null,
      },
      error: null,
    });
    adminMock.addResult({ data: { pbl_data: VALID_PBL_INTERVIEW_DATA }, error: null });
    // consultantProfile
    adminMock.addResult({ data: null, error: null });
    // self_assessments
    adminMock.addResult({ data: null, error: null });
    // projects.update (상태 전이)
    adminMock.addResult({ data: null, error: null });

    const result = await generatePBLAction(PROJECT_ID);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pblId).toBe('draft-id');
    expect(mockAfter).toHaveBeenCalled();
    expect(insertSystemActivityLog).toHaveBeenCalledWith(
      PROJECT_ID,
      USER_A_ID,
      'PBL 보고서가 생성되었습니다.',
    );
  });

  it('revisionPrompt 있을 때 → "새 PBL 보고서 버전" 활동 일지 기록', async () => {
    const { generatePBLContent } = await import('@/lib/services/pbl/pbl-generator');
    const { createDraftVersion } = await import('@/lib/services/pbl/pbl-crud');
    const { insertSystemActivityLog } = await import('@/lib/services/activity-log');
    vi.mocked(createDraftVersion).mockResolvedValueOnce({ id: 'rev-draft-id', version_number: 2 } as never);
    vi.mocked(generatePBLContent).mockResolvedValueOnce({ content: VALID_PBL_CONTENT } as never);

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        id: PROJECT_ID, status: 'PBL_DRAFTED', track: 'PBL',
        assigned_consultant_id: USER_A_ID, company_name: '테스트기업', is_test_mode: false,
        industry: '제조업', sub_industries: [], company_size: 'medium', customer_comment: null,
      },
      error: null,
    });
    adminMock.addResult({ data: { pbl_data: VALID_PBL_INTERVIEW_DATA }, error: null });
    // consultantProfile
    adminMock.addResult({ data: null, error: null });
    // self_assessments
    adminMock.addResult({ data: null, error: null });
    // projects.update (상태 전이)
    adminMock.addResult({ data: null, error: null });

    await generatePBLAction(PROJECT_ID, '더 자세하게 작성해 주세요');
    expect(insertSystemActivityLog).toHaveBeenCalledWith(
      PROJECT_ID,
      USER_A_ID,
      '새 PBL 보고서 버전이 생성되었습니다.',
    );
  });

  it('PBLGenerationError → 에러 메시지 반환', async () => {
    const { generatePBLContent, PBLGenerationError } = await import('@/lib/services/pbl/pbl-generator');
    vi.mocked(generatePBLContent).mockRejectedValueOnce(
      new PBLGenerationError('PBL 생성 한도 초과'),
    );

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        id: PROJECT_ID, status: 'INTERVIEWED', track: 'PBL',
        assigned_consultant_id: USER_A_ID, company_name: '기업', is_test_mode: false,
        industry: '제조업', sub_industries: [], company_size: 'medium', customer_comment: null,
      },
      error: null,
    });
    adminMock.addResult({ data: { pbl_data: VALID_PBL_INTERVIEW_DATA }, error: null });
    // consultantProfile
    adminMock.addResult({ data: null, error: null });
    // self_assessments
    adminMock.addResult({ data: null, error: null });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await generatePBLAction(PROJECT_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('한도 초과');
    consoleSpy.mockRestore();
  });
});

// ─── savePBLDraftAction ───────────────────────────────────────────────────────

describe('savePBLDraftAction', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase({});
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await savePBLDraftAction(PBL_ID, {});
    expect(result.success).toBe(false);
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await savePBLDraftAction(PBL_ID, {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('PBL 보고서 미존재 → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // requireConsultantPBLReportAccess → pbl_reports 조회 실패
    adminMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await savePBLDraftAction(PBL_ID, {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('PBL 보고서');
  });

  it('타 컨설턴트 PBL → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({
      data: {
        project_id: PROJECT_ID,
        projects: {
          status: 'PBL_DRAFTED', track: 'PBL',
          assigned_consultant_id: USER_B_ID, is_test_mode: false, company_name: '기업',
        },
      },
      error: null,
    });

    const result = await savePBLDraftAction(PBL_ID, {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('권한');
  });

  it('PBL 트랙 아닌 프로젝트 → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({
      data: {
        project_id: PROJECT_ID,
        projects: {
          status: 'ROADMAP_DRAFTED', track: 'ROADMAP',
          assigned_consultant_id: USER_A_ID, is_test_mode: false, company_name: '기업',
        },
      },
      error: null,
    });

    const result = await savePBLDraftAction(PBL_ID, {});
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('PBL 트랙');
  });

  it('잘못된 pbl_content Zod 검증 실패 → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });

    // pbl_content에 invalid 데이터
    const result = await savePBLDraftAction(PBL_ID, { pbl_content: { invalid: 'data' } });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('양식에 맞지 않습니다');
  });

  it('pbl_content 없이 diagnosis_summary만 업데이트 → success', async () => {
    const { updateDraft } = await import('@/lib/services/pbl/pbl-crud');
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });

    const result = await savePBLDraftAction(PBL_ID, {
      diagnosis_summary: '수정된 진단 요약',
    });
    expect(result.success).toBe(true);
    expect(updateDraft).toHaveBeenCalledWith(PBL_ID, {
      pbl_content: undefined,
      diagnosis_summary: '수정된 진단 요약',
    });
  });

  it('updateDraft 예외 발생 → catch error 반환', async () => {
    const { updateDraft } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(updateDraft).mockRejectedValueOnce(new Error('DB write error'));

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await savePBLDraftAction(PBL_ID, { diagnosis_summary: '요약' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('DB write error');
    consoleSpy.mockRestore();
  });
});

// ─── finalizePBLAction ────────────────────────────────────────────────────────

describe('finalizePBLAction', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase({});
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await finalizePBLAction(PBL_ID);
    expect(result.success).toBe(false);
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await finalizePBLAction(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('PBL 접근 권한 없음 → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await finalizePBLAction(PBL_ID);
    expect(result.success).toBe(false);
  });

  it('성공 → after 콜백으로 활동 일지 기록', async () => {
    const { insertSystemActivityLog } = await import('@/lib/services/activity-log');
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });

    const result = await finalizePBLAction(PBL_ID);
    expect(result.success).toBe(true);
    expect(mockAfter).toHaveBeenCalled();
    expect(insertSystemActivityLog).toHaveBeenCalledWith(
      PROJECT_ID,
      USER_A_ID,
      'PBL 보고서가 최종 확정되었습니다.',
    );
  });

  it('finalizePBL 예외 발생 → catch error 반환', async () => {
    const { finalizePBL } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(finalizePBL).mockRejectedValueOnce(new Error('finalize DB error'));

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await finalizePBLAction(PBL_ID);
    expect(result.success).toBe(false);
    // catch: error.message 그대로 반환
    if (!result.success) expect(result.error).toBe('finalize DB error');
    consoleSpy.mockRestore();
  });
});

// ─── deletePBLAction ──────────────────────────────────────────────────────────

describe('deletePBLAction', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase({});
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await deletePBLAction(PBL_ID);
    expect(result.success).toBe(false);
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await deletePBLAction(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('PBL 접근 권한 없음 → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await deletePBLAction(PBL_ID);
    expect(result.success).toBe(false);
  });

  it('성공 → deleteDraft 호출 + success', async () => {
    const { deleteDraft } = await import('@/lib/services/pbl/pbl-crud');
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });

    const result = await deletePBLAction(PBL_ID);
    expect(result.success).toBe(true);
    expect(deleteDraft).toHaveBeenCalledWith(PBL_ID);
  });

  it('deleteDraft 예외 발생 → catch error 반환', async () => {
    const { deleteDraft } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(deleteDraft).mockRejectedValueOnce(new Error('delete error'));

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await deletePBLAction(PBL_ID);
    expect(result.success).toBe(false);
    // catch: error.message 그대로 반환
    if (!result.success) expect(result.error).toBe('delete error');
    consoleSpy.mockRestore();
  });
});

// ─── togglePBLShareAction ─────────────────────────────────────────────────────

describe('togglePBLShareAction', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase({});
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await togglePBLShareAction(PBL_ID, true);
    expect(result.success).toBe(false);
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await togglePBLShareAction(PBL_ID, true);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('PBL 접근 권한 없음 → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await togglePBLShareAction(PBL_ID, true);
    expect(result.success).toBe(false);
  });

  it('공유 on → sharePBL(true) 호출 + 감사로그', async () => {
    const { sharePBL } = await import('@/lib/services/pbl/pbl-crud');
    const { createAuditLog } = await import('@/lib/services/audit');
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });

    const result = await togglePBLShareAction(PBL_ID, true);
    expect(result.success).toBe(true);
    expect(sharePBL).toHaveBeenCalledWith(PBL_ID, true);
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PBL_REPORT_SHARED',
        meta: expect.objectContaining({ is_shared: true }),
      }),
    );
  });

  it('공유 off → sharePBL(false) 호출', async () => {
    const { sharePBL } = await import('@/lib/services/pbl/pbl-crud');
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });

    const result = await togglePBLShareAction(PBL_ID, false);
    expect(result.success).toBe(true);
    expect(sharePBL).toHaveBeenCalledWith(PBL_ID, false);
  });

  it('감사로그 실패해도 성공 반환 (try-catch 내부)', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    vi.mocked(createAuditLog).mockRejectedValueOnce(new Error('audit error'));

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await togglePBLShareAction(PBL_ID, true);
    expect(result.success).toBe(true);
    consoleSpy.mockRestore();
  });

  it('sharePBL 예외 발생 → catch error 반환', async () => {
    const { sharePBL } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(sharePBL).mockRejectedValueOnce(new Error('share error'));

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await togglePBLShareAction(PBL_ID, true);
    expect(result.success).toBe(false);
    // catch: error.message 그대로 반환
    if (!result.success) expect(result.error).toBe('share error');
    consoleSpy.mockRestore();
  });
});

// ─── cancelPBLGeneration ──────────────────────────────────────────────────────

describe('cancelPBLGeneration', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await cancelPBLGeneration();
    expect(result.success).toBe(false);
  });

  it('인증된 사용자 → cancelAbort 호출 + success', async () => {
    const { cancelAbort } = await import('@/lib/services/abort-registry');
    // requireAuth: getCachedProfile → users 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await cancelPBLGeneration();
    expect(result.success).toBe(true);
    expect(cancelAbort).toHaveBeenCalledWith(`pbl:${USER_A_ID}`);
  });
});

// ─── exportPBLAsHwpxAction ────────────────────────────────────────────────────

describe('exportPBLAsHwpxAction', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase({});
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await exportPBLAsHwpxAction(PBL_ID);
    expect(result.success).toBe(false);
  });

  it('허용되지 않은 역할(USER_PENDING) → error', async () => {
    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });

    const result = await exportPBLAsHwpxAction(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('권한');
  });

  it('빈 pblId → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await exportPBLAsHwpxAction('');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('ID');
  });

  it('CONSULTANT_APPROVED + 타 컨설턴트 PBL → forbidden', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({
      data: {
        project_id: PROJECT_ID,
        projects: {
          status: 'PBL_DRAFTED', track: 'PBL',
          assigned_consultant_id: USER_B_ID, is_test_mode: false, company_name: '기업',
        },
      },
      error: null,
    });

    const result = await exportPBLAsHwpxAction(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('권한');
  });

  it('OPS_ADMIN + PBL 보고서 없음 → not found error', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    // pbl_reports 조회 → null
    adminMock.addResult({ data: null, error: null });

    const result = await exportPBLAsHwpxAction(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('PBL 보고서');
  });

  it('CONSULTANT_APPROVED + 성공 → base64 + fileName + mimeType 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // requireConsultantPBLReportAccess
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });
    // pbl_reports 상세 조회
    adminMock.addResult({
      data: { id: PBL_ID, version_number: 1, pbl_content: VALID_PBL_CONTENT },
      error: null,
    });
    // projects 조회
    adminMock.addResult({ data: { id: PROJECT_ID, company_name: '테스트기업' }, error: null });
    // interviews 조회
    adminMock.addResult({ data: null, error: null });

    const result = await exportPBLAsHwpxAction(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fileName).toBe('PBL_v1.hwpx');
      expect(result.data.contentBase64).toBeTruthy();
      expect(result.data.mimeType).toBe('application/vnd.hancom.hwpx');
      expect(Buffer.from(result.data.contentBase64, 'base64').toString()).toBe('dummy-pbl-hwpx-bytes');
    }
  });

  it('OPS_ADMIN + 성공 → base64 반환 + after 감사로그', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    // pbl_reports project_id 조회 (OPS 경로)
    adminMock.addResult({ data: { project_id: PROJECT_ID }, error: null });
    // pbl_reports 상세 조회
    adminMock.addResult({
      data: { id: PBL_ID, version_number: 2, pbl_content: VALID_PBL_CONTENT },
      error: null,
    });
    // projects 조회
    adminMock.addResult({ data: { id: PROJECT_ID, company_name: '운영기업' }, error: null });
    // interviews 조회
    adminMock.addResult({ data: null, error: null });

    const result = await exportPBLAsHwpxAction(PBL_ID);
    expect(result.success).toBe(true);
    expect(mockAfter).toHaveBeenCalled();
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PBL_HWPX_EXPORTED',
        actorUserId: USER_A_ID,
      }),
    );
  });

  it('HWPX 생성 에러 → 사용자 친화 메시지', async () => {
    const { generatePBLHwpx } = await import('@/lib/services/export/hwpx');
    vi.mocked(generatePBLHwpx).mockRejectedValueOnce(new Error('Python 서버 오류'));

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });
    adminMock.addResult({ data: { id: PBL_ID, version_number: 1 }, error: null });
    adminMock.addResult({ data: { id: PROJECT_ID, company_name: '기업' }, error: null });
    adminMock.addResult({ data: null, error: null });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await exportPBLAsHwpxAction(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('HWPX');
    consoleSpy.mockRestore();
  });

  it('로컬 dev 안내 메시지(Vercel Python 런타임) → 그대로 전달', async () => {
    const { generatePBLHwpx } = await import('@/lib/services/export/hwpx');
    vi.mocked(generatePBLHwpx).mockRejectedValueOnce(
      new Error('Vercel Python 런타임 로컬에서 실행 불가'),
    );

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });
    adminMock.addResult({ data: { id: PBL_ID, version_number: 1 }, error: null });
    adminMock.addResult({ data: { id: PROJECT_ID, company_name: '기업' }, error: null });
    adminMock.addResult({ data: null, error: null });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await exportPBLAsHwpxAction(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('Vercel Python 런타임');
    consoleSpy.mockRestore();
  });

  it('projects 조회 실패 → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });
    adminMock.addResult({ data: { id: PBL_ID, version_number: 1 }, error: null });
    // projects 조회 → null
    adminMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await exportPBLAsHwpxAction(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('프로젝트');
  });

  it('CONSULTANT_APPROVED + pbl_reports 두 번째 조회 실패 → error', async () => {
    // requireConsultantPBLReportAccess 성공 후 pbl_reports 상세 재조회 실패
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null }); // requireConsultantPBLReportAccess
    adminMock.addResult({ data: null, error: { message: 'not found' } }); // pbl_reports 상세 조회 실패

    const result = await exportPBLAsHwpxAction(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('PBL 보고서');
  });

  it('감사로그 실패해도 성공 반환 (after 내부 try-catch)', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    vi.mocked(createAuditLog).mockRejectedValueOnce(new Error('audit DB error'));

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: PBL_ACCESS_SUCCESS_ROW, error: null });
    adminMock.addResult({ data: { id: PBL_ID, version_number: 1, pbl_content: VALID_PBL_CONTENT }, error: null });
    adminMock.addResult({ data: { id: PROJECT_ID, company_name: '기업' }, error: null });
    adminMock.addResult({ data: null, error: null });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await exportPBLAsHwpxAction(PBL_ID);
    expect(result.success).toBe(true);
    consoleSpy.mockRestore();
  });

  it('외부 catch 블록: 예외 발생 → PBL HWPX 내보내기 실패 에러', async () => {
    // requireAuthWithRole에서 예외 발생하도록 createClient를 throw하게 설정
    vi.mocked(createClient).mockRejectedValueOnce(new Error('unexpected'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await exportPBLAsHwpxAction(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('PBL HWPX 내보내기');
    consoleSpy.mockRestore();
  });
});
