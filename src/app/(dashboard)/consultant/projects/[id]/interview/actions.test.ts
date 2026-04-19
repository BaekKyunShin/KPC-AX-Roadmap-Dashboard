/**
 * consultant/projects/[id]/interview/actions.ts 테스트
 *
 * 테스트 대상:
 * - fetchInterview: 인터뷰 조회 (인증/프로젝트 배정 검증)
 * - processSttFile: STT 처리 (인증/역할/크기검증/LLM)
 * - deleteSttInsights: STT 인사이트 삭제
 *
 * 감사 이슈:
 * - #23: verifyProjectAccess 역할 체크 — CONSULTANT_APPROVED 아닌 역할 거부 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
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


describe('fetchInterview — 에러/엣지 케이스', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인터뷰 없는 프로젝트 → null 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { assigned_consultant_id: USER_A_ID }, error: null });
    // interviews 조회 → null (인터뷰 없음)
    serverMock.addResult({ data: null, error: { code: 'PGRST116' } });

    const result = await fetchInterview(PROJECT_ID);

    // 에러가 발생해도 catch에서 null 반환
    expect(result).toBeNull();
  });

  it('예외 발생 → null 반환 (catch 처리)', async () => {
    // createClient가 throw
    vi.mocked(createClient).mockRejectedValueOnce(new Error('connection error'));

    const result = await fetchInterview(PROJECT_ID);

    expect(result).toBeNull();
  });
});

describe('processSttFile — 에러/엣지 케이스', () => {
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

  it('LLM 호출 예외 → catch 블록에서 에러 반환', async () => {
    const { validateSttTextSize, extractInsightsFromStt } = await import('@/lib/services/stt');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(validateSttTextSize).mockReturnValue({ valid: true });
    vi.mocked(extractInsightsFromStt).mockRejectedValue(new Error('LLM timeout'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await processSttFile(PROJECT_ID, '텍스트');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('STT 처리');
    consoleSpy.mockRestore();
  });

  it('after() 콜백에서 감사로그 actorUserId 전달 확인', async () => {
    const { validateSttTextSize, extractInsightsFromStt } = await import('@/lib/services/stt');
    const { createAuditLog } = await import('@/lib/services/audit');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(validateSttTextSize).mockReturnValue({ valid: true });
    vi.mocked(extractInsightsFromStt).mockResolvedValue({ 숨은_니즈: ['니즈1'] });
    adminMock.addResult({ data: null, error: null });

    await processSttFile(PROJECT_ID, '텍스트');
    await flushAfterCallbacks();

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: USER_A_ID,
        targetId: PROJECT_ID,
        meta: expect.objectContaining({ stt_processed: true }),
      }),
    );
  });
});

describe('deleteSttInsights — 에러/엣지 케이스', () => {
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

  it('배정되지 않은 프로젝트 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: null, error: null }); // project access fail

    const result = await deleteSttInsights(PROJECT_ID);

    expect(result.success).toBe(false);
  });

  it('예외 발생 → catch 블록에서 에러 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('admin unavailable');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await deleteSttInsights(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('삭제');
    consoleSpy.mockRestore();
  });
});
