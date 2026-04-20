/**
 * pbl-export.ts 테스트
 * Server Actions 검증: preparePBLExportData, logPBLDownload
 *
 * preparePBLExportData:
 * - 인증 실패 → error
 * - PBL 보고서 미존재 → error
 * - PBL 아닌 트랙 → error
 * - 내보내기 불가 상태 → error
 * - 사용자 프로필 미존재 → error
 * - CONSULTANT_APPROVED + 타 컨설턴트 → error
 * - CONSULTANT_APPROVED + 본인 → success (인터뷰 데이터 있음)
 * - CONSULTANT_APPROVED + 본인 → success (인터뷰 데이터 없음)
 * - OPS_ADMIN → 모든 프로젝트 접근
 * - SYSTEM_ADMIN → 모든 프로젝트 접근
 * - 허용되지 않은 역할(USER_PENDING) → error
 *
 * logPBLDownload:
 * - 인증 실패 → error
 * - PBL 보고서 미존재 → error
 * - PDF 다운로드 → DOWNLOAD_PDF 감사로그
 * - XLSX 다운로드 → DOWNLOAD_XLSX 감사로그
 * - 예외 발생 → catch error
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

const mockCreateAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/services/audit', () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

// ─── Import ─────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { preparePBLExportData, logPBLDownload } from './pbl-export';

// ─── 테스트 상수 ──────────────────────────────────────────────────────────────

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const PBL_ID = 'pbl-report-1';
const PROJECT_ID = 'project-1';

/** 최소 유효 PBL 보고서 row (pbl_content: stub) */
const PBL_ROW_BASE = {
  id: PBL_ID,
  project_id: PROJECT_ID,
  version_number: 1,
  status: 'DRAFT',
  diagnosis_summary: '진단 요약',
  pbl_content: {
    background: {},
    subject_profile: {},
    course_evaluation: {},
    operational_plan: {},
  },
  created_at: '2026-04-01T00:00:00Z',
  finalized_at: null,
  projects: {
    company_name: '테스트기업',
    assigned_consultant_id: USER_ID,
    status: 'PBL_DRAFTED',
    track: 'PBL',
  },
};

/** pblInterviewAutoSaveSchema 최소 유효 pbl_data */
const VALID_PBL_DATA = {
  courseOverview: {
    course_name: 'AI PBL 과정',
    training_job: '제조 직무',
    training_hours: 16,
    trainee_count: 10,
    ai_level: 'AI기초형',
    training_goals: ['기술문제 해결'],
    company_name: '테스트기업',
    industry_main: '제조업',
    contact: { name: '홍길동', email: 'test@example.com', phone: '010-1234-5678' },
  },
  trainingEnvironment: {
    training_needs_analysis: '분석 내용',
  },
  targetTasks: {
    selection_reason: '선정 이유',
    target_task_details: [],
  },
};

// ─── preparePBLExportData 테스트 ─────────────────────────────────────────────

describe('preparePBLExportData', () => {
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockCreateAuditLog.mockClear();
    adminMock = createMockSupabase({});
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  it('인증 실패 시 error를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('로그인이 필요합니다.');
  });

  it('PBL 보고서 미존재 시 error를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    // pbl_reports 조회 → null
    mock.addResult({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('PBL 보고서를 찾을 수 없습니다.');
  });

  it('PBL 아닌 트랙(ROADMAP) → error를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({
      data: {
        ...PBL_ROW_BASE,
        projects: { ...PBL_ROW_BASE.projects, track: 'ROADMAP' },
      },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('PBL 트랙 프로젝트가 아닙니다.');
  });

  it('내보내기 불가 상태(NEW) → error를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({
      data: {
        ...PBL_ROW_BASE,
        projects: { ...PBL_ROW_BASE.projects, status: 'NEW', track: 'PBL' },
      },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('내보내기할 수 없는 프로젝트 상태입니다.');
  });

  it('사용자 프로필 미존재 시 error를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    // 1) pbl_reports 조회 → 성공
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    // 2) users.role 조회 → null
    mock.addResult({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.');
  });

  it('CONSULTANT_APPROVED + 타 컨설턴트 → error를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: OTHER_USER_ID } });
    // 1) pbl_reports (assigned_consultant_id: USER_ID)
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    // 2) users.role → CONSULTANT_APPROVED
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('접근 권한이 없습니다.');
  });

  it('CONSULTANT_APPROVED + 본인 + 인터뷰 없음 → success', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    // admin: interviews 조회 → null
    adminMock.addResult({ data: null, error: null });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyName).toBe('테스트기업');
      expect(result.data.projectId).toBe(PROJECT_ID);
      expect(result.data.versionNumber).toBe(1);
      expect(result.data.interviewOverview).toBeUndefined();
    }
  });

  it('CONSULTANT_APPROVED + 본인 + 인터뷰 있음 → interviewOverview 포함 success', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    // admin: interviews 조회 → pbl_data 있음
    adminMock.addResult({ data: { pbl_data: VALID_PBL_DATA }, error: null });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interviewOverview).toBeDefined();
      expect(result.data.interviewOverview?.courseName).toBe('AI PBL 과정');
      expect(result.data.interviewOverview?.trainingHours).toBe(16);
    }
  });

  it('OPS_ADMIN → 타 컨설턴트 프로젝트도 접근 가능', async () => {
    const mock = createMockSupabase({ authUser: { id: OTHER_USER_ID } });
    // assigned_consultant_id: USER_ID이지만 OPS_ADMIN이므로 접근 가능
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    mock.addResult({ data: { role: 'OPS_ADMIN' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    adminMock.addResult({ data: null, error: null });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.companyName).toBe('테스트기업');
  });

  it('SYSTEM_ADMIN → 모든 프로젝트 접근 가능', async () => {
    const mock = createMockSupabase({ authUser: { id: OTHER_USER_ID } });
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    mock.addResult({ data: { role: 'SYSTEM_ADMIN' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    adminMock.addResult({ data: null, error: null });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
  });

  it('허용되지 않은 역할(USER_PENDING) → error를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    mock.addResult({ data: { role: 'USER_PENDING' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('접근 권한이 없습니다.');
  });

  it('FINALIZED 상태 → 내보내기 성공', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({
      data: {
        ...PBL_ROW_BASE,
        projects: { ...PBL_ROW_BASE.projects, status: 'FINALIZED' },
      },
      error: null,
    });
    mock.addResult({ data: { role: 'OPS_ADMIN' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    adminMock.addResult({ data: null, error: null });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
  });

  it('requirements 포함 여부 검증 (trainingEnvironment + targetTasks 있을 때)', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    adminMock.addResult({ data: { pbl_data: VALID_PBL_DATA }, error: null });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requirements).toBeDefined();
    }
  });

  it('예외 발생 → catch error 반환', async () => {
    vi.mocked(createClient).mockRejectedValueOnce(new Error('connection error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('데이터 준비에 실패했습니다.');
    consoleSpy.mockRestore();
  });
});

// ─── logPBLDownload 테스트 ───────────────────────────────────────────────────

describe('logPBLDownload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCreateAuditLog.mockClear();
  });

  it('인증 실패 시 error를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await logPBLDownload(PBL_ID, 'PDF');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('로그인이 필요합니다.');
  });

  it('PBL 보고서 미존재 시 error를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await logPBLDownload(PBL_ID, 'PDF');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('PBL 보고서를 찾을 수 없습니다.');
  });

  it('PDF 다운로드 시 DOWNLOAD_PDF 감사로그를 기록한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({
      data: { project_id: PROJECT_ID, version_number: 1, status: 'DRAFT' },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await logPBLDownload(PBL_ID, 'PDF');
    expect(result.success).toBe(true);
    expect(mockCreateAuditLog).toHaveBeenCalledWith({
      actorUserId: USER_ID,
      action: 'DOWNLOAD_PDF',
      targetType: 'pbl_report',
      targetId: PBL_ID,
      meta: {
        project_id: PROJECT_ID,
        version_number: 1,
        status: 'DRAFT',
        track: 'PBL',
      },
    });
  });

  it('XLSX 다운로드 시 DOWNLOAD_XLSX 감사로그를 기록한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({
      data: { project_id: PROJECT_ID, version_number: 2, status: 'FINAL' },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await logPBLDownload(PBL_ID, 'XLSX');
    expect(result.success).toBe(true);
    expect(mockCreateAuditLog).toHaveBeenCalledWith({
      actorUserId: USER_ID,
      action: 'DOWNLOAD_XLSX',
      targetType: 'pbl_report',
      targetId: PBL_ID,
      meta: {
        project_id: PROJECT_ID,
        version_number: 2,
        status: 'FINAL',
        track: 'PBL',
      },
    });
  });

  it('예외 발생 → catch error 반환', async () => {
    vi.mocked(createClient).mockRejectedValueOnce(new Error('connection error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await logPBLDownload(PBL_ID, 'PDF');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('감사로그 기록에 실패했습니다.');
    consoleSpy.mockRestore();
  });
});
