/**
 * 인터뷰 첨부 Server Action 테스트 (OFA-06.5)
 *
 * 검증:
 * - uploadInterviewAttachment — 인증/역할/배정/파일 검증 + Storage 업로드 + 본문 추출
 * - removeInterviewAttachment — 경로 검증 + Storage 삭제
 *
 * (V1 saveRoadmapInterview 테스트는 P8 legacy 제거와 함께 삭제 — 저장 경로는
 *  actions-v2.test.ts 의 saveRoadmapInterviewV2 케이스들이 정본으로 검증한다.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadInterviewAttachment, removeInterviewAttachment } from './actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/services/audit', () => ({ createAuditLog: vi.fn() }));
vi.mock('@/lib/services/activity-log', () => ({ insertSystemActivityLog: vi.fn() }));
vi.mock('@/lib/services/notification', () => ({ createNotificationForAdmins: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// file-parser dispatcher 모킹 — 실제 PDF/DOCX 파싱은 하지 않고 검증만 한다
vi.mock('@/lib/services/file-parser', () => ({
  extractTextFromAttachment: vi.fn(async () => ({ text: '추출된 본문 키워드' })),
}));

const { pendingCallbacks, mockAfter } = vi.hoisted(() => {
  const pending: Promise<unknown>[] = [];
  const after = vi.fn((fn: () => void | Promise<unknown>) => {
    const r = fn();
    if (r && typeof (r as Promise<unknown>).then === 'function')
      pending.push(r as Promise<unknown>);
  });
  return { pendingCallbacks: pending, mockAfter: after };
});
vi.mock('next/server', () => ({ after: mockAfter }));

afterEach(() => {
  pendingCallbacks.length = 0;
});

const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';

describe('인터뷰 첨부 Server Actions', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => vi.clearAllMocks());

  describe('uploadInterviewAttachment', () => {
    // jsdom 의 File 은 arrayBuffer() 가 미구현 — 진짜 File 을 만들고 arrayBuffer 만 polyfill
    function makeFile(name: string, mimeType: string, sizeBytes: number): File {
      const buf = new Uint8Array(sizeBytes);
      const file = new File([buf], name, { type: mimeType });
      // size 강제 (jsdom 은 정상이지만 안전)
      Object.defineProperty(file, 'size', { value: sizeBytes });
      // arrayBuffer polyfill
      Object.defineProperty(file, 'arrayBuffer', {
        value: async () => buf.buffer,
      });
      return file;
    }

    it('인증되지 않은 사용자 → error', async () => {
      serverMock = createMockSupabase({ authUser: null });
      vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

      const fd = new FormData();
      fd.set('file', makeFile('a.pdf', 'application/pdf', 100));
      const r = await uploadInterviewAttachment(PROJECT_ID, fd);
      expect(r.success).toBe(false);
    });

    it('CONSULTANT_APPROVED 가 아닌 역할 → error', async () => {
      serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

      const fd = new FormData();
      fd.set('file', makeFile('a.pdf', 'application/pdf', 100));
      const r = await uploadInterviewAttachment(PROJECT_ID, fd);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toContain('컨설턴트');
    });

    it('배정되지 않은 프로젝트 → error', async () => {
      serverMock.addResult({
        data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
        error: null,
      });
      // requireConsultantProjectAccess 의 single() 결과 — 빈 결과
      serverMock.addResult({ data: null, error: { message: 'not found' } });

      const fd = new FormData();
      fd.set('file', makeFile('a.pdf', 'application/pdf', 100));
      const r = await uploadInterviewAttachment(PROJECT_ID, fd);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toMatch(/접근|배정/);
    });

    it('FormData 에 file 이 없으면 → error', async () => {
      serverMock.addResult({
        data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
        error: null,
      });
      serverMock.addResult({ data: { assigned_consultant_id: USER_A }, error: null });

      const fd = new FormData();
      const r = await uploadInterviewAttachment(PROJECT_ID, fd);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toMatch(/파일/);
    });

    it('파일 크기 0 → error', async () => {
      serverMock.addResult({
        data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
        error: null,
      });
      serverMock.addResult({ data: { assigned_consultant_id: USER_A }, error: null });

      const fd = new FormData();
      fd.set('file', makeFile('zero.pdf', 'application/pdf', 0));
      const r = await uploadInterviewAttachment(PROJECT_ID, fd);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toMatch(/빈|크기/);
    });

    it('10MB 초과 → error', async () => {
      serverMock.addResult({
        data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
        error: null,
      });
      serverMock.addResult({ data: { assigned_consultant_id: USER_A }, error: null });

      const fd = new FormData();
      // 11MB
      fd.set('file', makeFile('big.pdf', 'application/pdf', 11 * 1024 * 1024));
      const r = await uploadInterviewAttachment(PROJECT_ID, fd);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toMatch(/10MB|크기/);
    });

    it('허용되지 않은 MIME (svg) → error', async () => {
      serverMock.addResult({
        data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
        error: null,
      });
      serverMock.addResult({ data: { assigned_consultant_id: USER_A }, error: null });

      const fd = new FormData();
      fd.set('file', makeFile('icon.svg', 'image/svg+xml', 100));
      const r = await uploadInterviewAttachment(PROJECT_ID, fd);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toMatch(/형식|허용/);
    });

    it('정상 PDF 업로드 → Storage 업로드 + extracted_text 포함 메타 반환', async () => {
      serverMock.addResult({
        data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
        error: null,
      });
      serverMock.addResult({ data: { assigned_consultant_id: USER_A }, error: null });

      const fd = new FormData();
      fd.set('file', makeFile('hrd.pdf', 'application/pdf', 1024));
      const r = await uploadInterviewAttachment(PROJECT_ID, fd);

      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.file_name).toBe('hrd.pdf');
        expect(r.data.mime_type).toBe('application/pdf');
        expect(r.data.storage_path).toContain(PROJECT_ID);
        expect(r.data.extracted_text).toBe('추출된 본문 키워드');
        expect(r.data.uploaded_at).toBeDefined();
      }
    });

    it('정상 업로드 + 파싱 실패 → parse_error 포함 (업로드는 성공)', async () => {
      const { extractTextFromAttachment } = await import('@/lib/services/file-parser');
      vi.mocked(extractTextFromAttachment).mockResolvedValueOnce({
        text: null,
        parseError: '파싱 실패: 손상된 PDF',
      });

      serverMock.addResult({
        data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
        error: null,
      });
      serverMock.addResult({ data: { assigned_consultant_id: USER_A }, error: null });

      const fd = new FormData();
      fd.set('file', makeFile('broken.pdf', 'application/pdf', 1024));
      const r = await uploadInterviewAttachment(PROJECT_ID, fd);

      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.extracted_text).toBeUndefined();
        expect(r.data.parse_error).toContain('파싱 실패');
      }
    });
  });

  describe('removeInterviewAttachment', () => {
    it('인증되지 않은 사용자 → error', async () => {
      serverMock = createMockSupabase({ authUser: null });
      vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

      const r = await removeInterviewAttachment(PROJECT_ID, `${PROJECT_ID}/file.pdf`);
      expect(r.success).toBe(false);
    });

    it('storagePath 가 projectId 로 시작하지 않으면 → error', async () => {
      serverMock.addResult({
        data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
        error: null,
      });
      serverMock.addResult({ data: { assigned_consultant_id: USER_A }, error: null });

      const r = await removeInterviewAttachment(PROJECT_ID, 'other-project/file.pdf');
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toMatch(/경로/);
    });

    it('정상 삭제 → success', async () => {
      serverMock.addResult({
        data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' },
        error: null,
      });
      serverMock.addResult({ data: { assigned_consultant_id: USER_A }, error: null });

      const r = await removeInterviewAttachment(PROJECT_ID, `${PROJECT_ID}/file.pdf`);
      expect(r.success).toBe(true);
    });
  });
});
