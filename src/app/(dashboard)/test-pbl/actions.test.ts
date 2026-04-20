/**
 * test-pbl/actions.ts 테스트
 *
 * 테스트 대상:
 * - generateTestPBL: 테스트 PBL 생성 (인증/역할/Zod/프로젝트생성/인터뷰저장/LLM/after 콜백)
 * - cancelTestPBLGeneration: 생성 취소 (인증/cancelAbort)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTestPBL, cancelTestPBLGeneration } from './actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ───────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@/lib/services/pbl/pbl-generator', () => ({
  generatePBLContent: vi.fn().mockResolvedValue({
    content: {
      background: {},
      subject_profile: {},
      course_evaluation: {},
      operational_plan: {},
    },
  }),
  PBLGenerationError: class PBLGenerationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PBLGenerationError';
    }
  },
}));

// pblInterviewSchema: course_name이 있으면 통과, 없으면 실패
vi.mock('@/lib/schemas/interview-pbl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/schemas/interview-pbl')>();
  return {
    ...actual,
    pblInterviewSchema: {
      safeParse: vi.fn((data: unknown) => {
        if (data && typeof data === 'object' && 'courseOverview' in data) {
          const d = data as { courseOverview?: { course_name?: string } };
          if (d.courseOverview?.course_name) {
            return { success: true, data };
          }
        }
        return {
          success: false,
          error: { errors: [{ message: 'Required' }] },
        };
      }),
    },
  };
});

vi.mock('@/lib/services/pbl/pbl-crud', () => ({
  createDraftVersion: vi.fn().mockResolvedValue({ id: 'test-draft-id', version_number: 1 }),
}));

const { mockAfter } = vi.hoisted(() => {
  const mockAfter = vi.fn((fn: () => void | Promise<unknown>) => {
    fn();
  });
  return { mockAfter };
});
vi.mock('next/server', () => ({ after: mockAfter }));

// ─── 테스트 상수 ──────────────────────────────────────────────────────────────

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';

/** pblInterviewSchema 최소 유효 데이터 */
const VALID_INTERVIEW_DATA = {
  courseOverview: {
    course_name: 'AI PBL 과정',
    training_job: '제조 직무',
    training_hours: 16,
    trainee_count: 10,
    ai_level: 'AI기초형',
    training_goals: ['기술문제 해결'],
    company_name: '테스트기업',
    industry_main: '제조업',
    contact: { name: '홍길동', email: 'test@example.com', phone: '010-1234-5678' },
  },
  trainingEnvironment: {},
  targetTasks: {},
  problemDefinition: {},
  learningProcess: {},
};

/** 생성된 프로젝트 mock row */
const MOCK_PROJECT_ROW = {
  id: PROJECT_ID,
  company_name: '[테스트] 테스트기업',
  status: 'INTERVIEWED',
  track: 'PBL',
  is_test_mode: true,
};

// ─── generateTestPBL 테스트 ───────────────────────────────────────────────────

describe('generateTestPBL', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_ID } });
    adminMock = createMockSupabase({});
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateTestPBL(VALID_INTERVIEW_DATA as any);
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('허용되지 않은 역할(USER_PENDING) → error', async () => {
    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateTestPBL(VALID_INTERVIEW_DATA as any);
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('pblInterviewSchema Zod 검증 실패 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    // 필수 필드 누락 (courseOverview.course_name 없음)
    const invalidInput = { courseOverview: { training_job: '직무' } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateTestPBL(invalidInput as any);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('검증 실패');
  });

  it('프로젝트 생성 실패 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // admin: projects.insert → error
    adminMock.addResult({ data: null, error: { message: 'insert failed' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateTestPBL(VALID_INTERVIEW_DATA as any);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('프로젝트 생성');
    consoleSpy.mockRestore();
  });

  it('인터뷰 저장 실패 → error 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // admin: projects.insert → 성공
    adminMock.addResult({ data: MOCK_PROJECT_ROW, error: null });
    // admin: interviews.insert → error
    adminMock.addResult({ data: null, error: { message: 'interview insert failed' } });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateTestPBL(VALID_INTERVIEW_DATA as any);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('인터뷰 저장');
    consoleSpy.mockRestore();
  });

  it('LLM 에러 → 사용자 친화 에러 반환', async () => {
    const { generatePBLContent } = await import('@/lib/services/pbl/pbl-generator');
    vi.mocked(generatePBLContent).mockRejectedValueOnce(new Error('LLM timeout'));

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: MOCK_PROJECT_ROW, error: null });
    adminMock.addResult({ data: null, error: null }); // interviews insert 성공
    adminMock.addResult({ data: null, error: null }); // consultant_profiles 조회

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateTestPBL(VALID_INTERVIEW_DATA as any);
    expect(result.success).toBe(false);
    consoleSpy.mockRestore();
  });

  it('PBLGenerationError → 에러 메시지 반환', async () => {
    const { generatePBLContent, PBLGenerationError } = await import('@/lib/services/pbl/pbl-generator');
    vi.mocked(generatePBLContent).mockRejectedValueOnce(
      new PBLGenerationError('PBL 생성 한도 초과'),
    );

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: MOCK_PROJECT_ROW, error: null });
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: null, error: null });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateTestPBL(VALID_INTERVIEW_DATA as any);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain('한도 초과');
    consoleSpy.mockRestore();
  });

  it('성공 → pblId + projectId 반환 + after 콜백 감사로그', async () => {
    const { createDraftVersion } = await import('@/lib/services/pbl/pbl-crud');
    const { createAuditLog } = await import('@/lib/services/audit');
    vi.mocked(createDraftVersion).mockResolvedValueOnce({ id: 'test-draft-id', version_number: 1 } as never);

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: MOCK_PROJECT_ROW, error: null });         // projects.insert
    adminMock.addResult({ data: null, error: null });                     // interviews.insert
    adminMock.addResult({ data: null, error: null });                     // consultant_profiles 조회
    adminMock.addResult({ data: null, error: null });                     // projects.update

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateTestPBL(VALID_INTERVIEW_DATA as any);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pblId).toBe('test-draft-id');
      expect(result.data.projectId).toBe(PROJECT_ID);
    }
    expect(mockAfter).toHaveBeenCalled();
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TEST_PROJECT_CREATE',
        meta: expect.objectContaining({ is_test_mode: true, track: 'PBL' }),
      }),
    );
  });

  it('OPS_ADMIN 역할도 허용 → success', async () => {
    const { createDraftVersion } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(createDraftVersion).mockResolvedValueOnce({ id: 'ops-draft-id', version_number: 1 } as never);

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: MOCK_PROJECT_ROW, error: null });
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: null, error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateTestPBL(VALID_INTERVIEW_DATA as any);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pblId).toBe('ops-draft-id');
  });

  it('SYSTEM_ADMIN 역할도 허용 → success', async () => {
    const { createDraftVersion } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(createDraftVersion).mockResolvedValueOnce({ id: 'sys-draft-id', version_number: 1 } as never);

    serverMock.addResult({ data: { role: 'SYSTEM_ADMIN', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: MOCK_PROJECT_ROW, error: null });
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: null, error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateTestPBL(VALID_INTERVIEW_DATA as any);
    expect(result.success).toBe(true);
  });

  it('courseOverview 선택 필드 없을 때 fallback 사용 (company_name, training_job 빈값)', async () => {
    // 빈 company_name, training_job으로 폴백 브랜치 커버
    const { createDraftVersion } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(createDraftVersion).mockResolvedValueOnce({ id: 'fallback-draft', version_number: 1 } as never);

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: MOCK_PROJECT_ROW, error: null });
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: null, error: null });

    const inputWithEmpty = {
      ...VALID_INTERVIEW_DATA,
      courseOverview: {
        ...VALID_INTERVIEW_DATA.courseOverview,
        company_name: '',          // 폴백: '샘플기업'
        industry_main: '',         // 폴백: '제조업'
        training_job: '',          // 폴백: '' (삼항 false 브랜치)
        contact: {
          name: '',                // 폴백: '담당자'
          email: '',               // 폴백: 동적 이메일
          phone: '',
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateTestPBL(inputWithEmpty as any);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pblId).toBe('fallback-draft');
  });

  it('컨설턴트 프로필 있을 때 스냅샷 조회 성공', async () => {
    const { createDraftVersion } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(createDraftVersion).mockResolvedValueOnce({ id: 'draft-with-profile', version_number: 1 } as never);

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    adminMock.addResult({ data: MOCK_PROJECT_ROW, error: null });
    adminMock.addResult({ data: null, error: null });
    // consultant_profiles → 프로필 있음
    adminMock.addResult({ data: { user_id: USER_ID, affiliation: 'KPC' }, error: null });
    adminMock.addResult({ data: null, error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateTestPBL(VALID_INTERVIEW_DATA as any);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pblId).toBe('draft-with-profile');
  });
});

// ─── cancelTestPBLGeneration 테스트 ──────────────────────────────────────────

describe('cancelTestPBLGeneration', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → error 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await cancelTestPBLGeneration();
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('허용되지 않은 역할(USER_PENDING) → error', async () => {
    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });

    const result = await cancelTestPBLGeneration();
    expect(result.success).toBe(false);
  });

  it('CONSULTANT_APPROVED → cancelAbort 호출 + success', async () => {
    const { cancelAbort } = await import('@/lib/services/abort-registry');
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await cancelTestPBLGeneration();
    expect(result.success).toBe(true);
    expect(cancelAbort).toHaveBeenCalledWith(`test-pbl:${USER_ID}`);
  });

  it('OPS_ADMIN → cancelAbort 호출 + success', async () => {
    const { cancelAbort } = await import('@/lib/services/abort-registry');
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await cancelTestPBLGeneration();
    expect(result.success).toBe(true);
    expect(cancelAbort).toHaveBeenCalledWith(`test-pbl:${USER_ID}`);
  });
});
