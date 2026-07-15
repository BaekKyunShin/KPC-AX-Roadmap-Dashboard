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
import type { RoadmapCourseSpec } from '@/lib/services/roadmap';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('../interview/actions', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../interview/actions');
  return {
    ...actual,
    // saveRoadmapInterviewV2 만 mock — fetchRoadmapInterviewV2 는 실제 구현 사용
    // (fetchRoadmapPageDataV2 가 인터뷰 데이터를 실제 deserialize 해야 HRD signed URL 주입 검증 가능).
    saveRoadmapInterviewV2: vi.fn().mockResolvedValue({ success: true }),
  };
});
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
    if (r && typeof (r as Promise<unknown>).then === 'function')
      pending.push(r as Promise<unknown>);
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
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  pendingCallbacks.length = 0;
});

const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';
const VERSION_ID = '550e8400-e29b-41d4-a716-446655440030';

/** Ⅲ 훈련과정 명세서 (양식 v2 — 훈련시기·훈련수준·훈련방법). */
function makeCourseSpec(overrides: Partial<RoadmapCourseSpec> = {}): RoadmapCourseSpec {
  return {
    training_period: '2026년 1분기',
    training_level: 'INTERMEDIATE',
    course_name: 'ML 기초 과정',
    training_method: '집체',
    recommended_program: 'S-OJT',
    goal: '기초 지식 확보',
    main_content: '지도학습 / 비지도학습',
    target_audience: '현업 담당자',
    subjects: [{ name: 'Python 기초', details: '문법·라이브러리', hours: 8 }],
    ...overrides,
  };
}

async function mockCachedAuth({
  authed = true,
  role = 'CONSULTANT_APPROVED',
  status = 'ACTIVE',
}: { authed?: boolean; role?: string | null; status?: string | null } = {}) {
  const cached = await import('@/lib/supabase/cached');
  vi.mocked(cached.getCachedUser).mockResolvedValue(
    (authed ? { id: USER_A, email: 'consultant@example.com' } : null) as never
  );
  vi.mocked(cached.getCachedProfile).mockResolvedValue(
    (authed ? { id: USER_A, role, status } : null) as never
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

  it('Patch 가 비어있음 → 성공(no-op)', async () => {
    const r = await editRoadmapV2(VERSION_ID, {});
    expect(r.success).toBe(true);
  });

  it('company_requirements patch → versionId→projectId 조회 후 saveRoadmapInterviewV2(autoSave) 위임', async () => {
    const { saveRoadmapInterviewV2 } = await import('../interview/actions');
    await mockCachedAuth();
    // version → project_id 조회
    serverMock.addResult({
      data: { project_id: PROJECT_ID },
      error: null,
    });
    vi.mocked(saveRoadmapInterviewV2).mockResolvedValue({ success: true });

    const r = await editRoadmapV2(VERSION_ID, {
      company_requirements: { status: '갱신' },
    });

    expect(r.success).toBe(true);
    expect(saveRoadmapInterviewV2).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({
        companyRequirements: { status: '갱신' },
      }),
      { autoSave: true }
    );
  });

  it('task_analysis patch (Ⅱ-3 표 행 편집) → saveRoadmapInterviewV2 에 taskAnalysis camelCase 전달', async () => {
    const { saveRoadmapInterviewV2 } = await import('../interview/actions');
    await mockCachedAuth();
    serverMock.addResult({
      data: { project_id: PROJECT_ID },
      error: null,
    });
    vi.mocked(saveRoadmapInterviewV2).mockResolvedValue({ success: true });

    const draft = [
      {
        domain: '재무',
        task: '결산',
        asIs: '엑셀 매크로',
        improvement: '월말 데이터로 결산 자동화, 수기 오류 해소 (필요도 높음)',
      },
    ];
    const r = await editRoadmapV2(VERSION_ID, { task_analysis: draft });

    expect(r.success).toBe(true);
    expect(saveRoadmapInterviewV2).toHaveBeenCalledWith(
      PROJECT_ID,
      { taskAnalysis: draft },
      { autoSave: true }
    );
  });

  it('target_task patch → saveRoadmapInterviewV2 에 camelCase 변환되어 전달 (v2: 분석내용 삭제)', async () => {
    const { saveRoadmapInterviewV2 } = await import('../interview/actions');
    await mockCachedAuth();
    serverMock.addResult({
      data: { project_id: PROJECT_ID },
      error: null,
    });
    vi.mocked(saveRoadmapInterviewV2).mockResolvedValue({ success: true });

    const r = await editRoadmapV2(VERSION_ID, {
      target_task: { name: '결산 자동화', reason: '효율' },
    });

    expect(r.success).toBe(true);
    expect(saveRoadmapInterviewV2).toHaveBeenCalledWith(
      PROJECT_ID,
      {
        targetTask: { name: '결산 자동화', reason: '효율' },
      },
      { autoSave: true }
    );
  });

  it('versionId 조회 실패 → error 반환 (saveRoadmapInterviewV2 미호출)', async () => {
    const { saveRoadmapInterviewV2 } = await import('../interview/actions');
    serverMock.addResult({ data: null, error: null });
    const r = await editRoadmapV2(VERSION_ID, {
      company_requirements: { status: '변경' },
    });
    expect(r.success).toBe(false);
    expect(saveRoadmapInterviewV2).not.toHaveBeenCalled();
  });

  it('Roadmap 슬라이스 + interview 슬라이스 혼합 → 두 위임 모두 수행', async () => {
    const { updateRoadmapManually } = await import('@/lib/services/roadmap');
    const { saveRoadmapInterviewV2 } = await import('../interview/actions');
    await mockCachedAuth();
    // version → project_id (interview 슬라이스 처리용)
    serverMock.addResult({ data: { project_id: PROJECT_ID }, error: null });
    vi.mocked(saveRoadmapInterviewV2).mockResolvedValue({ success: true });
    // requireConsultantRoadmapAccess (editRoadmapManually 내부)
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A } },
      error: null,
    });
    vi.mocked(updateRoadmapManually).mockResolvedValue({
      success: true,
      validation: { is_valid: true, errors: [] },
    } as never);

    const r = await editRoadmapV2(VERSION_ID, {
      setup_necessity: '변경된 필요성',
      // interview 슬라이스 — 더 이상 무시되지 않고 saveRoadmapInterviewV2 로 위임
      company_requirements: { status: '갱신' },
    });

    expect(r.success).toBe(true);
    // Roadmap 슬라이스 → updateRoadmapManually
    expect(updateRoadmapManually).toHaveBeenCalledWith(
      VERSION_ID,
      USER_A,
      expect.objectContaining({ setup_necessity: '변경된 필요성' })
    );
    const call = vi.mocked(updateRoadmapManually).mock.calls[0];
    expect(call[2]).not.toHaveProperty('company_requirements');
    // Interview 슬라이스 → saveRoadmapInterviewV2 (camelCase)
    expect(saveRoadmapInterviewV2).toHaveBeenCalledWith(
      PROJECT_ID,
      {
        companyRequirements: { status: '갱신' },
      },
      { autoSave: true }
    );
  });

  // 회귀 가드 (2026-05-18 이력) — extractRoadmapFieldsFromPayload 가 키를 빠뜨리면
  // 클라이언트가 보낸 편집이 updateRoadmapManually 까지 도달하지 못하고 조용히 사라진다.
  // 양식 v2 의 Ⅲ장은 훈련과정 명세서 하나뿐이므로 course_specs 누락은 곧 Ⅲ장 전체 유실.
  it('Ⅲ course_specs patch → updateRoadmapManually 에 그대로 전달 (회귀 가드)', async () => {
    const { updateRoadmapManually } = await import('@/lib/services/roadmap');
    await mockCachedAuth();
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A } },
      error: null,
    });
    vi.mocked(updateRoadmapManually).mockResolvedValue({
      success: true,
      validation: { is_valid: true, errors: [] },
    } as never);

    const newSpecs = [makeCourseSpec(), makeCourseSpec({ course_name: 'ML 심화 과정' })];
    const r = await editRoadmapV2(VERSION_ID, { course_specs: newSpecs });

    expect(r.success).toBe(true);
    const call = vi.mocked(updateRoadmapManually).mock.calls[0];
    expect(call[2]).toHaveProperty('course_specs');
    expect(call[2].course_specs).toEqual(newSpecs);
  });

  it('Ⅰ-1 setup_necessity + Ⅲ course_specs 혼합 → 두 필드 모두 전달', async () => {
    const { updateRoadmapManually } = await import('@/lib/services/roadmap');
    await mockCachedAuth();
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A } },
      error: null,
    });
    vi.mocked(updateRoadmapManually).mockResolvedValue({
      success: true,
      validation: { is_valid: true, errors: [] },
    } as never);

    const r = await editRoadmapV2(VERSION_ID, {
      setup_necessity: '변경된 수립 배경',
      course_specs: [makeCourseSpec()],
    });

    expect(r.success).toBe(true);
    const call = vi.mocked(updateRoadmapManually).mock.calls[0];
    expect(call[2].setup_necessity).toBe('변경된 수립 배경');
    expect(call[2].course_specs).toHaveLength(1);
  });

  // Ⅰ-3 요약(main_content) 은 outcome_summary 하위 필드다. updateRoadmapManually 가
  // outcome_summary 를 통째로 교체하므로, 현재 값을 읽어 병합한 완전한 객체를 보내야
  // 나머지 두 필드(역량수준·선정과업) 가 날아가지 않는다.
  it('Ⅰ-3 main_content patch → 현재 outcome_summary 와 병합해 전달', async () => {
    const { updateRoadmapManually } = await import('@/lib/services/roadmap');
    await mockCachedAuth();
    // buildOutcomeSummaryPatch — 현재 버전의 pbl_course(legacy 컬럼) 조회
    serverMock.addResult({
      data: {
        pbl_course: {
          setup_necessity: '기존 배경',
          outcome_summary: {
            ai_competency_level: 'ADVANCED',
            selected_tasks: '결산 자동화',
            main_content: '기존 요약',
          },
        },
      },
      error: null,
    });
    // requireConsultantRoadmapAccess (editRoadmapManually 내부)
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A } },
      error: null,
    });
    vi.mocked(updateRoadmapManually).mockResolvedValue({
      success: true,
      validation: { is_valid: true, errors: [] },
    } as never);

    const r = await editRoadmapV2(VERSION_ID, { main_content: '수정된 요약' });

    expect(r.success).toBe(true);
    const call = vi.mocked(updateRoadmapManually).mock.calls[0];
    expect(call[2].outcome_summary).toEqual({
      ai_competency_level: 'ADVANCED',
      selected_tasks: '결산 자동화',
      main_content: '수정된 요약',
    });
  });

  it('main_content patch + 버전 조회 실패 → error (updateRoadmapManually 미호출)', async () => {
    const { updateRoadmapManually } = await import('@/lib/services/roadmap');
    await mockCachedAuth();
    serverMock.addResult({ data: null, error: null });

    const r = await editRoadmapV2(VERSION_ID, { main_content: '수정된 요약' });

    expect(r.success).toBe(false);
    expect(updateRoadmapManually).not.toHaveBeenCalled();
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

  it('CONSULTANT_APPROVED + 배정 프로젝트 + 최신 버전(version_number DESC) 선택 + HRD signed URL 주입', async () => {
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

    // #013 fix — self_assessments + projects 추가 fetch
    adminMock.addResult({ data: { id: 'sa-1' }, error: null });
    adminMock.addResult({ data: { status: 'INTERVIEWED' }, error: null });

    const r = await fetchRoadmapPageDataV2(PROJECT_ID);

    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.versions).toHaveLength(2);
    // 최신(version_number DESC) 기준 첫 번째 = v-draft (version_number=2)
    expect(r.data.selectedVersion?.id).toBe('v-draft');
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

    // #013 fix — self_assessments + projects 추가 fetch
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: { status: 'ROADMAP_DRAFTED' }, error: null });

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

    // #013 fix — self_assessments + projects 추가 fetch
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: { status: 'INTERVIEWED' }, error: null });

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

    // #013 fix — self_assessments + projects 추가 fetch
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: { status: 'INTERVIEWED' }, error: null });

    const r = await fetchRoadmapPageDataV2(PROJECT_ID);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.selectedVersion?.id).toBe('v-1');
      // 서버 클라이언트의 projects 배정 쿼리는 호출되지 않아야 함
      expect(serverMock.client.from).not.toHaveBeenCalledWith('projects');
    }
  });
});
