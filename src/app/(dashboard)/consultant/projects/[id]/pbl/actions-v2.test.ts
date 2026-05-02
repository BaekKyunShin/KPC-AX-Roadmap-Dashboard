/**
 * Task 2.8 — PBL 결과 V2 Server Action 테스트
 *
 * 대상:
 *   - createPBLV2 / confirmFinalPBLV2 / editPBLV2 / exportPBLHwpxV2 /
 *     fetchPBLPageDataV2
 *
 * 5단계 패턴 검증 + Legacy Action 위임 경계 검증. Legacy Action 자체 상세
 * 동작은 actions.test.ts 에서 커버하므로, 본 파일은 래퍼/변환/초기 데이터
 * 조립만 확인한다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createPBLV2,
  confirmFinalPBLV2,
  editPBLV2,
  exportPBLHwpxV2,
  fetchPBLPageDataV2,
} from './actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMockSupabase } from '@/test/helpers/mock-supabase';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import type {
  PBLContent,
  PBLTrainingContent,
  PBLTrainingInstructor,
} from '@/lib/services/pbl/pbl-types';
import sampleResponse from '@/lib/services/pbl/__fixtures__/sample-llm-response.json';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/services/audit', () => ({ createAuditLog: vi.fn() }));
vi.mock('@/lib/services/activity-log', () => ({ insertSystemActivityLog: vi.fn() }));
vi.mock('@/lib/services/notification', () => ({ createNotificationForAdmins: vi.fn() }));
vi.mock('@/lib/supabase/cached', () => ({
  getCachedUser: vi.fn(),
  getCachedProfile: vi.fn(),
}));

vi.mock('@/lib/services/pbl/pbl-crud', async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    '@/lib/services/pbl/pbl-crud',
  );
  return {
    ...actual,
    listVersions: vi.fn(),
    getPBLReport: vi.fn(),
    finalizePBL: vi.fn(),
    createDraftVersion: vi.fn(),
    updateDraft: vi.fn(),
    deleteDraft: vi.fn(),
    sharePBL: vi.fn(),
  };
});
vi.mock('@/lib/services/pbl/pbl-generator', () => ({
  generatePBLContent: vi.fn(),
  PBLGenerationError: class PBLGenerationError extends Error {},
}));
vi.mock('@/lib/services/export/hwpx', () => ({
  buildRoadmapHwpxPayload: vi.fn(),
  generateRoadmapHwpx: vi.fn(),
  buildPBLHwpxPayload: vi.fn().mockReturnValue({ fileName: 'p.hwpx' }),
  generatePBLHwpx: vi.fn().mockResolvedValue(Buffer.from('PK\x03\x04')),
}));

const { mockAfter, flushAfterCallbacks, pendingCallbacks } = vi.hoisted(() => {
  const pending: Promise<unknown>[] = [];
  const after = vi.fn((fn: () => void | Promise<unknown>) => {
    const r = fn();
    if (r && typeof (r as Promise<unknown>).then === 'function') pending.push(r as Promise<unknown>);
  });
  async function flush() {
    await Promise.all(pending);
    pending.length = 0;
  }
  return { mockAfter: after, flushAfterCallbacks: flush, pendingCallbacks: pending };
});
vi.mock('next/server', () => ({ after: mockAfter }));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (key: string) => (key === 'host' ? 'localhost:3000' : null),
  }),
}));

afterEach(() => {
  pendingCallbacks.length = 0;
});

const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';
const VERSION_ID = '550e8400-e29b-41d4-a716-446655440030';

async function mockCachedAuth({
  authed = true,
  role = 'CONSULTANT_APPROVED',
  status = 'ACTIVE',
}: { authed?: boolean; role?: string | null; status?: string | null } = {}) {
  const cached = await import('@/lib/supabase/cached');
  vi.mocked(cached.getCachedUser).mockResolvedValue(
    (authed ? { id: USER_A, email: 'consultant@example.com' } : null) as never,
  );
  vi.mocked(cached.getCachedProfile).mockResolvedValue(
    (authed ? { id: USER_A, role, status } : null) as never,
  );
}

/**
 * PBL 보고서 접근 검증 쿼리 mock — adminMock 으로 수행.
 * Legacy `requireConsultantPBLReportAccess` 가 admin 클라이언트로
 * `pbl_reports!inner(projects)` 를 조회한다.
 */
function mockPBLReportAccess(
  adminMock: ReturnType<typeof createMockSupabase>,
  { assigned = true, track = 'PBL' as const, status = 'PBL_DRAFTED' } = {},
) {
  adminMock.addResult({
    data: {
      project_id: PROJECT_ID,
      projects: {
        status,
        track,
        assigned_consultant_id: assigned ? USER_A : 'other-user',
        is_test_mode: false,
        company_name: 'ACME',
      },
    },
    error: null,
  });
}

function validPBLInterview() {
  return {
    companyName: 'ACME',
    courseName: '생성형 AI 활용 PBL',
    trainingHours: 40,
    trainingTarget: '제조 공정 인력',
    trainingForm: '혼합형',
    trainingPeriod: '2026-06 ~ 2026-07',
    businessIssues: '품질 편차',
    companyIssues: '품질 편차 심각',
    organization: { orgTree: [], mainWork: [] },
    // R8 PBL-자체-02 — 정형 객체
    trainingEnv: {
      properTrainingHours: '',
      internalPlace: '현장 실습실 보유',
      externalPlace: '',
      internalInstructors: [],
      externalInstructors: [],
      aiInfrastructure: '',
    },
    hrdReportPdf: null,
    courseNecessity: 'AI 역량 내재화 필요',
    // R8 PBL-자체-03 — 평면 4행 배열
    activities: [
      { round: 1, role: 'PM' as const, personName: '홍길동', date: '2026-05-01', content: '인터뷰', method: 'ONSITE' },
      { round: 1, role: 'EXTERNAL_EXPERT' as const, personName: '', date: '2026-05-01', content: '인터뷰', method: 'ONSITE' },
      { round: 1, role: 'INTERNAL_EXPERT' as const, personName: '', date: '2026-05-01', content: '인터뷰', method: 'ONSITE' },
      { round: 1, role: 'JURISDICTION_MANAGER' as const, personName: '', date: '2026-05-01', content: '인터뷰', method: 'ONSITE' },
    ],
    // R8 PBL-자체-04 — 4 정형 항목
    problemDefinitionSheet: { background: '문제1', core: '핵심', scope: '범위', constraints: '제약' },
    priority: {
      items: [{ problem: '문제1', score: 5, rank: 1 }],
      method: 'AHP 설문 평균',
    },
    target: {
      name: '훈련대상 업무',
      scope: '생산팀 20명',
      necessity: '품질 편차 해소',
      details: [],
    },
    currentAiLevel: { level: 'BASIC' as const, note: '' },
    expectedAiLevel: { level: 'USER' as const, note: '' },
  };
}

// ============================================================================
// createPBLV2
// ============================================================================

describe('createPBLV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('인증 없음 → error', async () => {
    await mockCachedAuth({ authed: false });
    const r = await createPBLV2(PROJECT_ID);
    expect(r.success).toBe(false);
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error', async () => {
    await mockCachedAuth({ role: 'OPS_ADMIN' });
    const r = await createPBLV2(PROJECT_ID);
    expect(r.success).toBe(false);
  });
});

// ============================================================================
// confirmFinalPBLV2
// ============================================================================

describe('confirmFinalPBLV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('인증 없음 → error', async () => {
    await mockCachedAuth({ authed: false });
    const r = await confirmFinalPBLV2(VERSION_ID);
    expect(r.success).toBe(false);
  });

  it('정상 경로 → Legacy finalizePBL 위임', async () => {
    const { finalizePBL } = await import('@/lib/services/pbl/pbl-crud');
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    vi.mocked(finalizePBL).mockResolvedValue({} as never);

    const r = await confirmFinalPBLV2(VERSION_ID);
    await flushAfterCallbacks();
    expect(r.success).toBe(true);
    expect(finalizePBL).toHaveBeenCalledWith(VERSION_ID, USER_A);
  });
});

// ============================================================================
// editPBLV2
// ============================================================================

describe('editPBLV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('인증 없음 → error', async () => {
    await mockCachedAuth({ authed: false });
    const r = await editPBLV2(VERSION_ID, { companyIssues: '변경' });
    expect(r.success).toBe(false);
  });

  it('배정되지 않은 프로젝트 → error', async () => {
    await mockCachedAuth();
    mockPBLReportAccess(adminMock, { assigned: false });
    const r = await editPBLV2(VERSION_ID, { companyIssues: '변경' });
    expect(r.success).toBe(false);
  });

  it('빈 patch → 성공(no-op, 쿼리 미발생)', async () => {
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    const r = await editPBLV2(VERSION_ID, {});
    expect(r.success).toBe(true);
    // pbl_reports 접근 외에 interviews 쿼리 호출 없음
    expect(adminMock.chainable.update.mock.calls).toHaveLength(0);
  });

  it('Ⅱ 요구분석 patch (companyIssues) — 기존 pbl_data 와 병합 후 update', async () => {
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    // 기존 interview 조회
    adminMock.addResult({
      data: {
        id: 'interview-1',
        pbl_data: { companyName: 'ACME', courseName: '기존' },
      },
      error: null,
    });
    // update 결과
    adminMock.addResult({ data: null, error: null });

    const r = await editPBLV2(VERSION_ID, { companyIssues: '신규 이슈' });
    await flushAfterCallbacks();
    expect(r.success).toBe(true);

    const updateCalls = adminMock.chainable.update.mock.calls as Array<[Record<string, unknown>]>;
    expect(updateCalls.length).toBe(1);
    const dbPayload = updateCalls[0][0];
    const pblData = dbPayload.pbl_data as Record<string, unknown>;
    expect(pblData.companyIssues).toBe('신규 이슈');
    // 기존 필드 보존
    expect(pblData.companyName).toBe('ACME');
  });

  // R8 분기 cover — trainingEnv 정형 객체 patch 병합 (PBL-자체-02)
  it('trainingEnv 정형 patch — 기존 객체와 병합 (PBL-자체-02)', async () => {
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    adminMock.addResult({
      data: {
        id: 'interview-1',
        pbl_data: {
          trainingEnv: {
            properTrainingHours: '4시간',
            internalPlace: '본사',
            externalPlace: '',
            internalInstructors: [],
            externalInstructors: [],
            aiInfrastructure: 'PC 30대',
          },
        },
      },
      error: null,
    });
    adminMock.addResult({ data: null, error: null });

    // properTrainingHours 만 patch — 나머지는 기존 값 보존
    const r = await editPBLV2(VERSION_ID, {
      trainingEnv: { properTrainingHours: '8시간' },
    });
    await flushAfterCallbacks();
    expect(r.success).toBe(true);

    const updateCalls = adminMock.chainable.update.mock.calls as Array<[Record<string, unknown>]>;
    const pblData = updateCalls[0][0].pbl_data as Record<string, unknown>;
    const trainingEnv = pblData.trainingEnv as Record<string, unknown>;
    expect(trainingEnv.properTrainingHours).toBe('8시간');
    // 기존 값 보존
    expect(trainingEnv.internalPlace).toBe('본사');
    expect(trainingEnv.aiInfrastructure).toBe('PC 30대');
  });

  // R8 분기 cover — problemDefinitionSheet 정형 patch 병합 (PBL-자체-04)
  it('problemDefinitionSheet patch — 기존 시트와 부분 병합 (PBL-자체-04)', async () => {
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    adminMock.addResult({
      data: {
        id: 'interview-1',
        pbl_data: {
          problemDefinitionSheet: {
            background: '기존 배경',
            core: '기존 핵심',
            scope: '기존 범위',
            constraints: '기존 제약',
          },
        },
      },
      error: null,
    });
    adminMock.addResult({ data: null, error: null });

    // core 만 patch
    const r = await editPBLV2(VERSION_ID, {
      problemDefinitionSheet: { core: '신규 핵심' },
    });
    await flushAfterCallbacks();
    expect(r.success).toBe(true);

    const updateCalls = adminMock.chainable.update.mock.calls as Array<[Record<string, unknown>]>;
    const pblData = updateCalls[0][0].pbl_data as Record<string, unknown>;
    const sheet = pblData.problemDefinitionSheet as Record<string, unknown>;
    expect(sheet.core).toBe('신규 핵심');
    expect(sheet.background).toBe('기존 배경');
    expect(sheet.scope).toBe('기존 범위');
    expect(sheet.constraints).toBe('기존 제약');
  });

  it('Ⅰ overview patch — 루트 필드로 병합', async () => {
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    adminMock.addResult({
      data: { id: 'interview-1', pbl_data: { trainingHours: 20 } },
      error: null,
    });
    adminMock.addResult({ data: null, error: null });

    const r = await editPBLV2(VERSION_ID, {
      overview: { trainingHours: 50, trainingForm: '온라인' },
    });
    await flushAfterCallbacks();
    expect(r.success).toBe(true);

    const updateCalls = adminMock.chainable.update.mock.calls as Array<[Record<string, unknown>]>;
    const pblData = updateCalls[0][0].pbl_data as Record<string, unknown>;
    expect(pblData.trainingHours).toBe(50);
    expect(pblData.trainingForm).toBe('온라인');
  });

  it('기존 interview 없을 때 → insert 경로', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    adminMock.addResult({ data: null, error: null }); // maybeSingle → null
    adminMock.addResult({ data: null, error: null }); // insert

    const r = await editPBLV2(VERSION_ID, { companyIssues: '신규' });
    await flushAfterCallbacks();
    expect(r.success).toBe(true);

    const insertCalls = adminMock.chainable.insert.mock.calls as Array<[Record<string, unknown>]>;
    expect(insertCalls.length).toBe(1);
    expect(insertCalls[0][0]).toMatchObject({
      project_id: PROJECT_ID,
      interviewer_id: USER_A,
    });

    // PR5 (R6 spec) — 감사로그가 PBL_REPORT_EDITED 로 분기 + source: 'RESULT_PAGE'
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PBL_REPORT_EDITED',
        targetType: 'pbl_report',
        targetId: VERSION_ID,
        meta: expect.objectContaining({
          source: 'RESULT_PAGE',
          fields_changed: expect.any(Array),
        }),
      }),
    );
  });

  // ─── operations 슬라이스 (Ⅳ-3-다 / Ⅳ-3-마 LLM 결과 편집) ────────────────────
  // pbl_reports.pbl_content 를 직접 갱신 (interviews 미수정).
  // patch 형식: operations.training_plan.{ subject_profile.training_contents | training_instructors }

  function makeValidPBLContent(): PBLContent {
    // sample-llm-response.json 은 strict pblContentSchema 통과 (LLM 출력 1차 파싱 fixture)
    return JSON.parse(JSON.stringify(sampleResponse)) as PBLContent;
  }

  it('operations.training_contents patch — pbl_reports.pbl_content 만 갱신, interviews 미수정', async () => {
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    // pbl_reports row 조회 (pbl_content + status)
    const existing = makeValidPBLContent();
    adminMock.addResult({
      data: { pbl_content: existing, status: 'DRAFT' },
      error: null,
    });
    // pbl_reports update
    adminMock.addResult({ data: null, error: null });

    // 사용자 시나리오: detail 만 컨설턴트가 보강, 시간 컬럼은 read-only 유지
    // → 클라이언트가 기존 배열 전체를 송신하되 변경 행의 detail 만 새 값
    const baseContents =
      existing.operation_plan.training_plan.subject_profile.training_contents;
    const newContents: PBLTrainingContent[] = baseContents.map((c, i) =>
      i === 0 ? { ...c, detail: '컨설턴트가 보강한 단원 세부 내용' } : c,
    );
    const r = await editPBLV2(VERSION_ID, {
      operations: {
        training_plan: { subject_profile: { training_contents: newContents } },
      },
    });
    await flushAfterCallbacks();
    expect(r.success).toBe(true);

    // interviews 테이블은 건드리지 않아야 함
    // (admin 호출은 pbl_reports.select + pbl_reports.update 만 발생)
    const updateCalls = adminMock.chainable.update.mock.calls as Array<
      [Record<string, unknown>]
    >;
    expect(updateCalls.length).toBe(1);
    const updated = updateCalls[0][0].pbl_content as PBLContent;
    const updatedContents =
      updated.operation_plan.training_plan.subject_profile.training_contents;
    expect(updatedContents).toHaveLength(baseContents.length);
    expect(updatedContents[0].detail).toBe('컨설턴트가 보강한 단원 세부 내용');
    expect(updatedContents[0].unit_name).toBe(baseContents[0].unit_name);
    // 나머지 필드는 보존
    expect(updated.operation_plan.training_plan.subject_profile.course_name).toBe(
      existing.operation_plan.training_plan.subject_profile.course_name,
    );
    expect(updated.operation_plan.training_plan.training_instructors).toEqual(
      existing.operation_plan.training_plan.training_instructors,
    );
  });

  it('operations.training_instructors patch — training_instructors 만 교체', async () => {
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    const existing = makeValidPBLContent();
    adminMock.addResult({
      data: { pbl_content: existing, status: 'DRAFT' },
      error: null,
    });
    adminMock.addResult({ data: null, error: null });

    const newInstructors: PBLTrainingInstructor[] = [
      {
        name: '컨설턴트 보정 강사',
        internal_external: '외부',
        career_years: 12,
        work_name: 'AI 컨설팅',
        detailed_training_content: ['수정된 항목 1', '수정된 항목 2'],
      },
    ];
    const r = await editPBLV2(VERSION_ID, {
      operations: { training_plan: { training_instructors: newInstructors } },
    });
    await flushAfterCallbacks();
    expect(r.success).toBe(true);

    const updateCalls = adminMock.chainable.update.mock.calls as Array<
      [Record<string, unknown>]
    >;
    const updated = updateCalls[0][0].pbl_content as PBLContent;
    expect(updated.operation_plan.training_plan.training_instructors).toEqual(
      newInstructors,
    );
    // training_contents 는 보존
    expect(
      updated.operation_plan.training_plan.subject_profile.training_contents,
    ).toEqual(
      existing.operation_plan.training_plan.subject_profile.training_contents,
    );
  });

  it('operations patch 감사로그 meta — target: llm_generated + slice: operations', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    adminMock.addResult({
      data: { pbl_content: makeValidPBLContent(), status: 'DRAFT' },
      error: null,
    });
    adminMock.addResult({ data: null, error: null });

    const r = await editPBLV2(VERSION_ID, {
      operations: {
        training_plan: {
          training_instructors: [
            {
              name: '강사 A',
              internal_external: '외부',
              career_years: 5,
              work_name: '업무 A',
              detailed_training_content: ['항목'],
            },
          ],
        },
      },
    });
    await flushAfterCallbacks();
    expect(r.success).toBe(true);

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PBL_REPORT_EDITED',
        targetType: 'pbl_report',
        meta: expect.objectContaining({
          source: 'RESULT_PAGE',
          target: 'llm_generated',
          slice: 'operations',
        }),
      }),
    );
  });

  it('operations + 인터뷰 슬라이스 동시 patch → 명시적 에러', async () => {
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    const r = await editPBLV2(VERSION_ID, {
      companyIssues: '신규 이슈',
      operations: {
        training_plan: { subject_profile: { training_contents: [] } },
      },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toContain('한 번에');
    }
  });

  it('operations patch 가 strict 검증 실패 (training_contents 빈 배열) → error', async () => {
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    adminMock.addResult({
      data: { pbl_content: makeValidPBLContent(), status: 'DRAFT' },
      error: null,
    });

    const r = await editPBLV2(VERSION_ID, {
      operations: {
        training_plan: { subject_profile: { training_contents: [] } },
      },
    });
    expect(r.success).toBe(false);
    // pbl_reports update 는 호출되지 않아야 함
    expect(adminMock.chainable.update.mock.calls).toHaveLength(0);
  });
});

// ============================================================================
// exportPBLHwpxV2
// ============================================================================

describe('exportPBLHwpxV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('인증 없음 → error', async () => {
    await mockCachedAuth({ authed: false });
    const r = await exportPBLHwpxV2(VERSION_ID);
    expect(r.success).toBe(false);
  });

  it('CONSULTANT_APPROVED + 배정 프로젝트 → Legacy 위임 후 base64 반환', async () => {
    await mockCachedAuth();
    mockPBLReportAccess(adminMock);
    // pbl_reports row
    adminMock.addResult({
      data: { id: VERSION_ID, version_number: 1 },
      error: null,
    });
    // projects row
    adminMock.addResult({
      data: { id: PROJECT_ID, company_name: 'ACME' },
      error: null,
    });
    // interviews maybeSingle
    adminMock.addResult({ data: null, error: null });

    const r = await exportPBLHwpxV2(VERSION_ID);
    await flushAfterCallbacks();
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.fileName).toBe('p.hwpx');
      expect(r.data.mimeType).toBe('application/vnd.hancom.hwpx');
    }
  });
});

// ============================================================================
// fetchPBLPageDataV2
// ============================================================================

describe('fetchPBLPageDataV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('인증 없음 → error', async () => {
    await mockCachedAuth({ authed: false });
    const r = await fetchPBLPageDataV2(PROJECT_ID);
    expect(r.success).toBe(false);
  });

  it('허용되지 않은 역할 → error', async () => {
    await mockCachedAuth({ role: 'USER_PENDING' });
    const r = await fetchPBLPageDataV2(PROJECT_ID);
    expect(r.success).toBe(false);
  });

  it('CONSULTANT_APPROVED + 배정 + 최신 버전(version_number DESC) 선택 + snapshot 재구조화', async () => {
    const { listVersions } = await import('@/lib/services/pbl/pbl-crud');
    await mockCachedAuth();

    // requireConsultantProjectAccess (server)
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });

    vi.mocked(listVersions).mockResolvedValue([
      { id: 'v-draft', version_number: 2, status: 'DRAFT' } as unknown as PBLReportRow,
      { id: 'v-final', version_number: 1, status: 'FINAL' } as unknown as PBLReportRow,
    ]);

    // fetchPBLInterviewV2 경로 — verifyProjectAccess (server)
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // fetchProjectMetaForInterview (admin)
    adminMock.addResult({
      data: {
        id: PROJECT_ID,
        status: 'PBL_DRAFTED',
        track: 'PBL',
        company_name: 'ACME',
        is_test_mode: false,
      },
      error: null,
    });
    // interviews select — pbl_data 존재
    adminMock.addResult({
      data: {
        pbl_data: {
          ...validPBLInterview(),
          hrdReportPdf: {
            fileName: 'hrd.pdf',
            url: 'proj/hrd.pdf',
            size: 100,
          },
        },
      },
      error: null,
    });

    const createSignedUrl = vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed.example/hrd.pdf' }, error: null });
    (adminMock.client as unknown as { storage: { from: typeof vi.fn } }).storage = {
      from: vi.fn(() => ({ createSignedUrl })),
    } as never;

    // #013 fix — interviews + projects 추가 fetch
    adminMock.addResult({ data: { id: 'iv-1' }, error: null });
    adminMock.addResult({ data: { status: 'PBL_DRAFTED' }, error: null });

    const r = await fetchPBLPageDataV2(PROJECT_ID);
    expect(r.success).toBe(true);
    if (!r.success) return;

    expect(r.data.versions).toHaveLength(2);
    // 최신(version_number DESC) 기준 첫 번째 = v-draft (version_number=2)
    expect(r.data.selectedVersion?.id).toBe('v-draft');

    // snapshot 재구조화 검증 — overview / analysis 네임스페이스로 재정렬
    expect(r.data.interview.overview?.companyName).toBe('ACME');
    expect(r.data.interview.overview?.trainingHours).toBe(40);
    expect(r.data.interview.analysis?.companyIssues).toBe('품질 편차 심각');
    expect(r.data.interview.analysis?.hrdReportPdf?.url).toBe(
      'https://signed.example/hrd.pdf',
    );
    // Ⅲ flat
    // R8 PBL-자체-03 — 평면 4행 배열로 변경됨 (1차 × 4 역할)
    expect(r.data.interview.activities).toHaveLength(4);
    expect(r.data.interview.priority?.method).toBe('AHP 설문 평균');
  });

  it('versionId 지정 → 해당 버전 우선 선택', async () => {
    const { listVersions } = await import('@/lib/services/pbl/pbl-crud');
    await mockCachedAuth();
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(listVersions).mockResolvedValue([
      { id: 'v-a', version_number: 1, status: 'FINAL' } as unknown as PBLReportRow,
      { id: 'v-b', version_number: 2, status: 'DRAFT' } as unknown as PBLReportRow,
    ]);
    // fetchPBLInterviewV2 — null 반환 경로
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({
      data: {
        id: PROJECT_ID,
        status: 'PBL_DRAFTED',
        track: 'PBL',
        company_name: 'ACME',
        is_test_mode: false,
      },
      error: null,
    });
    adminMock.addResult({ data: null, error: null });

    // #013 fix — interviews + projects 추가 fetch
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: { status: 'PBL_DRAFTED' }, error: null });

    const r = await fetchPBLPageDataV2(PROJECT_ID, 'v-b');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.selectedVersion?.id).toBe('v-b');
  });

  it('버전이 없는 신규 프로젝트 → selectedVersion=null', async () => {
    const { listVersions } = await import('@/lib/services/pbl/pbl-crud');
    await mockCachedAuth();
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(listVersions).mockResolvedValue([]);

    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({
      data: {
        id: PROJECT_ID,
        status: 'INTERVIEWED',
        track: 'PBL',
        company_name: 'ACME',
        is_test_mode: false,
      },
      error: null,
    });
    adminMock.addResult({ data: null, error: null });

    // #013 fix — interviews + projects 추가 fetch
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: { status: 'INTERVIEWED' }, error: null });

    const r = await fetchPBLPageDataV2(PROJECT_ID);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.versions).toHaveLength(0);
      expect(r.data.selectedVersion).toBeNull();
    }
  });

  it('OPS_ADMIN — 배정 검증 스킵하고 admin 직접 interviews 조회', async () => {
    const { listVersions } = await import('@/lib/services/pbl/pbl-crud');
    await mockCachedAuth({ role: 'OPS_ADMIN' });

    vi.mocked(listVersions).mockResolvedValue([
      { id: 'v-1', version_number: 1, status: 'FINAL' } as unknown as PBLReportRow,
    ]);

    // admin interviews select
    adminMock.addResult({
      data: {
        pbl_data: { companyName: 'ACME', businessIssues: '이슈' },
      },
      error: null,
    });

    // #013 fix — interviews + projects 추가 fetch
    adminMock.addResult({ data: { id: 'iv-2' }, error: null });
    adminMock.addResult({ data: { status: 'PBL_DRAFTED' }, error: null });

    const r = await fetchPBLPageDataV2(PROJECT_ID);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.selectedVersion?.id).toBe('v-1');
      expect(r.data.interview.overview?.companyName).toBe('ACME');
      // 배정 검증 쿼리 호출 없음
      expect(serverMock.client.from).not.toHaveBeenCalledWith('projects');
    }
  });
});
