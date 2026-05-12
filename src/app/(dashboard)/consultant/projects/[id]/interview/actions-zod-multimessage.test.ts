/**
 * #1 — 인터뷰 Server Action Zod 다중 메시지 테스트
 *
 * 변경 대상 3개 함수의 Zod 검증 실패 시 에러 메시지 직렬화 동작:
 *   - saveRoadmapInterview      (v1 / 산인공 양식 1)
 *   - saveRoadmapInterviewV2    (v2 / camelCase strict)
 *   - savePBLInterviewV2        (v2 / camelCase strict)
 *
 * PBL v1(`savePBLInterview`) 은 클라이언트 호출 없는 dead code 로 확인되어 제거됨.
 * 본 PR 에서 PBL 보고서 생성 경로 V2 정렬과 함께 정리. 로드맵 v1 은 별도 후속 PR
 * 에서 처리.
 *
 * 기대 동작:
 *   - 다수 필드 누락 시: `validation.error.errors` 의 모든 메시지를
 *     `\n` 으로 join 하여 한 번에 반환 (최대 5줄, slice(0, 5))
 *   - 단일 필드만 누락 시: 1줄만 반환 (회귀: 단일 케이스도 동작)
 *   - errors 가 비어있는 엣지 케이스: fallback 메시지 반환
 *
 * mock 큐 패턴은 인접 actions-roadmap.test.ts (v1) 와 actions-v2.test.ts (v2)
 * 의 setup 을 그대로 미러링한다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveRoadmapInterview,
  saveRoadmapInterviewV2,
  savePBLInterviewV2,
} from './actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/services/audit', () => ({ createAuditLog: vi.fn() }));
vi.mock('@/lib/services/activity-log', () => ({ insertSystemActivityLog: vi.fn() }));
vi.mock('@/lib/services/notification', () => ({ createNotificationForAdmins: vi.fn() }));
vi.mock('@/lib/supabase/cached', () => ({
  getCachedUser: vi.fn(),
  getCachedProfile: vi.fn(),
}));
vi.mock('@/lib/services/file-parser', () => ({
  extractTextFromAttachment: vi.fn(async () => ({ text: 'mocked' })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/server', () => ({ after: vi.fn() }));

// ─── 공통 상수 ──────────────────────────────────────────────────────────────

const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';

/**
 * V2 헬퍼: requireAuth 가 캐시에서 user/profile 을 읽으므로
 * cached 모듈을 모킹한다.
 */
async function mockCachedAuth({
  authed = true,
  role = 'CONSULTANT_APPROVED',
  status = 'ACTIVE',
}: { authed?: boolean; role?: string | null; status?: string | null } = {}) {
  const cached = await import('@/lib/supabase/cached');
  vi.mocked(cached.getCachedUser).mockResolvedValue(
    (authed ? { id: USER_A, email: 'consultant@example.com' } : null) as never,
  );
  vi.mocked(cached.getCachedProfile).mockResolvedValue(
    (authed ? { id: USER_A, role, status } : null) as never,
  );
}

/** V2 — requireConsultantProjectAccess 의 server side projects select */
function mockProjectAssignmentCheck(
  serverMock: ReturnType<typeof createMockSupabase>,
  { assigned = true }: { assigned?: boolean } = {},
) {
  serverMock.addResult({
    data: assigned ? { id: PROJECT_ID } : null,
    error: null,
  });
}

/** V2 — fetchProjectMetaForInterview 의 admin side projects select */
function mockProjectMeta(
  adminMock: ReturnType<typeof createMockSupabase>,
  meta: {
    track?: 'ROADMAP' | 'PBL';
    status?: string;
    company_name?: string;
    is_test_mode?: boolean;
  } = {},
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

// ─── 테스트 ─────────────────────────────────────────────────────────────────

describe('Server Action Zod 다중 메시지 (#1)', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => vi.clearAllMocks());

  // ────────────────────────────────────────────────────────────────────────
  // saveRoadmapInterview (v1)
  // ────────────────────────────────────────────────────────────────────────
  it('saveRoadmapInterview — 필수 필드 3개 이상 비우면 모든 메시지가 줄바꿈으로 반환', async () => {
    await mockCachedAuth();
    // v1 은 직접 supabase.from('projects').select().eq().eq().single() 한 번만 호출
    serverMock.addResult({
      data: {
        id: PROJECT_ID,
        status: 'ASSIGNED',
        track: 'ROADMAP',
        assigned_consultant_id: USER_A,
        company_name: '테스트',
        is_test_mode: false,
      },
      error: null,
    });

    // overview 미존재 + interview_date 빈 값 + participants 빈 배열 + task_workflow_items 빈 배열 등
    // → 다수 issue 발생 (실측 13개)
    const invalid = {
      interview_date: '',
      interview_round: 1,
      interview_start_time: '',
      interview_end_time: '',
      interview_method: 'ONSITE' as const,
      participants: [],
      company_requirements: {
        company_status: '',
        main_problems: '',
        push_willingness: '',
        expected_outcomes: '',
      },
      task_workflow_items: [],
      training_targets: [],
    };

    const r = await saveRoadmapInterview(
      PROJECT_ID,
      invalid as never,
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      const lines = r.error.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(5);
      // 모든 라인이 비어있지 않은 메시지
      for (const line of lines) {
        expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // saveRoadmapInterviewV2 (v2 / camelCase strict)
  // ────────────────────────────────────────────────────────────────────────
  it('saveRoadmapInterviewV2 — 필수 필드 3개 이상 비우면 모든 메시지가 줄바꿈으로 반환', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'ROADMAP' });

    // strict 스키마에 빈 객체 전달 → 다수 필드 누락
    const r = await saveRoadmapInterviewV2(PROJECT_ID, {});
    expect(r.success).toBe(false);
    if (!r.success) {
      const lines = r.error.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(5);
      for (const line of lines) {
        expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // savePBLInterviewV2 (v2 / camelCase strict)
  // ────────────────────────────────────────────────────────────────────────
  it('savePBLInterviewV2 — 필수 필드 3개 이상 비우면 모든 메시지가 줄바꿈으로 반환', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'PBL' });

    // PBLInterviewStrictSchema 에 빈 객체 → 다수 필드 누락
    const r = await savePBLInterviewV2(PROJECT_ID, {});
    expect(r.success).toBe(false);
    if (!r.success) {
      const lines = r.error.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(5);
      for (const line of lines) {
        expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // 회귀: 단일 필드만 비우면 1줄만 반환
  // ────────────────────────────────────────────────────────────────────────
  it('빈 필드 1개만 비우면 1줄만 반환 (회귀: 단일 케이스도 동작)', async () => {
    await mockCachedAuth();
    serverMock.addResult({
      data: {
        id: PROJECT_ID,
        status: 'ASSIGNED',
        track: 'ROADMAP',
        assigned_consultant_id: USER_A,
        company_name: '테스트',
        is_test_mode: false,
      },
      error: null,
    });

    // 정상 데이터에서 training_targets 만 빈 배열로 → 1개 issue
    const valid = {
      overview: {
        establishment_necessity: '공정 품질 편차 개선',
        ai_competency_level: 'INTERMEDIATE' as const,
        selected_tasks_summary: '품질검사 자동화',
      },
      interview_date: '2026-04-16',
      interview_round: 1,
      interview_start_time: '09:00',
      interview_end_time: '11:00',
      interview_method: 'ONSITE' as const,
      participants: [{ id: 'p1', name: '홍길동', position: '팀장' }],
      company_requirements: {
        company_status: '제조업',
        main_problems: '품질 편차',
        push_willingness: '적극 지원',
        expected_outcomes: '15% 개선',
      },
      task_workflow_items: [{
        id: 't1',
        job: '생산',
        task_name: '검사',
        as_is: '육안',
        problems: '편차',
        data_availability: '2년치',
        ai_necessity: 4,
      }],
      analysis_notes: { text: '', attachment_files: [] },
      training_targets: [], // 단일 누락
      competency_models: [{
        id: 'cm1',
        competency_name: '품질 검사 데이터 해석',
        competency_definition: '검사 이미지 데이터에서 불량 패턴을 식별',
        knowledge: '이미지 분류 기초',
        skill: '이미지 레이블링',
        attitude: '데이터 기반 의사결정',
      }],
      ncs_usage: {
        uses_ncs: false,
        competency_derivation_method: '현장 인터뷰 + 벤치마킹',
      },
      notes: '',
    };

    const r = await saveRoadmapInterview(PROJECT_ID, valid as never);
    expect(r.success).toBe(false);
    if (!r.success) {
      const lines = r.error.split('\n');
      expect(lines.length).toBe(1);
      expect(lines[0].trim().length).toBeGreaterThan(0);
    }
  });

});
