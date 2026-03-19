/**
 * test-roadmap/actions.ts 테스트
 *
 * createTestRoadmap:
 *   - 인증 실패, 입력 검증 실패, STT 크기 초과,
 *     정상(STT 없음), 정상(STT 포함), LLM 에러,
 *     abort 등록/정리, after() 감사로그
 *
 * reviseTestRoadmap:
 *   - 인증 실패, 빈 revisionPrompt, 정상 + 감사로그, LLM 에러
 *
 * cancelTestRoadmapGeneration:
 *   - 인증 실패, 정상 → cancelAbort 호출
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── after() 콜백 추적 (vi.mock 호이스팅 대응 — 인라인 패턴) ──────────────

const pendingAfterCallbacks: Promise<unknown>[] = [];

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void | Promise<unknown>) => {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      pendingAfterCallbacks.push(result as Promise<unknown>);
    }
  }),
}));

async function flush() {
  await Promise.all(pendingAfterCallbacks);
  pendingAfterCallbacks.length = 0;
}

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockRequireAuthWithRole = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockRequireAuthWithRole(...args),
}));

const mockGenerateTestRoadmap = vi.fn();
const mockReviseTestRoadmap = vi.fn();

vi.mock('@/lib/services/roadmap', () => ({
  generateTestRoadmap: (...args: unknown[]) => mockGenerateTestRoadmap(...args),
  reviseTestRoadmap: (...args: unknown[]) => mockReviseTestRoadmap(...args),
}));

const mockValidateSttTextSize = vi.fn();
const mockExtractInsightsFromStt = vi.fn();

vi.mock('@/lib/services/stt', () => ({
  validateSttTextSize: (...args: unknown[]) => mockValidateSttTextSize(...args),
  extractInsightsFromStt: (...args: unknown[]) => mockExtractInsightsFromStt(...args),
}));

const mockCreateAuditLog = vi.fn();

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

const mockGetLLMUserFriendlyError = vi.fn();

vi.mock('@/lib/services/llm', () => ({
  getLLMUserFriendlyError: (...args: unknown[]) => mockGetLLMUserFriendlyError(...args),
}));

const mockRegisterAbort = vi.fn();
const mockCancelAbort = vi.fn();
const mockCleanupAbort = vi.fn();

vi.mock('@/lib/services/abort-registry', () => ({
  registerAbort: (...args: unknown[]) => mockRegisterAbort(...args),
  cancelAbort: (...args: unknown[]) => mockCancelAbort(...args),
  cleanupAbort: (...args: unknown[]) => mockCleanupAbort(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// ─── 테스트 대상 임포트 (모킹 이후) ────────────────────────────────────────

import {
  createTestRoadmap,
  reviseTestRoadmap,
  cancelTestRoadmapGeneration,
} from './actions';

// ─── 테스트 상수 ────────────────────────────────────────────────────────────

const TEST_USER_ID = 'user-test-1';

const mockSupabase = createMockSupabase();

const mockAuth = {
  user: { id: TEST_USER_ID, email: 'test@test.com' },
  supabase: mockSupabase.client,
  role: 'CONSULTANT_APPROVED' as const,
  status: 'ACTIVE' as const,
};

/** testInputSchema를 통과하는 유효한 입력 */
const mockInput = {
  company_name: '테스트 회사',
  industry: '제조업' as const,
  sub_industries: ['자동차'],
  company_size: '50-299' as const,
  interview_date: '2025-01-01',
  participants: [{ id: 'p-1', name: '홍길동', position: '팀장' }],
  company_details: {
    systems_and_tools: ['MS Office (Excel, Word, PPT)'],
    ai_experience: 'ChatGPT 사용 경험 있음',
  },
  job_tasks: [{ id: 'task-1', task_name: '업무1', task_description: '설명1' }],
  pain_points: [{ id: 'pain-1', description: '문제1', severity: 'HIGH' as const }],
  improvement_goals: [{ id: 'goal-1', goal_description: '목표1' }],
};

const mockRoadmapResult = {
  result: { diagnosis_summary: '요약', courses: [], pbl_course: {}, roadmap_matrix: [] },
  validation: { isValid: true, errors: [], warnings: [] },
};

const mockPreviousResult = {
  diagnosis_summary: '이전 요약',
  courses: [],
  pbl_course: {},
  roadmap_matrix: [],
};

// ─── 공통 설정 ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks();
  pendingAfterCallbacks.length = 0;
  mockSupabase.resetResults();

  // 기본 성공 설정
  mockRequireAuthWithRole.mockResolvedValue(mockAuth);
  mockRegisterAbort.mockReturnValue(new AbortController());

  // 컨설턴트 프로필 조회 기본값 (fetchConsultantProfile → supabase.from().select().eq().single())
  mockSupabase.addResult({ data: { id: 'prof-1', user_id: TEST_USER_ID }, error: null });
});

afterEach(() => {
  pendingAfterCallbacks.length = 0;
});

// ─── createTestRoadmap ──────────────────────────────────────────────────────

describe('createTestRoadmap', () => {
  it('인증 실패 → error 반환', async () => {
    mockRequireAuthWithRole.mockResolvedValue({ error: '권한이 없습니다.' });

    const result = await createTestRoadmap(mockInput);

    expect(result).toEqual({ success: false, error: '권한이 없습니다.' });
  });

  it('입력 검증 실패 — 필수 필드 누락 시 에러 반환', async () => {
    // company_name이 빈 문자열이면 "2자 이상" 검증 실패
    const invalidInput = { ...mockInput, company_name: '' };

    const result = await createTestRoadmap(invalidInput);

    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });

  it('STT 크기 초과 시 에러 반환', async () => {
    mockValidateSttTextSize.mockReturnValue({ valid: false, error: '크기 초과' });
    const inputWithStt = { ...mockInput, stt_text: '긴 텍스트...' };

    const result = await createTestRoadmap(inputWithStt);

    expect(result).toEqual({ success: false, error: '크기 초과' });
    expect(mockValidateSttTextSize).toHaveBeenCalledWith('긴 텍스트...');
  });

  it('정상 (STT 없음) → 성공 결과 반환', async () => {
    mockGenerateTestRoadmap.mockResolvedValue(mockRoadmapResult);

    const result = await createTestRoadmap(mockInput);

    expect(result).toEqual({
      success: true,
      data: {
        result: mockRoadmapResult.result,
        validation: mockRoadmapResult.validation,
      },
    });
    expect(mockGenerateTestRoadmap).toHaveBeenCalled();
    expect(mockExtractInsightsFromStt).not.toHaveBeenCalled();
  });

  it('정상 (STT 포함) → extractInsightsFromStt 호출', async () => {
    mockValidateSttTextSize.mockReturnValue({ valid: true });
    const sttInsights = { 추가_업무: ['업무A'], 추가_페인포인트: [] };
    mockExtractInsightsFromStt.mockResolvedValue(sttInsights);
    mockGenerateTestRoadmap.mockResolvedValue(mockRoadmapResult);

    const inputWithStt = { ...mockInput, stt_text: 'STT 텍스트' };
    const result = await createTestRoadmap(inputWithStt);

    expect(result.success).toBe(true);
    expect(mockValidateSttTextSize).toHaveBeenCalledWith('STT 텍스트');
    expect(mockExtractInsightsFromStt).toHaveBeenCalledWith('STT 텍스트');
    // sttInsights가 generateTestRoadmap의 4번째 인자로 전달됨
    expect(mockGenerateTestRoadmap).toHaveBeenCalledWith(
      expect.any(Object), // roadmapInput
      TEST_USER_ID,
      expect.any(Object), // consultantProfile
      sttInsights,
      expect.any(AbortSignal),
    );
  });

  it('LLM 에러 → getLLMUserFriendlyError로 변환된 에러 반환', async () => {
    mockGenerateTestRoadmap.mockRejectedValue(new Error('LLM 실패'));
    mockGetLLMUserFriendlyError.mockReturnValue('AI 서비스에 문제가 발생했습니다.');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await createTestRoadmap(mockInput);

    expect(result).toEqual({
      success: false,
      error: 'AI 서비스에 문제가 발생했습니다.',
    });
    expect(mockGetLLMUserFriendlyError).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('registerAbort / cleanupAbort가 올바른 키로 호출됨', async () => {
    mockGenerateTestRoadmap.mockResolvedValue(mockRoadmapResult);

    await createTestRoadmap(mockInput);

    expect(mockRegisterAbort).toHaveBeenCalledWith(`test-roadmap:${TEST_USER_ID}`);
    expect(mockCleanupAbort).toHaveBeenCalledWith(`test-roadmap:${TEST_USER_ID}`);
  });

  it('after()로 감사로그 호출 확인', async () => {
    mockGenerateTestRoadmap.mockResolvedValue(mockRoadmapResult);
    mockCreateAuditLog.mockResolvedValue(undefined);

    await createTestRoadmap(mockInput);
    await flush();

    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'TEST_ROADMAP_CREATE',
        targetType: 'roadmap',
        targetId: 'test-mode',
        meta: expect.objectContaining({
          company_name: '테스트 회사',
          industry: '제조업',
          is_test_mode: true,
          no_db_save: true,
        }),
      }),
    );
  });
});

// ─── reviseTestRoadmap ──────────────────────────────────────────────────────

describe('reviseTestRoadmap', () => {
  it('인증 실패 → error 반환', async () => {
    mockRequireAuthWithRole.mockResolvedValue({ error: '권한이 없습니다.' });

    const result = await reviseTestRoadmap(mockInput, mockPreviousResult as never, '수정해주세요');

    expect(result).toEqual({ success: false, error: '권한이 없습니다.' });
  });

  it('빈 revisionPrompt → 에러 반환', async () => {
    const result = await reviseTestRoadmap(mockInput, mockPreviousResult as never, '');

    expect(result).toEqual({
      success: false,
      error: '수정 요청 내용을 입력해주세요.',
    });
  });

  it('정상 → reviseTestRoadmapService 호출 + 감사로그', async () => {
    mockReviseTestRoadmap.mockResolvedValue(mockRoadmapResult);
    mockCreateAuditLog.mockResolvedValue(undefined);

    const result = await reviseTestRoadmap(
      mockInput,
      mockPreviousResult as never,
      '과정 수를 늘려주세요',
    );
    await flush();

    expect(result).toEqual({
      success: true,
      data: {
        result: mockRoadmapResult.result,
        validation: mockRoadmapResult.validation,
      },
    });
    expect(mockReviseTestRoadmap).toHaveBeenCalledWith(
      expect.any(Object), // roadmapInput
      mockPreviousResult,
      '과정 수를 늘려주세요',
      TEST_USER_ID,
      expect.any(Object), // consultantProfile
      expect.any(AbortSignal),
    );
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: TEST_USER_ID,
        action: 'TEST_ROADMAP_REVISE',
        targetType: 'roadmap',
        targetId: 'test-mode',
        meta: expect.objectContaining({
          is_test_mode: true,
          revision_prompt: '과정 수를 늘려주세요',
        }),
      }),
    );
  });

  it('LLM 에러 → 에러 변환', async () => {
    mockReviseTestRoadmap.mockRejectedValue(new Error('LLM timeout'));
    mockGetLLMUserFriendlyError.mockReturnValue('AI 서비스 시간 초과');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await reviseTestRoadmap(
      mockInput,
      mockPreviousResult as never,
      '수정해주세요',
    );

    expect(result).toEqual({
      success: false,
      error: 'AI 서비스 시간 초과',
    });
    consoleSpy.mockRestore();
  });
});

// ─── cancelTestRoadmapGeneration ────────────────────────────────────────────

describe('cancelTestRoadmapGeneration', () => {
  it('인증 실패 → error 반환', async () => {
    mockRequireAuthWithRole.mockResolvedValue({ error: '권한이 없습니다.' });

    const result = await cancelTestRoadmapGeneration();

    expect(result).toEqual({ success: false, error: '권한이 없습니다.' });
  });

  it('정상 → cancelAbort 호출 + success 반환', async () => {
    const result = await cancelTestRoadmapGeneration();

    expect(result).toEqual({ success: true });
    expect(mockCancelAbort).toHaveBeenCalledWith(`test-roadmap:${TEST_USER_ID}`);
  });
});
