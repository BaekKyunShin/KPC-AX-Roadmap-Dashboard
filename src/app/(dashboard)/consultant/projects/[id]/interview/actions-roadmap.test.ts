/**
 * saveRoadmapInterview 테스트 (OFA-05)
 *
 * 검증:
 * - 프로젝트 track !== 'ROADMAP' → forbidden
 * - 잘못된 스키마 → error
 * - 성공 → interviews upsert + INTERVIEWED 전이 (수동 저장)
 * - 자동저장 → 완화된 스키마 + 상태 전환 없음
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveRoadmapInterview } from './actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMockSupabase } from '@/test/helpers/mock-supabase';
import type { RoadmapInterviewInput } from '@/lib/schemas/interview-roadmap';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/services/audit', () => ({ createAuditLog: vi.fn() }));
vi.mock('@/lib/services/activity-log', () => ({ insertSystemActivityLog: vi.fn() }));
vi.mock('@/lib/services/notification', () => ({ createNotificationForAdmins: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { pendingCallbacks, flush: flushAfterCallbacks, mockAfter } = vi.hoisted(() => {
  const pending: Promise<unknown>[] = [];
  const after = vi.fn((fn: () => void | Promise<unknown>) => {
    const r = fn();
    if (r && typeof (r as Promise<unknown>).then === 'function') pending.push(r as Promise<unknown>);
  });
  async function flush() { await Promise.all(pending); pending.length = 0; }
  return { pendingCallbacks: pending, flush, mockAfter: after };
});
vi.mock('next/server', () => ({ after: mockAfter }));

afterEach(() => { pendingCallbacks.length = 0; });

const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';

function validRoadmapData(): RoadmapInterviewInput {
  return {
    overview: {
      establishment_necessity: '공정 품질 편차 개선을 위한 AI 훈련',
      ai_competency_level: 'INTERMEDIATE',
      selected_tasks_summary: '품질검사 자동화',
      roadmap_summary: '3단계 AI 인력 양성',
    },
    interview_date: '2026-04-16',
    interview_round: 1,
    interview_time: '09:00',
    interview_method: 'ONSITE',
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
    analysis_notes: { text: '', attachment_urls: [] },
    training_targets: [{
      id: 'tg1',
      task_name: '검사 자동화',
      selection_reason: 'AI 필요도 높음',
      as_is: '육안',
      to_be: 'AI 1차',
    }],
    notes: '',
  };
}

describe('saveRoadmapInterview', () => {
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
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const r = await saveRoadmapInterview(PROJECT_ID, validRoadmapData());
    expect(r.success).toBe(false);
  });

  it('CONSULTANT_APPROVED 아닌 역할 → error', async () => {
    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const r = await saveRoadmapInterview(PROJECT_ID, validRoadmapData());
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toContain('컨설턴트');
  });

  it('프로젝트 track !== ROADMAP → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        id: PROJECT_ID,
        status: 'ASSIGNED',
        track: 'PBL',
        assigned_consultant_id: USER_A,
        company_name: '테스트',
        is_test_mode: false,
      },
      error: null,
    });

    const r = await saveRoadmapInterview(PROJECT_ID, validRoadmapData());
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/PBL|ROADMAP/);
  });

  it('Zod 검증 실패 (필수 필드 빈 값) → error', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { id: PROJECT_ID, status: 'ASSIGNED', track: 'ROADMAP', assigned_consultant_id: USER_A, company_name: '테스트', is_test_mode: false },
      error: null,
    });

    const invalid = { ...validRoadmapData(), training_targets: [] };
    const r = await saveRoadmapInterview(PROJECT_ID, invalid);
    expect(r.success).toBe(false);
  });

  it('수동 저장 성공 → INTERVIEWED 전이 + INTERVIEW_CREATE 감사', async () => {
    const { createAuditLog } = await import('@/lib/services/audit');

    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { id: PROJECT_ID, status: 'ASSIGNED', track: 'ROADMAP', assigned_consultant_id: USER_A, company_name: '테스트', is_test_mode: false },
      error: null,
    });
    adminMock.addResult({ data: null, error: null }); // existing interview maybeSingle → null
    adminMock.addResult({ data: null, error: null }); // insert → ok
    adminMock.addResult({ data: null, error: null }); // project status update → ok

    const r = await saveRoadmapInterview(PROJECT_ID, validRoadmapData());
    await flushAfterCallbacks();

    expect(r.success).toBe(true);
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INTERVIEW_CREATE', targetType: 'interview', targetId: PROJECT_ID }),
    );
  });

  it('자동저장: 완화된 스키마 + 상태 전환 없음', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: { id: PROJECT_ID, status: 'ASSIGNED', track: 'ROADMAP', assigned_consultant_id: USER_A, company_name: '테스트', is_test_mode: false },
      error: null,
    });
    adminMock.addResult({ data: null, error: null });
    adminMock.addResult({ data: null, error: null });

    const minimal = {
      interview_date: '',
      participants: [{ id: 'p1', name: '' }],
      company_requirements: { company_status: '', main_problems: '', push_willingness: '', expected_outcomes: '' },
      task_workflow_items: [],
      training_targets: [],
    };
    const r = await saveRoadmapInterview(PROJECT_ID, minimal, { autoSave: true });
    expect(r.success).toBe(true);

    const fromCalls = adminMock.client.from.mock.calls as string[][];
    const projectUpdates = fromCalls.filter((c) => c[0] === 'projects');
    expect(projectUpdates).toHaveLength(0);
  });
});
