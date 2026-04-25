import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TestRoadmapActionInput } from './actions';
import { ROADMAP_INTERVIEW_SAMPLE } from '@/lib/fixtures/roadmap-interview-sample';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────
const mockRequireAuthWithRole = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockRequireAuthWithRole(...args),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/abort-registry', () => ({
  registerAbort: vi.fn(() => ({ signal: { aborted: false } })),
  cancelAbort: vi.fn(),
  cleanupAbort: vi.fn(),
}));

vi.mock('@/lib/services/roadmap', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/roadmap')>(
    '@/lib/services/roadmap',
  );
  return {
    ...actual,
    generateTestRoadmap: vi.fn(),
    reviseTestRoadmap: vi.fn(),
  };
});

vi.mock('next/server', () => ({ after: (fn: () => void) => fn() }));

import { createTestRoadmap, cancelTestRoadmapGeneration, reviseTestRoadmap } from './actions';
import {
  generateTestRoadmap,
  reviseTestRoadmap as reviseTestRoadmapService,
} from '@/lib/services/roadmap';

const TEST_USER_ID = 'test-user-1';

function makeValidInput(
  overrides: Partial<TestRoadmapActionInput> = {},
): TestRoadmapActionInput {
  return {
    interview: ROADMAP_INTERVIEW_SAMPLE,
    companyName: '테스트 기업',
    industry: '제조/생산',
    companySize: 'small',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuthWithRole.mockResolvedValue({
    user: { id: TEST_USER_ID, email: 'test@test.com' },
    role: 'CONSULTANT_APPROVED',
    status: 'ACTIVE',
    supabase: {
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
      }),
    },
  });
});

describe('createTestRoadmap', () => {
  it('미인증 → error 반환', async () => {
    mockRequireAuthWithRole.mockResolvedValueOnce({ error: '로그인이 필요합니다.' });
    const result = await createTestRoadmap(makeValidInput());
    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('회사명 2자 미만 → error', async () => {
    const result = await createTestRoadmap(makeValidInput({ companyName: 'A' }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/2자 이상/);
  });

  it('업종 누락 → error', async () => {
    const result = await createTestRoadmap(makeValidInput({ industry: '' }));
    expect(result.success).toBe(false);
  });

  it('기업 규모 누락 → error', async () => {
    const result = await createTestRoadmap(makeValidInput({ companySize: '' }));
    expect(result.success).toBe(false);
  });

  it('인터뷰 검증 실패 (수립 필요성 공란) → error', async () => {
    const result = await createTestRoadmap(
      makeValidInput({
        interview: { ...ROADMAP_INTERVIEW_SAMPLE, establishmentNecessity: '' },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('유효 입력 + 생성 성공 → result + validation 반환', async () => {
    vi.mocked(generateTestRoadmap).mockResolvedValue({
      result: {} as never,
      validation: { isValid: true, errors: [], warnings: [] },
    });
    const result = await createTestRoadmap(makeValidInput());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.validation.isValid).toBe(true);
  });

  it('LLM 실패 → error', async () => {
    vi.mocked(generateTestRoadmap).mockRejectedValue(new Error('LLM failure'));
    const result = await createTestRoadmap(makeValidInput());
    expect(result.success).toBe(false);
  });
});

describe('reviseTestRoadmap', () => {
  it('미인증 → error', async () => {
    mockRequireAuthWithRole.mockResolvedValueOnce({ error: '로그인이 필요합니다.' });
    const result = await reviseTestRoadmap(makeValidInput(), {} as never, '수정해줘');
    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('빈 prompt → error', async () => {
    const result = await reviseTestRoadmap(makeValidInput(), {} as never, '   ');
    expect(result.success).toBe(false);
  });

  it('유효 prompt → revise 호출', async () => {
    vi.mocked(reviseTestRoadmapService).mockResolvedValue({
      result: {} as never,
      validation: { isValid: true, errors: [], warnings: [] },
    });
    const result = await reviseTestRoadmap(makeValidInput(), {} as never, '초급 추가');
    expect(result.success).toBe(true);
  });
});

describe('cancelTestRoadmapGeneration', () => {
  it('성공', async () => {
    const result = await cancelTestRoadmapGeneration();
    expect(result).toEqual({ success: true });
  });
});
