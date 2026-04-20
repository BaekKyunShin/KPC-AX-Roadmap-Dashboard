/**
 * notices/actions.ts (공개 공지 다운로드 액션) 테스트
 *
 * getAttachmentDownloadUrl:
 *   - 미인증 → error
 *   - 권한 없는 역할 → error
 *   - storagePath가 빈 문자열 → error
 *   - storagePath가 null/undefined → error
 *   - createAttachmentSignedUrl 실패 → error
 *   - 성공 → { url } 반환
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAttachmentDownloadUrl } from './actions';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockRequireAuthWithRole = vi.fn();
const mockCreateAttachmentSignedUrl = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockRequireAuthWithRole(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({})),
}));

vi.mock('@/lib/services/notice', () => ({
  createAttachmentSignedUrl: (...args: unknown[]) => mockCreateAttachmentSignedUrl(...args),
}));

// ─── 테스트 상수 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const VALID_STORAGE_PATH = 'notice-id-1/uuid-abc.pdf';
const SIGNED_URL = 'https://supabase.co/storage/v1/signed/notice-attachments/notice-id-1/uuid-abc.pdf?token=xxx';

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────────────

function setupAuthSuccess(role = 'CONSULTANT_APPROVED') {
  mockRequireAuthWithRole.mockResolvedValue({
    user: { id: TEST_USER_ID, email: 'user@test.com' },
    supabase: {},
    role,
    status: 'ACTIVE',
  });
}

function setupAuthFailure(message = '로그인이 필요합니다.') {
  mockRequireAuthWithRole.mockResolvedValue({ error: message });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── getAttachmentDownloadUrl ─────────────────────────────────────────────

describe('getAttachmentDownloadUrl', () => {
  it('미인증 → error 반환', async () => {
    setupAuthFailure('로그인이 필요합니다.');

    const result = await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    expect(result).toEqual({ success: false, error: '로그인이 필요합니다.' });
  });

  it('권한 없는 역할(USER_PENDING) → error 반환', async () => {
    setupAuthFailure('다운로드 권한이 없습니다.');

    const result = await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    expect(result).toEqual({ success: false, error: '다운로드 권한이 없습니다.' });
  });

  it('storagePath가 빈 문자열 → 유효하지 않은 경로 error', async () => {
    setupAuthSuccess();

    const result = await getAttachmentDownloadUrl('');

    expect(result).toEqual({ success: false, error: '파일 경로가 유효하지 않습니다.' });
  });

  it('createAttachmentSignedUrl이 null 반환 → error', async () => {
    setupAuthSuccess();
    mockCreateAttachmentSignedUrl.mockResolvedValue(null);

    const result = await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    expect(result).toEqual({ success: false, error: '다운로드 링크 생성에 실패했습니다.' });
  });

  it('성공 (CONSULTANT_APPROVED) → { url } 반환', async () => {
    setupAuthSuccess('CONSULTANT_APPROVED');
    mockCreateAttachmentSignedUrl.mockResolvedValue(SIGNED_URL);

    const result = await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    expect(result).toEqual({ success: true, data: { url: SIGNED_URL } });
  });

  it('성공 (OPS_ADMIN) → { url } 반환', async () => {
    setupAuthSuccess('OPS_ADMIN');
    mockCreateAttachmentSignedUrl.mockResolvedValue(SIGNED_URL);

    const result = await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    expect(result).toEqual({ success: true, data: { url: SIGNED_URL } });
  });

  it('성공 (SYSTEM_ADMIN) → { url } 반환', async () => {
    setupAuthSuccess('SYSTEM_ADMIN');
    mockCreateAttachmentSignedUrl.mockResolvedValue(SIGNED_URL);

    const result = await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    expect(result).toEqual({ success: true, data: { url: SIGNED_URL } });
  });

  it('createAdminClient를 admin 클라이언트로 호출하여 서명 URL 생성', async () => {
    setupAuthSuccess();
    mockCreateAttachmentSignedUrl.mockResolvedValue(SIGNED_URL);

    await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    // createAttachmentSignedUrl이 올바른 경로와 만료시간(300)으로 호출되어야 함
    expect(mockCreateAttachmentSignedUrl).toHaveBeenCalledWith(
      VALID_STORAGE_PATH,
      expect.anything(), // adminClient
      300,
    );
  });
});
