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
} from './actions';
import { createClient } from '@/lib/supabase/server';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// --- 외부 모듈 모킹 ---------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/roadmap', () => ({
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
}));

vi.mock('@/lib/services/activity-log', () => ({
  insertSystemActivityLog: vi.fn(),
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

const { mockAfter } = vi.hoisted(() => {
  const mockAfter = vi.fn((fn: () => void | Promise<unknown>) => {
    fn();
  });
  return { mockAfter };
});
vi.mock('next/server', () => ({ after: mockAfter }));

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

  it('인증되지 않은 사용자 -> error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('CONSULTANT_APPROVED가 아닌 역할 -> error 반환', async () => {
    // requireAuthWithRole: users 테이블 역할 조회 -> OPS_ADMIN (불허)
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('존재하지 않는 로드맵 -> error 반환', async () => {
    // 1) requireAuthWithRole: 역할 조회 -> CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) roadmap_versions 조회 -> 없음
    serverMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toContain('로드맵');
  });

  it('타 컨설턴트의 로드맵 편집 시도 -> 접근 권한 에러', async () => {
    // 1) requireAuthWithRole: 역할 조회 -> CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) roadmap_versions 조회 -> project_id 반환
    serverMock.addResult({ data: { project_id: PROJECT_ID }, error: null });
    // 3) projects 조회 -> 다른 컨설턴트(USER_B)에게 배정됨
    serverMock.addResult({
      data: { assigned_consultant_id: USER_B_ID },
      error: null,
    });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toContain('권한');
  });

  it('빈 updates 객체 -> 검증 에러', async () => {
    // 1) requireAuthWithRole: 역할 조회 -> CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await editRoadmapManually(ROADMAP_ID, {});

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('잘못된 타입의 updates 데이터 -> 검증 에러', async () => {
    // 1) requireAuthWithRole: 역할 조회 -> CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    // diagnosis_summary에 숫자 전달 (string이어야 함)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await editRoadmapManually(ROADMAP_ID, { diagnosis_summary: 12345 as any });

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('정상 편집 요청 -> 성공', async () => {
    // 1) requireAuthWithRole: 역할 조회 -> CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) roadmap_versions 조회 -> project_id 반환
    serverMock.addResult({ data: { project_id: PROJECT_ID }, error: null });
    // 3) projects 조회 -> 본인에게 배정됨
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID },
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

  it('인증되지 않은 사용자 -> error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('CONSULTANT_APPROVED 아닌 역할 -> error 반환', async () => {
    // getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('Zod 검증 실패 (잘못된 projectId) -> error 반환', async () => {
    const result = await createRoadmap('not-a-uuid');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('입력 데이터');
  });

  it('미배정 프로젝트 -> error 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 -> 다른 컨설턴트에게 배정됨
    serverMock.addResult({
      data: { assigned_consultant_id: USER_B_ID, status: 'INTERVIEWED' },
      error: null,
    });

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('접근 권한');
  });

  it('부적절한 프로젝트 상태 (ASSIGNED) -> error 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 -> 본인 배정이지만 상태가 ASSIGNED (인터뷰 미완료)
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, status: 'ASSIGNED' },
      error: null,
    });

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('인터뷰');
  });

  it('LLM 에러 -> 사용자 친화적 에러 반환', async () => {
    const { generateRoadmap: generateRoadmapMock } = await import('@/lib/services/roadmap');

    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 -> 정상
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID, status: 'INTERVIEWED' },
      error: null,
    });

    vi.mocked(generateRoadmapMock).mockRejectedValueOnce(new Error('LLM API timeout'));

    const result = await createRoadmap(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeTruthy();
  });

  it('정상 생성 -> success + 로드맵 데이터 반환', async () => {
    const { generateRoadmap: generateRoadmapMock } = await import('@/lib/services/roadmap');

    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 -> 정상
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
      '로드맵이 생성되었습니다.',
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

  it('인증되지 않은 사용자 -> error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await confirmFinalRoadmap(ROADMAP_ID);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('CONSULTANT_APPROVED 아닌 역할 -> error 반환', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await confirmFinalRoadmap(ROADMAP_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('접근 권한 없음 (타 컨설턴트 로드맵) -> error 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) requireConsultantRoadmapAccess: roadmap_versions 조회
    serverMock.addResult({ data: { project_id: PROJECT_ID }, error: null });
    // 3) requireConsultantRoadmapAccess: projects 조회 -> 타 컨설턴트
    serverMock.addResult({
      data: { assigned_consultant_id: USER_B_ID },
      error: null,
    });

    const result = await confirmFinalRoadmap(ROADMAP_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('권한');
  });

  it('정상 확정 -> success', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) requireConsultantRoadmapAccess: roadmap_versions 조회
    serverMock.addResult({ data: { project_id: PROJECT_ID }, error: null });
    // 3) requireConsultantRoadmapAccess: projects 조회 -> 본인
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID },
      error: null,
    });

    const result = await confirmFinalRoadmap(ROADMAP_ID);

    expect(result.success).toBe(true);
  });

  it('서비스 에러 (finalizeRoadmap 실패) -> error 반환', async () => {
    const { finalizeRoadmap: finalizeRoadmapMock } = await import('@/lib/services/roadmap');

    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) requireConsultantRoadmapAccess: roadmap_versions 조회
    serverMock.addResult({ data: { project_id: PROJECT_ID }, error: null });
    // 3) requireConsultantRoadmapAccess: projects 조회 -> 본인
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID },
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

  it('인증되지 않은 사용자 -> 빈 배열 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await fetchRoadmapVersions(PROJECT_ID);

    expect(result).toEqual([]);
  });

  it('본인 프로젝트 -> 서비스 함수 호출', async () => {
    const { fetchRoadmapVersions: fetchVersionsMock } = await import('@/lib/services/roadmap');
    const mockVersions = [
      { id: 'v1', status: 'DRAFT', created_at: '2026-01-01' },
    ];
    vi.mocked(fetchVersionsMock).mockResolvedValueOnce(mockVersions as never);

    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 -> 본인 프로젝트
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID },
      error: null,
    });

    const result = await fetchRoadmapVersions(PROJECT_ID);

    expect(result).toEqual(mockVersions);
    expect(fetchVersionsMock).toHaveBeenCalledWith(PROJECT_ID);
  });

  it('타 컨설턴트 프로젝트 -> 빈 배열 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 -> 다른 컨설턴트 프로젝트
    serverMock.addResult({
      data: { assigned_consultant_id: USER_B_ID },
      error: null,
    });

    const result = await fetchRoadmapVersions(PROJECT_ID);

    expect(result).toEqual([]);
  });

  it('OPS_ADMIN -> 서비스 함수 호출 (프로젝트 조회 생략)', async () => {
    const { fetchRoadmapVersions: fetchVersionsMock } = await import('@/lib/services/roadmap');
    const mockVersions = [{ id: 'v1', status: 'FINAL', created_at: '2026-01-01' }];
    vi.mocked(fetchVersionsMock).mockResolvedValueOnce(mockVersions as never);

    // getCachedProfile: role 조회 -> OPS_ADMIN
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await fetchRoadmapVersions(PROJECT_ID);

    expect(result).toEqual(mockVersions);
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

  it('인증되지 않은 사용자 -> null 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await fetchRoadmapVersion(ROADMAP_ID);

    expect(result).toBeNull();
  });

  it('본인 프로젝트 로드맵 -> 정상 반환', async () => {
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
    // 2) projects 조회 -> 본인 배정
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID },
      error: null,
    });

    const result = await fetchRoadmapVersion(ROADMAP_ID);

    expect(result).toEqual(mockRoadmap);
  });

  it('타 컨설턴트 프로젝트 로드맵 -> null 반환', async () => {
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
    // 2) projects 조회 -> 타 컨설턴트
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

  it('인증되지 않은 사용자 -> error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await fetchProjectInfo(PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('접근 권한 없음 (타 컨설턴트) -> error 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 -> 타 컨설턴트 배정
    serverMock.addResult({
      data: { company_name: '테스트 기업', assigned_consultant_id: USER_B_ID },
      error: null,
    });

    const result = await fetchProjectInfo(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('권한');
  });

  it('정상 조회 (본인 프로젝트) -> success + companyName 반환', async () => {
    // 1) getCachedProfile: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) projects 조회 -> 본인 배정
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

  it('인증되지 않은 사용자 -> error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await cancelRoadmapGeneration();

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('정상 취소 -> success + cancelAbort 호출', async () => {
    const { cancelAbort } = await import('@/lib/services/abort-registry');

    // getCachedProfile: role 조회 (requireAuth는 role 조회를 함)
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await cancelRoadmapGeneration();

    expect(result.success).toBe(true);
    expect(cancelAbort).toHaveBeenCalledWith(`roadmap:${USER_A_ID}`);
  });
});
