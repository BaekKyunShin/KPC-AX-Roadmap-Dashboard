/**
 * Task 2.7-b — camelCase Server Action (V2) 테스트
 *
 * 대상:
 *   - saveRoadmapInterviewV2 / submitRoadmapInterviewV2 / fetchRoadmapInterviewV2
 *   - savePBLInterviewV2 / submitPBLInterviewV2 / fetchPBLInterviewV2
 *
 * 5단계 패턴 검증 + converter 경계 검증 (snake_case DB payload 스냅샷 포함).
 *
 * ── mock 시퀀스 규약 ─────────────────────────────────────────────────────
 * V2 Action 들은 공통 헬퍼 `verifyProjectAccess` → `requireConsultantProjectAccess`
 * 를 거친 뒤 admin 클라이언트로 `fetchProjectMetaForInterview` 를 호출한다.
 *   serverMock 큐: (1) projects 배정 single() — requireConsultantProjectAccess
 *   adminMock 큐:  (2) projects 메타 single()  — fetchProjectMetaForInterview
 *                  (3) interviews maybeSingle — 기존 interview 조회
 *                  (4) insert/update 결과
 *                  (5) 상태 전이 (제출 시)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveRoadmapInterviewV2,
  submitRoadmapInterviewV2,
  fetchRoadmapInterviewV2,
  savePBLInterviewV2,
  submitPBLInterviewV2,
  fetchPBLInterviewV2,
} from './actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMockSupabase } from '@/test/helpers/mock-supabase';
import type { RoadmapInterviewStrict } from '@/lib/schemas/interview-roadmap';
import type { PBLInterviewStrict } from '@/lib/schemas/interview-pbl';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/services/audit', () => ({ createAuditLog: vi.fn() }));
vi.mock('@/lib/services/activity-log', () => ({ insertSystemActivityLog: vi.fn() }));
vi.mock('@/lib/services/notification', () => ({ createNotificationForAdmins: vi.fn() }));
vi.mock('@/lib/supabase/cached', () => ({
  getCachedUser: vi.fn(),
  getCachedProfile: vi.fn(),
}));

const {
  pendingCallbacks,
  flush: flushAfterCallbacks,
  mockAfter,
} = vi.hoisted(() => {
  const pending: Promise<unknown>[] = [];
  const after = vi.fn((fn: () => void | Promise<unknown>) => {
    const r = fn();
    if (r && typeof (r as Promise<unknown>).then === 'function')
      pending.push(r as Promise<unknown>);
  });
  async function flush() {
    await Promise.all(pending);
    pending.length = 0;
  }
  return { pendingCallbacks: pending, flush, mockAfter: after };
});
vi.mock('next/server', () => ({ after: mockAfter }));

afterEach(() => {
  pendingCallbacks.length = 0;
});

const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';

// requireAuth 는 getCachedUser + getCachedProfile 을 사용하고,
// requireAuthWithRole 는 추가 DB 조회 없이 캐시 값만 본다. 그러므로
// mockServer 의 큐는 사용하지 않고, 캐시 mock 만 설정한다.
async function mockCachedAuth({
  authed = true,
  role = 'CONSULTANT_APPROVED',
  status = 'ACTIVE',
}: { authed?: boolean; role?: string | null; status?: string | null } = {}) {
  const cached = await import('@/lib/supabase/cached');
  vi.mocked(cached.getCachedUser).mockResolvedValue(
    (authed ? { id: USER_A, email: 'consultant@example.com' } : null) as never
  );
  vi.mocked(cached.getCachedProfile).mockResolvedValue(
    (authed ? { id: USER_A, role, status } : null) as never
  );
}

// requireConsultantProjectAccess 가 서버 클라이언트로 수행하는 projects select.
function mockProjectAssignmentCheck(
  serverMock: ReturnType<typeof createMockSupabase>,
  { assigned = true }: { assigned?: boolean } = {}
) {
  serverMock.addResult({
    data: assigned ? { id: PROJECT_ID } : null,
    error: null,
  });
}

// fetchProjectMetaForInterview 가 admin 클라이언트로 수행하는 projects select.
function mockProjectMeta(
  adminMock: ReturnType<typeof createMockSupabase>,
  meta: {
    track?: 'ROADMAP' | 'PBL' | null;
    status?: string;
    company_name?: string;
    is_test_mode?: boolean;
  } = {}
) {
  adminMock.addResult({
    data: {
      id: PROJECT_ID,
      status: meta.status ?? 'ASSIGNED',
      track: meta.track ?? 'ROADMAP',
      company_name: meta.company_name ?? '테스트',
      is_test_mode: meta.is_test_mode ?? false,
    },
    error: null,
  });
}

function validRoadmapV2(): RoadmapInterviewStrict {
  return {
    establishmentNecessity: '공정 품질 편차 개선을 위한 AI 훈련',
    performanceActivities: [
      {
        round: 1,
        date: '2026-05-01',
        timeRange: '09:00~11:00',
        content: '현장 인터뷰',
        method: 'ONSITE',
        pmName: '김PM',
        expertName: '이전문가',
      },
    ],
    aiLevel: 'INTERMEDIATE',
    selectedTask: '품질검사 자동화',
    hrdReportPdf: {
      fileName: 'hrd.pdf',
      url: 'p/hrd.pdf',
      size: 1024,
    },
    companyRequirements: {
      status: '제조업',
      problem: '품질 편차',
      will: '적극 지원',
      outcomes: '15% 개선',
    },
    taskAnalysis: [
      {
        domain: '생산',
        task: '검사',
        asIs: '육안',
        improvement: '편차 → 2년치 검사 데이터로 Vision AI 1차 선별 (필요도 높음)',
      },
    ],
    targetTask: {
      name: '품질검사 자동화',
      reason: 'AI 도입 필요도 4',
      expectedAsIs: '육안',
      expectedToBe: 'AI 1차 + 사람 확인',
    },
  };
}

function validPBLV2(): PBLInterviewStrict {
  return {
    companyName: '테스트 기업',
    courseName: 'AI 현장 문제해결 과정',
    trainingHours: 40,
    trainingTarget: '생산팀 주임급',
    trainingForm: '사내·집체',
    trainingPeriod: '2026-05 ~ 2026-06',
    businessIssues: '품질 불량률 상승',
    companyIssues: '제조 공정 품질 편차',
    organization: {
      orgTree: [{ id: 'root', name: '대표이사', children: [] }],
      mainWork: [{ dept: '생산', role: '품질검사', description: '출하 전 품질검사' }],
    },
    trainingEnv: {
      properTrainingHours: '',
      internalPlace: '사내 교육장 보유',
      externalPlace: '',
      internalInstructors: [],
      externalInstructors: [],
      aiInfrastructure: '',
      targetCharacteristics: { career: '', level: '' },
      aiInfraDetail: {
        toolCapacity: 'AVAILABLE' as const,
        networkStatus: 'GOOD' as const,
        pcCount: 0,
      },
      trainingNeedsAnalysis: '',
      expectationAsIs: '',
      expectationToBe: '',
      targetTraineeCount: 0,
      internalInstructorUsage: 'NO' as const,
      internalInstructorPrimary: { name: '', position: '' },
      otherEquipment: '',
    },
    hrdReportPdf: { fileName: 'pbl.pdf', url: 'p/pbl.pdf', size: 2048 },
    courseNecessity: 'AI 도입 필요',
    // Ⅲ-1 수행활동 — PBL 자체 입력 (정본 4역할 · 수행 일자)
    performanceActivities: [
      {
        round: 1,
        date: '25/04/10',
        content: '핵심문제 파악 워크숍',
        method: 'WORKSHOP',
        participants: {
          pm: '김PM',
          external_expert: '이직무',
          internal_expert: '박내부',
          jurisdiction_manager: '최주치의',
        },
      },
    ],
    problemDefinitionSheet: {
      background: '검사자별 편차로 클레임 증가.',
      core: '품질 편차 — 육안 검사 의존',
      scope: '생산·품질 부서',
      constraints: '예산·일정 한계',
    },
    // V2: Ⅲ-3 훈련대상 업무 (로드맵 과업 선정 + 선정 사유 + 세부내용)
    target: {
      taskSelections: [{ ai_necessity: '높음 — 전원 공통 수행', training_selected: true }],
      necessity: '검사 편차 해결',
      details: [
        {
          title: '품질 검사 자동화',
          as_is: '육안 검사',
          to_be: 'AI 비전 자동 검사',
          required_knowledge: '결함 유형 카탈로그',
          required_skill: 'CV 모델 운영',
        },
      ],
    },
  };
}

// ============================================================================
// saveRoadmapInterviewV2
// ============================================================================

describe('saveRoadmapInterviewV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => vi.clearAllMocks());

  it('인증되지 않은 사용자 → error', async () => {
    await mockCachedAuth({ authed: false });

    const r = await saveRoadmapInterviewV2(PROJECT_ID, validRoadmapV2());
    expect(r.success).toBe(false);
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error', async () => {
    await mockCachedAuth({ role: 'OPS_ADMIN' });

    const r = await saveRoadmapInterviewV2(PROJECT_ID, validRoadmapV2());
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('컨설턴트');
  });

  it('배정되지 않은 프로젝트 → error', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock, { assigned: false });

    const r = await saveRoadmapInterviewV2(PROJECT_ID, validRoadmapV2());
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/접근|배정/);
  });

  it('프로젝트 track !== ROADMAP → error', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'PBL' });

    const r = await saveRoadmapInterviewV2(PROJECT_ID, validRoadmapV2());
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/PBL/);
  });

  it('autoSave=true 면 partial 입력 (빈 객체) 도 통과', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'ROADMAP' });
    adminMock.addResult({ data: null, error: null }); // maybeSingle 기존 interview → null
    adminMock.addResult({ data: null, error: null }); // insert

    const r = await saveRoadmapInterviewV2(PROJECT_ID, {}, { autoSave: true });
    expect(r.success).toBe(true);
  });

  it('정식 확정(FINALIZED)·비종결 프로젝트 → autoSave 저장 성공 (특성화)', async () => {
    await mockCachedAuth();
    serverMock.addResult({ data: { id: PROJECT_ID, closed_at: null }, error: null }); // 배정 검증 (비종결)
    mockProjectMeta(adminMock, { track: 'ROADMAP', status: 'FINALIZED' });
    adminMock.addResult({ data: null, error: null }); // maybeSingle 기존 interview → null
    adminMock.addResult({ data: null, error: null }); // insert

    const r = await saveRoadmapInterviewV2(PROJECT_ID, {}, { autoSave: true });
    expect(r.success).toBe(true);
  });

  it('autoSave=false (제출) + strict 검증 실패 (빈 객체) → error', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'ROADMAP' });

    const r = await saveRoadmapInterviewV2(PROJECT_ID, {});
    expect(r.success).toBe(false);
  });

  it('정상 제출 성공 → INTERVIEWED 전이 + camelCase 가 snake_case 로 저장', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'ROADMAP' });
    adminMock.addResult({ data: null, error: null }); // interviews maybeSingle → null
    adminMock.addResult({ data: null, error: null }); // insert
    adminMock.addResult({ data: null, error: null }); // project status update

    const r = await saveRoadmapInterviewV2(PROJECT_ID, validRoadmapV2());
    await flushAfterCallbacks();

    expect(r.success).toBe(true);

    const insertCalls = adminMock.chainable.insert.mock.calls as Array<[Record<string, unknown>]>;
    expect(insertCalls.length).toBeGreaterThan(0);
    const inserted = insertCalls[0][0];

    // snake_case 경로로 변환되었는지 확인
    expect(inserted.project_id).toBe(PROJECT_ID);
    expect(inserted.interviewer_id).toBe(USER_A);
    const cd = inserted.company_details as Record<string, unknown>;
    const overview = cd.roadmap_overview as Record<string, unknown>;
    expect(overview.establishment_necessity).toBe('공정 품질 편차 개선을 위한 AI 훈련');
    expect(overview.ai_competency_level).toBe('INTERMEDIATE');
    expect(overview.selected_tasks_summary).toBe('품질검사 자동화');

    // Ⅰ-2 신규 키 performance_activities 검증 (Task 2.7-a)
    expect(Array.isArray(overview.performance_activities)).toBe(true);

    // 감사로그 — schema_version 기록
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'INTERVIEW_CREATE',
        meta: expect.objectContaining({ schema_version: 'v2_camelCase' }),
      })
    );
  });

  // (#4) Lost update 차단 — 부분 patch 가 다른 필드를 보존하는지 검증.
  // 두 탭 동시 편집 시 stale base 로 인한 데이터 손실 방지의 핵심 가드.
  it('autoSave 부분 patch 가 기존 row 의 다른 필드를 보존한다 (deep merge)', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'ROADMAP' });

    // 기존 DB row 시뮬레이션 — companyRequirements 4개 필드 + overview 가 채워진 상태.
    // (양식 v2: 분석내용 text·역량 모델링·NCS 는 삭제되어 보존 대상이 아니다.)
    adminMock.addResult({
      data: {
        id: 'existing-interview-id',
        company_details: {
          roadmap_overview: {
            establishment_necessity: '기존 필요성',
            performance_activities: [],
            ai_competency_level: 'INTERMEDIATE',
            selected_tasks_summary: '기존 과업',
          },
          roadmap_company_requirements: {
            company_status: '기존 상태',
            main_problems: '기존 문제',
            push_willingness: '기존 의지',
            expected_outcomes: '기존 성과',
          },
        },
        job_tasks: [],
        improvement_goals: [],
      },
      error: null,
    });
    adminMock.addResult({ data: null, error: null }); // update

    // 사용자가 'problem' 필드만 변경한 상황 (인터뷰 검토 페이지 InlineEdit).
    const r = await saveRoadmapInterviewV2(
      PROJECT_ID,
      { companyRequirements: { problem: '새 문제' } },
      { autoSave: true }
    );
    expect(r.success).toBe(true);

    const updateCalls = adminMock.chainable.update.mock.calls as Array<[Record<string, unknown>]>;
    expect(updateCalls.length).toBeGreaterThan(0);
    const updated = updateCalls[0][0];
    const cd = updated.company_details as Record<string, unknown>;

    // problem 만 새값, 나머지 3개는 보존
    const cr = cd.roadmap_company_requirements as Record<string, unknown>;
    expect(cr.main_problems).toBe('새 문제');
    expect(cr.company_status).toBe('기존 상태');
    expect(cr.push_willingness).toBe('기존 의지');
    expect(cr.expected_outcomes).toBe('기존 성과');

    // 다른 섹션도 통째로 보존되었는지 확인 (이전 lost update 의 핵심 메커니즘)
    const overview = cd.roadmap_overview as Record<string, unknown>;
    expect(overview.establishment_necessity).toBe('기존 필요성');
    expect(overview.selected_tasks_summary).toBe('기존 과업');
  });

  it('HRD PDF extractedText 가 DB 의 extracted_text 로 save 된다 (Critical 리뷰 수정)', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'ROADMAP' });
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: null, error: null });

    const data = {
      ...validRoadmapV2(),
      hrdReportPdf: {
        fileName: 'hrd.pdf',
        url: 'p/hrd.pdf',
        size: 1024,
        extractedText: 'PDF 본문: 역량 점수 분포 …',
      },
    };

    const r = await saveRoadmapInterviewV2(PROJECT_ID, data);
    await flushAfterCallbacks();
    expect(r.success).toBe(true);

    const insertCalls = adminMock.chainable.insert.mock.calls as Array<[Record<string, unknown>]>;
    const inserted = insertCalls[0][0];
    const cd = inserted.company_details as Record<string, unknown>;
    const overview = cd.roadmap_overview as Record<string, unknown>;
    const attachment = overview.hrd_report_attachment as Record<string, unknown>;
    expect(attachment.extracted_text).toBe('PDF 본문: 역량 점수 분포 …');
  });
});

// ============================================================================
// submitRoadmapInterviewV2 (얇은 wrapper)
// ============================================================================

describe('submitRoadmapInterviewV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('strict 검증 통과 → success', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'ROADMAP' });
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: null, error: null });

    const r = await submitRoadmapInterviewV2(PROJECT_ID, validRoadmapV2());
    await flushAfterCallbacks();
    expect(r.success).toBe(true);
  });

  // 양식 v2 — Ⅲ-1 역량 모델링·NCS 삭제로 NCS XOR 검증 테스트는 제거됨.
});

// ============================================================================
// fetchRoadmapInterviewV2
// ============================================================================

describe('fetchRoadmapInterviewV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('인증되지 않은 사용자 → null', async () => {
    await mockCachedAuth({ authed: false });

    const r = await fetchRoadmapInterviewV2(PROJECT_ID);
    expect(r).toBeNull();
  });

  it('배정되지 않은 프로젝트 → null', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock, { assigned: false });

    const r = await fetchRoadmapInterviewV2(PROJECT_ID);
    expect(r).toBeNull();
  });

  it('PBL track → null', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'PBL' });

    const r = await fetchRoadmapInterviewV2(PROJECT_ID);
    expect(r).toBeNull();
  });

  it('종결된 프로젝트(closed_at 존재)여도 조회는 성공한다 (열람 유지 특성화)', async () => {
    await mockCachedAuth();
    serverMock.addResult({
      data: { id: PROJECT_ID, closed_at: '2026-07-29T00:00:00Z' },
      error: null,
    });
    mockProjectMeta(adminMock, { track: 'ROADMAP' });
    adminMock.addResult({
      data: {
        company_details: { roadmap_overview: { establishment_necessity: '종결 후 열람' } },
      },
      error: null,
    });

    const r = await fetchRoadmapInterviewV2(PROJECT_ID);
    expect(r).not.toBeNull();
    expect(r?.establishmentNecessity).toBe('종결 후 열람');
  });

  it('DB snake_case row → camelCase 복원 (extractedText 포함)', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'ROADMAP' });
    adminMock.addResult({
      data: {
        company_details: {
          roadmap_overview: {
            establishment_necessity: '테스트 필요성',
            performance_activities: [],
            ai_competency_level: 'ADVANCED',
            selected_tasks_summary: '선정 과업',
            hrd_report_attachment: {
              file_name: 'a.pdf',
              storage_path: 'p/a.pdf',
              size: 100,
              extracted_text: '내부 본문',
            },
          },
        },
      },
      error: null,
    });

    const r = await fetchRoadmapInterviewV2(PROJECT_ID);
    expect(r).not.toBeNull();
    expect(r?.establishmentNecessity).toBe('테스트 필요성');
    expect(r?.aiLevel).toBe('ADVANCED');
    expect(r?.selectedTask).toBe('선정 과업');
    // Critical 리뷰 수정: extractedText 가 camelCase 로 복원됨 (UI 는 미노출)
    expect(r?.hrdReportPdf).toEqual({
      fileName: 'a.pdf',
      url: 'p/a.pdf',
      size: 100,
      extractedText: '내부 본문',
    });
  });

  it('stt_insights 컬럼을 select 하여 camelCase sttInsights 키로 반환한다', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'ROADMAP' });
    const stt = {
      추가_업무: ['데이터 정리'],
      추가_페인포인트: ['Excel 수기 복붙'],
      숨은_니즈: ['PDF 자동 분류'],
      조직_맥락: 'TF 신설 직후',
      AI_태도: '호의적이나 보안 우려',
      주요_인용: ['실무자 시간이 부족'],
    };
    adminMock.addResult({
      data: {
        company_details: {},
        stt_insights: stt,
      },
      error: null,
    });

    const r = await fetchRoadmapInterviewV2(PROJECT_ID);
    expect(r).not.toBeNull();
    expect(r?.sttInsights).toEqual(stt);
  });
});

// ============================================================================
// savePBLInterviewV2 / submitPBLInterviewV2 / fetchPBLInterviewV2
// ============================================================================

describe('savePBLInterviewV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('인증되지 않은 사용자 → error', async () => {
    await mockCachedAuth({ authed: false });

    const r = await savePBLInterviewV2(PROJECT_ID, validPBLV2());
    expect(r.success).toBe(false);
  });

  it('프로젝트 track !== PBL → error', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'ROADMAP' });

    const r = await savePBLInterviewV2(PROJECT_ID, validPBLV2());
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/로드맵|PBL/);
  });

  it('autoSave=true — partial (빈 객체) 허용', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'PBL' });
    adminMock.addResult({ data: null, error: null }); // interviews maybeSingle
    adminMock.addResult({ data: null, error: null }); // insert

    const r = await savePBLInterviewV2(PROJECT_ID, {}, { autoSave: true });
    expect(r.success).toBe(true);
  });

  it('정상 제출 → pbl_data JSONB 에 camelCase 저장 + INTERVIEWED 전이', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'PBL' });
    adminMock.addResult({ data: null, error: null }); // maybeSingle
    adminMock.addResult({ data: null, error: null }); // insert
    adminMock.addResult({ data: null, error: null }); // status update

    const r = await savePBLInterviewV2(PROJECT_ID, validPBLV2());
    await flushAfterCallbacks();

    expect(r.success).toBe(true);

    const insertCalls = adminMock.chainable.insert.mock.calls as Array<[Record<string, unknown>]>;
    expect(insertCalls.length).toBeGreaterThan(0);
    const inserted = insertCalls[0][0];

    expect(inserted.project_id).toBe(PROJECT_ID);
    expect(inserted.interviewer_id).toBe(USER_A);
    const pblData = inserted.pbl_data as Record<string, unknown>;
    expect(pblData.companyName).toBe('테스트 기업');
    expect(pblData.courseName).toBe('AI 현장 문제해결 과정');

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PBL_INTERVIEW_SAVED',
        meta: expect.objectContaining({ schema_version: 'v2_camelCase' }),
      })
    );
  });

  // (#4) PBL Lost update 차단.
  it('autoSave 부분 patch 가 기존 pbl_data 의 다른 필드를 보존한다 (deep merge)', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'PBL' });

    // 기존 DB row — pbl_data 에 다수 필드 보유
    adminMock.addResult({
      data: {
        id: 'existing-pbl-interview-id',
        pbl_data: {
          companyName: '기존 기업',
          courseName: '기존 과정',
          trainingHours: 40,
          businessIssues: '기존 비즈니스 이슈',
        },
      },
      error: null,
    });
    adminMock.addResult({ data: null, error: null }); // update

    // 사용자가 courseName 만 변경
    const r = await savePBLInterviewV2(PROJECT_ID, { courseName: '새 과정' }, { autoSave: true });
    expect(r.success).toBe(true);

    const updateCalls = adminMock.chainable.update.mock.calls as Array<[Record<string, unknown>]>;
    expect(updateCalls.length).toBeGreaterThan(0);
    const updated = updateCalls[0][0];
    const pblData = updated.pbl_data as Record<string, unknown>;

    expect(pblData.courseName).toBe('새 과정');
    expect(pblData.companyName).toBe('기존 기업');
    expect(pblData.trainingHours).toBe(40);
    expect(pblData.businessIssues).toBe('기존 비즈니스 이슈');
  });
});

describe('submitPBLInterviewV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('strict 검증: hrdReportPdf=null 일 때 courseNecessity 필수', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'PBL' });

    const invalid = {
      ...validPBLV2(),
      hrdReportPdf: null,
      courseNecessity: '   ',
    };
    const r = await submitPBLInterviewV2(PROJECT_ID, invalid);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/HRD이음|필요성/);
  });
});

describe('fetchPBLInterviewV2', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });
  afterEach(() => vi.clearAllMocks());

  it('비배정 프로젝트 → null', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock, { assigned: false });
    const r = await fetchPBLInterviewV2(PROJECT_ID);
    expect(r).toBeNull();
  });

  it('ROADMAP track → null', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'ROADMAP' });
    const r = await fetchPBLInterviewV2(PROJECT_ID);
    expect(r).toBeNull();
  });

  it('pbl_data JSONB → camelCase 그대로 반환', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'PBL' });
    adminMock.addResult({
      data: { pbl_data: { companyName: '복원 기업', trainingHours: 80 } },
      error: null,
    });

    const r = await fetchPBLInterviewV2(PROJECT_ID);
    expect(r).toEqual({ companyName: '복원 기업', trainingHours: 80 });
  });

  it('interview 미존재 → 빈 객체', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'PBL' });
    adminMock.addResult({ data: null, error: null });

    const r = await fetchPBLInterviewV2(PROJECT_ID);
    expect(r).toEqual({});
  });

  it('HRD PDF extracted_text 가 camelCase extractedText 로 복원된다 (Critical 리뷰 수정)', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'PBL' });
    adminMock.addResult({
      data: {
        pbl_data: {
          companyName: '복원 기업',
          hrdReportPdf: {
            fileName: 'pbl-hrd.pdf',
            url: 'p/pbl.pdf',
            size: 1000,
            extractedText: 'PBL HRD 본문 키워드',
          },
        },
      },
      error: null,
    });

    const r = await fetchPBLInterviewV2(PROJECT_ID);
    // pbl_data 는 통째 스루이므로 camelCase 가 그대로 들어온다.
    expect(r?.hrdReportPdf?.extractedText).toBe('PBL HRD 본문 키워드');
  });
});
