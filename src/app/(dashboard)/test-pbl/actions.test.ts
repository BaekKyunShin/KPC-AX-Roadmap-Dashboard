/**
 * test-pbl/actions.ts 테스트 (Task 2.11-e 재작성).
 *
 * 기존: V1 snake_case 인터뷰 + DB 저장 경로(프로젝트·인터뷰·pbl_reports) 포함
 * 신규: V2 camelCase 인터뷰 수용 + **DB 저장 없음** — LLM 결과만 in-memory 반환
 *
 * 테스트 대상:
 * - generateTestPBL: 인증/역할/검증/LLM/after 콜백
 * - cancelTestPBLGeneration: 인증/cancelAbort
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateTestPBL, cancelTestPBLGeneration, type TestPBLActionInput } from './actions';
import { PBL_INTERVIEW_SAMPLE } from '@/lib/fixtures/pbl-interview-sample';

// ─── 외부 모듈 모킹 ───────────────────────────────────────────────────────────

const mockRequireAuthWithRole = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockRequireAuthWithRole(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null }),
        }),
      }),
    }),
  }),
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

const mockGeneratePBLContent = vi.fn();

vi.mock('@/lib/services/pbl/pbl-generator', () => ({
  generatePBLContent: (...args: unknown[]) => mockGeneratePBLContent(...args),
  PBLGenerationError: class PBLGenerationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'PBLGenerationError';
    }
  },
}));

const { mockAfter } = vi.hoisted(() => {
  const mockAfter = vi.fn((fn: () => void | Promise<unknown>) => {
    void fn();
  });
  return { mockAfter };
});
vi.mock('next/server', () => ({ after: mockAfter }));

// ─── 테스트 상수 ──────────────────────────────────────────────────────────────

const USER_ID = 'test-user-pbl';

function makeValidInput(
  overrides: Partial<TestPBLActionInput> = {},
): TestPBLActionInput {
  return {
    interview: PBL_INTERVIEW_SAMPLE,
    companyName: '테스트 기업',
    industry: '제조/생산',
    companySize: 'small',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuthWithRole.mockResolvedValue({
    user: { id: USER_ID, email: 'test@test.com' },
    role: 'CONSULTANT_APPROVED',
    status: 'ACTIVE',
    supabase: {},
  });
  mockGeneratePBLContent.mockResolvedValue({
    content: {
      operational_plan: {},
      outcome_analysis: {},
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── generateTestPBL ─────────────────────────────────────────────────────────

describe('generateTestPBL', () => {
  it('미인증 → error 반환', async () => {
    mockRequireAuthWithRole.mockResolvedValueOnce({ error: '로그인이 필요합니다.' });
    const result = await generateTestPBL(makeValidInput());
    expect(result.success).toBe(false);
  });

  it('회사명 2자 미만 → error', async () => {
    const result = await generateTestPBL(makeValidInput({ companyName: 'A' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/2자 이상/);
  });

  it('업종 누락 → error', async () => {
    const result = await generateTestPBL(makeValidInput({ industry: '' }));
    expect(result.success).toBe(false);
  });

  it('인터뷰 검증 실패 (과정명 공란) → error', async () => {
    const result = await generateTestPBL(
      makeValidInput({
        interview: { ...PBL_INTERVIEW_SAMPLE, courseName: '' },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/검증 실패/);
  });

  it('LLM 에러 → 사용자 친화 에러 반환', async () => {
    mockGeneratePBLContent.mockRejectedValueOnce(new Error('LLM timeout'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await generateTestPBL(makeValidInput());
    expect(result.success).toBe(false);
    consoleSpy.mockRestore();
  });

  it('유효 입력 + 생성 성공 → content + interview 반환 + after 감사로그', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    const result = await generateTestPBL(makeValidInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBeDefined();
      expect(result.data.interview.courseName).toBe(PBL_INTERVIEW_SAMPLE.courseName);
    }
    expect(mockAfter).toHaveBeenCalled();
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TEST_PROJECT_CREATE',
        meta: expect.objectContaining({ is_test_mode: true, no_db_save: true }),
      }),
    );
  });

  it('OPS_ADMIN 역할도 허용 → success', async () => {
    mockRequireAuthWithRole.mockResolvedValueOnce({
      user: { id: USER_ID, email: 'test@test.com' },
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
      supabase: {},
    });
    const result = await generateTestPBL(makeValidInput());
    expect(result.success).toBe(true);
  });
});

// ─── cancelTestPBLGeneration ─────────────────────────────────────────────────

describe('cancelTestPBLGeneration', () => {
  it('미인증 → error', async () => {
    mockRequireAuthWithRole.mockResolvedValueOnce({ error: '로그인이 필요합니다.' });
    const result = await cancelTestPBLGeneration();
    expect(result.success).toBe(false);
  });

  it('성공 → { success: true }', async () => {
    const result = await cancelTestPBLGeneration();
    expect(result).toEqual({ success: true });
  });
});
