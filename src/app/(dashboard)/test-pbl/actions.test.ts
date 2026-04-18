import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '@/test/helpers/mock-supabase';
import { PBL_INTERVIEW_SAMPLE } from '../../../../e2e/fixtures/pbl-interview-sample';

const mockRequireAuthWithRole = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockRequireAuthWithRole(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/services/pbl/pbl-generator', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/pbl/pbl-generator')>(
    '@/lib/services/pbl/pbl-generator',
  );
  return {
    ...actual,
    generatePBLContent: vi.fn(),
  };
});

vi.mock('@/lib/services/pbl/pbl-crud', () => ({
  createDraftVersion: vi.fn(),
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/abort-registry', () => ({
  registerAbort: vi.fn(() => ({ signal: { aborted: false } })),
  cancelAbort: vi.fn(),
  cleanupAbort: vi.fn(),
}));

vi.mock('next/server', () => ({
  after: (fn: () => void) => fn(),
}));

import { generateTestPBL, cancelTestPBLGeneration } from './actions';
import { generatePBLContent } from '@/lib/services/pbl/pbl-generator';
import { createDraftVersion } from '@/lib/services/pbl/pbl-crud';
import { createAdminClient } from '@/lib/supabase/admin';

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440099';
let adminMock: ReturnType<typeof createMockSupabase>;

beforeEach(async () => {
  vi.clearAllMocks();
  adminMock = createMockSupabase();
  vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);

  mockRequireAuthWithRole.mockResolvedValue({
    user: { id: TEST_USER_ID, email: 'tester@test.com' },
    role: 'CONSULTANT_APPROVED',
    status: 'ACTIVE',
    supabase: adminMock.client,
  });
});

describe('generateTestPBL', () => {
  it('미인증 → error 반환', async () => {
    mockRequireAuthWithRole.mockResolvedValueOnce({ error: '로그인 필요' });
    const result = await generateTestPBL(PBL_INTERVIEW_SAMPLE);
    expect(result).toEqual({ success: false, error: '로그인 필요' });
  });

  it('성공 플로우 — 프로젝트·인터뷰 생성 + PBL 드래프트 저장 + 상태 전이', async () => {
    // 1) projects.insert → 신규 프로젝트 반환
    adminMock.addResult({
      data: {
        id: 'test-proj-1',
        company_name: '[테스트] 샘플정밀공업(주)',
        status: 'INTERVIEWED',
        track: 'PBL',
        is_test_mode: true,
      },
      error: null,
    });
    // 2) interviews.insert → 성공 (error:null)
    adminMock.addResult({ data: null, error: null });
    // 3) consultant_profiles.select.single → null (프로필 없음)
    adminMock.addResult({ data: null, error: null });

    vi.mocked(generatePBLContent).mockResolvedValue({
      content: {
        operation_plan: {} as never,
        performance_analysis: {} as never,
      },
      validation: { isValid: true, errors: [], warnings: [] },
    });

    vi.mocked(createDraftVersion).mockResolvedValue({
      id: 'pbl-draft-1',
      project_id: 'test-proj-1',
      version_number: 1,
    } as never);

    // 4) projects.update → 성공
    adminMock.addResult({ data: null, error: null });

    const result = await generateTestPBL(PBL_INTERVIEW_SAMPLE);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pblId).toBe('pbl-draft-1');
      expect(result.data.projectId).toBe('test-proj-1');
    }

    // projects 생성 시 is_test_mode=true + track=PBL
    const insertCall = adminMock.chainable.insert.mock.calls[0]?.[0];
    expect(insertCall).toMatchObject({
      track: 'PBL',
      is_test_mode: true,
      assigned_consultant_id: TEST_USER_ID,
    });
    expect((insertCall?.company_name as string)?.startsWith('[테스트]')).toBe(true);
  });

  it('프로젝트 생성 실패 → error 반환', async () => {
    adminMock.addResult({ data: null, error: { message: 'insert failed' } });

    const result = await generateTestPBL(PBL_INTERVIEW_SAMPLE);

    expect(result).toEqual({
      success: false,
      error: '테스트 프로젝트 생성에 실패했습니다.',
    });
  });

  it('인터뷰 저장 실패 → error 반환', async () => {
    // projects 생성 성공
    adminMock.addResult({
      data: { id: 'test-proj-2', company_name: '[테스트] X', status: 'INTERVIEWED', track: 'PBL', is_test_mode: true },
      error: null,
    });
    // interviews 저장 실패
    adminMock.addResult({ data: null, error: { message: 'insert failed' } });

    const result = await generateTestPBL(PBL_INTERVIEW_SAMPLE);

    expect(result).toEqual({
      success: false,
      error: '테스트 인터뷰 저장에 실패했습니다.',
    });
  });
});

describe('cancelTestPBLGeneration', () => {
  it('성공 → { success: true }', async () => {
    const result = await cancelTestPBLGeneration();
    expect(result).toEqual({ success: true });
  });

  it('미인증 → error', async () => {
    mockRequireAuthWithRole.mockResolvedValueOnce({ error: '로그인 필요' });
    const result = await cancelTestPBLGeneration();
    expect(result).toEqual({ success: false, error: '로그인 필요' });
  });
});
