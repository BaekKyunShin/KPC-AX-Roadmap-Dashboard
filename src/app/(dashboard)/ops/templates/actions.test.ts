/**
 * ops/templates/actions.ts 테스트
 *
 * hasQuestionsChanged:
 * - 동일한 questions → false
 * - question_text 변경 → true
 * - weight 변경 → true
 * - dimension 변경 → true
 * - order 변경 → true
 * - id 변경 → true
 * - 질문 추가 → true
 * - 질문 삭제 → true
 * - 빈 배열 동일 → false
 * - 배열 순서 다르지만 내용 동일 (정렬) → false
 *
 * updateTemplate:
 * - 사용 중 + 메타데이터만 변경 → in-place update (복제 안 함)
 * - 사용 중 + questions 변경 → 새 버전 생성 (복제)
 *
 * deleteTemplate:
 * - 인증/권한 없음 → 에러
 * - 활성 템플릿 → 삭제 불가
 * - 사용 중(usage > 0) → 삭제 불가
 * - 미사용 + 비활성 → 삭제 성공 + 감사로그
 * - DB 삭제 실패 → 에러
 *
 * setActiveTemplate:
 * - 인증 없음 / 템플릿 미존재 → 에러
 * - 비활성화 단계 DB 에러 → 에러 (기존 활성 유지 방지)
 * - 활성화 성공 → success + 감사로그
 * - 활성화 단계 DB 에러 → 에러
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  deleteTemplate,
  setActiveTemplate,
  updateTemplate,
} from './actions';
import { hasQuestionsChanged } from './utils';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockAuthResult = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockAuthResult(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ─── 테스트 헬퍼 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_TEMPLATE_ID = '550e8400-e29b-41d4-a716-446655440010';

function createMockSupabase() {
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
    'select', 'eq', 'neq', 'order', 'limit', 'delete', 'update', 'insert',
  ]) {
    chainable[method] = vi.fn(() => chainable);
  }

  chainable.single = vi.fn(() => nextResult());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chainable.then = (resolve: (v: any) => void, reject?: (e: any) => void) => {
    return Promise.resolve(nextResult()).then(resolve, reject);
  };

  const client = {
    from: vi.fn(() => chainable),
  };

  return {
    client,
    chainable,
    addResult: (result: { data: unknown; error: unknown; count?: number | null }) => {
      results.push(result);
    },
  };
}

// ─── 공통 mock 셋업 ─────────────────────────────────────────────────────────

let serverMock: ReturnType<typeof createMockSupabase>;
let adminMock: ReturnType<typeof createMockSupabase>;

beforeEach(async () => {
  serverMock = createMockSupabase();
  adminMock = createMockSupabase();

  const { createAdminClient } = await import('@/lib/supabase/admin');
  vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── deleteTemplate ─────────────────────────────────────────────────────────

describe('deleteTemplate', () => {
  it('인증되지 않은 사용자 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });

    const result = await deleteTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('OPS_ADMIN/SYSTEM_ADMIN 아닌 역할 → 권한 없음', async () => {
    mockAuthResult.mockResolvedValue({ error: '권한이 없습니다.' });

    const result = await deleteTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '권한이 없습니다.' });
  });

  it('활성 템플릿 → 삭제 불가', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 템플릿 조회 → 활성 상태
    serverMock.addResult({
      data: { id: TEST_TEMPLATE_ID, is_active: true, version: 1, name: '활성 템플릿' },
      error: null,
    });

    const result = await deleteTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({
      success: false,
      error: '활성 템플릿은 삭제할 수 없습니다. 먼저 비활성화해주세요.',
    });
  });

  it('사용 중인 템플릿(usage > 0) → 삭제 불가', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 템플릿 조회 → 비활성
    serverMock.addResult({
      data: { id: TEST_TEMPLATE_ID, is_active: false, version: 2, name: '사용중 템플릿' },
      error: null,
    });
    // 사용 현황 조회 → 3건 사용
    serverMock.addResult({ data: null, error: null, count: 3 });

    const result = await deleteTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({
      success: false,
      error: '이 템플릿으로 진행된 자가진단이 3건 있어 삭제할 수 없습니다.',
    });
  });

  it('미사용 + 비활성 → 삭제 성공 + 감사로그', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    const { revalidatePath } = await import('next/cache');

    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 템플릿 조회 → 비활성
    serverMock.addResult({
      data: { id: TEST_TEMPLATE_ID, is_active: false, version: 2, name: '삭제할 템플릿' },
      error: null,
    });
    // 사용 현황 조회 → 0건
    serverMock.addResult({ data: null, error: null, count: 0 });
    // admin 삭제 → 성공
    adminMock.addResult({ data: null, error: null });

    const result = await deleteTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: true });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'TEMPLATE_DELETE',
        targetType: 'template',
        targetId: TEST_TEMPLATE_ID,
        meta: expect.objectContaining({ version: 2, name: '삭제할 템플릿' }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/ops/templates');
  });

  it('DB 삭제 실패 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 템플릿 조회 → 비활성
    serverMock.addResult({
      data: { id: TEST_TEMPLATE_ID, is_active: false, version: 3, name: 'DB 에러 템플릿' },
      error: null,
    });
    // 사용 현황 → 0건
    serverMock.addResult({ data: null, error: null, count: 0 });
    // admin 삭제 → 실패
    adminMock.addResult({ data: null, error: { message: 'delete_failed' } });

    const result = await deleteTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '템플릿 삭제에 실패했습니다.' });
  });

  it('템플릿 조회 실패 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 템플릿 조회 → 없음
    serverMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await deleteTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '템플릿을 찾을 수 없습니다.' });
  });
});

// ─── setActiveTemplate ──────────────────────────────────────────────────────

describe('setActiveTemplate', () => {
  it('인증되지 않은 사용자 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });

    const result = await setActiveTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('존재하지 않는 템플릿 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    serverMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await setActiveTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '템플릿을 찾을 수 없습니다.' });
  });

  it('비활성화 단계 DB 에러 → error 반환 (기존 활성 유지 방지)', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 템플릿 조회 → 존재
    serverMock.addResult({
      data: { id: TEST_TEMPLATE_ID, is_active: false, version: 1, name: '테스트 템플릿' },
      error: null,
    });

    // admin: 비활성화 → 에러
    adminMock.addResult({ data: null, error: { message: '비활성화 실패' } });

    const result = await setActiveTemplate(TEST_TEMPLATE_ID);

    // 비활성화 실패 시 활성화로 진행하면 안 됨 → error 반환
    expect(result.success).toBe(false);
  });

  it('활성화 성공 → success + 감사로그', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    const { revalidatePath } = await import('next/cache');

    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 템플릿 조회 → 존재
    serverMock.addResult({
      data: { id: TEST_TEMPLATE_ID, is_active: false, version: 3, name: '활성화할 템플릿' },
      error: null,
    });

    // admin: 비활성화 → 성공
    adminMock.addResult({ data: null, error: null });
    // admin: 활성화 → 성공
    adminMock.addResult({ data: null, error: null });

    const result = await setActiveTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: true });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'TEMPLATE_ACTIVATE',
        targetType: 'template',
        targetId: TEST_TEMPLATE_ID,
        meta: expect.objectContaining({ version: 3, name: '활성화할 템플릿' }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/ops/templates');
  });

  it('활성화 단계 DB 에러 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 템플릿 조회 → 존재
    serverMock.addResult({
      data: { id: TEST_TEMPLATE_ID, is_active: false, version: 2, name: '테스트' },
      error: null,
    });

    // admin: 비활성화 → 성공
    adminMock.addResult({ data: null, error: null });
    // admin: 활성화 → 에러
    adminMock.addResult({ data: null, error: { message: 'activation_failed' } });

    const result = await setActiveTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '활성 템플릿 변경에 실패했습니다.' });
  });
});

// ─── updateTemplate ─────────────────────────────────────────────────────────

describe('updateTemplate', () => {
  const testQuestions = [
    { id: 'q1', order: 1, dimension: 'AI 성숙도', question_text: '현재 AI 도입 수준은?', weight: 1 },
  ];

  function createFormData(overrides?: Record<string, string>): FormData {
    const fd = new FormData();
    fd.append('id', TEST_TEMPLATE_ID);
    fd.append('name', overrides?.name ?? '원본 템플릿');
    fd.append('description', overrides?.description ?? '원본 설명');
    fd.append('questions', overrides?.questions ?? JSON.stringify(testQuestions));
    return fd;
  }

  it('사용 중 + 메타데이터만 변경 → in-place update (복제 안 함)', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');

    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 1. 기존 템플릿 조회 (.single)
    serverMock.addResult({
      data: {
        id: TEST_TEMPLATE_ID,
        version: 1,
        name: '원본 템플릿',
        description: '원본 설명',
        questions: testQuestions,
        is_active: true,
      },
      error: null,
    });
    // 2. usage count 조회 (.then)
    serverMock.addResult({ data: null, error: null, count: 5 });

    // admin: in-place update → 성공 (.single)
    adminMock.addResult({
      data: {
        id: TEST_TEMPLATE_ID,
        version: 1,
        name: '수정된 이름',
        description: '수정된 설명',
      },
      error: null,
    });

    const fd = createFormData({ name: '수정된 이름', description: '수정된 설명' });
    const result = await updateTemplate(fd);

    expect(result.success).toBe(true);
    // 감사로그가 TEMPLATE_UPDATE (직접 수정)로 기록됨
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TEMPLATE_UPDATE',
        targetId: TEST_TEMPLATE_ID,
      }),
    );
  });

  it('사용 중 + questions 변경 → 새 버전 생성 (복제)', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');

    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 1. 기존 템플릿 조회 (.single)
    serverMock.addResult({
      data: {
        id: TEST_TEMPLATE_ID,
        version: 1,
        name: '원본 템플릿',
        description: '원본 설명',
        questions: testQuestions,
        is_active: true,
      },
      error: null,
    });
    // 2. usage count 조회 (.then)
    serverMock.addResult({ data: null, error: null, count: 5 });
    // 3. 최신 버전 조회 (.single)
    serverMock.addResult({ data: { version: 2 }, error: null });

    const NEW_TEMPLATE_ID = '550e8400-e29b-41d4-a716-446655440099';

    // admin: insert 새 버전 → 성공 (.single)
    adminMock.addResult({
      data: {
        id: NEW_TEMPLATE_ID,
        version: 3,
        name: '원본 템플릿',
        description: '원본 설명',
      },
      error: null,
    });

    const changedQuestions = [
      { ...testQuestions[0], question_text: '변경된 질문 내용' },
    ];
    const fd = createFormData({ questions: JSON.stringify(changedQuestions) });
    const result = await updateTemplate(fd);

    expect(result.success).toBe(true);
    // 감사로그가 TEMPLATE_CREATE (새 버전)로 기록됨
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TEMPLATE_CREATE',
        targetId: NEW_TEMPLATE_ID,
      }),
    );
  });
});

// ─── hasQuestionsChanged ────────────────────────────────────────────────────

describe('hasQuestionsChanged', () => {
  const baseQuestion = {
    id: 'q1',
    order: 1,
    dimension: 'AI 성숙도',
    question_text: '현재 AI 도입 수준은?',
    weight: 1,
  };

  const baseQuestion2 = {
    id: 'q2',
    order: 2,
    dimension: '데이터 준비도',
    question_text: '데이터 품질 관리 체계가 있는가?',
    weight: 2,
  };

  it('동일한 questions → false', () => {
    const existing = [baseQuestion, baseQuestion2];
    const updated = [{ ...baseQuestion }, { ...baseQuestion2 }];

    expect(hasQuestionsChanged(existing, updated)).toBe(false);
  });

  it('question_text 변경 → true', () => {
    const existing = [baseQuestion];
    const updated = [{ ...baseQuestion, question_text: '변경된 질문' }];

    expect(hasQuestionsChanged(existing, updated)).toBe(true);
  });

  it('weight 변경 → true', () => {
    const existing = [baseQuestion];
    const updated = [{ ...baseQuestion, weight: 5 }];

    expect(hasQuestionsChanged(existing, updated)).toBe(true);
  });

  it('dimension 변경 → true', () => {
    const existing = [baseQuestion];
    const updated = [{ ...baseQuestion, dimension: '인프라 준비도' }];

    expect(hasQuestionsChanged(existing, updated)).toBe(true);
  });

  it('order 변경 → true', () => {
    const existing = [baseQuestion];
    const updated = [{ ...baseQuestion, order: 3 }];

    expect(hasQuestionsChanged(existing, updated)).toBe(true);
  });

  it('id 변경 → true', () => {
    const existing = [baseQuestion];
    const updated = [{ ...baseQuestion, id: 'q_new_1' }];

    expect(hasQuestionsChanged(existing, updated)).toBe(true);
  });

  it('질문 추가 → true', () => {
    const existing = [baseQuestion];
    const updated = [baseQuestion, baseQuestion2];

    expect(hasQuestionsChanged(existing, updated)).toBe(true);
  });

  it('질문 삭제 → true', () => {
    const existing = [baseQuestion, baseQuestion2];
    const updated = [baseQuestion];

    expect(hasQuestionsChanged(existing, updated)).toBe(true);
  });

  it('빈 배열 동일 → false', () => {
    expect(hasQuestionsChanged([], [])).toBe(false);
  });

  it('배열 순서 다르지만 내용 동일 (order 기준 정렬) → false', () => {
    const existing = [baseQuestion2, baseQuestion]; // order 2, 1
    const updated = [baseQuestion, baseQuestion2]; // order 1, 2

    expect(hasQuestionsChanged(existing, updated)).toBe(false);
  });
});
