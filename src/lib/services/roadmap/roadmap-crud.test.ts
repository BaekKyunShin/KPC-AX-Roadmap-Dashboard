/**
 * roadmap-crud.ts 테스트
 * - finalizeRoadmap: 원자적 로드맵 확정 (RPC 모킹)
 * - fetchRoadmapVersions: 로드맵 버전 목록 조회
 * - fetchRoadmapVersion: 특정 로드맵 버전 조회
 * - updateRoadmapManually: 로드맵 수동 편집
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { finalizeRoadmap, fetchRoadmapVersions, fetchRoadmapVersion, updateRoadmapManually } from './roadmap-crud';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';
import { buildRoadmapMatrixFromCourses } from './roadmap-matrix-builder';
import { validateRoadmap } from './roadmap-validator';
import { createMockSupabase } from '@/test/helpers/mock-supabase';
import type { RoadmapCell, RoadmapRow, PBLCourse, ValidationResult } from './roadmap-types';

// ─── 모킹 ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('../audit', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('../notification', () => ({
  createNotificationForAdmins: vi.fn(),
}));

vi.mock('./roadmap-matrix-builder', () => ({
  buildRoadmapMatrixFromCourses: vi.fn(),
}));

vi.mock('./roadmap-validator', () => ({
  validateRoadmap: vi.fn(),
}));

/** Supabase RPC + from 체인 모킹 (finalizeRoadmap 전용, quota.test.ts 패턴과 동일) */
function createFinalizeMockSupabase() {
  const singleFn = vi.fn();
  const eqFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

  const mockClient = {
    rpc: vi.fn(),
    from: vi.fn().mockReturnValue({ select: selectFn }),
  };

  return {
    mockClient,
    setRpcResult: (r: { data: unknown; error: unknown }) => {
      mockClient.rpc.mockResolvedValue(r);
    },
    setProjectQueryResult: (r: { data: unknown; error: unknown }) => {
      singleFn.mockResolvedValue(r);
    },
  };
}

// ─── finalizeRoadmap ────────────────────────────────────────────────────────

describe('finalizeRoadmap', () => {
  let mock: ReturnType<typeof createFinalizeMockSupabase>;

  beforeEach(() => {
    mock = createFinalizeMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(mock.mockClient as never);
    vi.mocked(createAuditLog).mockResolvedValue(undefined);
    vi.mocked(createNotificationForAdmins).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('finalize_roadmap RPC를 올바른 파라미터로 호출한다', async () => {
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

  it('RPC 성공 시 감사로그를 기록한다', async () => {
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
      meta: {
        project_id: 'proj-1',
        version_number: 3,
      },
    });
  });

  it('RPC 성공 시 운영관리자에게 알림을 보낸다 (비테스트 모드)', async () => {
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

  it('테스트 모드 프로젝트는 알림을 보내지 않는다', async () => {
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

  it('DRAFT가 아닌 로드맵 확정 시도 시 에러를 throw한다', async () => {
    mock.setRpcResult({
      data: { success: false, error: 'DRAFT 상태의 로드맵만 최종 확정할 수 있습니다.' },
      error: null,
    });

    await expect(finalizeRoadmap('roadmap-already-final', 'user-5')).rejects.toThrow(
      'DRAFT 상태의 로드맵만 최종 확정할 수 있습니다.'
    );
  });

  it('RPC에서 success: false 반환 시 에러를 throw한다', async () => {
    mock.setRpcResult({
      data: { success: false, error: '배정된 컨설턴트만 최종 확정할 수 있습니다.' },
      error: null,
    });

    await expect(finalizeRoadmap('roadmap-5', 'user-5')).rejects.toThrow(
      '배정된 컨설턴트만 최종 확정할 수 있습니다.'
    );
  });

  it('RPC 호출 자체가 실패하면 에러를 throw한다', async () => {
    mock.setRpcResult({
      data: null,
      error: { message: 'DB connection error' },
    });

    await expect(finalizeRoadmap('roadmap-6', 'user-6')).rejects.toThrow(
      '로드맵 확정에 실패했습니다.'
    );
  });

  it('RPC data가 null이면 에러를 throw한다', async () => {
    mock.setRpcResult({
      data: null,
      error: null,
    });

    await expect(finalizeRoadmap('roadmap-7', 'user-7')).rejects.toThrow(
      '로드맵 확정에 실패했습니다.'
    );
  });

  it('감사로그 실패 시에도 정상 완료된다 (throw하지 않음)', async () => {
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-1', version_number: 1 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '기업', is_test_mode: false },
      error: null,
    });
    vi.mocked(createAuditLog).mockRejectedValue(new Error('audit DB down'));

    await expect(finalizeRoadmap('roadmap-8', 'user-8')).resolves.toBeUndefined();
  });

  it('알림 실패 시에도 정상 완료된다 (throw하지 않음)', async () => {
    mock.setRpcResult({
      data: { success: true, project_id: 'proj-1', version_number: 1 },
      error: null,
    });
    mock.setProjectQueryResult({
      data: { company_name: '기업', is_test_mode: false },
      error: null,
    });
    vi.mocked(createNotificationForAdmins).mockRejectedValue(new Error('notification service down'));

    await expect(finalizeRoadmap('roadmap-9', 'user-9')).resolves.toBeUndefined();
  });
});

// ─── fetchRoadmapVersions ─────────────────────────────────────────────────

describe('fetchRoadmapVersions', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('정상 조회 시 버전 목록을 반환한다 (version_number 내림차순)', async () => {
    const sharedMock = createMockSupabase();
    const versions = [
      { id: 'rv-3', version_number: 3, status: 'DRAFT' },
      { id: 'rv-2', version_number: 2, status: 'FINAL' },
      { id: 'rv-1', version_number: 1, status: 'ARCHIVED' },
    ];
    sharedMock.addResult({ data: versions, error: null });
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);

    const result = await fetchRoadmapVersions('project-1');

    expect(result).toEqual(versions);
    expect(sharedMock.client.from).toHaveBeenCalledWith('roadmap_versions');
    expect(sharedMock.chainable.select).toHaveBeenCalledWith('*');
    expect(sharedMock.chainable.eq).toHaveBeenCalledWith('project_id', 'project-1');
    expect(sharedMock.chainable.order).toHaveBeenCalledWith('version_number', { ascending: false });
  });

  it('결과가 없으면 빈 배열을 반환한다', async () => {
    const sharedMock = createMockSupabase();
    sharedMock.addResult({ data: null, error: null });
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);

    const result = await fetchRoadmapVersions('project-empty');

    expect(result).toEqual([]);
  });

  it('빈 배열 반환 시 그대로 빈 배열을 반환한다', async () => {
    const sharedMock = createMockSupabase();
    sharedMock.addResult({ data: [], error: null });
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);

    const result = await fetchRoadmapVersions('project-no-versions');

    expect(result).toEqual([]);
  });
});

// ─── fetchRoadmapVersion ──────────────────────────────────────────────────

describe('fetchRoadmapVersion', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('존재하는 ID로 조회 시 데이터를 반환한다', async () => {
    const sharedMock = createMockSupabase();
    const versionData = {
      id: 'rv-1',
      version_number: 1,
      status: 'DRAFT',
      diagnosis_summary: '진단 요약',
      courses: [],
      roadmap_matrix: [],
    };
    sharedMock.addResult({ data: versionData, error: null });
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);

    const result = await fetchRoadmapVersion('rv-1');

    expect(result).toEqual(versionData);
    expect(sharedMock.client.from).toHaveBeenCalledWith('roadmap_versions');
    expect(sharedMock.chainable.select).toHaveBeenCalledWith('*');
    expect(sharedMock.chainable.eq).toHaveBeenCalledWith('id', 'rv-1');
    expect(sharedMock.chainable.single).toHaveBeenCalled();
  });

  it('존재하지 않는 ID로 조회 시 null을 반환한다', async () => {
    const sharedMock = createMockSupabase();
    sharedMock.addResult({ data: null, error: null });
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);

    const result = await fetchRoadmapVersion('rv-nonexistent');

    expect(result).toBeNull();
  });
});

// ─── updateRoadmapManually ────────────────────────────────────────────────

describe('updateRoadmapManually', () => {
  // 테스트에서 공통으로 사용하는 기본 로드맵 데이터
  const baseDraftRoadmap = {
    id: 'rv-1',
    status: 'DRAFT',
    project_id: 'p-1',
    version_number: 1,
    diagnosis_summary: '기존 진단 요약',
    courses: [
      {
        course_name: 'AI 기초',
        level: 'BEGINNER',
        target_task: '데이터 분석',
        target_audience: '전 직원',
        recommended_hours: 8,
        curriculum: [],
        tools: [{ name: 'ChatGPT', free_tier_info: '무료' }],
        expected_outcome: '기대효과',
        measurement_method: '측정',
        prerequisites: [],
      },
    ] as RoadmapCell[],
    roadmap_matrix: [
      {
        task_id: 'task_1',
        task_name: '데이터 분석',
        beginner: [{ course_name: 'AI 기초', recommended_hours: 8 }],
        intermediate: [],
        advanced: [],
      },
    ] as RoadmapRow[],
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
      course_name: 'AI 기초 PBL',
      total_hours: 8,
      target_tasks: ['데이터 분석'],
      target_audience: '전 직원',
      curriculum: [],
      final_deliverables: ['결과물'],
      expected_outcomes: ['효과'],
      business_impact: '임팩트',
      measurement_methods: ['측정'],
      prerequisites: [],
    } as PBLCourse,
    projects: { assigned_consultant_id: 'consultant-1' },
  };

  const defaultValidation: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  let sharedMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    sharedMock = createMockSupabase();
    vi.mocked(createAdminClient).mockReturnValue(sharedMock.client as never);
    vi.mocked(createAuditLog).mockResolvedValue(undefined);
    vi.mocked(validateRoadmap).mockReturnValue(defaultValidation);
    vi.mocked(buildRoadmapMatrixFromCourses).mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── 사전 검증 ───────────────────────────────────────────────────────────

  describe('사전 검증', () => {
    it('로드맵 미존재 시 error를 반환한다', async () => {
      sharedMock.addResult({ data: null, error: { message: 'not found' } });

      const result = await updateRoadmapManually('rv-nonexistent', 'consultant-1', {
        diagnosis_summary: '새 요약',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('로드맵을 찾을 수 없습니다.');
    });

    it('FINAL 상태 로드맵 편집 시 "DRAFT 상태만 편집 가능" error를 반환한다', async () => {
      sharedMock.addResult({
        data: { ...baseDraftRoadmap, status: 'FINAL' },
        error: null,
      });

      const result = await updateRoadmapManually('rv-final', 'consultant-1', {
        diagnosis_summary: '수정 시도',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DRAFT 상태의 로드맵만 편집할 수 있습니다.');
    });

    it('ARCHIVED 상태 로드맵 편집 시 error를 반환한다', async () => {
      sharedMock.addResult({
        data: { ...baseDraftRoadmap, status: 'ARCHIVED' },
        error: null,
      });

      const result = await updateRoadmapManually('rv-archived', 'consultant-1', {
        diagnosis_summary: '수정 시도',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DRAFT 상태의 로드맵만 편집할 수 있습니다.');
    });

    it('다른 컨설턴트가 편집 시도 시 "배정된 컨설턴트만 편집 가능" error를 반환한다', async () => {
      sharedMock.addResult({
        data: { ...baseDraftRoadmap },
        error: null,
      });

      const result = await updateRoadmapManually('rv-1', 'other-consultant', {
        diagnosis_summary: '수정 시도',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('배정된 컨설턴트만 로드맵을 편집할 수 있습니다.');
    });
  });

  // ─── 데이터 업데이트 ─────────────────────────────────────────────────────

  describe('데이터 업데이트', () => {
    it('diagnosis_summary만 변경 시 roadmap_matrix를 유지한다', async () => {
      // 1번째 결과: select().eq().single() — 조회
      sharedMock.addResult({ data: { ...baseDraftRoadmap }, error: null });
      // 2번째 결과: update().eq() — DB 업데이트
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '새로운 진단 요약',
      });

      expect(result.success).toBe(true);
      // courses가 변경되지 않았으므로 buildRoadmapMatrixFromCourses 호출 안 됨
      expect(buildRoadmapMatrixFromCourses).not.toHaveBeenCalled();
      // validateRoadmap에 전달된 데이터 확인
      expect(validateRoadmap).toHaveBeenCalledWith(
        expect.objectContaining({
          diagnosis_summary: '새로운 진단 요약',
          roadmap_matrix: baseDraftRoadmap.roadmap_matrix,
        }),
      );
    });

    it('courses 변경 시 buildRoadmapMatrixFromCourses를 호출하여 matrix를 재생성한다', async () => {
      const newCourses: RoadmapCell[] = [
        {
          course_name: 'AI 중급',
          level: 'INTERMEDIATE',
          target_task: '자동화',
          target_audience: '개발자',
          recommended_hours: 16,
          curriculum: [],
          tools: [{ name: 'Copilot', free_tier_info: '무료' }],
          expected_outcome: '생산성 향상',
          measurement_method: '코드 리뷰',
          prerequisites: [],
        },
      ];
      const newMatrix: RoadmapRow[] = [
        {
          task_id: 'task_1',
          task_name: '자동화',
          beginner: [],
          intermediate: [{ course_name: 'AI 중급', recommended_hours: 16 }],
          advanced: [],
        },
      ];
      vi.mocked(buildRoadmapMatrixFromCourses).mockReturnValue(newMatrix);

      sharedMock.addResult({ data: { ...baseDraftRoadmap }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        courses: newCourses,
      });

      expect(result.success).toBe(true);
      expect(buildRoadmapMatrixFromCourses).toHaveBeenCalledWith(newCourses);
      expect(validateRoadmap).toHaveBeenCalledWith(
        expect.objectContaining({
          roadmap_matrix: newMatrix,
          courses: newCourses,
        }),
      );
    });

    it('roadmap_matrix 직접 변경 시 (courses 미변경) 전달된 matrix를 사용한다', async () => {
      const customMatrix: RoadmapRow[] = [
        {
          task_id: 'custom_1',
          task_name: '커스텀 업무',
          beginner: [{ course_name: 'AI 기초', recommended_hours: 8 }],
          intermediate: [],
          advanced: [],
        },
      ];

      sharedMock.addResult({ data: { ...baseDraftRoadmap }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        roadmap_matrix: customMatrix,
      });

      expect(result.success).toBe(true);
      expect(buildRoadmapMatrixFromCourses).not.toHaveBeenCalled();
      expect(validateRoadmap).toHaveBeenCalledWith(
        expect.objectContaining({
          roadmap_matrix: customMatrix,
        }),
      );
    });

    it('pbl_course만 변경 시 정상 업데이트된다', async () => {
      const newPbl: PBLCourse = {
        ...baseDraftRoadmap.pbl_course,
        course_name: '새 PBL 과정',
        total_hours: 12,
      };

      sharedMock.addResult({ data: { ...baseDraftRoadmap }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        pbl_course: newPbl,
      });

      expect(result.success).toBe(true);
      expect(validateRoadmap).toHaveBeenCalledWith(
        expect.objectContaining({
          pbl_course: newPbl,
        }),
      );
    });

    it('복합 업데이트 (여러 필드 동시 변경) 시 모두 반영된다', async () => {
      const newCourses: RoadmapCell[] = [
        {
          course_name: '종합 과정',
          level: 'ADVANCED',
          target_task: '전략',
          target_audience: '경영진',
          recommended_hours: 24,
          curriculum: [],
          tools: [{ name: 'GPT-4', free_tier_info: '무료 체험' }],
          expected_outcome: '전략 수립',
          measurement_method: 'KPI',
          prerequisites: [],
        },
      ];
      const newMatrix: RoadmapRow[] = [
        {
          task_id: 'task_1',
          task_name: '전략',
          beginner: [],
          intermediate: [],
          advanced: [{ course_name: '종합 과정', recommended_hours: 24 }],
        },
      ];
      vi.mocked(buildRoadmapMatrixFromCourses).mockReturnValue(newMatrix);

      sharedMock.addResult({ data: { ...baseDraftRoadmap }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '종합 업데이트 진단',
        courses: newCourses,
        pbl_course: baseDraftRoadmap.pbl_course,
      });

      expect(result.success).toBe(true);
      expect(buildRoadmapMatrixFromCourses).toHaveBeenCalledWith(newCourses);
      expect(validateRoadmap).toHaveBeenCalledWith(
        expect.objectContaining({
          diagnosis_summary: '종합 업데이트 진단',
          roadmap_matrix: newMatrix,
          courses: newCourses,
          pbl_course: baseDraftRoadmap.pbl_course,
        }),
      );
    });
  });

  // ─── 검증 및 저장 ───────────────────────────────────────────────────────

  describe('검증 및 저장', () => {
    it('validateRoadmap을 호출하고 validation 결과를 반환한다', async () => {
      const validation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['경고 메시지'],
      };
      vi.mocked(validateRoadmap).mockReturnValue(validation);

      sharedMock.addResult({ data: { ...baseDraftRoadmap }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '업데이트',
      });

      expect(result.success).toBe(true);
      expect(result.validation).toEqual(validation);
      expect(validateRoadmap).toHaveBeenCalledTimes(1);
    });

    it('무료/유료 에러 포함 시 free_tool_validated가 false로 설정된다', async () => {
      const validation: ValidationResult = {
        isValid: false,
        errors: ['유료 도구 사용 감지: Copilot Pro'],
        warnings: [],
      };
      vi.mocked(validateRoadmap).mockReturnValue(validation);

      sharedMock.addResult({ data: { ...baseDraftRoadmap }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '업데이트',
      });

      // free_tool_validated는 DB update 호출에서 확인
      expect(sharedMock.chainable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          free_tool_validated: false,
        }),
      );
      expect(result.validation).toEqual(validation);
    });

    it('시간 에러 포함 시 time_limit_validated가 false로 설정된다', async () => {
      const validation: ValidationResult = {
        isValid: false,
        errors: ['시간 초과: AI 기초 (100시간 > 40시간)'],
        warnings: [],
      };
      vi.mocked(validateRoadmap).mockReturnValue(validation);

      sharedMock.addResult({ data: { ...baseDraftRoadmap }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '업데이트',
      });

      expect(sharedMock.chainable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          time_limit_validated: false,
        }),
      );
      expect(result.validation).toEqual(validation);
    });

    it('DB update 실패 시 error + validation을 반환한다', async () => {
      vi.mocked(validateRoadmap).mockReturnValue(defaultValidation);

      sharedMock.addResult({ data: { ...baseDraftRoadmap }, error: null });
      // update 결과: 에러
      sharedMock.addResult({ data: null, error: { message: 'DB write error' } });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '업데이트',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB write error');
      expect(result.validation).toEqual(defaultValidation);
    });

    it('성공 시 success: true + validation을 반환한다', async () => {
      vi.mocked(validateRoadmap).mockReturnValue(defaultValidation);

      sharedMock.addResult({ data: { ...baseDraftRoadmap }, error: null });
      sharedMock.addResult({ data: null, error: null });

      const result = await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '성공 업데이트',
      });

      expect(result).toEqual({ success: true, validation: defaultValidation });
    });
  });

  // ─── 감사로그 ─────────────────────────────────────────────────────────────

  describe('감사로그', () => {
    it('edited_fields에 변경된 키 목록이 포함된다', async () => {
      vi.mocked(validateRoadmap).mockReturnValue(defaultValidation);

      sharedMock.addResult({ data: { ...baseDraftRoadmap }, error: null });
      sharedMock.addResult({ data: null, error: null });

      await updateRoadmapManually('rv-1', 'consultant-1', {
        diagnosis_summary: '변경',
        pbl_course: baseDraftRoadmap.pbl_course,
      });

      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'consultant-1',
          action: 'ROADMAP_UPDATE',
          targetType: 'roadmap',
          targetId: 'rv-1',
          meta: expect.objectContaining({
            project_id: 'p-1',
            version_number: 1,
            edited_fields: ['diagnosis_summary', 'pbl_course'],
          }),
        }),
      );
    });

    it('validation_result 메타가 감사로그에 포함된다', async () => {
      const validation: ValidationResult = {
        isValid: false,
        errors: ['에러1', '에러2'],
        warnings: ['경고1'],
      };
      vi.mocked(validateRoadmap).mockReturnValue(validation);

      sharedMock.addResult({ data: { ...baseDraftRoadmap }, error: null });
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
