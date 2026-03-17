/**
 * assessment/actions.ts 테스트
 *
 * 테스트 대상:
 * - submitPublicAssessment: is_used 토큰의 에러 메시지 구분
 *   - 실제 제출된 토큰 → "이미 진단 결과를 제출하셨습니다."
 *   - 무효화된 토큰 (재생성) → "이 링크는 더 이상 유효하지 않습니다..."
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

const { pendingCallbacks: pendingAfterCallbacks, flush: _flushAfterCallbacks, mockAfter } = vi.hoisted(() => {
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
