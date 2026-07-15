/**
 * ops/projects/actions/crud.ts 테스트
 *
 * 테스트 대상:
 * - createProject: 프로젝트 생성 (OPS_ADMIN)
 * - createSelfAssessment: 자가진단 입력
 * - assignConsultant: 컨설턴트 배정
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── after() 추적 ────────────────────────────────────────────────────────────

const { pendingCallbacks, flush, mockAfter } = vi.hoisted(() => {
  const pendingCallbacks: Promise<unknown>[] = [];
  const mockAfter = vi.fn((fn: () => void | Promise<unknown>) => {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      pendingCallbacks.push(result as Promise<unknown>);
    }
  });
  return {
    pendingCallbacks,
    flush: async () => {
      await Promise.all(pendingCallbacks);
      pendingCallbacks.length = 0;
    },
    mockAfter,
  };
});

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockAuthResult = vi.fn();
vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockAuthResult(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/notification', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/calculate-scores', () => ({
  calculateScores: vi
    .fn()
    .mockReturnValue({ data: 3, process: 4, culture: 2, technology: 3, total_score: 60 }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/server', () => ({
  after: mockAfter,
}));

// ─── 테스트 대상 import ──────────────────────────────────────────────────────

import { createProject, createSelfAssessment, assignConsultant } from './crud';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { createNotification } from '@/lib/services/notification';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440010';
const TEST_CONSULTANT_ID = '550e8400-e29b-41d4-a716-446655440020';
const TEST_TEMPLATE_ID = '550e8400-e29b-41d4-a716-446655440030';
const TEST_ROADMAP_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440050';

function createAuthSuccess() {
  const mock = createMockSupabase({ authUser: { id: TEST_USER_ID } });
  return {
    user: { id: TEST_USER_ID, email: 'ops@test.com' },
    supabase: mock.client,
    role: 'OPS_ADMIN',
    status: 'ACTIVE',
    _mock: mock,
  };
}

function makeProjectFormData(overrides: Record<string, string> = {}) {
  const data = new FormData();
  data.set('company_name', overrides.company_name ?? '테스트 주식회사');
  data.set('industry', overrides.industry ?? '제조업');
  data.set('company_size', overrides.company_size ?? '50-299');
  data.set('contact_name', overrides.contact_name ?? '김테스트');
  data.set('contact_email', overrides.contact_email ?? 'test@company.com');
  if (overrides.sub_industries) data.set('sub_industries', overrides.sub_industries);
  if (overrides.contact_phone) data.set('contact_phone', overrides.contact_phone);
  if (overrides.company_address) data.set('company_address', overrides.company_address);
  if (overrides.customer_comment) data.set('customer_comment', overrides.customer_comment);
  if (overrides.track !== undefined) data.set('track', overrides.track);
  if (overrides.roadmap_project_id !== undefined)
    data.set('roadmap_project_id', overrides.roadmap_project_id);
  return data;
}

// ─── createProject ──────────────────────────────────────────────────────────

describe('createProject', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    pendingCallbacks.length = 0;
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 시 에러 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });

    const result = await createProject(makeProjectFormData());
    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('유효한 데이터로 프로젝트 생성 성공', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({
      data: { id: TEST_PROJECT_ID, company_name: '테스트 주식회사' },
      error: null,
    });

    const result = await createProject(makeProjectFormData());
    expect(result).toEqual({ success: true, data: { projectId: TEST_PROJECT_ID } });
    expect(adminMock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_name: '테스트 주식회사',
        status: 'NEW',
        created_by: TEST_USER_ID,
      })
    );
  });

  it('Zod 검증 실패 시 에러 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    const formData = makeProjectFormData({ company_name: '' }); // 빈 회사명
    const result = await createProject(formData);
    expect(result.success).toBe(false);
  });

  it('sub_industries JSON 파싱 실패 시 빈 배열', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({ data: { id: TEST_PROJECT_ID }, error: null });

    const formData = makeProjectFormData({ sub_industries: 'invalid-json' });
    const result = await createProject(formData);
    expect(result.success).toBe(true);
  });

  it('sub_industries 정상 파싱', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({ data: { id: TEST_PROJECT_ID }, error: null });

    const formData = makeProjectFormData({ sub_industries: '["자동차","전자"]' });
    const result = await createProject(formData);
    expect(result.success).toBe(true);
    expect(adminMock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        sub_industries: ['자동차', '전자'],
      })
    );
  });

  it('DB insert 에러 시 감사 로그 기록 + 에러 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({ data: null, error: { message: 'duplicate key' } });

    const result = await createProject(makeProjectFormData());
    expect(result).toEqual({ success: false, error: '프로젝트 생성에 실패했습니다.' });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_CREATE',
        success: false,
      })
    );
  });

  it('track 미지정 시 기본값 ROADMAP으로 저장', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({ data: { id: TEST_PROJECT_ID }, error: null });

    const result = await createProject(makeProjectFormData());
    expect(result.success).toBe(true);
    expect(adminMock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ track: 'ROADMAP' })
    );
  });

  it("track='PBL' 지정 시 PBL 프로젝트로 저장", async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({ data: { id: TEST_PROJECT_ID }, error: null });

    const result = await createProject(makeProjectFormData({ track: 'PBL' }));
    expect(result.success).toBe(true);
    expect(adminMock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ track: 'PBL' })
    );
  });

  it("track='INVALID' 지정 시 검증 실패", async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    const result = await createProject(makeProjectFormData({ track: 'INVALID' }));
    expect(result.success).toBe(false);
  });

  it('성공 시 after()로 감사 로그 기록', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({ data: { id: TEST_PROJECT_ID }, error: null });

    await createProject(makeProjectFormData());
    expect(mockAfter).toHaveBeenCalled();
    await flush();
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_CREATE',
        targetId: TEST_PROJECT_ID,
      })
    );
  });

  // ── 선행 로드맵 연계 (PR2) ──────────────────────────────────────────────────

  it('PBL + 유효한 선행 로드맵(FINAL 보유) 링크 시 roadmap_project_id를 저장', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    // 1) getLatestFinalRoadmap → FINAL 존재  2) projects insert
    adminMock.addResult({ data: { id: 'rv-1', status: 'FINAL' }, error: null });
    adminMock.addResult({ data: { id: TEST_PROJECT_ID }, error: null });

    const result = await createProject(
      makeProjectFormData({ track: 'PBL', roadmap_project_id: TEST_ROADMAP_PROJECT_ID })
    );

    expect(result).toEqual({ success: true, data: { projectId: TEST_PROJECT_ID } });
    expect(adminMock.chainable.insert).toHaveBeenCalledWith(
      expect.objectContaining({ track: 'PBL', roadmap_project_id: TEST_ROADMAP_PROJECT_ID })
    );
  });

  it('PBL + FINAL 로드맵이 없는 링크는 검증 에러 (insert 안 함)', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    // getLatestFinalRoadmap → null (FINAL 없음)
    adminMock.addResult({ data: null, error: null });

    const result = await createProject(
      makeProjectFormData({ track: 'PBL', roadmap_project_id: TEST_ROADMAP_PROJECT_ID })
    );

    expect(result.success).toBe(false);
    expect(adminMock.chainable.insert).not.toHaveBeenCalled();
  });

  it('ROADMAP 트랙에 roadmap_project_id가 와도 저장하지 않는다(스트립)', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({ data: { id: TEST_PROJECT_ID }, error: null });

    const result = await createProject(
      makeProjectFormData({ track: 'ROADMAP', roadmap_project_id: TEST_ROADMAP_PROJECT_ID })
    );

    expect(result.success).toBe(true);
    const payload = adminMock.chainable.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('roadmap_project_id');
  });

  it('PBL + 링크 미선택 시 roadmap_project_id 없이 정상 생성', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({ data: { id: TEST_PROJECT_ID }, error: null });

    const result = await createProject(makeProjectFormData({ track: 'PBL' }));

    expect(result.success).toBe(true);
    const payload = adminMock.chainable.insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('roadmap_project_id');
  });
});

// ─── createSelfAssessment ───────────────────────────────────────────────────

describe('createSelfAssessment', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  function makeAssessmentFormData() {
    const data = new FormData();
    data.set('project_id', TEST_PROJECT_ID);
    data.set('template_id', TEST_TEMPLATE_ID);
    data.set(
      'answers',
      JSON.stringify([
        { question_id: 'q1', answer_value: 3 },
        { question_id: 'q2', answer_value: 4 },
      ])
    );
    return data;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    pendingCallbacks.length = 0;
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 시 에러 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });

    const result = await createSelfAssessment(makeAssessmentFormData());
    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('answers JSON 파싱 실패 시 에러 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    const formData = new FormData();
    formData.set('project_id', TEST_PROJECT_ID);
    formData.set('template_id', TEST_TEMPLATE_ID);
    formData.set('answers', 'invalid-json');

    const result = await createSelfAssessment(formData);
    expect(result).toEqual({ success: false, error: '응답 데이터 형식이 올바르지 않습니다.' });
  });

  it('Zod 검증 실패 시 에러 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    const formData = new FormData();
    formData.set('project_id', 'invalid-uuid');
    formData.set('template_id', TEST_TEMPLATE_ID);
    formData.set('answers', '[]');

    const result = await createSelfAssessment(formData);
    expect(result.success).toBe(false);
  });

  it('템플릿 미존재 시 에러 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({ data: null, error: null }); // 템플릿 조회 실패

    const result = await createSelfAssessment(makeAssessmentFormData());
    expect(result).toEqual({ success: false, error: '템플릿을 찾을 수 없습니다.' });
  });

  it('정상 자가진단 저장 성공', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    // 템플릿 조회
    adminMock.addResult({ data: { version: 1, questions: [] }, error: null });
    // 자가진단 insert
    adminMock.addResult({ data: null, error: null });
    // 프로젝트 상태 업데이트
    adminMock.addResult({ data: null, error: null });

    const result = await createSelfAssessment(makeAssessmentFormData());
    expect(result).toEqual({ success: true });
  });

  it('insert 에러 시 감사 로그 + 에러 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addResult({ data: { version: 1, questions: [] }, error: null });
    adminMock.addResult({ data: null, error: { message: 'insert error' } });

    const result = await createSelfAssessment(makeAssessmentFormData());
    expect(result).toEqual({ success: false, error: '자가진단 저장에 실패했습니다.' });
  });
});

// ─── assignConsultant ───────────────────────────────────────────────────────

describe('assignConsultant', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  function makeAssignFormData() {
    const data = new FormData();
    data.set('project_id', TEST_PROJECT_ID);
    data.set('consultant_id', TEST_CONSULTANT_ID);
    data.set('assignment_reason', '산업 분야 경험이 풍부하여 배정');
    return data;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    pendingCallbacks.length = 0;
    adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 시 에러 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '인증되지 않은 사용자입니다.' });

    const result = await assignConsultant(makeAssignFormData());
    expect(result).toEqual({ success: false, error: '인증되지 않은 사용자입니다.' });
  });

  it('Zod 검증 실패 시 에러 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    const formData = new FormData();
    formData.set('project_id', 'invalid-uuid');
    formData.set('consultant_id', TEST_CONSULTANT_ID);
    formData.set('assignment_reason', '이유');

    const result = await assignConsultant(formData);
    expect(result.success).toBe(false);
  });

  it('RPC 성공 시 배정 성공', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addRpcResult({ data: { success: true }, error: null });
    // after() 콜백 내부: 프로젝트 company_name 조회
    adminMock.addResult({ data: { company_name: '테스트사' }, error: null });

    const result = await assignConsultant(makeAssignFormData());
    expect(result).toEqual({ success: true });
  });

  it('RPC 에러 시 감사 로그 + 에러 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addRpcResult({ data: null, error: { message: 'RPC 에러' } });

    const result = await assignConsultant(makeAssignFormData());
    expect(result.success).toBe(false);
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_ASSIGN',
        success: false,
      })
    );
  });

  it('RPC 결과가 success: false일 때 에러 반환', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addRpcResult({
      data: { success: false, error: '이미 배정된 프로젝트' },
      error: null,
    });

    const result = await assignConsultant(makeAssignFormData());
    expect(result).toEqual({ success: false, error: '이미 배정된 프로젝트' });
  });

  it('성공 시 after()로 감사 로그 + 알림 생성', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addRpcResult({ data: { success: true }, error: null });
    // after() 내부: 프로젝트 조회
    adminMock.addResult({ data: { company_name: '테스트 주식회사' }, error: null });

    await assignConsultant(makeAssignFormData());
    expect(mockAfter).toHaveBeenCalled();
    await flush();
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROJECT_ASSIGN',
        targetId: TEST_PROJECT_ID,
      })
    );
  });

  it('재배정 시 이전 컨설턴트에게 해제 알림 전송', async () => {
    const PREVIOUS_CONSULTANT_ID = '550e8400-e29b-41d4-a716-446655440099';
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    adminMock.addRpcResult({
      data: { success: true, previous_consultant_id: PREVIOUS_CONSULTANT_ID },
      error: null,
    });
    // after() 내부: 프로젝트 조회
    adminMock.addResult({ data: { company_name: '재배정사' }, error: null });

    await assignConsultant(makeAssignFormData());
    await flush();

    // 새 컨설턴트 배정 알림
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_CONSULTANT_ID,
        type: 'assignment',
        title: '새 프로젝트 배정',
      })
    );
    // 이전 컨설턴트 해제 알림
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: PREVIOUS_CONSULTANT_ID,
        type: 'assignment',
        title: '프로젝트 배정 해제',
        message: '재배정사 프로젝트 담당이 변경되었습니다.',
      })
    );
  });

  it('첫 배정 시 해제 알림 미전송', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    // previous_consultant_id가 없는 경우 (첫 배정)
    adminMock.addRpcResult({ data: { success: true }, error: null });
    adminMock.addResult({ data: { company_name: '첫배정사' }, error: null });

    await assignConsultant(makeAssignFormData());
    await flush();

    // 새 컨설턴트 배정 알림만 전송
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_CONSULTANT_ID,
        title: '새 프로젝트 배정',
      })
    );
  });

  it('같은 컨설턴트로 재배정 시 해제 알림 미전송', async () => {
    const auth = createAuthSuccess();
    mockAuthResult.mockResolvedValue(auth);

    // 이전 컨설턴트 == 새 컨설턴트
    adminMock.addRpcResult({
      data: { success: true, previous_consultant_id: TEST_CONSULTANT_ID },
      error: null,
    });
    adminMock.addResult({ data: { company_name: '자기배정사' }, error: null });

    await assignConsultant(makeAssignFormData());
    await flush();

    // 배정 알림만 전송, 해제 알림 미전송
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_CONSULTANT_ID,
        title: '새 프로젝트 배정',
      })
    );
  });
});
