/**
 * Task 2.8 — 로드맵 결과 V2 Server Action 테스트
 *
 * 대상:
 *   - createRoadmapV2 / confirmFinalRoadmapV2 / editRoadmapV2 /
 *     exportRoadmapHwpxV2 / fetchRoadmapPageDataV2
 *
 * 5단계 패턴 검증 + Legacy Action 위임 경계 검증. Legacy Action 자체의 상세
 * 동작은 actions.test.ts 에서 커버하므로 본 파일은 V2 래퍼가 올바른 Legacy
 * 로 위임하는지, payload 변환이 누락/오염 없는지, fetchRoadmapPageDataV2 의
 * 초기 데이터 조립(버전 선택·인터뷰 HRD signed URL 주입) 이 정상인지만 검증한다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createRoadmapV2,
  confirmFinalRoadmapV2,
  editRoadmapV2,
  exportRoadmapHwpxV2,
  fetchRoadmapPageDataV2,
} from './actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/services/audit', () => ({ createAuditLog: vi.fn() }));
vi.mock('@/lib/services/activity-log', () => ({ insertSystemActivityLog: vi.fn() }));
vi.mock('@/lib/services/notification', () => ({ createNotificationForAdmins: vi.fn() }));
vi.mock('@/lib/supabase/cached', () => ({
  getCachedUser: vi.fn(),
  getCachedProfile: vi.fn(),
}));

// LLM·HWPX·service 계층 mock (V2 래퍼 테스트에서는 비즈니스 로직 재검증 불필요).
vi.mock('@/lib/services/roadmap', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/services/roadmap');
  return {
    ...actual,
    generateRoadmap: vi.fn(),
    finalizeRoadmap: vi.fn(),
    updateRoadmapManually: vi.fn(),
    fetchRoadmapVersions: vi.fn(),
    fetchRoadmapVersion: vi.fn(),
  };
});
vi.mock('@/lib/services/export/hwpx', () => ({
  buildRoadmapHwpxPayload: vi.fn().mockReturnValue({ fileName: 'r.hwpx' }),
  generateRoadmapHwpx: vi.fn().mockResolvedValue(Buffer.from('PK\x03\x04')),
  buildPBLHwpxPayload: vi.fn(),
  generatePBLHwpx: vi.fn(),
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

// ============================================================================
// createRoadmapV2
// ============================================================================

describe('createRoadmapV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('인증되지 않은 사용자 → error', async () => {
    await mockCachedAuth({ authed: false });
    const r = await createRoadmapV2(PROJECT_ID);
    expect(r.success).toBe(false);
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error', async () => {
    await mockCachedAuth({ role: 'OPS_ADMIN' });
    const r = await createRoadmapV2(PROJECT_ID);
    expect(r.success).toBe(false);
  });

  it('Legacy createRoadmap 과 동일 동작 — 배정 프로젝트 + eligible status → 위임 성공', async () => {
    const { generateRoadmap } = await import('@/lib/services/roadmap');
    await mockCachedAuth();
    // requireAuthWithRole — 캐시만 사용.
    // createRoadmap 의 프로젝트 접근 검증 쿼리.
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A, status: 'INTERVIEWED' },
      error: null,
    });
    vi.mocked(generateRoadmap).mockResolvedValue({
      roadmapId: VERSION_ID,
      result: {},
      validation: { is_valid: true, errors: [] },
    } as never);

    const r = await createRoadmapV2(PROJECT_ID);
    await flushAfterCallbacks();

    expect(r.success).toBe(true);
    if (r.success) expect((r.data as { roadmapId: string }).roadmapId).toBe(VERSION_ID);
  });
});

// ============================================================================
// confirmFinalRoadmapV2
// ============================================================================

describe('confirmFinalRoadmapV2', () => {
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
    const r = await confirmFinalRoadmapV2(VERSION_ID);
    expect(r.success).toBe(false);
  });

  it('정상 경로 → Legacy finalizeRoadmap 위임', async () => {
    const { finalizeRoadmap } = await import('@/lib/services/roadmap');
    await mockCachedAuth();
    // requireConsultantRoadmapAccess 쿼리
    serverMock.addResult({
      data: {
        project_id: PROJECT_ID,
        projects: { assigned_consultant_id: USER_A },
      },
      error: null,
    });
    vi.mocked(finalizeRoadmap).mockResolvedValue({} as never);

    const r = await confirmFinalRoadmapV2(VERSION_ID);
    await flushAfterCallbacks();
    expect(r.success).toBe(true);
    expect(finalizeRoadmap).toHaveBeenCalledWith(VERSION_ID, USER_A);
  });
});

// ============================================================================
// editRoadmapV2
// ============================================================================

describe('editRoadmapV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('Roadmap 소유 필드 없음 → 성공(no-op)', async () => {
    // Interview 원본 편집 필드(company_requirements 등)만 포함된 patch 는
    // 현 Task 에서 no-op 처리. Task 2.11 에서 interview 편집 경로 추가 예정.
    const r = await editRoadmapV2(VERSION_ID, {
      company_requirements: { status: '변경' },
    });
    expect(r.success).toBe(true);
  });

  it('setup_necessity 포함 → updateRoadmapManually 위임', async () => {
    const { updateRoadmapManually } = await import('@/lib/services/roadmap');
    await mockCachedAuth();
    // requireConsultantRoadmapAccess
    serverMock.addResult({
      data: {
        project_id: PROJECT_ID,
        projects: { assigned_consultant_id: USER_A },
      },
      error: null,
    });
    vi.mocked(updateRoadmapManually).mockResolvedValue({
      success: true,
      validation: { is_valid: true, errors: [] },
    } as never);

    const r = await editRoadmapV2(VERSION_ID, {
      setup_necessity: '변경된 필요성',
      // interview 슬라이스 — 무시되어야 함
      company_requirements: { status: '무시됨' },
      task_analysis_note: '무시됨',
    });

    expect(r.success).toBe(true);
    expect(updateRoadmapManually).toHaveBeenCalledWith(
      VERSION_ID,
      USER_A,
      expect.objectContaining({ setup_necessity: '변경된 필요성' }),
    );
    // Interview 원본 필드는 Legacy 시그니처에 전달되지 않아야 한다 (Task 2.11 이월).
    const call = vi.mocked(updateRoadmapManually).mock.calls[0];
    expect(call[2]).not.toHaveProperty('company_requirements');
    expect(call[2]).not.toHaveProperty('task_analysis_note');
  });

  it('Ⅲ-1 역량 + NCS + Ⅲ-4 course_specs 혼합 → 전체 전달', async () => {
    const { updateRoadmapManually } = await import('@/lib/services/roadmap');
    await mockCachedAuth();
    serverMock.addResult({
      data: {
        project_id: PROJECT_ID,
        projects: { assigned_consultant_id: USER_A },
      },
      error: null,
    });
    vi.mocked(updateRoadmapManually).mockResolvedValue({
      success: true,
      validation: { is_valid: true, errors: [] },
    } as never);

    const r = await editRoadmapV2(VERSION_ID, {
      competencies: [
        {
          name: '역량1',
          definition: '정의',
          knowledge: ['k1'],
          skills: ['s1'],
          attitudes: ['a1'],
        },
      ],
      ncs_used: false,
      ncs_derivation_method: '인터뷰 기반',
      training_structure_method: '방법',
      course_specs: [],
    });

    expect(r.success).toBe(true);
    const call = vi.mocked(updateRoadmapManually).mock.calls[0];
    expect(call[2]).toMatchObject({
      ncs_used: false,
      ncs_derivation_method: '인터뷰 기반',
      training_structure_method: '방법',
    });
    expect(call[2].competencies).toHaveLength(1);
  });
});

// ============================================================================
// exportRoadmapHwpxV2
// ============================================================================

describe('exportRoadmapHwpxV2', () => {
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
    const r = await exportRoadmapHwpxV2(VERSION_ID);
    expect(r.success).toBe(false);
  });

  it('CONSULTANT_APPROVED + 배정 프로젝트 → Legacy 위임 후 base64 반환', async () => {
    const { fetchRoadmapVersion } = await import('@/lib/services/roadmap');
    await mockCachedAuth();
    // requireConsultantRoadmapAccess
    serverMock.addResult({
      data: {
        project_id: PROJECT_ID,
        projects: { assigned_consultant_id: USER_A },
      },
      error: null,
    });
    vi.mocked(fetchRoadmapVersion).mockResolvedValue({
      id: VERSION_ID,
      version_number: 1,
      project_id: PROJECT_ID,
    } as never);
    // Legacy 내부: project row
    serverMock.addResult({
      data: { id: PROJECT_ID, company_name: '테스트' },
      error: null,
    });
    // Legacy 내부: interview maybeSingle
    serverMock.addResult({ data: null, error: null });

    const r = await exportRoadmapHwpxV2(VERSION_ID);
    await flushAfterCallbacks();
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.fileName).toBe('r.hwpx');
      expect(r.data.mimeType).toBe('application/vnd.hancom.hwpx');
      expect(r.data.contentBase64.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// fetchRoadmapPageDataV2
// ============================================================================

describe('fetchRoadmapPageDataV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('인증되지 않은 사용자 → error', async () => {
    await mockCachedAuth({ authed: false });
    const r = await fetchRoadmapPageDataV2(PROJECT_ID);
    expect(r.success).toBe(false);
  });

  it('허용되지 않은 역할 → error', async () => {
    await mockCachedAuth({ role: 'USER_PENDING' });
    const r = await fetchRoadmapPageDataV2(PROJECT_ID);
    expect(r.success).toBe(false);
  });

  it('CONSULTANT_APPROVED + 배정 프로젝트 + FINAL 우선 선택 + HRD signed URL 주입', async () => {
    const { fetchRoadmapVersions } = await import('@/lib/services/roadmap');
    await mockCachedAuth();

    // requireConsultantProjectAccess
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });

    // fetchRoadmapVersions service — mock 반환
    vi.mocked(fetchRoadmapVersions).mockResolvedValue([
      {
        id: 'v-draft',
        version_number: 2,
        status: 'DRAFT',
        diagnosis_summary: '',
        roadmap_matrix: null,
        pbl_course: null,
        courses: null,
        revision_prompt: null,
        is_shared: false,
        created_at: '2026-04-23',
        finalized_at: null,
      },
      {
        id: 'v-final',
        version_number: 1,
        status: 'FINAL',
        diagnosis_summary: '',
        roadmap_matrix: null,
        pbl_course: null,
        courses: null,
        revision_prompt: null,
        is_shared: false,
        created_at: '2026-04-22',
        finalized_at: '2026-04-22',
      },
    ] as never);

    // fetchRoadmapInterviewV2 내부 — verifyProjectAccess (projects select)
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // fetchProjectMetaForInterview (admin client)
    adminMock.addResult({
      data: {
        id: PROJECT_ID,
        status: 'ROADMAP_DRAFTED',
        track: 'ROADMAP',
        company_name: 'ACME',
        is_test_mode: false,
      },
      error: null,
    });
    // interviews select — HRD PDF 가 storage_path 로 저장된 경우
    adminMock.addResult({
      data: {
        company_details: {
          roadmap_overview: {
            establishment_necessity: '테스트 필요성',
            performance_activities: [],
            ai_competency_level: 'INTERMEDIATE',
            selected_tasks_summary: '선정',
            hrd_report_attachment: {
              file_name: 'hrd.pdf',
              storage_path: 'proj/hrd.pdf',
              size: 100,
            },
          },
        },
        job_tasks: null,
        improvement_goals: null,
      },
      error: null,
    });

    // Storage signed URL — mock-supabase storageMock 가 기본 제공하므로 재정의
    const createSignedUrl = vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'https://signed.example/hrd.pdf' }, error: null });
    (adminMock.client as unknown as { storage: { from: typeof vi.fn } }).storage = {
      from: vi.fn(() => ({ createSignedUrl })),
    } as never;

    const r = await fetchRoadmapPageDataV2(PROJECT_ID);

    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.versions).toHaveLength(2);
    // FINAL 우선 선택
    expect(r.data.selectedVersion?.id).toBe('v-final');
    // HRD signed URL 주입 확인
    expect(r.data.interview.hrdReportPdf?.url).toBe('https://signed.example/hrd.pdf');
    expect(createSignedUrl).toHaveBeenCalledWith('proj/hrd.pdf', 3600);
  });

  it('versionId 지정 → 해당 버전 우선 선택', async () => {
    const { fetchRoadmapVersions } = await import('@/lib/services/roadmap');
    await mockCachedAuth();
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });

    vi.mocked(fetchRoadmapVersions).mockResolvedValue([
      { id: 'v-a', version_number: 1, status: 'FINAL' } as never,
      { id: 'v-b', version_number: 2, status: 'DRAFT' } as never,
    ]);

    // fetchRoadmapInterviewV2 경로 — null 반환 (interviews 없음)
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({
      data: {
        id: PROJECT_ID,
        status: 'ROADMAP_DRAFTED',
        track: 'ROADMAP',
        company_name: 'ACME',
        is_test_mode: false,
      },
      error: null,
    });
    adminMock.addResult({ data: null, error: null });

    const r = await fetchRoadmapPageDataV2(PROJECT_ID, 'v-b');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.selectedVersion?.id).toBe('v-b');
  });

  it('버전이 없는 신규 프로젝트 → selectedVersion=null, interview 는 정상 반환', async () => {
    const { fetchRoadmapVersions } = await import('@/lib/services/roadmap');
    await mockCachedAuth();
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(fetchRoadmapVersions).mockResolvedValue([]);

    // fetchRoadmapInterviewV2
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({
      data: {
        id: PROJECT_ID,
        status: 'INTERVIEWED',
        track: 'ROADMAP',
        company_name: 'ACME',
        is_test_mode: false,
      },
      error: null,
    });
    adminMock.addResult({ data: null, error: null });

    const r = await fetchRoadmapPageDataV2(PROJECT_ID);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.versions).toHaveLength(0);
      expect(r.data.selectedVersion).toBeNull();
    }
  });

  it('OPS_ADMIN — 배정 검증 스킵하고 직접 interviews 조회', async () => {
    const { fetchRoadmapVersions } = await import('@/lib/services/roadmap');
    await mockCachedAuth({ role: 'OPS_ADMIN' });

    vi.mocked(fetchRoadmapVersions).mockResolvedValue([
      { id: 'v-1', version_number: 1, status: 'FINAL' } as never,
    ]);

    // admin interviews select (OPS 경로 — fetchRoadmapInterviewV2 사용하지 않음)
    adminMock.addResult({
      data: {
        company_details: null,
        job_tasks: null,
        improvement_goals: null,
      },
      error: null,
    });

    const r = await fetchRoadmapPageDataV2(PROJECT_ID);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.selectedVersion?.id).toBe('v-1');
      // 서버 클라이언트의 projects 배정 쿼리는 호출되지 않아야 함
      expect(serverMock.client.from).not.toHaveBeenCalledWith('projects');
    }
  });
});
