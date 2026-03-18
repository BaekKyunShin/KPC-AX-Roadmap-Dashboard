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
 * setActiveTemplate (원자적 RPC):
 * - 인증 없음 → 에러
 * - 템플릿 미존재 → RPC가 실패 반환
 * - RPC 실행 에러 → 에러
 * - 활성화 성공 → success + 감사로그
 *
 * fetchTemplates:
 * - 인증 실패 → error
 * - 빈 목록 → 빈 배열
 * - 템플릿 2개 + usage 매핑
 * - DB 에러 → error
 * - usage 없는 템플릿 → usage_count: 0
 *
 * fetchTemplate:
 * - 인증 실패 → error
 * - 존재 → 데이터 + usage_count
 * - 미존재 → error
 * - DB 에러 → error
 *
 * createTemplate:
 * - 인증 실패 → error
 * - Zod 실패 (이름 1자) → error
 * - Zod 실패 (질문 0개) → error
 * - JSON 파싱 실패 → catch 블록 error
 * - 기존 버전 없음 → version 1
 * - 기존 최신 버전 3 → version 4
 * - 성공 + 감사로그 + revalidatePath
 * - DB insert 실패 → error
 *
 * duplicateTemplate:
 * - 인증 실패 → error
 * - 원본 미존재 → error
 * - 성공 → "(복사본)" 접미사 + 새 버전
 * - 감사로그에 duplicated_from 포함
 * - DB insert 실패 → error
 *
 * updateTemplate (추가 분기):
 * - 인증 실패 → error
 * - Zod 실패 → error
 * - 기존 템플릿 미존재 → error
 * - 미사용 + 질문 변경 → 직접 수정 (questions 포함)
 * - DB 실패 → error
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  deleteTemplate,
  setActiveTemplate,
  updateTemplate,
  fetchTemplates,
  fetchTemplate,
  createTemplate,
  duplicateTemplate,
} from './actions';
import { hasQuestionsChanged } from './utils';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

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

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void) => fn()),
}));

// ─── 테스트 헬퍼 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_TEMPLATE_ID = '550e8400-e29b-41d4-a716-446655440010';

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

  it('존재하지 않는 템플릿 → RPC가 실패 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
    });

    // admin RPC: 템플릿 없음
    adminMock.addRpcResult({
      data: { success: false, error: '템플릿을 찾을 수 없습니다.' },
      error: null,
    });

    const result = await setActiveTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '템플릿을 찾을 수 없습니다.' });
  });

  it('RPC 실행 에러 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
    });

    // admin RPC: DB 에러
    adminMock.addRpcResult({
      data: null,
      error: { message: 'RPC execution failed' },
    });

    const result = await setActiveTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '활성 템플릿 변경에 실패했습니다.' });
  });

  it('활성화 성공 → success + 감사로그', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    const { revalidatePath } = await import('next/cache');

    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
    });

    // admin RPC: 성공
    adminMock.addRpcResult({
      data: { success: true, name: '활성화할 템플릿', version: 3 },
      error: null,
    });

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

// ─── fetchTemplates ──────────────────────────────────────────────────────────

describe('fetchTemplates', () => {
  it('인증 실패 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });

    const result = await fetchTemplates();

    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('빈 목록 → 빈 배열', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 1. 템플릿 목록 조회 → 빈 배열 (thenable)
    serverMock.addResult({ data: [], error: null });
    // 2. usage 조회 → 빈 배열 (thenable, templateIds = [])
    serverMock.addResult({ data: [], error: null });

    const result = await fetchTemplates();

    expect(result.success).toBe(true);
    expect((result as { success: true; data: unknown[] }).data).toEqual([]);
  });

  it('템플릿 2개 + 사용 현황 올바르게 매핑', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    const t1Id = '550e8400-e29b-41d4-a716-446655440011';
    const t2Id = '550e8400-e29b-41d4-a716-446655440012';

    // 1. 템플릿 목록 조회
    serverMock.addResult({
      data: [
        { id: t1Id, name: '템플릿1', version: 2 },
        { id: t2Id, name: '템플릿2', version: 1 },
      ],
      error: null,
    });
    // 2. usage 조회 → t1에 2건, t2에 1건
    serverMock.addResult({
      data: [
        { template_id: t1Id },
        { template_id: t1Id },
        { template_id: t2Id },
      ],
      error: null,
    });

    const result = await fetchTemplates();

    expect(result.success).toBe(true);
    const data = (result as { success: true; data: Array<{ id: string; usage_count: number }> }).data;
    expect(data).toHaveLength(2);
    expect(data[0].usage_count).toBe(2);
    expect(data[1].usage_count).toBe(1);
  });

  it('DB 에러 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 템플릿 목록 조회 실패
    serverMock.addResult({ data: null, error: { message: 'db_error' } });

    const result = await fetchTemplates();

    expect(result).toEqual({ success: false, error: '템플릿 목록 조회에 실패했습니다.' });
  });

  it('usage 없는 템플릿 → usage_count: 0', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    const tId = '550e8400-e29b-41d4-a716-446655440013';

    // 1. 템플릿 목록 조회
    serverMock.addResult({
      data: [{ id: tId, name: '미사용 템플릿', version: 1 }],
      error: null,
    });
    // 2. usage 조회 → 빈 배열 (사용 없음)
    serverMock.addResult({ data: [], error: null });

    const result = await fetchTemplates();

    expect(result.success).toBe(true);
    const data = (result as { success: true; data: Array<{ id: string; usage_count: number }> }).data;
    expect(data[0].usage_count).toBe(0);
  });

  it('usage 데이터가 null → usage_count: 0', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    const tId = '550e8400-e29b-41d4-a716-446655440014';

    // 1. 템플릿 목록 조회
    serverMock.addResult({
      data: [{ id: tId, name: '널 usage 템플릿', version: 1 }],
      error: null,
    });
    // 2. usage 조회 → null 데이터
    serverMock.addResult({ data: null, error: null });

    const result = await fetchTemplates();

    expect(result.success).toBe(true);
    const data = (result as { success: true; data: Array<{ id: string; usage_count: number }> }).data;
    expect(data[0].usage_count).toBe(0);
  });
});

// ─── fetchTemplate ───────────────────────────────────────────────────────────

describe('fetchTemplate', () => {
  it('인증 실패 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });

    const result = await fetchTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('존재하는 템플릿 → 데이터 + usage_count', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 1. 템플릿 조회 (.single)
    serverMock.addResult({
      data: { id: TEST_TEMPLATE_ID, name: '조회 템플릿', version: 1 },
      error: null,
    });
    // 2. usage count 조회 (head: true, count: 'exact')
    serverMock.addResult({ data: null, error: null, count: 7 });

    const result = await fetchTemplate(TEST_TEMPLATE_ID);

    expect(result.success).toBe(true);
    const data = (result as { success: true; data: { usage_count: number } }).data;
    expect(data.usage_count).toBe(7);
  });

  it('미존재 템플릿 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 템플릿 조회 실패
    serverMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await fetchTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '템플릿 조회에 실패했습니다.' });
  });

  it('usage_count 가 0인 경우 → 0 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 1. 템플릿 조회
    serverMock.addResult({
      data: { id: TEST_TEMPLATE_ID, name: '미사용 템플릿', version: 1 },
      error: null,
    });
    // 2. usage count → 0 (count가 0이면 getTemplateUsageCount가 0 반환)
    serverMock.addResult({ data: null, error: null, count: 0 });

    const result = await fetchTemplate(TEST_TEMPLATE_ID);

    expect(result.success).toBe(true);
    const data = (result as { success: true; data: { usage_count: number } }).data;
    expect(data.usage_count).toBe(0);
  });
});

// ─── createTemplate ──────────────────────────────────────────────────────────

describe('createTemplate', () => {
  const validQuestions = [
    { id: 'q1', order: 1, dimension: 'AI 성숙도', question_text: '현재 AI 도입 수준은?', weight: 1 },
  ];

  function createFormData(overrides?: Record<string, string>): FormData {
    const fd = new FormData();
    fd.set('name', overrides?.name ?? '테스트 템플릿');
    fd.set('description', overrides?.description ?? '테스트 설명');
    fd.set('questions', overrides?.questions ?? JSON.stringify(validQuestions));
    return fd;
  }

  it('인증 실패 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });

    const fd = createFormData();
    const result = await createTemplate(fd);

    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('Zod 실패 (이름 1자) → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    const fd = createFormData({ name: 'A' }); // 2자 미만
    const result = await createTemplate(fd);

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('2자 이상');
  });

  it('Zod 실패 (질문 0개) → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    const fd = createFormData({ questions: JSON.stringify([]) });
    const result = await createTemplate(fd);

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('최소 1개');
  });

  it('JSON 파싱 실패 → catch 블록 error', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    const fd = createFormData({ questions: '유효하지 않은 JSON{{{' });
    const result = await createTemplate(fd);

    expect(result).toEqual({ success: false, error: '템플릿 생성에 실패했습니다.' });
  });

  it('기존 버전 없음 → version 1', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 1. getNextTemplateVersion → 기존 버전 없음 (.single → data: null)
    serverMock.addResult({ data: null, error: null });

    const NEW_ID = '550e8400-e29b-41d4-a716-446655440020';

    // admin: insert → 성공
    adminMock.addResult({
      data: { id: NEW_ID, version: 1, name: '테스트 템플릿' },
      error: null,
    });

    const fd = createFormData();
    const result = await createTemplate(fd);

    expect(result.success).toBe(true);
    // insert에 version: 1이 전달되었는지 확인
    expect(adminMock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ version: 1 }),
    );
  });

  it('기존 최신 버전 3 → version 4', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 1. getNextTemplateVersion → 기존 최신 버전 3
    serverMock.addResult({ data: { version: 3 }, error: null });

    const NEW_ID = '550e8400-e29b-41d4-a716-446655440021';

    // admin: insert → 성공
    adminMock.addResult({
      data: { id: NEW_ID, version: 4, name: '테스트 템플릿' },
      error: null,
    });

    const fd = createFormData();
    const result = await createTemplate(fd);

    expect(result.success).toBe(true);
    expect(adminMock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ version: 4 }),
    );
  });

  it('성공 + 감사로그 + revalidatePath', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    const { revalidatePath } = await import('next/cache');

    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 1. getNextTemplateVersion
    serverMock.addResult({ data: { version: 2 }, error: null });

    const NEW_ID = '550e8400-e29b-41d4-a716-446655440022';

    // admin: insert → 성공
    adminMock.addResult({
      data: { id: NEW_ID, version: 3, name: '테스트 템플릿' },
      error: null,
    });

    const fd = createFormData();
    const result = await createTemplate(fd);

    expect(result.success).toBe(true);
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'TEMPLATE_CREATE',
        targetType: 'template',
        targetId: NEW_ID,
        meta: expect.objectContaining({ version: 3, name: '테스트 템플릿' }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/ops/templates');
  });

  it('DB insert 실패 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 1. getNextTemplateVersion
    serverMock.addResult({ data: { version: 1 }, error: null });

    // admin: insert 실패
    adminMock.addResult({
      data: null,
      error: { message: 'insert_failed' },
    });

    const fd = createFormData();
    const result = await createTemplate(fd);

    expect(result).toEqual({ success: false, error: '템플릿 생성에 실패했습니다.' });
  });
});

// ─── duplicateTemplate ───────────────────────────────────────────────────────

describe('duplicateTemplate', () => {
  it('인증 실패 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });

    const result = await duplicateTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('원본 미존재 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 원본 조회 실패
    serverMock.addResult({ data: null, error: { message: 'not found' } });

    const result = await duplicateTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '템플릿을 찾을 수 없습니다.' });
  });

  it('성공 → "(복사본)" 접미사 + 새 버전 + is_active: false', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    const sourceQuestions = [
      { id: 'q1', order: 1, dimension: 'AI', question_text: '질문입니다', weight: 1 },
    ];

    // 1. 원본 템플릿 조회 (.single)
    serverMock.addResult({
      data: {
        id: TEST_TEMPLATE_ID,
        name: '원본 템플릿',
        description: '원본 설명',
        questions: sourceQuestions,
        version: 2,
      },
      error: null,
    });
    // 2. getNextTemplateVersion (.single)
    serverMock.addResult({ data: { version: 5 }, error: null });

    const NEW_ID = '550e8400-e29b-41d4-a716-446655440030';

    // admin: insert → 성공
    adminMock.addResult({
      data: {
        id: NEW_ID,
        name: '원본 템플릿 (복사본)',
        version: 6,
      },
      error: null,
    });

    const result = await duplicateTemplate(TEST_TEMPLATE_ID);

    expect(result.success).toBe(true);
    // insert 호출에 "(복사본)" 접미사 + is_active: false 확인
    expect(adminMock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '원본 템플릿 (복사본)',
        is_active: false,
        version: 6,
        questions: sourceQuestions,
        description: '원본 설명',
        created_by: TEST_USER_ID,
      }),
    );
  });

  it('감사로그에 duplicated_from 포함', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');

    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 1. 원본 조회
    serverMock.addResult({
      data: {
        id: TEST_TEMPLATE_ID,
        name: '원본',
        description: null,
        questions: [],
        version: 1,
      },
      error: null,
    });
    // 2. getNextTemplateVersion
    serverMock.addResult({ data: { version: 1 }, error: null });

    const NEW_ID = '550e8400-e29b-41d4-a716-446655440031';

    // admin: insert
    adminMock.addResult({
      data: { id: NEW_ID, name: '원본 (복사본)', version: 2 },
      error: null,
    });

    await duplicateTemplate(TEST_TEMPLATE_ID);

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'TEMPLATE_CREATE',
        targetType: 'template',
        targetId: NEW_ID,
        meta: expect.objectContaining({
          duplicated_from: TEST_TEMPLATE_ID,
          source_version: 1,
        }),
      }),
    );
  });

  it('DB insert 실패 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 1. 원본 조회
    serverMock.addResult({
      data: {
        id: TEST_TEMPLATE_ID,
        name: '원본',
        description: null,
        questions: [],
        version: 1,
      },
      error: null,
    });
    // 2. getNextTemplateVersion
    serverMock.addResult({ data: { version: 1 }, error: null });

    // admin: insert 실패
    adminMock.addResult({
      data: null,
      error: { message: 'insert_failed' },
    });

    const result = await duplicateTemplate(TEST_TEMPLATE_ID);

    expect(result).toEqual({ success: false, error: '템플릿 복제에 실패했습니다.' });
  });
});

// ─── updateTemplate (추가 분기) ──────────────────────────────────────────────

describe('updateTemplate — 추가 분기', () => {
  const testQuestions = [
    { id: 'q1', order: 1, dimension: 'AI 성숙도', question_text: '현재 AI 도입 수준은?', weight: 1 },
  ];

  function createUpdateFormData(overrides?: Record<string, string>): FormData {
    const fd = new FormData();
    fd.set('id', overrides?.id ?? TEST_TEMPLATE_ID);
    fd.set('name', overrides?.name ?? '원본 템플릿');
    fd.set('description', overrides?.description ?? '원본 설명');
    fd.set('questions', overrides?.questions ?? JSON.stringify(testQuestions));
    return fd;
  }

  it('인증 실패 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '권한이 없습니다.' });

    const fd = createUpdateFormData();
    const result = await updateTemplate(fd);

    expect(result).toEqual({ success: false, error: '권한이 없습니다.' });
  });

  it('Zod 실패 (이름 1자) → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    const fd = createUpdateFormData({ name: 'A' });
    const result = await updateTemplate(fd);

    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toContain('2자 이상');
  });

  it('Zod 실패 (유효하지 않은 UUID) → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    const fd = createUpdateFormData({ id: 'not-a-uuid' });
    const result = await updateTemplate(fd);

    expect(result.success).toBe(false);
  });

  it('기존 템플릿 미존재 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 기존 템플릿 조회 실패
    serverMock.addResult({ data: null, error: { message: 'not found' } });

    const fd = createUpdateFormData();
    const result = await updateTemplate(fd);

    expect(result).toEqual({ success: false, error: '템플릿을 찾을 수 없습니다.' });
  });

  it('미사용 + 질문 변경 → 직접 수정 (questions 포함)', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');

    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    const changedQuestions = [
      { ...testQuestions[0], question_text: '변경된 질문입니다 수정' },
    ];

    // 1. 기존 템플릿 조회 (.single)
    serverMock.addResult({
      data: {
        id: TEST_TEMPLATE_ID,
        version: 1,
        name: '원본 템플릿',
        description: '원본 설명',
        questions: testQuestions,
        is_active: false,
      },
      error: null,
    });
    // 2. usage count → 0 (미사용)
    serverMock.addResult({ data: null, error: null, count: 0 });

    // admin: in-place update (questions 포함) → 성공
    adminMock.addResult({
      data: {
        id: TEST_TEMPLATE_ID,
        version: 1,
        name: '원본 템플릿',
      },
      error: null,
    });

    const fd = createUpdateFormData({ questions: JSON.stringify(changedQuestions) });
    const result = await updateTemplate(fd);

    expect(result.success).toBe(true);
    // 미사용이므로 questions도 포함하여 update 호출
    expect(adminMock.chainable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        questions: changedQuestions,
      }),
    );
    // 감사로그가 TEMPLATE_UPDATE로 기록됨
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TEMPLATE_UPDATE',
        targetId: TEST_TEMPLATE_ID,
      }),
    );
  });

  it('DB update 실패 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    // 1. 기존 템플릿 조회
    serverMock.addResult({
      data: {
        id: TEST_TEMPLATE_ID,
        version: 1,
        name: '원본 템플릿',
        description: '원본 설명',
        questions: testQuestions,
        is_active: false,
      },
      error: null,
    });
    // 2. usage count → 0
    serverMock.addResult({ data: null, error: null, count: 0 });

    // admin: update 실패
    adminMock.addResult({
      data: null,
      error: { message: 'update_failed' },
    });

    const fd = createUpdateFormData();
    const result = await updateTemplate(fd);

    expect(result).toEqual({ success: false, error: '템플릿 수정에 실패했습니다.' });
  });

  it('사용 중 + questions 변경 + DB insert 실패 → error 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    const changedQuestions = [
      { ...testQuestions[0], question_text: '새로운 질문 텍스트입니다' },
    ];

    // 1. 기존 템플릿 조회
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
    // 2. usage count → 5 (사용 중)
    serverMock.addResult({ data: null, error: null, count: 5 });
    // 3. getNextTemplateVersion
    serverMock.addResult({ data: { version: 3 }, error: null });

    // admin: insert 새 버전 실패
    adminMock.addResult({
      data: null,
      error: { message: 'insert_failed' },
    });

    const fd = createUpdateFormData({ questions: JSON.stringify(changedQuestions) });
    const result = await updateTemplate(fd);

    expect(result).toEqual({ success: false, error: '템플릿 새 버전 생성에 실패했습니다.' });
  });

  it('JSON 파싱 실패 → catch 블록 error', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID },
      supabase: serverMock.client,
    });

    const fd = createUpdateFormData({ questions: '유효하지않은JSON{' });
    const result = await updateTemplate(fd);

    expect(result).toEqual({ success: false, error: '템플릿 수정에 실패했습니다.' });
  });
});
