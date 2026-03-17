/**
 * consultant/projects/[id]/interview/actions.ts 테스트
 *
 * 테스트 대상:
 * - saveInterview: 인터뷰 저장/수정 (인증/역할/프로젝트접근/Zod/상태전이)
 * - fetchInterview: 인터뷰 조회 (인증/프로젝트 배정 검증)
 * - processSttFile: STT 처리 (인증/역할/크기검증/LLM)
 * - deleteSttInsights: STT 인사이트 삭제
 *
 * 감사 이슈:
 * - #23: verifyProjectAccess 역할 체크 — CONSULTANT_APPROVED 아닌 역할 거부 검증
 * - #27: 자동저장 시 완화된 스키마 적용 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveInterview,
  fetchInterview,
  processSttFile,
  deleteSttInsights,
} from './actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('@/lib/services/activity-log', () => ({
  insertSystemActivityLog: vi.fn(),
}));

vi.mock('@/lib/services/notification', () => ({
  createNotificationForAdmins: vi.fn(),
}));

vi.mock('@/lib/services/stt', () => ({
  extractInsightsFromStt: vi.fn(),
  validateSttTextSize: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const { pendingCallbacks: pendingAfterCallbacks, flush: flushAfterCallbacks, mockAfter } = vi.hoisted(() => {
  const pendingCallbacks: Promise<unknown>[] = [];
  const mockAfter = vi.fn((fn: () => void | Promise<unknown>) => {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      pendingCallbacks.push(result as Promise<unknown>);
    }
  });
  async function flush() {
    await Promise.all(pendingCallbacks);
    pendingCallbacks.length = 0;
  }
  return { pendingCallbacks, flush, mockAfter };
});
vi.mock('next/server', () => ({ after: mockAfter }));

// after() 콜백 추적 배열을 테스트 간에 정리하여 격리 보장
afterEach(() => {
  pendingAfterCallbacks.length = 0;
});

// ─── 테스트 헬퍼 ────────────────────────────────────────────────────────────

const USER_A_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_B_ID = '550e8400-e29b-41d4-a716-446655440002';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';


/** 유효한 인터뷰 데이터 (수동 저장용 엄격한 스키마) */
function validInterviewData() {
  return {
    interview_date: '2026-02-15',
    participants: [{ id: 'p1', name: '홍길동', position: '부장' }],
    company_details: { ai_experience: 'ChatGPT 사용 경험' },
    job_tasks: [{ id: 't1', task_name: '데이터 분석', task_description: '매출 데이터 분석 업무' }],
    pain_points: [{ id: 'pp1', description: '수작업 반복', severity: 'HIGH' as const }],
    constraints: [],
    improvement_goals: [{ id: 'g1', goal_description: '데이터 분석 자동화' }],
    notes: '',
    customer_requirements: '',
  };
}

/** 자동저장용 최소 데이터 (완화된 스키마) — 감사 이슈 #27 검증용 */
function minimalAutoSaveData() {
  return {
    interview_date: '',
    participants: [{ id: 'p1', name: '', position: '' }],
    company_details: { ai_experience: '' },
    job_tasks: [{ id: 't1', task_name: '', task_description: '' }],
    pain_points: [{ id: 'pp1', description: '', severity: 'MEDIUM' as const }],
    improvement_goals: [{ id: 'g1', goal_description: '' }],
    notes: '',
    customer_requirements: '',
  };
}

/** 자동저장 최초 insert 시나리오 공통 mock 설정 */
function setupAutoSaveFirstInsertMocks(
  serverMock: ReturnType<typeof createMockSupabase>,
  adminMock: ReturnType<typeof createMockSupabase>,
) {
  serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
  serverMock.addResult({
    data: { id: PROJECT_ID, status: 'ASSIGNED', assigned_consultant_id: USER_A_ID, company_name: '테스트', is_test_mode: false },
    error: null,
  });
  // existing interview → 없음
  adminMock.addResult({ data: null, error: null });
  // insert → 성공 (자동저장이므로 상태 전환/알림 없음)
  adminMock.addResult({ data: null, error: null });
}

// ─── saveInterview ──────────────────────────────────────────────────────────

describe('saveInterview', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await saveInterview(PROJECT_ID, validInterviewData());

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  // 감사 이슈 #23: verifyProjectAccess에서 CONSULTANT_APPROVED 아닌 역할 거부
  it('CONSULTANT_APPROVED 아닌 역할 → error 반환 (감사 #23)', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await saveInterview(PROJECT_ID, validInterviewData());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('ACTIVE 아닌 상태 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'INACTIVE' }, error: null });

    const result = await saveInterview(PROJECT_ID, validInterviewData());

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('배정되지 않은 프로젝트 → error 반환', async () => {
    // 1) role 조회 → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) project access (inline) → 없음 (다른 컨설턴트에게 배정)
    serverMock.addResult({ data: null, error: null });

    const result = await saveInterview(PROJECT_ID, validInterviewData());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('접근 권한');
  });

  it('Zod 검증 실패 (수동 저장, 참석자 이름 빈 값) → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { id: PROJECT_ID, status: 'ASSIGNED', assigned_consultant_id: USER_A_ID, company_name: '테스트', is_test_mode: false },
      error: null,
    });

    const invalidData = {
      ...validInterviewData(),
      participants: [{ id: 'p1', name: '' }], // 이름 빈 값 → 수동 저장에서 실패
    };

    const result = await saveInterview(PROJECT_ID, invalidData);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  // 감사 이슈 #27: 자동저장 시 완화된 스키마 적용 검증
  it('자동저장 시 완화된 스키마 적용 → 빈 값도 통과 (감사 #27)', async () => {
    setupAutoSaveFirstInsertMocks(serverMock, adminMock);

    const result = await saveInterview(PROJECT_ID, minimalAutoSaveData(), { autoSave: true });

    expect(result.success).toBe(true);
  });

  it('자동저장(최초 insert) 시 프로젝트 상태를 INTERVIEWED로 전환하지 않음', async () => {
    setupAutoSaveFirstInsertMocks(serverMock, adminMock);

    await saveInterview(PROJECT_ID, minimalAutoSaveData(), { autoSave: true });

    // admin client의 from('projects') 호출이 없어야 함 (상태 전환 스킵)
    const fromCalls = adminMock.client.from.mock.calls as string[][];
    const projectUpdateCalls = fromCalls.filter(
      (call) => call[0] === 'projects',
    );
    expect(projectUpdateCalls).toHaveLength(0);
  });

  it('자동저장(최초 insert) 시 운영관리자에게 알림을 보내지 않음', async () => {
    const { createNotificationForAdmins } = await import('@/lib/services/notification');
    setupAutoSaveFirstInsertMocks(serverMock, adminMock);

    await saveInterview(PROJECT_ID, minimalAutoSaveData(), { autoSave: true });

    expect(createNotificationForAdmins).not.toHaveBeenCalled();
  });

  it('수동 저장 시 엄격한 스키마 적용 → 빈 값 거부 (감사 #27 대조)', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { id: PROJECT_ID, status: 'ASSIGNED', assigned_consultant_id: USER_A_ID, company_name: '테스트', is_test_mode: false },
      error: null,
    });

    const result = await saveInterview(PROJECT_ID, minimalAutoSaveData());

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('최초 인터뷰 저장 (insert) → success + 상태 INTERVIEWED 전이', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    const { insertSystemActivityLog } = await import('@/lib/services/activity-log');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { id: PROJECT_ID, status: 'ASSIGNED', assigned_consultant_id: USER_A_ID, company_name: '테스트 기업', is_test_mode: false },
      error: null,
    });
    // existing interview → 없음 (maybeSingle)
    adminMock.addResult({ data: null, error: null });
    // interview insert → 성공
    adminMock.addResult({ data: null, error: null });
    // project status update → 성공
    adminMock.addResult({ data: null, error: null });

    const result = await saveInterview(PROJECT_ID, validInterviewData());
    await flushAfterCallbacks();

    expect(result).toEqual({ success: true });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'INTERVIEW_CREATE',
        targetType: 'interview',
        targetId: PROJECT_ID,
      }),
    );
    expect(insertSystemActivityLog).toHaveBeenCalledWith(
      PROJECT_ID,
      USER_A_ID,
      '인터뷰가 저장되었습니다.',
    );
  });

  it('인터뷰 수정 (update) → success + INTERVIEW_UPDATE 감사로그', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { id: PROJECT_ID, status: 'INTERVIEWED', assigned_consultant_id: USER_A_ID, company_name: '테스트 기업', is_test_mode: false },
      error: null,
    });
    // existing interview → 있음 (maybeSingle)
    adminMock.addResult({ data: { id: 'interview-1' }, error: null });
    // interview update → 성공
    adminMock.addResult({ data: null, error: null });

    const result = await saveInterview(PROJECT_ID, validInterviewData());

    expect(result).toEqual({ success: true });
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INTERVIEW_UPDATE' }),
    );
  });

  it('자동저장으로 생성된 인터뷰를 수동 저장(update)하면 프로젝트 상태가 INTERVIEWED로 전환됨', async () => {
    const { createNotificationForAdmins } = await import('@/lib/services/notification');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 프로젝트 상태가 아직 ASSIGNED (자동저장은 상태를 변경하지 않았으므로)
    serverMock.addResult({
      data: { id: PROJECT_ID, status: 'ASSIGNED', assigned_consultant_id: USER_A_ID, company_name: '테스트 기업', is_test_mode: false },
      error: null,
    });
    // existing interview → 있음 (자동저장이 이미 생성)
    adminMock.addResult({ data: { id: 'interview-1' }, error: null });
    // interview update → 성공
    adminMock.addResult({ data: null, error: null });
    // project status update → 성공
    adminMock.addResult({ data: null, error: null });

    const result = await saveInterview(PROJECT_ID, validInterviewData());

    expect(result).toEqual({ success: true });
    // 프로젝트 상태가 INTERVIEWED로 전환되어야 함
    const fromCalls = adminMock.client.from.mock.calls as string[][];
    const projectUpdateCalls = fromCalls.filter((call) => call[0] === 'projects');
    expect(projectUpdateCalls.length).toBeGreaterThanOrEqual(1);
    // 알림도 발송되어야 함
    expect(createNotificationForAdmins).toHaveBeenCalled();
  });

  it('자동저장 모드에서는 활동 일지를 기록하지 않음', async () => {
    const { insertSystemActivityLog } = await import('@/lib/services/activity-log');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { id: PROJECT_ID, status: 'INTERVIEWED', assigned_consultant_id: USER_A_ID, company_name: '테스트', is_test_mode: false },
      error: null,
    });
    adminMock.addResult({ data: { id: 'interview-1' }, error: null });
    adminMock.addResult({ data: null, error: null });

    await saveInterview(PROJECT_ID, validInterviewData(), { autoSave: true });

    expect(insertSystemActivityLog).not.toHaveBeenCalled();
  });

  it('DB insert 실패 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { id: PROJECT_ID, status: 'ASSIGNED', assigned_consultant_id: USER_A_ID, company_name: '테스트', is_test_mode: false },
      error: null,
    });
    adminMock.addResult({ data: null, error: null }); // no existing
    adminMock.addResult({ data: null, error: { message: 'insert_error' } }); // insert 실패
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await saveInterview(PROJECT_ID, validInterviewData());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('저장');
    consoleSpy.mockRestore();
  });

  it('기존 인터뷰 조회 에러 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { id: PROJECT_ID, status: 'ASSIGNED', assigned_consultant_id: USER_A_ID, company_name: '테스트', is_test_mode: false },
      error: null,
    });
    // maybeSingle 에러
    adminMock.addResult({ data: null, error: { message: 'db_error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await saveInterview(PROJECT_ID, validInterviewData());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('확인');
    consoleSpy.mockRestore();
  });
});

// ─── fetchInterview ─────────────────────────────────────────────────────────

describe('fetchInterview', () => {
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

    const result = await fetchInterview(PROJECT_ID);

    expect(result).toBeNull();
  });

  it('배정되지 않은 프로젝트 → null 반환', async () => {
    // 1) requireAuth: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) project access → 다른 컨설턴트에게 배정
    serverMock.addResult({
      data: { assigned_consultant_id: USER_B_ID },
      error: null,
    });

    const result = await fetchInterview(PROJECT_ID);

    expect(result).toBeNull();
  });

  it('정상 조회 → 인터뷰 데이터 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // project access → 본인에게 배정
    serverMock.addResult({
      data: { assigned_consultant_id: USER_A_ID },
      error: null,
    });
    // interview 조회
    serverMock.addResult({
      data: {
        id: 'interview-1',
        project_id: PROJECT_ID,
        interview_date: '2026-02-15',
        participants: [{ id: 'p1', name: '홍길동' }],
      },
      error: null,
    });

    const result = await fetchInterview(PROJECT_ID);

    expect(result).toBeTruthy();
    expect(result?.id).toBe('interview-1');
  });

  it('프로젝트 조회 실패 → null 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // project → null (not found)
    serverMock.addResult({ data: null, error: null });

    const result = await fetchInterview(PROJECT_ID);

    expect(result).toBeNull();
  });
});

// ─── processSttFile ─────────────────────────────────────────────────────────

describe('processSttFile', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await processSttFile(PROJECT_ID, '텍스트');

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  // 감사 이슈 #23: verifyProjectAccess 역할 체크
  it('CONSULTANT_APPROVED 아닌 역할 → error 반환 (감사 #23)', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await processSttFile(PROJECT_ID, '텍스트');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('배정되지 않은 프로젝트 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: null, error: null }); // project access fail

    const result = await processSttFile(PROJECT_ID, '텍스트');

    expect(result.success).toBe(false);
  });

  it('파일 크기 초과 → error 반환', async () => {
    const { validateSttTextSize } = await import('@/lib/services/stt');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(validateSttTextSize).mockReturnValue({
      valid: false,
      error: '파일 크기가 너무 큽니다.',
    });

    const result = await processSttFile(PROJECT_ID, '아주 긴 텍스트...');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('크기');
  });

  it('정상 처리 → success + 인사이트 반환', async () => {
    const { validateSttTextSize, extractInsightsFromStt } = await import('@/lib/services/stt');
    const { createAuditLog } = await import('@/lib/services/audit');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });

    vi.mocked(validateSttTextSize).mockReturnValue({ valid: true });

    const mockInsights = {
      추가_업무: ['추가 업무1'],
      추가_페인포인트: ['페인포인트1'],
      숨은_니즈: [],
      조직_맥락: '맥락',
      AI_태도: '긍정적',
      주요_인용: [],
    };
    vi.mocked(extractInsightsFromStt).mockResolvedValue(mockInsights);

    // admin: update stt_insights
    adminMock.addResult({ data: null, error: null });

    const result = await processSttFile(PROJECT_ID, '인터뷰 녹취록 텍스트');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockInsights);
    }
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'INTERVIEW_UPDATE',
        meta: expect.objectContaining({ stt_processed: true }),
      }),
    );
  });

  it('DB 저장 실패 → error 반환', async () => {
    const { validateSttTextSize, extractInsightsFromStt } = await import('@/lib/services/stt');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(validateSttTextSize).mockReturnValue({ valid: true });
    vi.mocked(extractInsightsFromStt).mockResolvedValue({});

    // admin: update 실패
    adminMock.addResult({ data: null, error: { message: 'update_error' } });

    const result = await processSttFile(PROJECT_ID, '텍스트');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('저장');
  });
});

// ─── deleteSttInsights ──────────────────────────────────────────────────────

describe('deleteSttInsights', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await deleteSttInsights(PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });

    const result = await deleteSttInsights(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('DB 삭제(null 업데이트) 실패 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({ data: null, error: { message: 'update_error' } });

    const result = await deleteSttInsights(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('삭제');
  });

  it('정상 삭제 → success', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({ data: null, error: null });

    const result = await deleteSttInsights(PROJECT_ID);

    expect(result).toEqual({ success: true });
  });
});
