/**
 * consultant/projects/[id]/actions.ts 테스트
 *
 * 테스트 대상:
 * - fetchActivityLogs: 활동 일지 조회 (인증, 데이터, 에러 처리)
 * - createActivityLog: 활동 일지 생성 (인증/역할/프로젝트접근/Zod/DB)
 * - updateActivityLog: 활동 일지 수정 (소유권/system_auto 방어)
 * - deleteActivityLog: 활동 일지 삭제 (소유권/system_auto 방어)
 * - generateInterviewGuide: 인터뷰 가이드 생성 (쿼터/프로젝트/LLM)
 * - updateInterviewGuideQuestions: 가이드 질문 업데이트 (Zod/DB)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchActivityLogs,
  createActivityLog,
  updateActivityLog,
  deleteActivityLog,
  generateInterviewGuide,
  updateInterviewGuideQuestions,
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

vi.mock('@/lib/services/quota', () => ({
  checkAndRecordLLMUsage: vi.fn(),
}));

vi.mock('@/lib/services/interview-guide', () => ({
  generateInterviewGuideData: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ─── 테스트 헬퍼 ────────────────────────────────────────────────────────────

const USER_A_ID = '550e8400-e29b-41d4-a716-446655440001';
const USER_B_ID = '550e8400-e29b-41d4-a716-446655440002';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';
const LOG_ID = '550e8400-e29b-41d4-a716-446655440030';


// ─── fetchActivityLogs ──────────────────────────────────────────────────────

describe('fetchActivityLogs', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증되지 않은 사용자 → 빈 결과 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await fetchActivityLogs(PROJECT_ID);

    expect(result).toEqual({ logs: [], total: 0 });
  });

  it('정상 조회 → 활동 로그 목록 반환', async () => {
    // 1) requireAuth: role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) 활동 로그 쿼리
    serverMock.addResult({
      data: [
        { id: 'log-1', project_id: PROJECT_ID, consultant_id: USER_A_ID, type: 'field_note', content: '현장 메모', created_at: '2026-01-01', updated_at: '2026-01-01' },
        { id: 'log-2', project_id: PROJECT_ID, consultant_id: USER_A_ID, type: 'pre_research', content: '사전 조사', created_at: '2026-01-02', updated_at: '2026-01-02' },
      ],
      error: null,
      count: 2,
    });

    const result = await fetchActivityLogs(PROJECT_ID);

    expect(result.logs).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('DB 에러 → 빈 결과 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: null, error: { message: 'DB error' }, count: null });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await fetchActivityLogs(PROJECT_ID);

    expect(result).toEqual({ logs: [], total: 0 });
    consoleSpy.mockRestore();
  });
});

// ─── createActivityLog ──────────────────────────────────────────────────────

describe('createActivityLog', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await createActivityLog(PROJECT_ID, 'field_note', '테스트 내용');

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error 반환', async () => {
    // requireAuthWithRole: role 조회 → OPS_ADMIN (불허)
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await createActivityLog(PROJECT_ID, 'field_note', '테스트 내용');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('배정되지 않은 프로젝트 → error 반환', async () => {
    // 1) role 조회 → CONSULTANT_APPROVED
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) project access → 배정 안 됨
    serverMock.addResult({ data: null, error: null });

    const result = await createActivityLog(PROJECT_ID, 'field_note', '테스트 내용');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('배정');
  });

  it('Zod 검증 실패 (빈 내용) → error 반환', async () => {
    // 1) role 조회
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // 2) project access
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });

    const result = await createActivityLog(PROJECT_ID, 'field_note', '');

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('Zod 검증 실패 (잘못된 유형) → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await createActivityLog(PROJECT_ID, 'invalid_type' as any, '테스트 내용');

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('DB insert 실패 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // admin insert 실패
    adminMock.addResult({ data: null, error: { message: 'insert_error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createActivityLog(PROJECT_ID, 'field_note', '테스트 내용');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('저장');
    consoleSpy.mockRestore();
  });

  it('정상 생성 → success', async () => {
    const { revalidatePath } = await import('next/cache');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({ data: null, error: null });

    const result = await createActivityLog(PROJECT_ID, 'field_note', '현장 메모 내용');

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith(`/consultant/projects/${PROJECT_ID}`);
  });
});

// ─── updateActivityLog ──────────────────────────────────────────────────────

describe('updateActivityLog', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await updateActivityLog(LOG_ID, PROJECT_ID, '수정 내용');

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('Zod 검증 실패 (빈 내용) → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });

    const result = await updateActivityLog(LOG_ID, PROJECT_ID, '');

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('타인의 로그 수정 시도 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // verifyManualLogOwnership: 다른 사용자의 로그
    adminMock.addResult({
      data: { id: LOG_ID, consultant_id: USER_B_ID, type: 'field_note' },
      error: null,
    });

    const result = await updateActivityLog(LOG_ID, PROJECT_ID, '수정 내용');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('본인');
  });

  it('system_auto 로그 수정 시도 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // verifyManualLogOwnership: 시스템 자동 기록
    adminMock.addResult({
      data: { id: LOG_ID, consultant_id: USER_A_ID, type: 'system_auto' },
      error: null,
    });

    const result = await updateActivityLog(LOG_ID, PROJECT_ID, '수정 내용');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('시스템');
  });

  it('존재하지 않는 로그 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({ data: null, error: null });

    const result = await updateActivityLog(LOG_ID, PROJECT_ID, '수정 내용');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('찾을 수 없습니다');
  });

  it('정상 수정 → success', async () => {
    const { revalidatePath } = await import('next/cache');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // ownership check
    adminMock.addResult({
      data: { id: LOG_ID, consultant_id: USER_A_ID, type: 'field_note' },
      error: null,
    });
    // update
    adminMock.addResult({ data: null, error: null });

    const result = await updateActivityLog(LOG_ID, PROJECT_ID, '수정된 내용');

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith(`/consultant/projects/${PROJECT_ID}`);
  });
});

// ─── deleteActivityLog ──────────────────────────────────────────────────────

describe('deleteActivityLog', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await deleteActivityLog(LOG_ID, PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('타인의 로그 삭제 시도 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({
      data: { id: LOG_ID, consultant_id: USER_B_ID, type: 'field_note' },
      error: null,
    });

    const result = await deleteActivityLog(LOG_ID, PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('본인');
  });

  it('system_auto 로그 삭제 시도 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({
      data: { id: LOG_ID, consultant_id: USER_A_ID, type: 'system_auto' },
      error: null,
    });

    const result = await deleteActivityLog(LOG_ID, PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('시스템');
  });

  it('DB 삭제 실패 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({
      data: { id: LOG_ID, consultant_id: USER_A_ID, type: 'field_note' },
      error: null,
    });
    adminMock.addResult({ data: null, error: { message: 'delete_error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await deleteActivityLog(LOG_ID, PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('삭제');
    consoleSpy.mockRestore();
  });

  it('정상 삭제 → success', async () => {
    const { revalidatePath } = await import('next/cache');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({
      data: { id: LOG_ID, consultant_id: USER_A_ID, type: 'field_note' },
      error: null,
    });
    adminMock.addResult({ data: null, error: null });

    const result = await deleteActivityLog(LOG_ID, PROJECT_ID);

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith(`/consultant/projects/${PROJECT_ID}`);
  });
});

// ─── generateInterviewGuide ────────────────────────────────────────────────

describe('generateInterviewGuide', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await generateInterviewGuide(PROJECT_ID);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await generateInterviewGuide(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('컨설턴트');
  });

  it('LLM 쿼터 초과 → error 반환', async () => {
    const { checkAndRecordLLMUsage } = await import('@/lib/services/quota');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({
      exceeded: true,
      message: '일별 LLM 호출 한도를 초과했습니다.',
    });

    const result = await generateInterviewGuide(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('한도');
  });

  it('프로젝트 없음 → error 반환', async () => {
    const { checkAndRecordLLMUsage } = await import('@/lib/services/quota');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false, message: undefined });
    // 프로젝트 데이터 없음
    serverMock.addResult({ data: null, error: null });

    const result = await generateInterviewGuide(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('프로젝트');
  });

  it('자가진단 미완료 → error 반환', async () => {
    const { checkAndRecordLLMUsage } = await import('@/lib/services/quota');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false, message: undefined });
    // 프로젝트 데이터 있으나 self_assessments = null
    serverMock.addResult({
      data: {
        company_name: '테스트 기업',
        industry: '제조업',
        company_size: '50-299',
        customer_comment: '',
        self_assessments: null,
      },
      error: null,
    });

    const result = await generateInterviewGuide(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('자가진단');
  });

  it('정상 생성 → success + 가이드 데이터 반환', async () => {
    const { checkAndRecordLLMUsage } = await import('@/lib/services/quota');
    const { generateInterviewGuideData } = await import('@/lib/services/interview-guide');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false, message: undefined });

    // 프로젝트 + 자가진단 데이터
    serverMock.addResult({
      data: {
        company_name: '테스트 기업',
        industry: '제조업',
        company_size: '50-299',
        customer_comment: '코멘트',
        self_assessments: {
          scores: { total_score: 30, max_possible_score: 50 },
          answers: [{ question_id: 'q1', answer_value: 4 }],
          template: {
            questions: [{ id: 'q1', order: 1, dimension: 'infra', question_text: '질문1', weight: 2 }],
          },
        },
      },
      error: null,
    });

    const mockGuideData = {
      company_summary: '기업 요약',
      key_points: [
        { dimension: 'infra', score_percent: 60, status: 'warning' as const, insight: '인프라 부족' },
      ],
      questions: [
        { id: 'q1', dimension: 'infra', question: '질문1?', intent: '의도', checked: false, is_custom: false },
      ],
      cautions: ['주의사항1'],
    };
    vi.mocked(generateInterviewGuideData).mockResolvedValue(mockGuideData);

    // admin upsert 성공
    adminMock.addResult({ data: null, error: null });

    const result = await generateInterviewGuide(PROJECT_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockGuideData);
    }
  });

  it('DB upsert 실패 → error 반환', async () => {
    const { checkAndRecordLLMUsage } = await import('@/lib/services/quota');
    const { generateInterviewGuideData } = await import('@/lib/services/interview-guide');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false, message: undefined });

    serverMock.addResult({
      data: {
        company_name: '테스트 기업',
        industry: '제조업',
        company_size: '50-299',
        customer_comment: '',
        self_assessments: {
          scores: { total_score: 30, max_possible_score: 50 },
          answers: [],
          template: { questions: [] },
        },
      },
      error: null,
    });

    vi.mocked(generateInterviewGuideData).mockResolvedValue({
      company_summary: '기업 요약',
      key_points: [{ dimension: 'infra', score_percent: 60, status: 'warning' as const, insight: '인프라' }],
      questions: [{ id: 'q1', dimension: 'infra', question: '질문?', intent: '의도', checked: false, is_custom: false }],
      cautions: ['주의'],
    });

    // admin upsert 실패
    adminMock.addResult({ data: null, error: { message: 'upsert_error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await generateInterviewGuide(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('저장');
    consoleSpy.mockRestore();
  });
});

// ─── updateInterviewGuideQuestions ──────────────────────────────────────────

describe('updateInterviewGuideQuestions', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  const validQuestions = [
    { id: 'q1', dimension: 'infra', question: '질문1?', intent: '의도1', checked: true, is_custom: false },
  ];

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인증되지 않은 사용자 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await updateInterviewGuideQuestions(PROJECT_ID, validQuestions);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('Zod 검증 실패 (빈 질문 배열) → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });

    const result = await updateInterviewGuideQuestions(PROJECT_ID, []);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('기존 가이드 없음 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // admin: 기존 가이드 조회 → 없음
    adminMock.addResult({ data: null, error: null });

    const result = await updateInterviewGuideQuestions(PROJECT_ID, validQuestions);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('가이드');
  });

  it('정상 업데이트 → success', async () => {
    const { revalidatePath } = await import('next/cache');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // 기존 가이드 조회
    adminMock.addResult({
      data: {
        id: 'guide-1',
        guide_data: {
          company_summary: '기존 요약',
          key_points: [],
          questions: [],
          cautions: [],
        },
      },
      error: null,
    });
    // update
    adminMock.addResult({ data: null, error: null });

    const result = await updateInterviewGuideQuestions(PROJECT_ID, validQuestions);

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith(`/consultant/projects/${PROJECT_ID}`);
  });

  it('DB update 실패 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({
      data: { id: 'guide-1', guide_data: { company_summary: '요약', key_points: [], questions: [], cautions: [] } },
      error: null,
    });
    adminMock.addResult({ data: null, error: { message: 'update_error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await updateInterviewGuideQuestions(PROJECT_ID, validQuestions);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('업데이트');
    consoleSpy.mockRestore();
  });
});

// ─── 추가 에지 케이스 ──────────────────────────────────────────────────────

describe('fetchActivityLogs — 추가 에지 케이스', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('type 필터 적용 시 eq(type) 호출 확인', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: [], error: null, count: 0 });

    await fetchActivityLogs(PROJECT_ID, { type: 'field_note' });

    expect(serverMock.chainable.eq).toHaveBeenCalledWith('type', 'field_note');
  });

  it('custom limit/offset 적용 확인', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: [], error: null, count: 0 });

    await fetchActivityLogs(PROJECT_ID, { limit: 5, offset: 10 });

    expect(serverMock.chainable.range).toHaveBeenCalledWith(10, 14); // offset + limit - 1
  });

  it('data null → 빈 배열 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: null, error: null, count: 0 });

    const result = await fetchActivityLogs(PROJECT_ID);

    expect(result.logs).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('count null → total 0 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: [{ id: 'log-1' }], error: null, count: null });

    const result = await fetchActivityLogs(PROJECT_ID);

    expect(result.total).toBe(0);
  });
});

describe('createActivityLog — 추가 에지 케이스', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('예외 발생 시 알 수 없는 오류 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // adminClient.from이 예외를 던지도록 설정
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('unexpected');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createActivityLog(PROJECT_ID, 'field_note', '내용');

    expect(result).toEqual({
      success: false,
      error: '알 수 없는 오류가 발생했습니다.',
    });
    consoleSpy.mockRestore();
  });

  it('pre_research 타입으로 생성 성공', async () => {
    const { revalidatePath } = await import('next/cache');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({ data: null, error: null });

    const result = await createActivityLog(PROJECT_ID, 'pre_research', '사전 조사 내용');

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith(`/consultant/projects/${PROJECT_ID}`);
  });
});

describe('updateActivityLog — 추가 에지 케이스', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('DB update 실패 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // ownership check 통과
    adminMock.addResult({
      data: { id: LOG_ID, consultant_id: USER_A_ID, type: 'field_note' },
      error: null,
    });
    // update 실패
    adminMock.addResult({ data: null, error: { message: 'update_error' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await updateActivityLog(LOG_ID, PROJECT_ID, '수정 내용');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('수정');
    consoleSpy.mockRestore();
  });

  it('예외 발생 시 알 수 없는 오류 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // createAdminClient가 예외를 던짐
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('unexpected');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await updateActivityLog(LOG_ID, PROJECT_ID, '수정 내용');

    expect(result).toEqual({
      success: false,
      error: '알 수 없는 오류가 발생했습니다.',
    });
    consoleSpy.mockRestore();
  });
});

describe('deleteActivityLog — 추가 에지 케이스', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('존재하지 않는 로그 삭제 시도 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // ownership check → not found
    adminMock.addResult({ data: null, error: null });

    const result = await deleteActivityLog(LOG_ID, PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('찾을 수 없습니다');
  });

  it('예외 발생 시 알 수 없는 오류 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('unexpected');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await deleteActivityLog(LOG_ID, PROJECT_ID);

    expect(result).toEqual({
      success: false,
      error: '알 수 없는 오류가 발생했습니다.',
    });
    consoleSpy.mockRestore();
  });

  it('소프트 삭제 — update(deleted_at) 호출 확인', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    adminMock.addResult({
      data: { id: LOG_ID, consultant_id: USER_A_ID, type: 'field_note' },
      error: null,
    });
    adminMock.addResult({ data: null, error: null });

    await deleteActivityLog(LOG_ID, PROJECT_ID);

    // update가 deleted_at 필드를 포함하여 호출되었는지 확인
    const updateCalls = adminMock.chainable.update.mock.calls;
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    const lastUpdateArg = updateCalls[updateCalls.length - 1][0];
    expect(lastUpdateArg).toHaveProperty('deleted_at');
    expect(typeof lastUpdateArg.deleted_at).toBe('string');
  });
});

describe('generateInterviewGuide — 추가 에지 케이스', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('자가진단 scores가 null → error 반환', async () => {
    const { checkAndRecordLLMUsage } = await import('@/lib/services/quota');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false, message: undefined });

    serverMock.addResult({
      data: {
        company_name: '테스트 기업',
        industry: '제조업',
        company_size: '50-299',
        customer_comment: '',
        self_assessments: {
          scores: null, // scores가 null
          answers: [],
          template: { questions: [] },
        },
      },
      error: null,
    });

    const result = await generateInterviewGuide(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('점수 데이터');
  });

  it('LLM 출력이 Zod 검증 실패 → error 반환', async () => {
    const { checkAndRecordLLMUsage } = await import('@/lib/services/quota');
    const { generateInterviewGuideData } = await import('@/lib/services/interview-guide');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false, message: undefined });

    serverMock.addResult({
      data: {
        company_name: '테스트 기업',
        industry: '제조업',
        company_size: '50-299',
        customer_comment: '',
        self_assessments: {
          scores: { total_score: 30, max_possible_score: 50 },
          answers: [],
          template: { questions: [] },
        },
      },
      error: null,
    });

    // LLM 출력이 잘못된 형식
    vi.mocked(generateInterviewGuideData).mockResolvedValue({
      // company_summary 누락 → Zod 검증 실패
    } as never);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await generateInterviewGuide(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('형식');
    consoleSpy.mockRestore();
  });

  it('LLM 호출 예외 발생 → AI 분석 오류 반환', async () => {
    const { checkAndRecordLLMUsage } = await import('@/lib/services/quota');
    const { generateInterviewGuideData } = await import('@/lib/services/interview-guide');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false, message: undefined });

    serverMock.addResult({
      data: {
        company_name: '테스트 기업',
        industry: '제조업',
        company_size: '50-299',
        customer_comment: '',
        self_assessments: {
          scores: { total_score: 30, max_possible_score: 50 },
          answers: [],
          template: { questions: [] },
        },
      },
      error: null,
    });

    vi.mocked(generateInterviewGuideData).mockRejectedValue(new Error('토큰 한도 초과'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await generateInterviewGuide(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('AI 분석');
    consoleSpy.mockRestore();
  });

  it('쿼터 초과 시 message가 없으면 기본 메시지 사용', async () => {
    const { checkAndRecordLLMUsage } = await import('@/lib/services/quota');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({
      exceeded: true,
      message: undefined, // 메시지 없음
    });

    const result = await generateInterviewGuide(PROJECT_ID);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('한도');
  });
});

describe('updateInterviewGuideQuestions — 추가 에지 케이스', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  const validQuestions = [
    { id: 'q1', dimension: 'infra', question: '질문1?', intent: '의도1', checked: true, is_custom: false },
  ];

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('예외 발생 시 알 수 없는 오류 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('unexpected');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await updateInterviewGuideQuestions(PROJECT_ID, validQuestions);

    expect(result).toEqual({
      success: false,
      error: '알 수 없는 오류가 발생했습니다.',
    });
    consoleSpy.mockRestore();
  });

  it('기존 guide_data의 다른 필드를 보존하며 questions만 업데이트', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PROJECT_ID }, error: null });
    // 기존 가이드 조회 — company_summary, key_points, cautions 보존 확인
    adminMock.addResult({
      data: {
        id: 'guide-1',
        guide_data: {
          company_summary: '기존 요약 보존됨',
          key_points: [{ dimension: 'infra', score_percent: 50, status: 'warning', insight: '인프라' }],
          questions: [{ id: 'old-q', dimension: 'old', question: '옛 질문', intent: '의도', checked: false, is_custom: false }],
          cautions: ['기존 주의사항'],
        },
      },
      error: null,
    });
    // update 성공
    adminMock.addResult({ data: null, error: null });

    await updateInterviewGuideQuestions(PROJECT_ID, validQuestions);

    // update 호출 인자에서 guide_data 확인
    const updateCalls = adminMock.chainable.update.mock.calls;
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    const updatedData = updateCalls[updateCalls.length - 1][0];
    expect(updatedData.guide_data.company_summary).toBe('기존 요약 보존됨');
    expect(updatedData.guide_data.cautions).toEqual(['기존 주의사항']);
    expect(updatedData.guide_data.questions).toEqual(validQuestions);
  });
});
