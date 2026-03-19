/**
 * roadmap-export.ts 테스트
 * Server Actions 검증: prepareExportData, logDownload
 *
 * prepareExportData:
 * - 인증 실패 → error
 * - 로드맵 미존재 → error
 * - 사용자 프로필 미존재 → error
 * - CONSULTANT_APPROVED + 타인 프로젝트 → error
 * - CONSULTANT_APPROVED + 본인 프로젝트 → success
 * - OPS_ADMIN → 모든 프로젝트 접근 가능
 * - 허용되지 않은 역할 → error
 *
 * logDownload:
 * - 인증 실패 → error
 * - 로드맵 미존재 → error
 * - PDF 다운로드 → DOWNLOAD_PDF 감사로그
 * - XLSX 다운로드 → DOWNLOAD_XLSX 감사로그
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const mockCreateAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/services/audit', () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

// ─── Import ────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server';
import { prepareExportData, logDownload } from './roadmap-export';

// ─── 테스트 데이터 상수 ──────────────────────────────────────────────────────

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const ROADMAP_ID = 'roadmap-1';
const PROJECT_ID = 'proj-1';

const ROADMAP_DATA = {
  id: ROADMAP_ID,
  project_id: PROJECT_ID,
  version_number: 1,
  status: 'DRAFT',
  diagnosis_summary: '진단 요약',
  roadmap_matrix: [],
  pbl_course: {
    selected_course_name: 'AI 기초',
    selected_course_level: 'BEGINNER',
    selected_course_task: '데이터 분석',
    selection_rationale: {
      consultant_expertise_fit: '적합',
      pain_point_alignment: '일치',
      feasibility_assessment: '가능',
      summary: '요약',
    },
    course_name: 'PBL 과정',
    total_hours: 16,
    target_tasks: ['분석'],
    target_audience: '직원',
    curriculum: [],
    final_deliverables: [],
    expected_outcomes: [],
    business_impact: '',
    measurement_methods: [],
    prerequisites: [],
  },
  courses: [],
  created_at: '2026-02-01T00:00:00Z',
  finalized_at: null,
  projects: {
    company_name: '테스트 기업',
    assigned_consultant_id: USER_ID,
    status: 'ROADMAP_DRAFTED',
  },
};

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('prepareExportData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 시 에러를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await prepareExportData(ROADMAP_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('로그인이 필요합니다.');
    }
  });

  it('로드맵 미존재 시 에러를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    // 로드맵 조회 → null
    mock.addResult({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await prepareExportData(ROADMAP_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('로드맵을 찾을 수 없습니다.');
    }
  });

  it('사용자 프로필 미존재 시 에러를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    // 1) 로드맵 조회 → 성공
    mock.addResult({ data: ROADMAP_DATA, error: null });
    // 2) 프로필 조회 → null
    mock.addResult({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await prepareExportData(ROADMAP_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.');
    }
  });

  it('CONSULTANT_APPROVED가 타인 프로젝트에 접근하면 에러를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: OTHER_USER_ID } });
    // 1) 로드맵 조회 → 성공 (assigned_consultant_id는 USER_ID)
    mock.addResult({ data: ROADMAP_DATA, error: null });
    // 2) 프로필 조회 → CONSULTANT_APPROVED
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await prepareExportData(ROADMAP_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('접근 권한이 없습니다.');
    }
  });

  it('CONSULTANT_APPROVED가 본인 프로젝트에 접근하면 데이터를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    // 1) 로드맵 조회 → 성공
    mock.addResult({ data: ROADMAP_DATA, error: null });
    // 2) 프로필 조회 → CONSULTANT_APPROVED
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await prepareExportData(ROADMAP_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyName).toBe('테스트 기업');
      expect(result.data.projectId).toBe(PROJECT_ID);
      expect(result.data.versionNumber).toBe(1);
      expect(result.data.status).toBe('DRAFT');
    }
  });

  it('OPS_ADMIN은 모든 프로젝트에 접근할 수 있다', async () => {
    const mock = createMockSupabase({ authUser: { id: OTHER_USER_ID } });
    // 1) 로드맵 조회 → 성공 (assigned_consultant_id는 USER_ID, 다른 사용자)
    mock.addResult({ data: ROADMAP_DATA, error: null });
    // 2) 프로필 조회 → OPS_ADMIN
    mock.addResult({ data: { role: 'OPS_ADMIN' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await prepareExportData(ROADMAP_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyName).toBe('테스트 기업');
    }
  });

  it('허용되지 않은 역할(USER_PENDING)은 에러를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    // 1) 로드맵 조회 → 성공
    mock.addResult({ data: ROADMAP_DATA, error: null });
    // 2) 프로필 조회 → USER_PENDING
    mock.addResult({ data: { role: 'USER_PENDING' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await prepareExportData(ROADMAP_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('접근 권한이 없습니다.');
    }
  });

  it('프로젝트 상태가 내보내기 불가(NEW)이면 에러를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    const roadmapWithInvalidStatus = {
      ...ROADMAP_DATA,
      projects: { ...ROADMAP_DATA.projects, status: 'NEW' },
    };
    // 1) 로드맵 조회 → 성공 (비정상 상태)
    mock.addResult({ data: roadmapWithInvalidStatus, error: null });
    // 프로필 조회 불필요 — 상태 검증에서 즉시 반환
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await prepareExportData(ROADMAP_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('내보내기할 수 없는 프로젝트 상태입니다.');
    }
  });

  it('프로젝트 상태가 FINALIZED이면 내보내기에 성공한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    const roadmapWithFinalizedStatus = {
      ...ROADMAP_DATA,
      projects: { ...ROADMAP_DATA.projects, status: 'FINALIZED' },
    };
    mock.addResult({ data: roadmapWithFinalizedStatus, error: null });
    mock.addResult({ data: { role: 'OPS_ADMIN' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await prepareExportData(ROADMAP_ID);

    expect(result.success).toBe(true);
  });
});

describe('logDownload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('인증 실패 시 에러를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await logDownload(ROADMAP_ID, 'PDF');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('로그인이 필요합니다.');
    }
  });

  it('로드맵 미존재 시 에러를 반환한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    // 1) 프로필 조회 → 성공
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    // 2) 로드맵 조회 → null
    mock.addResult({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await logDownload(ROADMAP_ID, 'PDF');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('로드맵을 찾을 수 없습니다.');
    }
  });

  it('PDF 다운로드 시 DOWNLOAD_PDF 감사로그를 기록한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    // 1) 프로필 조회
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    // 2) 로드맵 조회
    mock.addResult({
      data: { project_id: PROJECT_ID, version_number: 1, status: 'DRAFT' },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await logDownload(ROADMAP_ID, 'PDF');

    expect(result.success).toBe(true);
    expect(mockCreateAuditLog).toHaveBeenCalledWith({
      actorUserId: USER_ID,
      action: 'DOWNLOAD_PDF',
      targetType: 'roadmap',
      targetId: ROADMAP_ID,
      meta: {
        project_id: PROJECT_ID,
        version_number: 1,
        status: 'DRAFT',
        role: 'CONSULTANT_APPROVED',
      },
    });
  });

  it('XLSX 다운로드 시 DOWNLOAD_XLSX 감사로그를 기록한다', async () => {
    const mock = createMockSupabase({ authUser: { id: USER_ID } });
    // 1) 프로필 조회
    mock.addResult({ data: { role: 'OPS_ADMIN' }, error: null });
    // 2) 로드맵 조회
    mock.addResult({
      data: { project_id: PROJECT_ID, version_number: 2, status: 'FINAL' },
      error: null,
    });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const result = await logDownload(ROADMAP_ID, 'XLSX');

    expect(result.success).toBe(true);
    expect(mockCreateAuditLog).toHaveBeenCalledWith({
      actorUserId: USER_ID,
      action: 'DOWNLOAD_XLSX',
      targetType: 'roadmap',
      targetId: ROADMAP_ID,
      meta: {
        project_id: PROJECT_ID,
        version_number: 2,
        status: 'FINAL',
        role: 'OPS_ADMIN',
      },
    });
  });
});
