/**
 * editRoadmapManually 보안 테스트
 *
 * 이슈 #5: 타 컨설턴트 로드맵 무단 변경 가능
 * - 프로젝트 배정 검증 추가
 * - Zod 입력 검증 추가
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { editRoadmapManually } from './actions';
import { createClient } from '@/lib/supabase/server';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/roadmap', () => ({
  updateRoadmapManually: vi.fn().mockResolvedValue({
    success: true,
    validation: { isValid: true, errors: [], warnings: [] },
  }),
}));

vi.mock('@/lib/services/activity-log', () => ({
  insertSystemActivityLog: vi.fn(),
}));

// ─── 테스트 헬퍼 ────────────────────────────────────────────────────────────

const USER_A_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_B_ID = '550e8400-e29b-41d4-a716-446655440002';
const ROADMAP_ID = '550e8400-e29b-41d4-a716-446655440010';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';

/**
 * Supabase 체인 모킹 팩토리 (기존 ops/projects/actions.test.ts 패턴)
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
  };

  return {
    mockClient,
    chainable,
    addResult: (result: { data: unknown; error: unknown; count?: number | null }) => {
      results.push(result);
    },
  };
}

/** 유효한 updates (diagnosis_summary만 수정) */
function validUpdates() {
  return { diagnosis_summary: '수정된 진단 요약입니다.' };
}

// ─── editRoadmapManually ────────────────────────────────────────────────────

describe('editRoadmapManually', () => {
  let serverMock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    serverMock = createMockClient({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockClient({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.mockClient as never);

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('CONSULTANT_APPROVED가 아닌 역할 → error 반환', async () => {
    // requireAuthWithRole: users 테이블 역할 조회 → OPS_ADMIN (불허)
    serverMock.addResult({ data: { role: 'OPS_ADMIN' }, error: null });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('존재하지 않는 로드맵 → error 반환', async () => {
    // 1) requireAuthWithRole: 역할 조회 → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    // 2) roadmap_versions 조회 → 없음
    serverMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toContain('로드맵');
  });

  it('타 컨설턴트의 로드맵 편집 시도 → 접근 권한 에러', async () => {
    // 1) requireAuthWithRole: 역할 조회 → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    // 2) roadmap_versions 조회 → project_id 반환
    serverMock.addResult({ data: { project_id: PROJECT_ID }, error: null });
    // 3) projects 조회 → 다른 컨설턴트(USER_B)에게 배정됨
    serverMock.addResult({
      data: { assigned_consultant_id: USER_B_ID },
      error: null,
    });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(false);
    expect(result.success === false && result.error).toContain('권한');
  });

  it('빈 updates 객체 → 검증 에러', async () => {
    // 1) requireAuthWithRole: 역할 조회 → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });

    const result = await editRoadmapManually(ROADMAP_ID, {});

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('잘못된 타입의 updates 데이터 → 검증 에러', async () => {
    // 1) requireAuthWithRole: 역할 조회 → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });

    // diagnosis_summary에 숫자 전달 (string이어야 함)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await editRoadmapManually(ROADMAP_ID, { diagnosis_summary: 12345 as any });

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('정상 편집 요청 → 성공', async () => {
    // 1) requireAuthWithRole: 역할 조회 → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    // 2) roadmap_versions 조회 → project_id 반환
    serverMock.addResult({ data: { project_id: PROJECT_ID }, error: null });
    // 3) projects 조회 → 본인에게 배정됨
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID },
      error: null,
    });

    const result = await editRoadmapManually(ROADMAP_ID, validUpdates());

    expect(result.success).toBe(true);
  });
});
