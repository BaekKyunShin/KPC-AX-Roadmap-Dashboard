import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDraftVersion,
  deleteDraft,
  finalizePBL,
  getLatestFinal,
  getPBLReport,
  listVersions,
  sharePBL,
  updateDraft,
} from './pbl-crud';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';
import type { PBLContent } from './pbl-types';
import { PBL_EVALUATION_SCALE_DESCRIPTION } from './pbl-types';
import { createEmptyOutcomeAnalysis } from './__fixtures__/empty-outcome-analysis';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));
vi.mock('../audit', () => ({
  createAuditLog: vi.fn(),
}));
vi.mock('../notification', () => ({
  createNotificationForAdmins: vi.fn(),
}));

// ============================================================================
// 공통 유틸: Supabase 체인 모킹을 "의도별 레시피"로 구성
// ============================================================================

function minimalValidPBLContent(): PBLContent {
  return {
    operation_plan: {
      training_goal: '목표',
      ai_tool_usage_plan: [
        { stage: '1단계', main_activity: '훈련실시', ai_tools: ['A'], utilized_data: 'd', purpose: 'p', specific_method: 'm' },
        { stage: '2단계', main_activity: '피드백', ai_tools: ['B'], utilized_data: 'd', purpose: 'p', specific_method: 'm' },
        { stage: '3단계', main_activity: '평가', ai_tools: ['C'], utilized_data: 'd', purpose: 'p', specific_method: 'm' },
      ],
      training_plan: {
        overview: { course_name: 'C', training_period: { start: '', end: '' } },
        learning_group: { instructors: [], trainees: [] },
        subject_profile: {
          course_name: 'C',
          total_hours: 8,
          training_goals: ['g'],
          ai_tools: ['A'],
          utilized_data: 'd',
          analysis_method: 'LLM',
          training_contents: [
            {
              unit_name: 'u',
              detail: 'd',
              training_hours: 8,
              instructor_hours: { external: 4, internal: 4 },
            },
          ],
          total_sum_hours: 8,
        },
        facilities: [],
        training_instructors: [],
      },
      evaluation_plan: {
        course_evaluation: {
          course_name: 'C',
          evaluation_methods: ['포트폴리오'],
          evaluation_target: 't',
          evaluation_date: '2026-01-01',
          evaluation_criteria: 'c',
          evaluation_result: '예정',
          performance_checklist: [
            { unit_name: 'u', evaluation_criteria: 'c', performance_level: 4 },
          ],
          overall_comment: '',
          evaluation_scale: PBL_EVALUATION_SCALE_DESCRIPTION,
        },
        result_evaluation: {
          satisfaction_survey: [null, null, null, null, null],
          achievement_survey: [null, null, null],
          external_expert_survey: [null, null, null, null, null],
          practical_application_survey: [null, null, null, null],
        },
      },
    },
    outcome_analysis: createEmptyOutcomeAnalysis(),
  };
}

function buildRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pbl-1',
    project_id: 'proj-1',
    version_number: 1,
    status: 'DRAFT' as const,
    consultant_profile_snapshot: {},
    diagnosis_summary: '요약',
    pbl_content: minimalValidPBLContent(),
    free_tool_validated: true,
    time_limit_validated: true,
    revision_prompt: null,
    is_shared: false,
    like_count: 0,
    created_by: 'u-1',
    finalized_by: null,
    finalized_at: null,
    created_at: '2026-04-18T00:00:00Z',
    updated_at: '2026-04-18T00:00:00Z',
    ...overrides,
  };
}

// ============================================================================
// tests
// ============================================================================

describe('pbl-crud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createDraftVersion', () => {
    it('프로필 스냅샷을 채우고 version_number=prev+1로 저장한다', async () => {
      const inserted = buildRow({ version_number: 3 });

      // supabase.from(table).select(...).eq(...)... 체인
      const insertSelectSingle = vi.fn().mockResolvedValue({ data: inserted, error: null });
      const insertSelect = vi.fn().mockReturnValue({ single: insertSelectSingle });
      const insert = vi.fn().mockReturnValue({ select: insertSelect });

      const projectSingle = vi
        .fn()
        .mockResolvedValue({ data: { assigned_consultant_id: 'cons-1' }, error: null });
      const profileSingle = vi.fn().mockResolvedValue({
        data: { user_id: 'cons-1', expertise_domains: ['AI'] },
        error: null,
      });
      const latestMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { version_number: 2 }, error: null });

      const fromCalls: string[] = [];
      const client = {
        from: vi.fn((table: string) => {
          fromCalls.push(table);
          if (table === 'projects') {
            return {
              select: () => ({
                eq: () => ({ single: projectSingle }),
              }),
            };
          }
          if (table === 'consultant_profiles') {
            return {
              select: () => ({
                eq: () => ({ single: profileSingle }),
              }),
            };
          }
          if (table === 'pbl_reports') {
            // SELECT for latest + INSERT
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({ maybeSingle: latestMaybeSingle }),
                  }),
                }),
              }),
              insert,
            };
          }
          throw new Error(`Unexpected from: ${table}`);
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(client as never);

      const result = await createDraftVersion(
        'proj-1',
        minimalValidPBLContent(),
        'u-1',
        '요약',
        null,
      );

      expect(result.version_number).toBe(3);
      const insertPayload = insert.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(insertPayload.version_number).toBe(3);
      expect(insertPayload.project_id).toBe('proj-1');
      expect(insertPayload.status).toBe('DRAFT');
      expect(insertPayload.consultant_profile_snapshot).toMatchObject({
        user_id: 'cons-1',
      });
    });

    it('컨설턴트 배정이 없으면 snapshot은 {}로 저장', async () => {
      const inserted = buildRow();
      const insert = vi
        .fn()
        .mockReturnValue({ select: () => ({ single: vi.fn().mockResolvedValue({ data: inserted, error: null }) }) });

      const client = {
        from: vi.fn((table: string) => {
          if (table === 'projects') {
            return {
              select: () => ({
                eq: () => ({
                  single: vi.fn().mockResolvedValue({ data: { assigned_consultant_id: null }, error: null }),
                }),
              }),
            };
          }
          if (table === 'pbl_reports') {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
              insert,
            };
          }
          throw new Error(`Unexpected from: ${table}`);
        }),
      };

      vi.mocked(createAdminClient).mockReturnValue(client as never);

      await createDraftVersion('proj-1', minimalValidPBLContent(), 'u-1', '', null);

      const payload = insert.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(payload.consultant_profile_snapshot).toEqual({});
      expect(payload.version_number).toBe(1);
    });
  });

  describe('updateDraft', () => {
    it('DRAFT 상태가 아니면 예외', async () => {
      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'pbl-1', status: 'FINAL' }, error: null }),
            }),
          }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);

      await expect(
        updateDraft('pbl-1', { pbl_content: minimalValidPBLContent() }),
      ).rejects.toThrow(/DRAFT 상태/);
    });

    it('DRAFT일 때 update 호출', async () => {
      const updated = buildRow({ diagnosis_summary: '새요약' });
      const updateSelectSingle = vi.fn().mockResolvedValue({ data: updated, error: null });

      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'pbl-1', status: 'DRAFT' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: () => ({ select: () => ({ single: updateSelectSingle }) }),
          }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);

      const result = await updateDraft('pbl-1', { diagnosis_summary: '새요약' });
      expect(result.diagnosis_summary).toBe('새요약');
    });
  });

  describe('finalizePBL', () => {
    it('RPC 성공 시 감사로그·알림 발행', async () => {
      const client = {
        rpc: vi.fn().mockResolvedValue({
          data: { success: true, project_id: 'proj-1', version_number: 2 },
          error: null,
        }),
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({
                data: { company_name: '테스트기업', is_test_mode: false },
                error: null,
              }),
            }),
          }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);
      vi.mocked(createAuditLog).mockResolvedValue(undefined);
      vi.mocked(createNotificationForAdmins).mockResolvedValue(undefined);

      await finalizePBL('pbl-1', 'user-1');

      expect(client.rpc).toHaveBeenCalledWith('finalize_pbl', {
        p_pbl_report_id: 'pbl-1',
        p_actor_user_id: 'user-1',
      });
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PBL_REPORT_FINALIZED' }),
      );
      expect(createNotificationForAdmins).toHaveBeenCalled();
    });

    it('RPC success=false면 예외', async () => {
      const client = {
        rpc: vi.fn().mockResolvedValue({ data: { success: false, error: '권한 없음' }, error: null }),
        from: vi.fn(),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);

      await expect(finalizePBL('pbl-1', 'user-1')).rejects.toThrow('권한 없음');
    });

    it('테스트 모드 프로젝트는 알림을 보내지 않는다', async () => {
      const client = {
        rpc: vi.fn().mockResolvedValue({
          data: { success: true, project_id: 'proj-1', version_number: 1 },
          error: null,
        }),
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({
                data: { company_name: '테스트', is_test_mode: true },
                error: null,
              }),
            }),
          }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);

      await finalizePBL('pbl-1', 'user-1');

      expect(createNotificationForAdmins).not.toHaveBeenCalled();
    });
  });

  describe('listVersions / getLatestFinal / getPBLReport', () => {
    it('listVersions은 버전 목록을 내림차순으로 반환', async () => {
      const rows = [buildRow({ version_number: 3 }), buildRow({ id: 'pbl-2', version_number: 2 })];
      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              order: vi.fn().mockResolvedValue({ data: rows, error: null }),
            }),
          }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);

      const result = await listVersions('proj-1');
      expect(result).toHaveLength(2);
      expect(result[0]!.version_number).toBe(3);
    });

    it('getLatestFinal은 FINAL 최신 1건', async () => {
      const row = buildRow({ status: 'FINAL' });
      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }) }),
                }),
              }),
            }),
          }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);

      const result = await getLatestFinal('proj-1');
      expect(result?.status).toBe('FINAL');
    });

    it('getPBLReport는 id로 단건 조회', async () => {
      const row = buildRow();
      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
            }),
          }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);
      const result = await getPBLReport('pbl-1');
      expect(result?.id).toBe('pbl-1');
    });
  });

  describe('deleteDraft', () => {
    it('DRAFT가 아니면 예외', async () => {
      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { status: 'FINAL' }, error: null }),
            }),
          }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);
      await expect(deleteDraft('pbl-1')).rejects.toThrow(/DRAFT 상태/);
    });

    it('대상 보고서가 없으면 "찾을 수 없습니다" 예외', async () => {
      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);
      await expect(deleteDraft('pbl-missing')).rejects.toThrow(/찾을 수 없습니다/);
    });

    it('DRAFT면 delete 호출', async () => {
      const deleteEq = vi.fn().mockResolvedValue({ error: null });
      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { status: 'DRAFT' }, error: null }),
            }),
          }),
          delete: vi.fn().mockReturnValue({ eq: deleteEq }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);
      await deleteDraft('pbl-1');
      expect(deleteEq).toHaveBeenCalledWith('id', 'pbl-1');
    });

    it('delete 에러 응답 시 "삭제 실패" 예외', async () => {
      const deleteEq = vi
        .fn()
        .mockResolvedValue({ error: { message: 'FK 제약 위반' } });
      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { status: 'DRAFT' }, error: null }),
            }),
          }),
          delete: vi.fn().mockReturnValue({ eq: deleteEq }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);
      await expect(deleteDraft('pbl-1')).rejects.toThrow(/삭제 실패.*FK 제약/);
    });
  });

  describe('sharePBL', () => {
    it('FINAL 상태만 공유 허용', async () => {
      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { status: 'DRAFT' }, error: null }),
            }),
          }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);
      await expect(sharePBL('pbl-1', true)).rejects.toThrow(/FINAL 상태/);
    });

    it('FINAL이면 is_shared 업데이트', async () => {
      const row = buildRow({ status: 'FINAL', is_shared: true });
      const updateEq = vi.fn().mockReturnValue({
        select: () => ({ single: vi.fn().mockResolvedValue({ data: row, error: null }) }),
      });
      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'pbl-1', status: 'FINAL' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({ eq: updateEq }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);

      const result = await sharePBL('pbl-1', true);
      expect(result.is_shared).toBe(true);
    });

    it('fetch 에러 응답 시 "찾을 수 없습니다" 예외', async () => {
      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS 거부' } }),
            }),
          }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);
      await expect(sharePBL('pbl-1', true)).rejects.toThrow(/찾을 수 없습니다/);
    });

    it('update 에러 응답 시 "공유 토글 실패" 예외', async () => {
      const updateEq = vi.fn().mockReturnValue({
        select: () => ({
          single: vi
            .fn()
            .mockResolvedValue({ data: null, error: { message: '동시성 충돌' } }),
        }),
      });
      const client = {
        from: vi.fn(() => ({
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'pbl-1', status: 'FINAL' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({ eq: updateEq }),
        })),
      };
      vi.mocked(createAdminClient).mockReturnValue(client as never);

      await expect(sharePBL('pbl-1', true)).rejects.toThrow(/공유 토글 실패.*동시성/);
    });
  });
});
