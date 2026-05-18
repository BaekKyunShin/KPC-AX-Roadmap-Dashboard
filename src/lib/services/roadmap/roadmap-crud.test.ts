/**
 * roadmap-crud.ts 테스트 (산인공 4섹션 구조)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  finalizeRoadmap,
  fetchRoadmapVersions,
  fetchRoadmapVersion,
  updateRoadmapManually,
} from './roadmap-crud';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';
import { validateRoadmap } from './roadmap-validator';
import { createMockSupabase } from '@/test/helpers/mock-supabase';
import type {
  RoadmapAnnualPlan,
  RoadmapCompetency,
  RoadmapCourseSpec,
  RoadmapTrainingStructureItem,
  ValidationResult,
} from './roadmap-types';

// ─── 모킹 ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('../audit', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('../notification', () => ({
  createNotificationForAdmins: vi.fn(),
}));

vi.mock('./roadmap-validator', () => ({
  validateRoadmap: vi.fn(),
}));

// ─── finalizeRoadmap 전용 Supabase 모킹 ───────────────────────────────────

function createFinalizeMockSupabase() {
  // single() 응답 큐 — sanitize-select(roadmap row) → project select 순서로 소비.
  // 사용자가 setRoadmapRowQueryResult / setProjectQueryResult 호출 순서대로 큐에 push.
  const singleQueue: Array<{ data: unknown; error: unknown }> = [];
  const singleFn = vi.fn(async () => {
    if (singleQueue.length > 0) return singleQueue.shift()!;
    return { data: null, error: null };
  });
  const eqFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  const updateEqFn = vi.fn().mockResolvedValue({ data: null, error: null });
  const updateFn = vi.fn().mockReturnValue({ eq: updateEqFn });

  const mockClient = {
    rpc: vi.fn(),
    from: vi.fn().mockReturnValue({ select: selectFn, update: updateFn }),
  };

  return {
    mockClient,
    updateFn,
    setRpcResult: (r: { data: unknown; error: unknown }) => {
      mockClient.rpc.mockResolvedValue(r);
    },
    /** sanitize 단계의 roadmap row select 응답 */
    setRoadmapRowQueryResult: (r: { data: unknown; error: unknown }) => {
      singleQueue.push(r);
    },
    /** 알림 단계의 project 행 single 응답 */
    setProjectQueryResult: (r: { data: unknown; error: unknown }) => {
      singleQueue.push(r);
    },
  };
}

// ─── finalizeRoadmap ──────────────────────────────────────────────────────

describe('finalizeRoadmap', () => {
  let mock: ReturnType<typeof createFinalizeMockSupabase>;

  beforeEach(() => {
    mock = createFinalizeMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mock.mockClient as never);
    vi.mocked(createAuditLog).mockResolvedValue(undefined);
    vi.mocked(createNotificationForAdmins).mockResolvedValue(undefined);
  });

  afterEach(() => vi.clearAllMocks());

  // sanitize-select 단계용 최소 row stub (정책 이전 후 매 finalize 호출이 select 수행)
  const minimalRoadmapRow = {
    id: 'rv',
    project_id: 'p',
    version_number: 1,
    status: 'DRAFT',
    diagnosis_summary: '',
    roadmap_matrix: [],
    pbl_course: {},
    courses: [],
  };

  it('RPC를 올바른 파라미터로 호출한다', async () => {
    mock.setRoadmapRowQueryResult({ data: minimalRoadmapRow, error: null });
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-1', version_number: 2 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '테스트기업', is_test_mode: false },
      error: null,
    });

    await finalizeRoadmap('roadmap-1', 'user-1');

    expect(mock.mockClient.rpc).toHaveBeenCalledWith('finalize_roadmap', {
      p_roadmap_id: 'roadmap-1',
      p_actor_user_id: 'user-1',
    });
  });

  it('성공 시 감사로그를 기록한다', async () => {
    mock.setRoadmapRowQueryResult({ data: minimalRoadmapRow, error: null });
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-1', version_number: 3 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '감사기업', is_test_mode: false },
      error: null,
    });

    await finalizeRoadmap('roadmap-2', 'user-2');

    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: 'user-2',
      action: 'ROADMAP_FINALIZE',
      targetType: 'roadmap',
      targetId: 'roadmap-2',
      meta: { project_id: 'proj-1', version_number: 3 },
    });
  });

  it('성공 시 알림을 보낸다 (비테스트 모드)', async () => {
    mock.setRoadmapRowQueryResult({ data: minimalRoadmapRow, error: null });
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-1', version_number: 1 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '알림기업', is_test_mode: false },
      error: null,
    });

    await finalizeRoadmap('roadmap-3', 'user-3');

    expect(createNotificationForAdmins).toHaveBeenCalledWith({
      type: 'roadmap_finalized',
      title: '로드맵 확정',
      message: '알림기업 프로젝트 로드맵이 최종 확정되었습니다.',
      link: '/ops/projects/proj-1',
    });
  });

  it('테스트 모드 프로젝트는 알림 미발송', async () => {
    mock.setRoadmapRowQueryResult({ data: minimalRoadmapRow, error: null });
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-test', version_number: 1 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '테스트기업', is_test_mode: true },
      error: null,
    });

    await finalizeRoadmap('roadmap-4', 'user-4');

    expect(createNotificationForAdmins).not.toHaveBeenCalled();
  });

  it('success: false → error 메시지로 throw', async () => {
    mock.setRoadmapRowQueryResult({ data: minimalRoadmapRow, error: null });
    mock.setRpcResult({
      data: { success: false, error: '배정된 컨설턴트만 최종 확정할 수 있습니다.' },
      error: null,
    });

    await expect(finalizeRoadmap('roadmap-5', 'user-5')).rejects.toThrow(
      '배정된 컨설턴트만 최종 확정할 수 있습니다.',
    );
  });

  it('RPC error → 기본 메시지로 throw', async () => {
    mock.setRoadmapRowQueryResult({ data: minimalRoadmapRow, error: null });
    mock.setRpcResult({ data: null, error: { message: 'DB error' } });
    await expect(finalizeRoadmap('r', 'u')).rejects.toThrow('로드맵 확정에 실패했습니다.');
  });

  it('RPC data=null → 기본 메시지로 throw', async () => {
    mock.setRoadmapRowQueryResult({ data: minimalRoadmapRow, error: null });
    mock.setRpcResult({ data: null, error: null });
    await expect(finalizeRoadmap('r', 'u')).rejects.toThrow('로드맵 확정에 실패했습니다.');
  });

  it('감사로그 실패 시에도 정상 완료 (throw하지 않음)', async () => {
    mock.setRoadmapRowQueryResult({ data: minimalRoadmapRow, error: null });
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-1', version_number: 1 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '기업', is_test_mode: false },
      error: null,
    });
    vi.mocked(createAuditLog).mockRejectedValue(new Error('audit 실패'));

    await expect(finalizeRoadmap('r', 'u')).resolves.toBeUndefined();
  });
});

// ─── finalizeRoadmap — sanitize 통합 (정책 이전) ─────────────────────────
// 정책 이전 (2026-05-18): DRAFT 편집 중 sanitize 가 빈 행을 즉시 제거하는
// 동작을 제거하고, FINAL 확정 시점에 1회 정리하도록 옮김.

describe('finalizeRoadmap — sanitize 통합', () => {
  beforeEach(() => {
    vi.mocked(createAuditLog).mockResolvedValue(undefined);
    vi.mocked(createNotificationForAdmins).mockResolvedValue(undefined);
  });
  afterEach(() => vi.clearAllMocks());

  it('빈 행 포함 row → sanitize 후 정리된 결과를 update → RPC 호출', async () => {
    const sharedMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);

    // 1. SELECT: 빈 행 1개 포함된 DRAFT row
    sharedMock.addResult({
      data: {
        id: 'rv-final',
        status: 'DRAFT',
        project_id: 'p-1',
        version_number: 1,
        diagnosis_summary: '확정 전',
        roadmap_matrix: [],
        pbl_course: {
          competencies: [
            { name: '역량1', definition: '정의', knowledge: [], skills: [], attitudes: [] },
            // 빈 competency
            { name: '', definition: '', knowledge: [], skills: [], attitudes: [] },
          ],
          annual_plan: {
            items: [
              { competency_name: '역량1', course_name: '과정1', format: '집체', hours: 8, notes: '' },
              // 빈 항목
              { competency_name: '', course_name: '', format: '집체', hours: 0, notes: '' },
            ],
            usage_plan: '활용',
          },
        },
        courses: [
          {
            course_name: '과정1',
            format: '집체',
            recommended_program: '',
            goal: '',
            main_content: '',
            target_audience: '',
            subjects: [{ name: '과목1', details: 'd', hours: 8 }],
          },
          // 빈 course_spec 카드
          {
            course_name: '',
            format: '집체',
            recommended_program: '',
            goal: '',
            main_content: '',
            target_audience: '',
            subjects: [],
          },
        ],
      },
      error: null,
    });
    // 2. UPDATE 결과
    sharedMock.addResult({ data: null, error: null });
    // 3. RPC: finalize_roadmap 성공
    sharedMock.addRpcResult({
      data: { success: true, project_id: 'p-1', version_number: 1 },
      error: null,
    });
    // 4. 알림용 project 조회
    sharedMock.addResult({
      data: { company_name: 'X', is_test_mode: true },
      error: null,
    });

    await finalizeRoadmap('rv-final', 'consultant-1');

    // update 호출 — 빈 행 제거된 결과로 저장
    const updateCall = sharedMock.chainable.update.mock.calls[0];
    expect(updateCall).toBeDefined();
    expect(updateCall[0].pbl_course.competencies).toHaveLength(1);
    expect(updateCall[0].pbl_course.annual_plan.items).toHaveLength(1);
    expect(updateCall[0].courses).toHaveLength(1);

    // RPC 호출 검증
    expect(sharedMock.client.rpc).toHaveBeenCalledWith('finalize_roadmap', {
      p_roadmap_id: 'rv-final',
      p_actor_user_id: 'consultant-1',
    });
  });
});

// ─── fetchRoadmapVersions ─────────────────────────────────────────────────

describe('fetchRoadmapVersions', () => {
  afterEach(() => vi.clearAllMocks());

  it('정상 조회 시 버전 목록을 반환 (내림차순)', async () => {
    const sharedMock = createMockSupabase();
    const versions = [
      { id: 'rv-3', version_number: 3, status: 'DRAFT' },
      { id: 'rv-2', version_number: 2, status: 'FINAL' },
    ];
    sharedMock.addResult({ data: versions, error: null });
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);

    const result = await fetchRoadmapVersions('project-1');

    expect(result).toEqual(versions);
    expect(sharedMock.client.from).toHaveBeenCalledWith('roadmap_versions');
    expect(sharedMock.chainable.eq).toHaveBeenCalledWith('project_id', 'project-1');
    expect(sharedMock.chainable.order).toHaveBeenCalledWith('version_number', { ascending: false });
  });

  it('null 결과 → 빈 배열', async () => {
    const sharedMock = createMockSupabase();
    sharedMock.addResult({ data: null, error: null });
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);

    expect(await fetchRoadmapVersions('p')).toEqual([]);
  });
});

// ─── fetchRoadmapVersion ──────────────────────────────────────────────────

describe('fetchRoadmapVersion', () => {
  afterEach(() => vi.clearAllMocks());

  it('존재하는 ID → 데이터 반환', async () => {
    const sharedMock = createMockSupabase();
    const data = { id: 'rv-1', version_number: 1, status: 'DRAFT' };
    sharedMock.addResult({ data, error: null });
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);

    expect(await fetchRoadmapVersion('rv-1')).toEqual(data);
    expect(sharedMock.chainable.eq).toHaveBeenCalledWith('id', 'rv-1');
  });

  it('존재하지 않음 → null', async () => {
    const sharedMock = createMockSupabase();
    sharedMock.addResult({ data: null, error: null });
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);

    expect(await fetchRoadmapVersion('rv-x')).toBeNull();
  });
});

// ─── updateRoadmapManually ────────────────────────────────────────────────

describe('updateRoadmapManually', () => {
  // 산인공 4섹션 legacy 컬럼 구조 샘플 (DB row 모양)
  const legacyCompetency: RoadmapCompetency = {
    name: '역량1',
    definition: '정의',
    knowledge: ['K'],
    skills: ['S'],
    attitudes: ['A'],
  };
  const legacyTraining: RoadmapTrainingStructureItem = {
    competency_name: '역량1',
    level: 'BEGINNER',
    content: 'c',
    target_audience: 't',
    method: '집체',
    goal: 'g',
  };
  const legacyAnnualPlan: RoadmapAnnualPlan = {
    items: [
      {
        competency_name: '역량1',
        course_name: '과정1',
        format: '집체',
        hours: 16,
        notes: '',
      },
    ],
    usage_plan: '활용',
  };
  const legacyCourseSpec: RoadmapCourseSpec = {
    course_name: '과정1',
    format: '집체',
    recommended_program: 'K-Digital',
    goal: 'g',
    main_content: 'm',
    target_audience: 't',
    subjects: [{ name: '과목', details: 'd', hours: 8 }],
  };

  // DB row (legacy 컬럼 구조)
  const baseDraftRow = {
    id: 'rv-1',
    status: 'DRAFT',
    project_id: 'p-1',
    version_number: 1,
    diagnosis_summary: '기존 진단',
    roadmap_matrix: [legacyTraining],
    pbl_course: {
      competencies: [legacyCompetency],
      annual_plan: legacyAnnualPlan,
    },
    courses: [legacyCourseSpec, legacyCourseSpec, legacyCourseSpec],
    projects: { assigned_consultant_id: 'consultant-1' },
  };

  const defaultValidation: ValidationResult = { isValid: true, errors: [], warnings: [] };

  let sharedMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    sharedMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);
    vi.mocked(createAuditLog).mockResolvedValue(undefined);
    vi.mocked(validateRoadmap).mockReturnValue(defaultValidation);
  });

  afterEach(() => vi.clearAllMocks());

  // ─── 사전 검증 ─────────────────────────────────────────────────────────

  describe('사전 검증', () => {
    it('로드맵 미존재 → error', async () => {
      sharedMock.addResult({ data: null, error: { message: 'not found' } });

      const result = await updateRoadmapManually('rv-x', 'consultant-1', {
        diagnosis_summary: '수정',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('로드맵을 찾을 수 없습니다.');
    });

    // PR5 (R6 spec) — FINAL in-place 수정 허용. ARCHIVED 만 차단.
    it('FINAL 상태 → in-place 수정 허용 (PR5)', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow, status: 'FINAL' }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '수정',
      });

      expect(result.success).toBe(true);
    });

    it('ARCHIVED 상태 → 차단', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow, status: 'ARCHIVED' }, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '수정',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('아카이브된 로드맵은 편집할 수 없습니다.');
    });

    it('다른 컨설턴트 → 배정 컨설턴트만 편집 가능 error', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });

      const result = await updateRoadmapManually('rv-1', 'other', {
        diagnosis_summary: '수정',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('배정된 컨설턴트만 로드맵을 편집할 수 있습니다.');
    });
  });

  // ─── 데이터 업데이트 (신규 4섹션 부분 업데이트) ────────────────────────

  describe('데이터 업데이트', () => {
    it('diagnosis_summary만 변경 → 기존 4섹션 유지', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '새 진단',
      });

      expect(result.success).toBe(true);
      expect(validateRoadmap).toHaveBeenCalledWith(
        expect.objectContaining({
          diagnosis_summary: '새 진단',
          competencies: [legacyCompetency],
          training_structure: [legacyTraining],
          annual_plan: legacyAnnualPlan,
          course_specs: baseDraftRow.courses,
        }),
      );
    });

    it('competencies만 변경 → 다른 섹션 유지', async () => {
      const newComp: RoadmapCompetency = {
        ...legacyCompetency,
        name: '역량2',
        definition: '새 정의',
      };
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        competencies: [newComp],
      });

      expect(validateRoadmap).toHaveBeenCalledWith(
        expect.objectContaining({
          competencies: [newComp],
          training_structure: [legacyTraining],
        }),
      );
    });

    it('training_structure만 변경 → DB의 roadmap_matrix 컬럼에 매핑되어 저장', async () => {
      const newStruct: RoadmapTrainingStructureItem = {
        ...legacyTraining,
        content: '새 훈련 내용',
      };
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        training_structure: [newStruct],
      });

      expect(sharedMock.chainable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          roadmap_matrix: [newStruct],
        }),
      );
    });

    it('annual_plan만 변경 → pbl_course 컬럼 안에 annual_plan으로 저장', async () => {
      const newPlan: RoadmapAnnualPlan = {
        items: [
          {
            competency_name: '역량1',
            course_name: '새 과정',
            format: '혼합',
            hours: 24,
            notes: '',
          },
        ],
        usage_plan: '새 활용',
      };
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', { annual_plan: newPlan });

      expect(sharedMock.chainable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          pbl_course: expect.objectContaining({
            annual_plan: newPlan,
            competencies: [legacyCompetency],
          }),
        }),
      );
    });

    it('course_specs만 변경 → courses 컬럼에 저장', async () => {
      const newSpecs = [legacyCourseSpec];
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        course_specs: newSpecs,
      });

      expect(sharedMock.chainable.update).toHaveBeenCalledWith(
        expect.objectContaining({ courses: newSpecs }),
      );
    });

    it('복합 업데이트 (여러 섹션 동시 변경) 시 모두 반영', async () => {
      const newComp: RoadmapCompetency = { ...legacyCompetency, name: '신규역량' };
      const newStruct: RoadmapTrainingStructureItem = { ...legacyTraining, content: '신규' };

      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '복합',
        competencies: [newComp],
        training_structure: [newStruct],
      });

      expect(result.success).toBe(true);
      expect(validateRoadmap).toHaveBeenCalledWith(
        expect.objectContaining({
          diagnosis_summary: '복합',
          competencies: [newComp],
          training_structure: [newStruct],
        }),
      );
    });
  });

  // ─── 빈 행 보존 (DRAFT 편집 중 sanitize 해제) ─────────────────────────────
  // 정책 이전 (2026-05-18): "행 추가" 직후 sanitize 가 빈 행을 즉시 제거해
  // 클라이언트가 입력을 시작하기도 전에 행이 사라지는 문제 해결.
  // sanitize 는 finalizeRoadmap / export 시점에만 수행하도록 옮김.

  describe('빈 행 보존 (DRAFT 편집)', () => {
    it('빈 annual_plan 항목 추가 시 DB 저장 시 그대로 보존', async () => {
      const planWithEmpty: RoadmapAnnualPlan = {
        items: [
          ...legacyAnnualPlan.items,
          { competency_name: '', course_name: '', format: '집체', hours: 0, notes: '' },
        ],
        usage_plan: '활용',
      };
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', { annual_plan: planWithEmpty });

      expect(sharedMock.chainable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          pbl_course: expect.objectContaining({
            annual_plan: expect.objectContaining({
              items: expect.arrayContaining([
                expect.objectContaining({ competency_name: '', course_name: '' }),
              ]),
            }),
          }),
        }),
      );
      const updateCall = sharedMock.chainable.update.mock.calls.find(
        (c: unknown[]) => (c[0] as Record<string, { annual_plan?: unknown }>).pbl_course?.annual_plan,
      );
      expect(updateCall?.[0].pbl_course.annual_plan.items).toHaveLength(2);
    });

    it('빈 course_spec 카드 추가 시 DB 저장 시 그대로 보존', async () => {
      const specsWithEmpty: RoadmapCourseSpec[] = [
        legacyCourseSpec,
        {
          course_name: '',
          format: '집체',
          recommended_program: '',
          goal: '',
          main_content: '',
          target_audience: '',
          subjects: [],
        },
      ];
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', { course_specs: specsWithEmpty });

      const updateCall = sharedMock.chainable.update.mock.calls.find(
        (c: unknown[]) => (c[0] as Record<string, unknown>).courses,
      );
      expect(updateCall?.[0].courses).toHaveLength(2);
      expect(updateCall?.[0].courses[1]).toEqual(
        expect.objectContaining({ course_name: '' }),
      );
    });

    it('빈 subject(교과목) 추가 시 DB 저장 시 그대로 보존', async () => {
      const specsWithEmptySubject: RoadmapCourseSpec[] = [
        {
          ...legacyCourseSpec,
          subjects: [
            ...legacyCourseSpec.subjects,
            { name: '', details: '', hours: 0 },
          ],
        },
      ];
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        course_specs: specsWithEmptySubject,
      });

      const updateCall = sharedMock.chainable.update.mock.calls.find(
        (c: unknown[]) => (c[0] as Record<string, unknown>).courses,
      );
      expect(updateCall?.[0].courses[0].subjects).toHaveLength(2);
      expect(updateCall?.[0].courses[0].subjects[1]).toEqual(
        expect.objectContaining({ name: '', details: '' }),
      );
    });

    it('빈 competency 추가 시 DB 저장 시 그대로 보존', async () => {
      const compsWithEmpty: RoadmapCompetency[] = [
        legacyCompetency,
        { name: '', definition: '', knowledge: [], skills: [], attitudes: [] },
      ];
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', { competencies: compsWithEmpty });

      const updateCall = sharedMock.chainable.update.mock.calls.find(
        (c: unknown[]) => (c[0] as Record<string, { competencies?: unknown }>).pbl_course?.competencies,
      );
      expect(updateCall?.[0].pbl_course.competencies).toHaveLength(2);
      expect(updateCall?.[0].pbl_course.competencies[1]).toEqual(
        expect.objectContaining({ name: '', definition: '' }),
      );
    });
  });

  // ─── 검증 및 저장 ─────────────────────────────────────────────────────

  describe('검증 및 저장', () => {
    it('validateRoadmap을 호출하고 validation 결과를 반환', async () => {
      const validation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['경고'],
      };
      vi.mocked(validateRoadmap).mockReturnValue(validation);

      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '업데이트',
      });

      expect(result.success).toBe(true);
      expect(result.validation).toEqual(validation);
    });

    it('free_tool_validated / time_limit_validated는 항상 true (legacy 컬럼)', async () => {
      vi.mocked(validateRoadmap).mockReturnValue({
        isValid: false,
        errors: ['무료 도구 오류'],
        warnings: [],
      });

      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '업데이트',
      });

      expect(sharedMock.chainable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          free_tool_validated: true,
          time_limit_validated: true,
        }),
      );
    });

    it('DB update 실패 → error + validation 반환', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: { message: 'DB write error' } });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '업데이트',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB write error');
      expect(result.validation).toEqual(defaultValidation);
    });

    it('성공 시 success: true + validation 반환', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '성공',
      });

      expect(result).toEqual({ success: true, validation: defaultValidation });
    });
  });

  // ─── 감사로그 ──────────────────────────────────────────────────────────

  describe('감사로그', () => {
    // PR5 (R6 spec) — action 이 ROADMAP_RESULT_EDITED 로 변경됨
    it('action=ROADMAP_RESULT_EDITED + meta.fields_changed 에 변경 키 + status 포함', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '변경',
        competencies: [legacyCompetency],
      });

      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'consultant-1',
          action: 'ROADMAP_RESULT_EDITED',
          targetType: 'roadmap',
          targetId: 'rv-1',
          meta: expect.objectContaining({
            project_id: 'p-1',
            version_id: 'rv-1',
            version_number: 1,
            status: 'DRAFT',
            fields_changed: ['diagnosis_summary', 'competencies'],
          }),
        }),
      );
    });

    it('FINAL 상태 in-place 수정 시 meta.status=FINAL', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow, status: 'FINAL' }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '확정 후 수정',
      });

      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ROADMAP_RESULT_EDITED',
          meta: expect.objectContaining({
            status: 'FINAL',
            fields_changed: ['diagnosis_summary'],
          }),
        }),
      );
    });

    it('diff 페이로드 — 짧은 텍스트 필드 원문 포함, 배열 필드는 length 비교', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '새 진단',
        competencies: [legacyCompetency, { ...legacyCompetency, name: '추가역량' }],
      });

      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            diff: expect.objectContaining({
              diagnosis_summary: expect.objectContaining({ after: '새 진단' }),
              competencies: expect.objectContaining({
                before_length: 1,
                after_length: 2,
              }),
            }),
          }),
        }),
      );
    });

    it('validation_result 메타가 포함', async () => {
      vi.mocked(validateRoadmap).mockReturnValue({
        isValid: false,
        errors: ['e1', 'e2'],
        warnings: ['w1'],
      });

      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '변경',
      });

      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            validation_result: {
              isValid: false,
              errorCount: 2,
              warningCount: 1,
            },
          }),
        }),
      );
    });
  });
});
