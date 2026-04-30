/**
 * PR5 (R6 spec) — 인터뷰 검토 페이지 Server Actions 테스트.
 *
 * fetchLatestResultMeta / editInterviewFieldRoadmap / editInterviewFieldPbl /
 * triggerResultRegenerationFromReview 의 5단계 패턴 + 감사로그 분기 검증.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  fetchLatestResultMeta,
  editInterviewFieldRoadmap,
  editInterviewFieldPbl,
  triggerResultRegenerationFromReview,
} from '../actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/services/audit', () => ({ createAuditLog: vi.fn() }));
vi.mock('@/lib/supabase/cached', () => ({
  getCachedUser: vi.fn(),
  getCachedProfile: vi.fn(),
}));
vi.mock('../../actions', () => ({
  saveRoadmapInterviewV2: vi.fn(),
  savePBLInterviewV2: vi.fn(),
}));

const { pendingCallbacks, mockAfter } = vi.hoisted(() => {
  const pending: Promise<unknown>[] = [];
  const after = vi.fn((fn: () => void | Promise<unknown>) => {
    const r = fn();
    if (r && typeof (r as Promise<unknown>).then === 'function') pending.push(r as Promise<unknown>);
  });
  return { pendingCallbacks: pending, mockAfter: after };
});
vi.mock('next/server', () => ({ after: mockAfter }));

afterEach(() => {
  pendingCallbacks.length = 0;
});

const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';

async function mockAuth({
  authed = true,
  role = 'CONSULTANT_APPROVED',
}: { authed?: boolean; role?: string | null } = {}) {
  const cached = await import('@/lib/supabase/cached');
  vi.mocked(cached.getCachedUser).mockResolvedValue(
    (authed ? { id: USER_A, email: 'consultant@example.com' } : null) as never,
  );
  vi.mocked(cached.getCachedProfile).mockResolvedValue(
    (authed ? { id: USER_A, role, status: 'ACTIVE' } : null) as never,
  );
}

describe('interview/review/actions', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(async () => {
    vi.clearAllMocks();
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase({ authUser: { id: USER_A } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
    await mockAuth();
  });

  // ─── fetchLatestResultMeta ─────────────────────────────────────────────
  describe('fetchLatestResultMeta', () => {
    it('ROADMAP 트랙 — 최신 roadmap_versions row 의 created_at·status·id 반환', async () => {
      serverMock.addResult({
        data: {
          id: 'rv-1',
          created_at: '2026-04-29T09:00:00Z',
          status: 'DRAFT',
        },
        error: null,
      });

      const result = await fetchLatestResultMeta(PROJECT_ID, 'ROADMAP');
      expect(result).toEqual({
        createdAt: '2026-04-29T09:00:00Z',
        status: 'DRAFT',
        versionId: 'rv-1',
      });
    });

    it('PBL 트랙 — 최신 pbl_reports row 반환', async () => {
      serverMock.addResult({
        data: {
          id: 'pr-1',
          created_at: '2026-04-30T10:00:00Z',
          status: 'FINAL',
        },
        error: null,
      });

      const result = await fetchLatestResultMeta(PROJECT_ID, 'PBL');
      expect(result.createdAt).toBe('2026-04-30T10:00:00Z');
      expect(result.status).toBe('FINAL');
      expect(result.versionId).toBe('pr-1');
    });

    it('결과 row 없음 → 모든 필드 null', async () => {
      serverMock.addResult({ data: null, error: null });

      const result = await fetchLatestResultMeta(PROJECT_ID, 'ROADMAP');
      expect(result).toEqual({ createdAt: null, status: null, versionId: null });
    });
  });

  // ─── editInterviewFieldRoadmap ─────────────────────────────────────────
  describe('editInterviewFieldRoadmap', () => {
    it('인증 실패 → success: false', async () => {
      await mockAuth({ authed: false });
      const result = await editInterviewFieldRoadmap(PROJECT_ID, { foo: 'bar' });
      expect(result.success).toBe(false);
    });

    it('saveRoadmapInterviewV2 위임 + INTERVIEW_FIELD_EDITED 감사로그 분기', async () => {
      const { saveRoadmapInterviewV2 } = await import('../../actions');
      vi.mocked(saveRoadmapInterviewV2).mockResolvedValue({ success: true } as never);

      const result = await editInterviewFieldRoadmap(PROJECT_ID, {
        establishmentNecessity: 'new',
      });
      expect(result.success).toBe(true);
      expect(saveRoadmapInterviewV2).toHaveBeenCalledWith(
        PROJECT_ID,
        { establishmentNecessity: 'new' },
        { autoSave: true },
      );

      // after 콜백이 동기적으로 호출되어 감사로그가 기록됨
      const { createAuditLog } = await import('@/lib/services/audit');
      await Promise.all(pendingCallbacks);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INTERVIEW_FIELD_EDITED',
          targetType: 'project',
          targetId: PROJECT_ID,
          meta: expect.objectContaining({
            track: 'ROADMAP',
            field_paths: ['establishmentNecessity'],
            source: 'REVIEW_PAGE',
          }),
        }),
      );
    });

    it('saveRoadmapInterviewV2 실패 시 감사로그 기록 안 함', async () => {
      const { saveRoadmapInterviewV2 } = await import('../../actions');
      vi.mocked(saveRoadmapInterviewV2).mockResolvedValue({
        success: false,
        error: '저장 실패',
      } as never);

      const result = await editInterviewFieldRoadmap(PROJECT_ID, { foo: 'bar' });
      expect(result.success).toBe(false);

      const { createAuditLog } = await import('@/lib/services/audit');
      expect(createAuditLog).not.toHaveBeenCalled();
    });
  });

  // ─── editInterviewFieldPbl ─────────────────────────────────────────────
  describe('editInterviewFieldPbl', () => {
    it('savePBLInterviewV2 위임 + INTERVIEW_FIELD_EDITED (track: PBL) 감사로그', async () => {
      const { savePBLInterviewV2 } = await import('../../actions');
      vi.mocked(savePBLInterviewV2).mockResolvedValue({ success: true } as never);

      const result = await editInterviewFieldPbl(PROJECT_ID, { companyName: 'X' });
      expect(result.success).toBe(true);
      expect(savePBLInterviewV2).toHaveBeenCalledWith(
        PROJECT_ID,
        { companyName: 'X' },
        { autoSave: true },
      );

      const { createAuditLog } = await import('@/lib/services/audit');
      await Promise.all(pendingCallbacks);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INTERVIEW_FIELD_EDITED',
          meta: expect.objectContaining({ track: 'PBL', source: 'REVIEW_PAGE' }),
        }),
      );
    });
  });

  // ─── triggerResultRegenerationFromReview ───────────────────────────────
  describe('triggerResultRegenerationFromReview', () => {
    it('배정 컨설턴트가 아니면 차단', async () => {
      adminMock.addResult({
        data: { id: PROJECT_ID, assigned_consultant_id: 'other-user' },
        error: null,
      });

      const result = await triggerResultRegenerationFromReview(PROJECT_ID, 'ROADMAP');
      expect(result.success).toBe(false);
    });

    it('성공 시 RESULT_REGENERATED_FROM_REVIEW 감사로그 + resultPath 반환 (ROADMAP)', async () => {
      adminMock.addResult({
        data: { id: PROJECT_ID, assigned_consultant_id: USER_A },
        error: null,
      });
      // fetchLatestResultMeta 의 select (server client)
      serverMock.addResult({
        data: { id: 'rv-1', created_at: '2026-04-29T09:00:00Z', status: 'DRAFT' },
        error: null,
      });

      const result = await triggerResultRegenerationFromReview(PROJECT_ID, 'ROADMAP');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resultPath).toBe(`/consultant/projects/${PROJECT_ID}/roadmap`);
      }

      const { createAuditLog } = await import('@/lib/services/audit');
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESULT_REGENERATED_FROM_REVIEW',
          targetType: 'roadmap',
          meta: expect.objectContaining({
            track: 'ROADMAP',
            triggered_from: 'REVIEW_BANNER',
            previous_version_id: 'rv-1',
            previous_version_status: 'DRAFT',
          }),
        }),
      );
    });

    it('PBL 트랙 — resultPath 가 /pbl 로 반환', async () => {
      adminMock.addResult({
        data: { id: PROJECT_ID, assigned_consultant_id: USER_A },
        error: null,
      });
      serverMock.addResult({
        data: { id: 'pr-1', created_at: '2026-04-30T10:00:00Z', status: 'FINAL' },
        error: null,
      });

      const result = await triggerResultRegenerationFromReview(PROJECT_ID, 'PBL');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resultPath).toBe(`/consultant/projects/${PROJECT_ID}/pbl`);
      }
    });
  });
});
