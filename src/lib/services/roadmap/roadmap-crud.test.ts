/**
 * roadmap-crud.ts 테스트 — 산인공 공식 양식 v2 (2026-07-13 개정)
 *
 * DB legacy 컬럼 ↔ v2 구조 매핑 (roadmap-storage-mapper):
 *   diagnosis_summary txt│ diagnosis_summary
 *   roadmap_matrix jsonb │ (미사용 — 항상 [])
 *   pbl_course     jsonb │ { setup_necessity, outcome_summary }
 *   courses        jsonb │ course_specs: RoadmapCourseSpec[]
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
import type { RoadmapCourseSpec, RoadmapOutcomeSummary, ValidationResult } from './roadmap-types';

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
      '배정된 컨설턴트만 최종 확정할 수 있습니다.'
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
// v2 의 정리 대상은 훈련과정 명세서(courses)와 교과목(subjects)뿐이다.

describe('finalizeRoadmap — sanitize 통합', () => {
  beforeEach(() => {
    vi.mocked(createAuditLog).mockResolvedValue(undefined);
    vi.mocked(createNotificationForAdmins).mockResolvedValue(undefined);
  });
  afterEach(() => vi.clearAllMocks());

  it('빈 명세서·빈 교과목 포함 row → sanitize 후 정리된 결과를 update → RPC 호출', async () => {
    const sharedMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);

    // 1. SELECT: 빈 명세서 카드 1개 + 빈 교과목 1개가 섞인 DRAFT row
    sharedMock.addResult({
      data: {
        id: 'rv-final',
        status: 'DRAFT',
        project_id: 'p-1',
        version_number: 1,
        diagnosis_summary: '확정 전',
        roadmap_matrix: [],
        pbl_course: {
          setup_necessity: '수립 배경',
          outcome_summary: {
            ai_competency_level: 'INTERMEDIATE',
            selected_tasks: '과업',
            main_content: '요약',
          },
        },
        courses: [
          {
            training_period: '2026년 1분기',
            training_level: 'BEGINNER',
            course_name: '과정1',
            training_method: '집체',
            recommended_program: '',
            goal: '',
            main_content: '',
            target_audience: '',
            subjects: [
              { name: '과목1', details: 'd', hours: 8 },
              // 빈 교과목
              { name: '', details: '', hours: 0 },
            ],
          },
          // 빈 명세서 카드
          {
            training_period: '',
            training_level: 'BEGINNER',
            course_name: '',
            training_method: '집체',
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
    expect(updateCall[0].courses).toHaveLength(1);
    expect(updateCall[0].courses[0].subjects).toHaveLength(1);
    // Ⅰ장은 pbl_course 컬럼에 그대로 보존
    expect(updateCall[0].pbl_course).toEqual({
      setup_necessity: '수립 배경',
      outcome_summary: {
        ai_competency_level: 'INTERMEDIATE',
        selected_tasks: '과업',
        main_content: '요약',
      },
    });

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
  // v2 구조 샘플
  const legacyOutcomeSummary: RoadmapOutcomeSummary = {
    ai_competency_level: 'INTERMEDIATE',
    selected_tasks: '기존 선정 과업',
    main_content: '기존 수립 주요내용',
  };

  const legacyCourseSpec: RoadmapCourseSpec = {
    training_period: '2026년 1분기',
    training_level: 'BEGINNER',
    course_name: '과정1',
    training_method: '집체',
    recommended_program: 'K-Digital',
    goal: 'g',
    main_content: 'm',
    target_audience: 't',
    subjects: [{ name: '과목', details: 'd', hours: 8 }],
  };

  // DB row (legacy 컬럼 구조 — pbl_course 는 Ⅰ장, courses 는 Ⅲ장)
  const baseDraftRow = {
    id: 'rv-1',
    status: 'DRAFT',
    project_id: 'p-1',
    version_number: 1,
    diagnosis_summary: '기존 진단',
    roadmap_matrix: [],
    pbl_course: {
      setup_necessity: '기존 수립 배경',
      outcome_summary: legacyOutcomeSummary,
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

  // ─── 데이터 업데이트 (v2 축소된 updates 병합) ──────────────────────────

  describe('데이터 업데이트', () => {
    it('diagnosis_summary만 변경 → 나머지 v2 섹션 유지', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '새 진단',
      });

      expect(result.success).toBe(true);
      expect(validateRoadmap).toHaveBeenCalledWith({
        diagnosis_summary: '새 진단',
        setup_necessity: '기존 수립 배경',
        outcome_summary: legacyOutcomeSummary,
        course_specs: baseDraftRow.courses,
      });
    });

    it('setup_necessity만 변경 → pbl_course 컬럼에 매핑되어 저장', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        setup_necessity: '새 수립 배경',
      });

      expect(sharedMock.chainable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          pbl_course: expect.objectContaining({
            setup_necessity: '새 수립 배경',
            outcome_summary: legacyOutcomeSummary,
          }),
        })
      );
    });

    it('outcome_summary만 변경 → pbl_course 컬럼 안에 outcome_summary로 저장', async () => {
      const newOutcome: RoadmapOutcomeSummary = {
        ai_competency_level: 'ADVANCED',
        selected_tasks: '새 선정 과업',
        main_content: '새 수립 주요내용',
      };
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', { outcome_summary: newOutcome });

      expect(sharedMock.chainable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          pbl_course: expect.objectContaining({
            outcome_summary: newOutcome,
            setup_necessity: '기존 수립 배경',
          }),
        })
      );
    });

    it('course_specs만 변경 → courses 컬럼에 저장', async () => {
      const newSpecs = [{ ...legacyCourseSpec, course_name: '새 과정' }];
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', { course_specs: newSpecs });

      expect(sharedMock.chainable.update).toHaveBeenCalledWith(
        expect.objectContaining({ courses: newSpecs })
      );
    });

    it('v2 신규 필드(훈련시기·훈련수준·훈련방법) 변경이 courses 컬럼에 반영된다', async () => {
      const newSpecs: RoadmapCourseSpec[] = [
        {
          ...legacyCourseSpec,
          training_period: '2026년 4분기',
          training_level: 'ADVANCED',
          training_method: '원격',
        },
      ];
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', { course_specs: newSpecs });

      const updateCall = sharedMock.chainable.update.mock.calls.find(
        (c: unknown[]) => (c[0] as Record<string, unknown>).courses
      );
      expect(updateCall?.[0].courses[0]).toEqual(
        expect.objectContaining({
          training_period: '2026년 4분기',
          training_level: 'ADVANCED',
          training_method: '원격',
        })
      );
    });

    it('roadmap_matrix 컬럼은 v2 에서 미사용이므로 항상 빈 배열로 저장된다', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', { diagnosis_summary: '수정' });

      expect(sharedMock.chainable.update).toHaveBeenCalledWith(
        expect.objectContaining({ roadmap_matrix: [] })
      );
    });

    it('복합 업데이트 (여러 섹션 동시 변경) 시 모두 반영', async () => {
      const newOutcome: RoadmapOutcomeSummary = {
        ai_competency_level: 'ADVANCED',
        selected_tasks: '신규 과업',
        main_content: '신규 요약',
      };
      const newSpecs = [{ ...legacyCourseSpec, course_name: '신규 과정' }];

      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '복합',
        setup_necessity: '복합 배경',
        outcome_summary: newOutcome,
        course_specs: newSpecs,
      });

      expect(result.success).toBe(true);
      expect(validateRoadmap).toHaveBeenCalledWith({
        diagnosis_summary: '복합',
        setup_necessity: '복합 배경',
        outcome_summary: newOutcome,
        course_specs: newSpecs,
      });
    });

    // 하위호환: 운영 DB 에 v1 FINAL 확정본이 실재한다.
    it('v1 legacy row(courses[*].format + orphan 키) → v2 구조로 승격되어 병합된다', async () => {
      const v1Row = {
        ...baseDraftRow,
        pbl_course: {
          // v1 orphan 키 (읽기 시 무시되어야 함)
          competencies: [{ name: '역량1', definition: '정의' }],
          annual_plan: { items: [], usage_plan: '활용' },
          setup_necessity: '기존 수립 배경',
          outcome_summary: legacyOutcomeSummary,
        },
        courses: [
          {
            course_name: 'v1 과정',
            format: '집체', // v1 키 → training_method 로 승격
            recommended_program: 'K-Digital',
            goal: 'g',
            main_content: 'm',
            target_audience: 't',
            subjects: [{ name: '과목', details: 'd', hours: 8 }],
          },
        ],
      };
      sharedMock.addResult({ data: v1Row, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', { diagnosis_summary: '수정' });

      const merged = vi.mocked(validateRoadmap).mock.calls[0][0];

      // v1 format → v2 training_method 승격 + 신규 필드 backfill
      expect(merged.course_specs[0].training_method).toBe('집체');
      expect(merged.course_specs[0].training_period).toBe('');
      expect(merged.course_specs[0].training_level).toBe('BEGINNER');
      expect(merged.course_specs[0]).not.toHaveProperty('format');
      // v1 orphan 키는 병합 결과에 포함되지 않는다
      expect(merged).not.toHaveProperty('competencies');
      expect(merged).not.toHaveProperty('annual_plan');
    });
  });

  // ─── 빈 행 보존 (DRAFT 편집 중 sanitize 해제) ─────────────────────────────
  // 정책 이전 (2026-05-18): "행 추가" 직후 sanitize 가 빈 행을 즉시 제거해
  // 클라이언트가 입력을 시작하기도 전에 행이 사라지는 문제 해결.
  // sanitize 는 finalizeRoadmap / export 시점에만 수행하도록 옮김.

  describe('빈 행 보존 (DRAFT 편집)', () => {
    it('빈 명세서 카드 추가 시 DB 저장 시 그대로 보존', async () => {
      const specsWithEmpty: RoadmapCourseSpec[] = [
        legacyCourseSpec,
        {
          training_period: '',
          training_level: 'BEGINNER',
          course_name: '',
          training_method: '',
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
        (c: unknown[]) => (c[0] as Record<string, unknown>).courses
      );
      expect(updateCall?.[0].courses).toHaveLength(2);
      expect(updateCall?.[0].courses[1]).toEqual(expect.objectContaining({ course_name: '' }));
    });

    it('빈 subject(교과목) 추가 시 DB 저장 시 그대로 보존', async () => {
      const specsWithEmptySubject: RoadmapCourseSpec[] = [
        {
          ...legacyCourseSpec,
          subjects: [...legacyCourseSpec.subjects, { name: '', details: '', hours: 0 }],
        },
      ];
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        course_specs: specsWithEmptySubject,
      });

      const updateCall = sharedMock.chainable.update.mock.calls.find(
        (c: unknown[]) => (c[0] as Record<string, unknown>).courses
      );
      expect(updateCall?.[0].courses[0].subjects).toHaveLength(2);
      expect(updateCall?.[0].courses[0].subjects[1]).toEqual(
        expect.objectContaining({ name: '', details: '' })
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
        errors: ['명세서 개수 부족'],
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
        })
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
        course_specs: [legacyCourseSpec],
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
            fields_changed: ['diagnosis_summary', 'course_specs'],
          }),
        })
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
        })
      );
    });

    it('diff 페이로드 — 짧은 텍스트 필드 원문 포함, 배열 필드(course_specs)는 length 비교', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      // 기존 courses 3개 → 4개로 증가
      await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '새 진단',
        course_specs: [
          legacyCourseSpec,
          legacyCourseSpec,
          legacyCourseSpec,
          { ...legacyCourseSpec, course_name: '추가 과정' },
        ],
      });

      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            diff: expect.objectContaining({
              diagnosis_summary: expect.objectContaining({ after: '새 진단' }),
              course_specs: expect.objectContaining({
                before_length: 3,
                after_length: 4,
              }),
            }),
          }),
        })
      );
    });

    it('diff 페이로드 — 객체 필드(outcome_summary)는 JSON 길이 비교', async () => {
      sharedMock.addResult({ data: { ...baseDraftRow }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        outcome_summary: {
          ai_competency_level: 'ADVANCED',
          selected_tasks: '새 과업',
          main_content: '새 요약',
        },
      });

      const auditCall = vi.mocked(createAuditLog).mock.calls[0][0];
      const diff = (auditCall.meta as Record<string, Record<string, unknown>>).diff;

      expect(diff.outcome_summary).toEqual({
        before_length: expect.any(Number),
        after_length: expect.any(Number),
      });
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
        })
      );
    });
  });
});
