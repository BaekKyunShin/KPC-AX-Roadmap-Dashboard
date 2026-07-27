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

/** V2 PBL 인터뷰 (양식 v2 정본) — camelCase. AI역량·우선순위·수행활동 자체입력 제거. */
const VALID_PBL_DATA_V2 = {
  // Ⅰ 훈련과정 개요
  companyName: '테스트기업',
  courseName: 'AI PBL 과정 V2',
  ncsCode: '200107',
  trainingHours: 24,
  trainingTarget: '제조 현장 관리자',
  trainingForm: '집체훈련',
  trainingPeriod: '2026-05-01 ~ 2026-05-31',
  businessIssues: '품질 향상',
  // Ⅱ 분석
  companyIssues: '경영 이슈 V2',
  organization: { orgTree: [], mainWork: [] },
  trainingEnv: {
    properTrainingHours: 'V2 훈련환경 분석 결과',
    internalPlace: '',
    externalPlace: '',
    internalInstructors: [],
    externalInstructors: [],
    aiInfrastructure: '',
  },
  hrdReportPdf: null,
  courseNecessity: 'AI훈련 필요성 V2',
  // Ⅲ 과제 도출
  problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
  target: {
    taskSelections: [{ ai_necessity: '높음', training_selected: true }],
    necessity: 'V2 선정 사유',
    details: [
      {
        title: '검사 데이터 분석',
        as_is: '수동 엑셀 분석',
        to_be: 'AI 자동 분석',
        required_knowledge: '통계 기초',
        required_skill: 'Python pandas',
      },
    ],
  },
};

/** V2 부분 입력 (Ⅲ-3 details 5 컬럼 일부 누락) — loose parse 통과 케이스 */
const PARTIAL_PBL_DATA_V2 = {
  companyName: '테스트기업',
  courseName: '부분 V2 과정',
  trainingHours: 8,
  trainingTarget: '신입',
  trainingForm: '온라인',
  trainingPeriod: '2026-05',
  businessIssues: '',
  companyIssues: '',
  organization: { orgTree: [], mainWork: [] },
  trainingEnv: {
    properTrainingHours: '',
    internalPlace: '부분 환경',
    externalPlace: '',
    internalInstructors: [],
    externalInstructors: [],
    aiInfrastructure: '',
  },
  hrdReportPdf: null,
  courseNecessity: '',
  problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
  target: {
    taskSelections: [],
    necessity: '부분 사유',
    details: [
      { title: '부분 항목', as_is: '', to_be: '', required_knowledge: '', required_skill: '' },
    ],
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
    adminMock.addResult({ data: { pbl_data: VALID_PBL_DATA_V2 }, error: null });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interviewOverview).toBeDefined();
      expect(result.data.interviewOverview?.courseName).toBe('AI PBL 과정 V2');
      expect(result.data.interviewOverview?.trainingHours).toBe(24);
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

  it('requirements 포함 여부 검증 (trainingEnv + target 있을 때)', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    adminMock.addResult({ data: { pbl_data: VALID_PBL_DATA_V2 }, error: null });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requirements).toBeDefined();
    }
  });

  it('V2 PBL 인터뷰 (camelCase) → interviewOverview/requirements 매핑 success', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    adminMock.addResult({ data: { pbl_data: VALID_PBL_DATA_V2 }, error: null });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interviewOverview).toBeDefined();
      expect(result.data.interviewOverview?.courseName).toBe('AI PBL 과정 V2');
      expect(result.data.interviewOverview?.trainingHours).toBe(24);
      expect(result.data.interviewOverview?.trainingJob).toBe('제조 현장 관리자');
      // v2 양식: AI역량 자체입력 제거 → aiLevel 항상 빈 문자열 (로드맵 연계로만 표시).
      expect(result.data.interviewOverview?.aiLevel).toBe('');
      expect(result.data.interviewOverview?.traineeCount).toBe(0);
      expect(result.data.interviewOverview?.trainingGoals).toEqual([]);

      expect(result.data.requirements).toBeDefined();
      // R8 PBL-자체-02 — 정형 객체. buildRequirementsFromV2 가 6 영역을 줄바꿈으로 결합
      expect(result.data.requirements?.trainingNeedsAnalysis).toContain('V2 훈련환경 분석 결과');
      expect(result.data.requirements?.selectionReason).toBe('V2 선정 사유');
      expect(result.data.requirements?.targetTaskDetails).toEqual([
        {
          task_name: '검사 데이터 분석',
          as_is: '수동 엑셀 분석',
          to_be: 'AI 자동 분석',
          required_knowledge: '통계 기초',
          required_skill: 'Python pandas',
        },
      ]);
    }
  });

  it('V2 부분 입력 (Ⅲ-3 details 일부 누락) → loose parse 통과 + 빈 문자열 매핑', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    adminMock.addResult({ data: { pbl_data: PARTIAL_PBL_DATA_V2 }, error: null });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interviewOverview?.courseName).toBe('부분 V2 과정');
      expect(result.data.interviewOverview?.aiLevel).toBe('');
      expect(result.data.requirements?.targetTaskDetails).toEqual([
        {
          task_name: '부분 항목',
          as_is: '',
          to_be: '',
          required_knowledge: '',
          required_skill: '',
        },
      ]);
    }
  });

  it('V2 인터뷰 (currentAiLevel/trainingEnv/target 미입력) → aiLevel 빈값 + requirements undefined', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    // V2 키만 존재 (companyName) — currentAiLevel/trainingEnv/target 모두 누락
    adminMock.addResult({
      data: { pbl_data: { companyName: '미입력 기업', courseName: 'X' } },
      error: null,
    });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interviewOverview?.aiLevel).toBe('');
      expect(result.data.requirements).toBeUndefined();
    }
  });

  it('pbl_data 가 빈 객체 → V2/V1 키 모두 부재 → interviewOverview/requirements undefined', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    adminMock.addResult({ data: { pbl_data: {} }, error: null });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interviewOverview).toBeUndefined();
      expect(result.data.requirements).toBeUndefined();
    }
  });

  it('diagnosis_summary null → 빈 문자열 fallback', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({
      data: { ...PBL_ROW_BASE, diagnosis_summary: null },
      error: null,
    });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    adminMock.addResult({ data: null, error: null });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.diagnosisSummary).toBe('');
    }
  });

  it('V2 키가 없는 pbl_data → interviewOverview/requirements undefined (V1 fallback 제거)', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    mock.addResult({ data: PBL_ROW_BASE, error: null });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);
    // 구 V1 키(companyStatus)만 존재 — V2 정본만 처리하므로 무시된다.
    adminMock.addResult({
      data: { pbl_data: { companyStatus: { business_issues: 'X' } } },
      error: null,
    });

    const result = await preparePBLExportData(PBL_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interviewOverview).toBeUndefined();
      expect(result.data.requirements).toBeUndefined();
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
