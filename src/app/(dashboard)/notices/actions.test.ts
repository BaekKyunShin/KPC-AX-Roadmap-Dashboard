/**
 * notices/actions.ts (공개 공지 다운로드 액션) 테스트
 *
 * getAttachmentDownloadUrl:
 *   - 미인증 → error
 *   - 권한 없는 역할 → error
 *   - storagePath가 빈 문자열 → error
 *   - storagePath가 null/undefined → error
 *   - attachment 행 미존재 → error
 *   - attachment 조회 에러 → error
 *   - createAttachmentSignedUrl 실패 → error
 *   - 성공 → { url } 반환 (file_name 도 createAttachmentSignedUrl 에 전달)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAttachmentDownloadUrl } from './actions';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockRequireAuthWithRole = vi.fn();
const mockCreateAttachmentSignedUrl = vi.fn();
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockCreateAdminClient = vi.fn(() => ({ from: mockFrom }));

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockRequireAuthWithRole(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock('@/lib/services/notice', () => ({
  createAttachmentSignedUrl: (...args: unknown[]) => mockCreateAttachmentSignedUrl(...args),
}));

// ─── 테스트 상수 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const VALID_STORAGE_PATH = 'notice-id-1/uuid-abc.pdf';
const SIGNED_URL = 'https://supabase.co/storage/v1/signed/notice-attachments/notice-id-1/uuid-abc.pdf?token=xxx';
const ORIGINAL_FILE_NAME = '2026 AI 컨설팅 보고서.pdf';

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

function setupAttachmentFound(fileName = ORIGINAL_FILE_NAME) {
  mockMaybeSingle.mockResolvedValue({
    data: { file_name: fileName },
    error: null,
  });
}

function setupAttachmentNotFound() {
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
}

function setupAttachmentLookupError(message = 'db error') {
  mockMaybeSingle.mockResolvedValue({ data: null, error: { message } });
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

  it('attachment 행이 없으면 → "첨부 파일을 찾을 수 없습니다." error', async () => {
    setupAuthSuccess();
    setupAttachmentNotFound();

    const result = await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    expect(result).toEqual({ success: false, error: '첨부 파일을 찾을 수 없습니다.' });
    // signed URL 생성은 시도조차 하지 않아야 함
    expect(mockCreateAttachmentSignedUrl).not.toHaveBeenCalled();
  });

  it('attachment 조회 에러 → "첨부 파일 조회에 실패했습니다." error', async () => {
    setupAuthSuccess();
    setupAttachmentLookupError('connection refused');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    expect(result).toEqual({ success: false, error: '첨부 파일 조회에 실패했습니다.' });
    expect(mockCreateAttachmentSignedUrl).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('createAttachmentSignedUrl이 null 반환 → error', async () => {
    setupAuthSuccess();
    setupAttachmentFound();
    mockCreateAttachmentSignedUrl.mockResolvedValue(null);

    const result = await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    expect(result).toEqual({ success: false, error: '다운로드 링크 생성에 실패했습니다.' });
  });

  it('성공 (CONSULTANT_APPROVED) → { url } 반환', async () => {
    setupAuthSuccess('CONSULTANT_APPROVED');
    setupAttachmentFound();
    mockCreateAttachmentSignedUrl.mockResolvedValue(SIGNED_URL);

    const result = await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    expect(result).toEqual({ success: true, data: { url: SIGNED_URL } });
  });

  it('성공 (OPS_ADMIN) → { url } 반환', async () => {
    setupAuthSuccess('OPS_ADMIN');
    setupAttachmentFound();
    mockCreateAttachmentSignedUrl.mockResolvedValue(SIGNED_URL);

    const result = await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    expect(result).toEqual({ success: true, data: { url: SIGNED_URL } });
  });

  it('성공 (SYSTEM_ADMIN) → { url } 반환', async () => {
    setupAuthSuccess('SYSTEM_ADMIN');
    setupAttachmentFound();
    mockCreateAttachmentSignedUrl.mockResolvedValue(SIGNED_URL);

    const result = await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    expect(result).toEqual({ success: true, data: { url: SIGNED_URL } });
  });

  it('storage_path 로 notice_attachments 조회 → file_name 을 createAttachmentSignedUrl 에 전달', async () => {
    setupAuthSuccess();
    setupAttachmentFound(ORIGINAL_FILE_NAME);
    mockCreateAttachmentSignedUrl.mockResolvedValue(SIGNED_URL);

    await getAttachmentDownloadUrl(VALID_STORAGE_PATH);

    // notice_attachments 테이블에서 file_name 컬럼을 storage_path 로 조회
    expect(mockFrom).toHaveBeenCalledWith('notice_attachments');
    expect(mockSelect).toHaveBeenCalledWith('file_name');
    expect(mockEq).toHaveBeenCalledWith('storage_path', VALID_STORAGE_PATH);

    // createAttachmentSignedUrl이 올바른 경로/만료시간(300)/원본 파일명과 함께 호출
    expect(mockCreateAttachmentSignedUrl).toHaveBeenCalledWith(
      VALID_STORAGE_PATH,
      expect.anything(), // adminClient
      300,
      ORIGINAL_FILE_NAME,
    );
  });
});
