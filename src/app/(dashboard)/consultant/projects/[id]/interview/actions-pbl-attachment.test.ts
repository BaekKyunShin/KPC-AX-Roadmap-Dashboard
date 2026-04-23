/**
 * uploadInterviewAttachment / removeInterviewAttachment — PBL 트랙 재사용 계약 (ISSUE-14 PBL 확장)
 *
 * 검증 목적:
 *   - 로드맵/PBL 양 트랙에서 동일 Server Action 을 재사용한다
 *   - 프로젝트 track 필드를 Server Action 이 조회하지 않고, 배정(assigned_consultant_id) 만 확인
 *   - 따라서 PBL 프로젝트에 배정된 컨설턴트도 동일 시그니처로 업로드·삭제 가능
 *
 * 이 테스트는 향후 실수로 Server Action 에 track 제한을 추가하는 회귀를 차단한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
vi.mock('@/lib/services/file-parser', () => ({
  extractTextFromAttachment: vi.fn(async () => ({ text: 'HRD이음 진단 결과 요약 (PBL 테스트)' })),
}));
vi.mock('next/server', () => ({ after: vi.fn() }));

const CONSULTANT_ID = '550e8400-e29b-41d4-a716-446655440091';
const PBL_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440092';

function makeFile(name: string, mimeType: string, sizeBytes: number): File {
  const buf = new Uint8Array(sizeBytes);
  const file = new File([buf], name, { type: mimeType });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  Object.defineProperty(file, 'arrayBuffer', { value: async () => buf.buffer });
  return file;
}

describe('uploadInterviewAttachment — PBL 트랙 재사용', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: CONSULTANT_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => vi.clearAllMocks());

  it('PBL 프로젝트에 배정된 컨설턴트 → 업로드 성공 + extracted_text 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    // requireConsultantProjectAccess — track 필드 없이 id 만 반환 (Server Action 은 track 조회 안 함)
    serverMock.addResult({ data: { id: PBL_PROJECT_ID }, error: null });

    const fd = new FormData();
    fd.set('file', makeFile('hrd-이음.pdf', 'application/pdf', 4096));
    const r = await uploadInterviewAttachment(PBL_PROJECT_ID, fd);

    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.file_name).toBe('hrd-이음.pdf');
      expect(r.data.mime_type).toBe('application/pdf');
      expect(r.data.storage_path.startsWith(`${PBL_PROJECT_ID}/`)).toBe(true);
      expect(r.data.extracted_text).toBe('HRD이음 진단 결과 요약 (PBL 테스트)');
    }
  });

  it('PBL 프로젝트에 배정되지 않은 컨설턴트 → 접근 거부', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: null, error: { message: 'not found' } });

    const fd = new FormData();
    fd.set('file', makeFile('hrd.pdf', 'application/pdf', 1024));
    const r = await uploadInterviewAttachment(PBL_PROJECT_ID, fd);

    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/접근|배정/);
  });

  it('PBL 에서도 비-PDF/이미지 등 허용 MIME 화이트리스트는 동일하게 적용', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PBL_PROJECT_ID }, error: null });

    const fd = new FormData();
    fd.set('file', makeFile('icon.svg', 'image/svg+xml', 1024));
    const r = await uploadInterviewAttachment(PBL_PROJECT_ID, fd);

    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/형식|허용/);
  });

  it('PBL 에서도 10MB 초과 파일은 거부', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PBL_PROJECT_ID }, error: null });

    const fd = new FormData();
    fd.set('file', makeFile('big.pdf', 'application/pdf', 11 * 1024 * 1024));
    const r = await uploadInterviewAttachment(PBL_PROJECT_ID, fd);

    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/10MB|크기/);
  });
});

describe('removeInterviewAttachment — PBL 트랙 재사용', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: CONSULTANT_ID } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => vi.clearAllMocks());

  it('PBL 프로젝트에 배정된 컨설턴트 → 삭제 성공', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PBL_PROJECT_ID }, error: null });

    const r = await removeInterviewAttachment(PBL_PROJECT_ID, `${PBL_PROJECT_ID}/note-xyz.pdf`);
    expect(r.success).toBe(true);
  });

  it('PBL 에서도 다른 프로젝트 경로로 우회 삭제 시도 → 거부', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({ data: { id: PBL_PROJECT_ID }, error: null });

    const otherProject = '550e8400-e29b-41d4-a716-446655440099';
    const r = await removeInterviewAttachment(PBL_PROJECT_ID, `${otherProject}/note.pdf`);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/경로/);
  });
});
