/**
 * consultant/projects/[id]/roadmap/actions.ts 테스트
 *
 * 테스트 대상:
 * - editRoadmapManually: 로드맵 수동 편집 (보안 이슈 #5: 타 컨설턴트 로드맵 무단 변경 방지)
 * - createRoadmap: 로드맵 생성 (인증/역할/Zod/프로젝트배정/상태/LLM)
 * - confirmFinalRoadmap: 로드맵 최종 확정 (인증/역할/접근권한/서비스에러)
 * - fetchRoadmapVersions: 로드맵 버전 목록 (인증/본인프로젝트/타인프로젝트/OPS_ADMIN)
 * - fetchRoadmapVersion: 특정 로드맵 버전 (인증/본인프로젝트/타인프로젝트)
 * - fetchProjectInfo: 프로젝트 정보 (인증/접근권한/정상)
 * - cancelRoadmapGeneration: 로드맵 생성 취소 (인증/정상)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  editRoadmapManually,
  createRoadmap,
  confirmFinalRoadmap,
  fetchRoadmapVersions,
  fetchRoadmapVersion,
  fetchProjectInfo,
  cancelRoadmapGeneration,
  exportRoadmapAsHwpxAction,
} from './actions';
import { createClient } from '@/lib/supabase/server';
import { createMockSupabase } from '@/test/helpers/mock-supabase';
import { generateRoadmapHwpx } from '@/lib/services/export/hwpx';

// --- 외부 모듈 모킹 ---------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/roadmap', () => ({
  // createRoadmap 의 catch 가 instanceof 로 참조하므로 mock 에도 반드시 포함해야 한다
  // (누락 시 "No export is defined on the mock" 런타임 에러).
  RoadmapPersistError: class RoadmapPersistError extends Error {},
  updateRoadmapManually: vi.fn().mockResolvedValue({
    success: true,
    validation: { isValid: true, errors: [], warnings: [] },
  }),
  generateRoadmap: vi.fn().mockResolvedValue({
    roadmapId: 'new-roadmap-id',
    result: { diagnosis_summary: '진단 요약' },
    validation: { isValid: true, errors: [], warnings: [] },
  }),
  finalizeRoadmap: vi.fn().mockResolvedValue(undefined),
  fetchRoadmapVersions: vi.fn().mockResolvedValue([]),
  fetchRoadmapVersion: vi.fn().mockResolvedValue(null),
  /** raw row → 신규 4섹션 매퍼. 테스트에서는 identity-ish 변환으로 단순화. */
  fromRoadmapVersionColumns: vi.fn((row: Record<string, unknown>) => ({
    diagnosis_summary: typeof row?.diagnosis_summary === 'string' ? row.diagnosis_summary : '',
    competencies: [],
    training_structure: [],
    annual_plan: { items: [], usage_plan: '' },
    course_specs: [],
  })),
  /** 신규 4섹션 → DB legacy 컬럼 매퍼. identity-ish 변환. */
  toRoadmapVersionColumns: vi.fn((result: Record<string, unknown>) => ({
    diagnosis_summary: result.diagnosis_summary,
    roadmap_matrix: result.training_structure ?? [],
    pbl_course: { competencies: result.competencies ?? [], annual_plan: result.annual_plan ?? {} },
    courses: result.course_specs ?? [],
  })),
  /** sanitize 동작. 테스트에서는 identity 통과 (실제 sanitize 검증은 roadmap-sanitize.test.ts 담당). */
  sanitizeRoadmapResult: vi.fn((r: unknown) => r),
}));

vi.mock('@/lib/services/activity-log', () => ({
  insertSystemActivityLog: vi.fn(),
}));

vi.mock('@/lib/services/llm', () => ({
  getLLMUserFriendlyError: vi.fn((err: unknown) =>
    err instanceof Error ? err.message : 'LLM 호출에 실패했습니다.'
  ),
}));

vi.mock('@/lib/services/abort-registry', () => ({
  registerAbort: vi.fn(() => new AbortController()),
  cancelAbort: vi.fn(() => true),
  cleanupAbort: vi.fn(),
}));

vi.mock('@/lib/services/export/hwpx', () => ({
  generateRoadmapHwpx: vi.fn().mockResolvedValue(Buffer.from('dummy-hwpx-bytes')),
  generatePBLHwpx: vi.fn().mockResolvedValue(Buffer.from('dummy-pbl-hwpx-bytes')),
  buildRoadmapHwpxPayload: vi.fn((inputs: Record<string, unknown>) => ({
    track: 'ROADMAP',
    fileName: `${(inputs.project as { company_name?: string })?.company_name ?? '로드맵'}_로드맵_v1.hwpx`,
    data: {},
  })),
  buildPBLHwpxPayload: vi.fn(() => ({
    track: 'PBL',
    fileName: 'PBL_v1.hwpx',
    data: {},
  })),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
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

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// --- 테스트 헬퍼 -------------------------------------------------------------

const USER_A_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_B_ID = '550e8400-e29b-41d4-a716-446655440002';
const ROADMAP_ID = '550e8400-e29b-41d4-a716-446655440010';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';

/** 유효한 updates (diagnosis_summary만 수정) */
function validUpdates() {
  return { diagnosis_summary: '수정된 진단 요약입니다.' };
}

// --- editRoadmapManually -----------------------------------------------------

describe('editRoadmapManually', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('CONSULTANT_APPROVED가 아닌 역할 → error 반환', async () => {
    // requireAuthWithRole: users 테이블 역할 조회 → OPS_ADMIN (불허)
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('존재하지 않는 로드맵 → error 반환', async () => {
    // 1) requireAuthWithRole: 역할 조회 → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) roadmap_versions 조회 → 없음
    serverMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toContain('로드맵');
  });

  it('타 컨설턴트의 로드맵 편집 시도 → 접근 권한 에러', async () => {
    // 1) requireAuthWithRole: 역할 조회 → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) requireConsultantRoadmapAccess: JOIN 조회 → 다른 컨설턴트(USER_B)에게 배정됨
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_B_ID } },
      error: null,
    });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toContain('권한');
  });

  it('빈 updates 객체 → 검증 에러', async () => {
    // 1) requireAuthWithRole: 역할 조회 → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await editRoadmapManually(ROADMAP_ID, {});

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('잘못된 타입의 updates 데이터 → 검증 에러', async () => {
    // 1) requireAuthWithRole: 역할 조회 → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    // diagnosis_summary에 숫자 전달 (string이어야 함)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await editRoadmapManually(ROADMAP_ID, { diagnosis_summary: 12345 as any });

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('정상 편집 요청 → 성공', async () => {
    // 1) requireAuthWithRole: 역할 조회 → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) requireConsultantRoadmapAccess: JOIN 조회 → 본인에게 배정됨
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A_ID } },
      error: null,
    });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(true);
  });
});

// --- createRoadmap -----------------------------------------------------------

describe('createRoadmap', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error 반환', async () => {
    // getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('종결된 프로젝트(closed_at 존재) → 생성 차단', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        assigned_consultant_id: USER_A_ID,
        status: 'INTERVIEWED',
        closed_at: '2026-07-29T00:00:00Z',
      },
      error: null,
    });

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('종결');
  });

  it('Zod 검증 실패 (잘못된 projectId) → error 반환', async () => {
    // 인증 통과 후 Zod 검증 실패해야 함 (인증이 Zod보다 우선)
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await createRoadmap('not-a-uuid');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('입력 데이터');
  });

  it('미배정 프로젝트 → error 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 → 다른 컨설턴트에게 배정됨
    serverMock.addResult({
      data: { assigned_consultant_id: USER_B_ID, status: 'INTERVIEWED' },
      error: null,
    });

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('접근 권한');
  });

  it('부적절한 프로젝트 상태 (ASSIGNED) → error 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 → 본인 배정이지만 상태가 ASSIGNED (인터뷰 미완료)
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, status: 'ASSIGNED' },
      error: null,
    });

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('인터뷰');
  });

  it('LLM 에러 → 사용자 친화적 에러 반환', async () => {
    const { generateRoadmap: generateRoadmapMock } = await import('@/lib/services/roadmap');

    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 → 정상
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, status: 'INTERVIEWED' },
      error: null,
    });

    vi.mocked(generateRoadmapMock).mockRejectedValueOnce(new Error('LLM API timeout'));

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });

  it('정상 생성 → success + 로드맵 데이터 반환', async () => {
    const { generateRoadmap: generateRoadmapMock } = await import('@/lib/services/roadmap');

    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 → 정상
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, status: 'INTERVIEWED' },
      error: null,
    });

    vi.mocked(generateRoadmapMock).mockResolvedValueOnce({
      roadmapId: 'new-roadmap-id',
      result: { diagnosis_summary: '진단 요약' } as never,
      validation: { isValid: true, errors: [], warnings: [] },
    });

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({ roadmapId: 'new-roadmap-id' });
    }
  });

  it('정상 생성 시 운영관리 경로 캐시 무효화 (#003)', async () => {
    const { generateRoadmap: generateRoadmapMock } = await import('@/lib/services/roadmap');
    const { revalidatePath } = await import('next/cache');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, status: 'INTERVIEWED' },
      error: null,
    });

    vi.mocked(generateRoadmapMock).mockResolvedValueOnce({
      roadmapId: 'new-roadmap-id',
      result: { diagnosis_summary: '진단 요약' } as never,
      validation: { isValid: true, errors: [], warnings: [] },
    });

    await createRoadmap(PROJECT_ID);

    expect(revalidatePath).toHaveBeenCalledWith('/ops/projects');
    expect(revalidatePath).toHaveBeenCalledWith(`/ops/projects/${PROJECT_ID}`);
  });

  it('정상 생성 시 after() 콜백으로 활동 일지 기록', async () => {
    const { generateRoadmap: generateRoadmapMock } = await import('@/lib/services/roadmap');
    const { insertSystemActivityLog } = await import('@/lib/services/activity-log');

    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, status: 'INTERVIEWED' },
      error: null,
    });

    vi.mocked(generateRoadmapMock).mockResolvedValueOnce({
      roadmapId: 'new-roadmap-id',
      result: { diagnosis_summary: '진단 요약' } as never,
      validation: { isValid: true, errors: [], warnings: [] },
    });

    await createRoadmap(PROJECT_ID);

    expect(mockAfter).toHaveBeenCalled();
    expect(insertSystemActivityLog).toHaveBeenCalledWith(
      PROJECT_ID,
      USER_A_ID,
      '로드맵이 생성되었습니다.'
    );
  });
});

// --- confirmFinalRoadmap -----------------------------------------------------

describe('confirmFinalRoadmap', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await confirmFinalRoadmap(ROADMAP_ID);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await confirmFinalRoadmap(ROADMAP_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('접근 권한 없음 (타 컨설턴트 로드맵) → error 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) requireConsultantRoadmapAccess: JOIN 조회 → 타 컨설턴트
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_B_ID } },
      error: null,
    });

    const result = await confirmFinalRoadmap(ROADMAP_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('권한');
  });

  it('정상 확정 → success', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) requireConsultantRoadmapAccess: JOIN 조회 → 본인
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A_ID } },
      error: null,
    });

    const result = await confirmFinalRoadmap(ROADMAP_ID);

    expect(result.success).toBe(true);
  });

  it('종결된 프로젝트(closed_at 존재) → 확정 차단', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        project_id: PROJECT_ID,
        projects: { assigned_consultant_id: USER_A_ID, closed_at: '2026-07-29T00:00:00Z' },
      },
      error: null,
    });

    const result = await confirmFinalRoadmap(ROADMAP_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('종결');
  });

  it('정상 확정 시 운영관리 경로 캐시 무효화 (#002)', async () => {
    const { revalidatePath } = await import('next/cache');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A_ID } },
      error: null,
    });

    await confirmFinalRoadmap(ROADMAP_ID);

    expect(revalidatePath).toHaveBeenCalledWith('/ops/projects');
    expect(revalidatePath).toHaveBeenCalledWith(`/ops/projects/${PROJECT_ID}`);
  });

  it('서비스 에러 (finalizeRoadmap 실패) → error 반환', async () => {
    const { finalizeRoadmap: finalizeRoadmapMock } = await import('@/lib/services/roadmap');

    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) requireConsultantRoadmapAccess: JOIN 조회 → 본인
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A_ID } },
      error: null,
    });

    vi.mocked(finalizeRoadmapMock).mockRejectedValueOnce(new Error('DB error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await confirmFinalRoadmap(ROADMAP_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('확정');
    consoleSpy.mockRestore();
  });
});

// --- fetchRoadmapVersions ----------------------------------------------------

describe('fetchRoadmapVersions', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → 빈 배열 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await fetchRoadmapVersions(PROJECT_ID);

    expect(result).toEqual([]);
  });

  it('본인 프로젝트 → 서비스 함수 호출', async () => {
    const { fetchRoadmapVersions: fetchVersionsMock } = await import('@/lib/services/roadmap');
    const mockVersions = [
      { id: 'v1', status: 'DRAFT', created_at: '2026-01-01', version_number: 1 },
    ];
    vi.mocked(fetchVersionsMock).mockResolvedValueOnce(mockVersions as never);

    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 → 본인 프로젝트
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID },
      error: null,
    });

    const result = await fetchRoadmapVersions(PROJECT_ID);

    // 변환 후: 신규 4섹션 구조 + legacy 필드 포함
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'v1', status: 'DRAFT', version_number: 1 });
    expect(result[0]).toHaveProperty('competencies');
    expect(result[0]).toHaveProperty('training_structure');
    expect(result[0]).toHaveProperty('annual_plan');
    expect(result[0]).toHaveProperty('course_specs');
    expect(fetchVersionsMock).toHaveBeenCalledWith(PROJECT_ID);
  });

  it('타 컨설턴트 프로젝트 → 빈 배열 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 → 다른 컨설턴트 프로젝트
    serverMock.addResult({
      data: { assigned_consultant_id: USER_B_ID },
      error: null,
    });

    const result = await fetchRoadmapVersions(PROJECT_ID);

    expect(result).toEqual([]);
  });

  it('OPS_ADMIN → 서비스 함수 호출 (프로젝트 조회 생략)', async () => {
    const { fetchRoadmapVersions: fetchVersionsMock } = await import('@/lib/services/roadmap');
    const mockVersions = [
      { id: 'v1', status: 'FINAL', created_at: '2026-01-01', version_number: 1 },
    ];
    vi.mocked(fetchVersionsMock).mockResolvedValueOnce(mockVersions as never);

    // getCachedProfile: role 조회 → OPS_ADMIN
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await fetchRoadmapVersions(PROJECT_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'v1', status: 'FINAL' });
  });
});

// --- fetchRoadmapVersion -----------------------------------------------------

describe('fetchRoadmapVersion', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → null 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await fetchRoadmapVersion(ROADMAP_ID);

    expect(result).toBeNull();
  });

  it('본인 프로젝트 로드맵 → 정상 반환', async () => {
    const { fetchRoadmapVersion: fetchVersionMock } = await import('@/lib/services/roadmap');
    const mockRoadmap = {
      id: ROADMAP_ID,
      project_id: PROJECT_ID,
      version_number: 1,
      status: 'DRAFT',
      diagnosis_summary: '진단',
    };
    vi.mocked(fetchVersionMock).mockResolvedValueOnce(mockRoadmap as never);

    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 → 본인 배정
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID },
      error: null,
    });

    const result = await fetchRoadmapVersion(ROADMAP_ID);

    // 변환 후 형태 확인
    expect(result).toMatchObject({ id: ROADMAP_ID, status: 'DRAFT' });
    expect(result).toHaveProperty('competencies');
    expect(result).toHaveProperty('course_specs');
  });

  it('타 컨설턴트 프로젝트 로드맵 → null 반환', async () => {
    const { fetchRoadmapVersion: fetchVersionMock } = await import('@/lib/services/roadmap');
    const mockRoadmap = {
      id: ROADMAP_ID,
      project_id: PROJECT_ID,
      status: 'DRAFT',
      result: { diagnosis_summary: '진단' },
    };
    vi.mocked(fetchVersionMock).mockResolvedValueOnce(mockRoadmap as never);

    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 → 타 컨설턴트
    serverMock.addResult({
      data: { assigned_consultant_id: USER_B_ID },
      error: null,
    });

    const result = await fetchRoadmapVersion(ROADMAP_ID);

    expect(result).toBeNull();
  });
});

// --- fetchProjectInfo --------------------------------------------------------

describe('fetchProjectInfo', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await fetchProjectInfo(PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('접근 권한 없음 (타 컨설턴트) → error 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 → 타 컨설턴트 배정
    serverMock.addResult({
      data: { company_name: '테스트 기업', assigned_consultant_id: USER_B_ID },
      error: null,
    });

    const result = await fetchProjectInfo(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('권한');
  });

  it('정상 조회 (본인 프로젝트) → success + companyName 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 → 본인 배정
    serverMock.addResult({
      data: { company_name: '테스트 기업', assigned_consultant_id: USER_A_ID },
      error: null,
    });

    const result = await fetchProjectInfo(PROJECT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyName).toBe('테스트 기업');
    }
  });
});

// --- cancelRoadmapGeneration -------------------------------------------------

describe('cancelRoadmapGeneration', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await cancelRoadmapGeneration();

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('정상 취소 → success + cancelAbort 호출', async () => {
    const { cancelAbort } = await import('@/lib/services/abort-registry');

    // getCachedProfile: role 조회 (requireAuth는 role 조회를 함)
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await cancelRoadmapGeneration();

    expect(result.success).toBe(true);
    expect(cancelAbort).toHaveBeenCalledWith(`roadmap:${USER_A_ID}`);
  });
});

// ─── 에러/엣지 케이스 ────────────────────────────────────────────────────────

describe('createRoadmap — 에러/엣지 케이스', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('revisionPrompt 있을 때 → "새 로드맵 버전" 활동 일지 기록', async () => {
    const { generateRoadmap: generateRoadmapMock } = await import('@/lib/services/roadmap');
    const { insertSystemActivityLog } = await import('@/lib/services/activity-log');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, status: 'INTERVIEWED' },
      error: null,
    });

    vi.mocked(generateRoadmapMock).mockResolvedValueOnce({
      roadmapId: 'rev-roadmap-id',
      result: { diagnosis_summary: '수정 진단' } as never,
      validation: { isValid: true, errors: [], warnings: [] },
    });

    await createRoadmap(PROJECT_ID, '이 부분을 더 구체적으로 작성해주세요.');

    expect(insertSystemActivityLog).toHaveBeenCalledWith(
      PROJECT_ID,
      USER_A_ID,
      '새 로드맵 버전이 생성되었습니다.'
    );
  });

  it('프로젝트 미배정 (data null) → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // projects 조회 → null
    serverMock.addResult({ data: null, error: null });

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('접근 권한');
  });

  it('AbortError 발생 → 에러 반환', async () => {
    const { generateRoadmap: generateRoadmapMock } = await import('@/lib/services/roadmap');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, status: 'INTERVIEWED' },
      error: null,
    });

    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    vi.mocked(generateRoadmapMock).mockRejectedValueOnce(abortError);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    consoleSpy.mockRestore();
  });

  it('ROADMAP_DRAFTED 상태에서 로드맵 생성 가능', async () => {
    const { generateRoadmap: generateRoadmapMock } = await import('@/lib/services/roadmap');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // ROADMAP_DRAFTED도 ROADMAP_ELIGIBLE_STATUSES에 포함되어야 함
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, status: 'ROADMAP_DRAFTED' },
      error: null,
    });

    vi.mocked(generateRoadmapMock).mockResolvedValueOnce({
      roadmapId: 'redraft-id',
      result: { diagnosis_summary: '재생성' } as never,
      validation: { isValid: true, errors: [], warnings: [] },
    });

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(true);
  });
});

describe('editRoadmapManually — 에러/엣지 케이스', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('updateRoadmapManually 서비스 에러 → error 반환', async () => {
    const { updateRoadmapManually } = await import('@/lib/services/roadmap');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A_ID } },
      error: null,
    });

    vi.mocked(updateRoadmapManually).mockResolvedValueOnce({
      success: false,
      error: '로드맵 구조가 유효하지 않습니다.',
      validation: { isValid: false, errors: ['오류'], warnings: [] },
    });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('로드맵');
  });

  it('updateRoadmapManually success: false + error undefined → 기본 에러 메시지', async () => {
    const { updateRoadmapManually } = await import('@/lib/services/roadmap');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A_ID } },
      error: null,
    });

    vi.mocked(updateRoadmapManually).mockResolvedValueOnce({
      success: false,
      validation: { isValid: false, errors: [], warnings: [] },
    });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('로드맵 편집에 실패했습니다.');
  });

  it('예외 발생 → catch 블록에서 에러 반환', async () => {
    const { updateRoadmapManually } = await import('@/lib/services/roadmap');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A_ID } },
      error: null,
    });

    vi.mocked(updateRoadmapManually).mockRejectedValueOnce(new Error('unexpected error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('로드맵 편집에 실패했습니다.');
    consoleSpy.mockRestore();
  });
});

describe('fetchRoadmapVersions — 에러/엣지 케이스', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('role이 null → 빈 배열 반환', async () => {
    // users 테이블 조회 결과가 null → role이 null
    serverMock.addResult({ data: null, error: null });

    const result = await fetchRoadmapVersions(PROJECT_ID);

    expect(result).toEqual([]);
  });

  it('USER_PENDING 역할 → 빈 배열 반환', async () => {
    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });

    const result = await fetchRoadmapVersions(PROJECT_ID);

    expect(result).toEqual([]);
  });

  it('SYSTEM_ADMIN → 서비스 함수 호출 (프로젝트 조회 생략)', async () => {
    const { fetchRoadmapVersions: fetchVersionsMock } = await import('@/lib/services/roadmap');
    const mockVersions = [{ id: 'v1', status: 'FINAL', version_number: 1 }];
    vi.mocked(fetchVersionsMock).mockResolvedValueOnce(mockVersions as never);

    serverMock.addResult({ data: { role: 'SYSTEM_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await fetchRoadmapVersions(PROJECT_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'v1', status: 'FINAL' });
  });

  it('예외 발생 → 빈 배열 반환', async () => {
    const { fetchRoadmapVersions: fetchVersionsMock } = await import('@/lib/services/roadmap');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { assigned_consultant_id: USER_A_ID }, error: null });

    vi.mocked(fetchVersionsMock).mockRejectedValueOnce(new Error('service error'));

    const result = await fetchRoadmapVersions(PROJECT_ID);

    expect(result).toEqual([]);
  });
});

describe('fetchRoadmapVersion — 에러/엣지 케이스', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('role이 null → null 반환', async () => {
    serverMock.addResult({ data: null, error: null });

    const result = await fetchRoadmapVersion(ROADMAP_ID);

    expect(result).toBeNull();
  });

  it('fetchRoadmapVersionService가 null 반환 → null 반환', async () => {
    const { fetchRoadmapVersion: fetchVersionMock } = await import('@/lib/services/roadmap');
    vi.mocked(fetchVersionMock).mockResolvedValueOnce(null);

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await fetchRoadmapVersion(ROADMAP_ID);

    expect(result).toBeNull();
  });

  it('OPS_ADMIN → 프로젝트 접근 검증 없이 반환', async () => {
    const { fetchRoadmapVersion: fetchVersionMock } = await import('@/lib/services/roadmap');
    const mockRoadmap = {
      id: ROADMAP_ID,
      project_id: PROJECT_ID,
      version_number: 1,
      status: 'FINAL',
    };
    vi.mocked(fetchVersionMock).mockResolvedValueOnce(mockRoadmap as never);

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await fetchRoadmapVersion(ROADMAP_ID);

    expect(result).toMatchObject({ id: ROADMAP_ID, status: 'FINAL' });
    expect(result).toHaveProperty('competencies');
  });

  it('CONSULTANT_APPROVED + 프로젝트 없음 → null 반환', async () => {
    const { fetchRoadmapVersion: fetchVersionMock } = await import('@/lib/services/roadmap');
    const mockRoadmap = { id: ROADMAP_ID, project_id: PROJECT_ID, status: 'DRAFT' };
    vi.mocked(fetchVersionMock).mockResolvedValueOnce(mockRoadmap as never);

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // projects 조회 → null
    serverMock.addResult({ data: null, error: null });

    const result = await fetchRoadmapVersion(ROADMAP_ID);

    expect(result).toBeNull();
  });

  it('USER_PENDING 역할 → null 반환', async () => {
    const { fetchRoadmapVersion: fetchVersionMock } = await import('@/lib/services/roadmap');
    const mockRoadmap = { id: ROADMAP_ID, project_id: PROJECT_ID, status: 'DRAFT' };
    vi.mocked(fetchVersionMock).mockResolvedValueOnce(mockRoadmap as never);

    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });

    const result = await fetchRoadmapVersion(ROADMAP_ID);

    expect(result).toBeNull();
  });
});

describe('fetchProjectInfo — 에러/엣지 케이스', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('role이 null → 사용자 정보 없음 에러', async () => {
    serverMock.addResult({ data: null, error: null });

    const result = await fetchProjectInfo(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('사용자 정보');
  });

  it('프로젝트 미존재 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: null, error: null });

    const result = await fetchProjectInfo(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('프로젝트');
  });

  it('OPS_ADMIN → 프로젝트 배정 검증 없이 정상 반환', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { company_name: '운영사 기업', assigned_consultant_id: USER_B_ID },
      error: null,
    });

    const result = await fetchProjectInfo(PROJECT_ID);

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.companyName).toBe('운영사 기업');
  });

  it('USER_PENDING 역할 → 접근 권한 에러', async () => {
    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { company_name: '기업', assigned_consultant_id: USER_A_ID },
      error: null,
    });

    const result = await fetchProjectInfo(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('권한');
  });

  it('예외 발생 → catch 블록에서 에러 반환', async () => {
    // auth 자체가 throw하도록 설정
    vi.mocked(createClient).mockRejectedValueOnce(new Error('connection failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchProjectInfo(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('조회');
    consoleSpy.mockRestore();
  });
});

// --- exportRoadmapAsHwpxAction (Step 7) --------------------------------------

describe('exportRoadmapAsHwpxAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → error 반환', async () => {
    const mock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await exportRoadmapAsHwpxAction(ROADMAP_ID);
    expect(result.success).toBe(false);
  });

  it('빈 roadmapId → error 반환', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_A_ID } });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await exportRoadmapAsHwpxAction('');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('로드맵 ID');
  });

  it('타 컨설턴트의 로드맵 → forbidden', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_A_ID } });
    // 1) users.role 조회
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) requireConsultantRoadmapAccess: roadmap_versions 조회 — 다른 컨설턴트
    mock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_B_ID } },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await exportRoadmapAsHwpxAction(ROADMAP_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('권한');
  });

  it('로드맵 없음 → not found', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_A_ID } });
    // 1) users.role
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) requireConsultantRoadmapAccess — 로드맵 없음
    mock.addResult({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await exportRoadmapAsHwpxAction(ROADMAP_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('로드맵을');
  });

  it('성공 → base64 + fileName + mimeType 반환', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_A_ID } });
    // 1) users.role
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) requireConsultantRoadmapAccess
    mock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A_ID } },
      error: null,
    });
    // 3) projects 조회
    mock.addResult({
      data: { id: PROJECT_ID, company_name: '테스트(주)' },
      error: null,
    });
    // 4) interviews 조회
    mock.addResult({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    // fetchRoadmapVersionService 모킹 — 유효한 roadmap row 반환
    const { fetchRoadmapVersion: fetchRoadmapVersionMock } = await import('@/lib/services/roadmap');
    vi.mocked(fetchRoadmapVersionMock).mockResolvedValueOnce({
      id: ROADMAP_ID,
      project_id: PROJECT_ID,
      version_number: 1,
      status: 'FINAL',
      consultant_profile_snapshot: { affiliation: 'KPC' },
      diagnosis_summary: '진단',
      roadmap_matrix: [],
      pbl_course: {},
      courses: [],
      created_by: USER_A_ID,
      created_at: '2026-04-17',
      updated_at: '2026-04-17',
    } as never);

    const result = await exportRoadmapAsHwpxAction(ROADMAP_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fileName).toContain('테스트(주)');
      expect(result.data.contentBase64).toBeTruthy();
      expect(result.data.mimeType).toBe('application/vnd.hancom.hwpx');
      // "dummy-hwpx-bytes" base64 = "ZHVtbXktaHdweC1ieXRlcw=="
      expect(Buffer.from(result.data.contentBase64, 'base64').toString()).toBe('dummy-hwpx-bytes');
    }
  });

  it('종결된 프로젝트(closed_at 존재)여도 내보내기는 성공한다 (열람·내보내기 유지 특성화)', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_A_ID } });
    // 1) users.role
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) requireConsultantRoadmapAccess — 종결 프로젝트
    mock.addResult({
      data: {
        project_id: PROJECT_ID,
        projects: { assigned_consultant_id: USER_A_ID, closed_at: '2026-07-29T00:00:00Z' },
      },
      error: null,
    });
    // 3) projects 조회
    mock.addResult({ data: { id: PROJECT_ID, company_name: '테스트(주)' }, error: null });
    // 4) interviews 조회
    mock.addResult({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const { fetchRoadmapVersion: fetchRoadmapVersionMock } = await import('@/lib/services/roadmap');
    vi.mocked(fetchRoadmapVersionMock).mockResolvedValueOnce({
      id: ROADMAP_ID,
      project_id: PROJECT_ID,
      version_number: 1,
      status: 'DRAFT',
      consultant_profile_snapshot: { affiliation: 'KPC' },
      diagnosis_summary: '진단',
      roadmap_matrix: [],
      pbl_course: {},
      courses: [],
      created_by: USER_A_ID,
      created_at: '2026-04-17',
      updated_at: '2026-04-17',
    } as never);

    const result = await exportRoadmapAsHwpxAction(ROADMAP_ID);
    expect(result.success).toBe(true);
  });

  it('Python 함수 500 에러 → 사용자 친화 메시지', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_A_ID } });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    mock.addResult({
      data: { project_id: PROJECT_ID, projects: { assigned_consultant_id: USER_A_ID } },
      error: null,
    });
    mock.addResult({
      data: { id: PROJECT_ID, company_name: '테스트(주)' },
      error: null,
    });
    mock.addResult({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const { fetchRoadmapVersion: fetchRoadmapVersionMock } = await import('@/lib/services/roadmap');
    vi.mocked(fetchRoadmapVersionMock).mockResolvedValueOnce({
      id: ROADMAP_ID,
      project_id: PROJECT_ID,
      version_number: 1,
      consultant_profile_snapshot: { affiliation: 'KPC' },
      roadmap_matrix: [],
      pbl_course: {},
      courses: [],
      created_at: '2026-04-17',
      updated_at: '2026-04-17',
    } as never);
    vi.mocked(generateRoadmapHwpx).mockRejectedValueOnce(new Error('HWPX generation failed: 500'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await exportRoadmapAsHwpxAction(ROADMAP_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('HWPX');
    consoleSpy.mockRestore();
  });
});
