/**
 * assessment/actions.ts 테스트
 *
 * 테스트 대상:
 * - submitPublicAssessment: is_used 토큰의 에러 메시지 구분
 *   - 실제 제출된 토큰 → "이미 진단 결과를 제출하셨습니다."
 *   - 무효화된 토큰 (재생성) → "이 링크는 더 이상 유효하지 않습니다..."
 * - submitPublicAssessment: 전체 커버리지 (토큰 만료, 기존 진단, 템플릿, INSERT, after 등)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { submitPublicAssessment } from './actions';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('@/lib/services/notification', () => ({
  createNotificationForAdmins: vi.fn(),
}));

vi.mock('@/lib/services/calculate-scores', () => ({
  calculateScores: vi.fn(() => ({
    total_score: 21,
    max_possible_score: 30,
    dimension_scores: [{ dimension: 'AI_LITERACY', score: 7, max_score: 10 }],
  })),
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

afterEach(() => {
  pendingAfterCallbacks.length = 0;
  vi.restoreAllMocks();
});

// ─── 테스트 헬퍼 ────────────────────────────────────────────────────────────

const TEST_TOKEN_ID = '550e8400-e29b-41d4-a716-446655440010';
const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440011';
const TEST_TEMPLATE_ID = '550e8400-e29b-41d4-a716-446655440012';


function validFormData(): FormData {
  const fd = new FormData();
  fd.set('token', 'valid-token-abc');
  fd.set('submitted_by_name', '홍길동');
  fd.set('submitted_by_title', '대리');
  fd.set('submitted_by_email', 'test@example.com');
  fd.set('template_id', TEST_TEMPLATE_ID);
  fd.set(
    'answers',
    JSON.stringify([
      { question_id: 'q1', answer_value: 4 },
      { question_id: 'q2', answer_value: 3 },
    ])
  );
  return fd;
}

// ─── is_used 에러 메시지 구분 테스트 ────────────────────────────────────────

describe('submitPublicAssessment - is_used 토큰 메시지 구분', () => {
  it('실제 제출된 토큰 → "이미 진단 결과를 제출하셨습니다." 메시지 반환', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    // 1) 토큰 조회: is_used = true
    adminMock.addResult({
      data: {
        id: TEST_TOKEN_ID,
        project_id: TEST_PROJECT_ID,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_used: true,
      },
      error: null,
    });

    // 2) self_assessments 조회: 실제 제출 레코드 존재
    adminMock.addResult({
      data: { id: 'assessment-1' },
      error: null,
    });

    const result = await submitPublicAssessment(validFormData());

    expect(result).toEqual({
      success: false,
      error: '이미 진단 결과를 제출하셨습니다.',
    });
  });

  it('무효화된 토큰 (재생성) → "유효하지 않은 링크" 메시지 반환', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    // 1) 토큰 조회: is_used = true
    adminMock.addResult({
      data: {
        id: TEST_TOKEN_ID,
        project_id: TEST_PROJECT_ID,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_used: true,
      },
      error: null,
    });

    // 2) self_assessments 조회: 레코드 없음 (토큰 무효화만 됨)
    adminMock.addResult({
      data: null,
      error: null,
    });

    const result = await submitPublicAssessment(validFormData());

    expect(result).toEqual({
      success: false,
      error: '이 링크는 더 이상 유효하지 않습니다. 담당자에게 새 링크를 요청해 주세요.',
    });
  });
});

// ─── 전체 커버리지 테스트 (L74-185) ─────────────────────────────────────────

describe('submitPublicAssessment - 전체 커버리지', () => {
  /** Happy path 결과 큐 세팅 헬퍼 */
  function setupHappyPath(adminMock: ReturnType<typeof createMockSupabase>) {
    // 1) 토큰 조회: 유효, is_used=false, 미래 만료
    adminMock.addResult({
      data: {
        id: TEST_TOKEN_ID,
        project_id: TEST_PROJECT_ID,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_used: false,
      },
      error: null,
    });

    // 2) 기존 진단 조회: 없음
    adminMock.addResult({
      data: null,
      error: null,
    });

    // 3) 템플릿 조회: 성공
    adminMock.addResult({
      data: {
        version: 1,
        questions: [
          { id: 'q1', dimension: 'AI_LITERACY', weight: 1 },
          { id: 'q2', dimension: 'AI_LITERACY', weight: 1 },
        ],
      },
      error: null,
    });

    // 4) INSERT: 성공
    adminMock.addResult({ data: null, error: null });

    // 5) 토큰 update (is_used): 성공
    adminMock.addResult({ data: null, error: null });

    // 6) 프로젝트 update (status): 성공
    adminMock.addResult({ data: null, error: null });

    // 7) after() 블록 내: 프로젝트 조회 (company_name)
    adminMock.addResult({
      data: { company_name: '테스트 주식회사' },
      error: null,
    });
  }

  // 1. 정상 경로 (happy path)
  it('유효 토큰 + 유효 답변 → INSERT 성공 → success: true', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    setupHappyPath(adminMock);

    const result = await submitPublicAssessment(validFormData());

    expect(result).toEqual({ success: true });
  });

  // 2. 토큰 만료
  it('토큰 만료 → 링크 만료 에러 반환', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-20T12:00:00Z'));

    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const adminMock = createMockSupabase();
      vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

      // 토큰: 유효하지만 1시간 전에 만료됨
      adminMock.addResult({
        data: {
          id: TEST_TOKEN_ID,
          project_id: TEST_PROJECT_ID,
          expires_at: new Date('2026-03-20T11:00:00Z').toISOString(),
          is_used: false,
        },
        error: null,
      });

      const result = await submitPublicAssessment(validFormData());

      expect(result).toEqual({
        success: false,
        error: '링크가 만료되었습니다. 담당자에게 새 링크를 요청해 주세요.',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  // 3. 기존 진단 (TOKEN 소스)
  it('기존 진단 존재 (토큰 제출) → "이미 진단 결과를 제출하셨습니다."', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    // 1) 토큰 조회: 유효
    adminMock.addResult({
      data: {
        id: TEST_TOKEN_ID,
        project_id: TEST_PROJECT_ID,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_used: false,
      },
      error: null,
    });

    // 2) 기존 진단: assessment_token_id 존재
    adminMock.addResult({
      data: {
        id: 'existing-assessment-id',
        assessment_token_id: 'some-token-uuid',
      },
      error: null,
    });

    const result = await submitPublicAssessment(validFormData());

    expect(result).toEqual({
      success: false,
      error: '이미 진단 결과를 제출하셨습니다.',
    });
  });

  // 4. 기존 진단 (OPS 수동 입력 - assessment_token_id: null)
  it('기존 진단 존재 (OPS 수동 입력, token_id=null) → 운영 담당자 입력 완료 메시지', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    // 1) 토큰 조회: 유효
    adminMock.addResult({
      data: {
        id: TEST_TOKEN_ID,
        project_id: TEST_PROJECT_ID,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_used: false,
      },
      error: null,
    });

    // 2) 기존 진단: assessment_token_id = null (OPS 수동)
    adminMock.addResult({
      data: {
        id: 'existing-assessment-id',
        assessment_token_id: null,
      },
      error: null,
    });

    const result = await submitPublicAssessment(validFormData());

    expect(result).toEqual({
      success: false,
      error: '진단 결과를 이미 KPC 운영 담당자가 입력 완료했습니다.',
    });
  });

  // 5. 기존 진단 (방어: assessment_token_id = undefined)
  it('기존 진단 존재 (방어, token_id=undefined) → 운영 담당자 입력 완료 메시지', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    // 1) 토큰 조회: 유효
    adminMock.addResult({
      data: {
        id: TEST_TOKEN_ID,
        project_id: TEST_PROJECT_ID,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_used: false,
      },
      error: null,
    });

    // 2) 기존 진단: assessment_token_id = undefined (방어 케이스)
    adminMock.addResult({
      data: {
        id: 'existing-assessment-id',
        assessment_token_id: undefined,
      },
      error: null,
    });

    const result = await submitPublicAssessment(validFormData());

    expect(result).toEqual({
      success: false,
      error: '진단 결과를 이미 KPC 운영 담당자가 입력 완료했습니다.',
    });
  });

  // 6. 템플릿 미존재
  it('템플릿 미존재 → 템플릿 찾을 수 없음 에러', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    // 1) 토큰 조회: 유효
    adminMock.addResult({
      data: {
        id: TEST_TOKEN_ID,
        project_id: TEST_PROJECT_ID,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_used: false,
      },
      error: null,
    });

    // 2) 기존 진단: 없음
    adminMock.addResult({ data: null, error: null });

    // 3) 템플릿: 없음
    adminMock.addResult({ data: null, error: null });

    const result = await submitPublicAssessment(validFormData());

    expect(result).toEqual({
      success: false,
      error: '템플릿을 찾을 수 없습니다.',
    });
  });

  // 7. INSERT 실패
  it('INSERT 실패 → 진단 저장 실패 에러 + console.error 호출', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    // 1) 토큰 조회: 유효
    adminMock.addResult({
      data: {
        id: TEST_TOKEN_ID,
        project_id: TEST_PROJECT_ID,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_used: false,
      },
      error: null,
    });

    // 2) 기존 진단: 없음
    adminMock.addResult({ data: null, error: null });

    // 3) 템플릿: 성공
    adminMock.addResult({
      data: {
        version: 1,
        questions: [
          { id: 'q1', dimension: 'AI_LITERACY', weight: 1 },
          { id: 'q2', dimension: 'AI_LITERACY', weight: 1 },
        ],
      },
      error: null,
    });

    // 4) INSERT: 실패
    adminMock.addResult({
      data: null,
      error: { message: 'DB error' },
    });

    const result = await submitPublicAssessment(validFormData());

    expect(result).toEqual({
      success: false,
      error: '진단 저장에 실패했습니다.',
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[submitPublicAssessment] Supabase error:',
      'DB error'
    );
  });

  // 8. 토큰 is_used 업데이트 검증
  it('성공 시 토큰 is_used=true 업데이트 호출 검증', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    setupHappyPath(adminMock);

    await submitPublicAssessment(validFormData());

    // update 호출 검증: assessment_tokens 테이블에 is_used 업데이트
    const updateCalls = adminMock.chainable.update.mock.calls;
    expect(updateCalls).toContainEqual([
      { is_used: true, used_at: expect.any(String) },
    ]);
  });

  // 9. 프로젝트 상태 전이 검증
  it('성공 시 프로젝트 상태 NEW→DIAGNOSED 전이 호출 검증', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    setupHappyPath(adminMock);

    await submitPublicAssessment(validFormData());

    // update 호출 검증: projects 테이블에 status 업데이트
    const updateCalls = adminMock.chainable.update.mock.calls;
    expect(updateCalls).toContainEqual([{ status: 'DIAGNOSED' }]);

    // eq 호출에서 status=NEW 조건 검증
    const eqCalls = adminMock.chainable.eq.mock.calls;
    expect(eqCalls).toContainEqual(['status', 'NEW']);
  });

  // 10. after() 블록 검증: 감사로그 + 알림
  it('성공 시 after() 블록에서 감사로그 + 알림 호출 검증', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { createAuditLog } = await import('@/lib/services/audit');
    const { createNotificationForAdmins } = await import(
      '@/lib/services/notification'
    );

    const adminMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

    setupHappyPath(adminMock);

    await submitPublicAssessment(validFormData());

    // after() 콜백 실행
    await flushAfterCallbacks();

    // 감사로그 호출 검증
    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: null,
      action: 'PUBLIC_SELF_ASSESSMENT_CREATE',
      targetType: 'self_assessment',
      targetId: TEST_PROJECT_ID,
      meta: {
        submitted_by_name: '홍길동',
        submitted_by_email: 'test@example.com',
        company_name: '테스트 주식회사',
      },
    });

    // 알림 호출 검증
    expect(createNotificationForAdmins).toHaveBeenCalledWith({
      type: 'assessment_submitted',
      title: '자가진단 완료',
      message: '테스트 주식회사에서 자가진단을 완료했습니다. (작성자: 홍길동)',
      link: `/ops/projects/${TEST_PROJECT_ID}`,
    });
  });
});
