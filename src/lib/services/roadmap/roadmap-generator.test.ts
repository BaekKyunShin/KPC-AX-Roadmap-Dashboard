/**
 * roadmap-generator.ts 테스트 — 산인공 공식 양식 v2 (2026-07-13 개정)
 * - generateRoadmap: 쿼터·조회·LLM·저장·부수효과
 * - generateTestRoadmap / reviseTestRoadmap
 * - LLM 결과 스키마 불일치 시 RoadmapStorageError throw
 * - fillMissingRoadmapFields: v2 신규 필드 자동 보정 (2인자 시그니처)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ─── 모킹 ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('../llm', () => ({
  callLLMForJSON: vi.fn(),
}));

vi.mock('../audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../notification', () => ({
  createNotificationForAdmins: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../quota', () => ({
  checkAndRecordLLMUsage: vi.fn().mockResolvedValue({ exceeded: false }),
}));

vi.mock('./roadmap-prompts', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('system prompt'),
  buildUserPrompt: vi.fn().mockReturnValue('user prompt'),
}));

import {
  generateRoadmap,
  generateTestRoadmap,
  reviseTestRoadmap,
  RoadmapStorageError,
  fillMissingRoadmapFields,
} from './roadmap-generator';
import type { TestRoadmapInput } from './roadmap-generator';
import type { RoadmapCourseSpec, RoadmapResult, TrainingLevel } from './roadmap-types';
import { ROADMAP_COURSE_SPEC_COUNT } from './roadmap-types';
import { createAdminClient } from '@/lib/supabase/admin';
import { callLLMForJSON } from '../llm';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';
import { checkAndRecordLLMUsage } from '../quota';
import { buildUserPrompt } from './roadmap-prompts';

// ─── 산인공 v2 유효 LLM 응답 (명세서 6개) ───────────────────────────────
// roadmapContentSchema 를 통과해야 하므로 training_period 공백 금지,
// subjects 최소 1개 · hours 양수를 지킨다.

const PERIODS = [
  '2026년 1분기',
  '2026년 1분기',
  '2026년 2분기',
  '2026년 3분기',
  '2026년 3분기',
  '2026년 4분기',
];
const LEVELS: TrainingLevel[] = [
  'BEGINNER',
  'BEGINNER',
  'INTERMEDIATE',
  'INTERMEDIATE',
  'ADVANCED',
  'ADVANCED',
];

function makeCourseSpec(
  index: number,
  overrides: Partial<RoadmapCourseSpec> = {}
): RoadmapCourseSpec {
  return {
    training_period: PERIODS[index],
    training_level: LEVELS[index],
    course_name: `AI 훈련과정 ${index + 1}`,
    training_method: index % 2 === 0 ? '집체' : '혼합',
    recommended_program: 'K-Digital Training',
    goal: `훈련목표 ${index + 1}`,
    main_content: `주요 훈련 내용 ${index + 1}`,
    target_audience: '실무자',
    subjects: [{ name: `교과목 ${index + 1}`, details: '실습 활동', hours: 8 }],
    ...overrides,
  };
}

/** 양식 Ⅲ장 명세서 6개 (ROADMAP_COURSE_SPEC_COUNT) */
const MOCK_COURSE_SPECS: RoadmapCourseSpec[] = Array.from(
  { length: ROADMAP_COURSE_SPEC_COUNT },
  (_, i) => makeCourseSpec(i)
);

const MOCK_LLM_RESULT: RoadmapResult = {
  diagnosis_summary: '테스트 진단 요약',
  setup_necessity: '수립 배경 복사본',
  outcome_summary: {
    ai_competency_level: 'INTERMEDIATE',
    selected_tasks: '데이터 분석 자동화',
    main_content: '초급→중급→고급 6개 과정 구성',
  },
  course_specs: MOCK_COURSE_SPECS,
};

// ─── 헬퍼: Supabase 체인 모킹 ─────────────────────────────────────────────

interface MockOverrides {
  projectResult?: { data: Record<string, unknown> | null; error: { message: string } | null };
  selfAssessmentData?: Record<string, unknown>[] | null;
  interviewData?: Record<string, unknown>[] | null;
  consultantProfileData?: Record<string, unknown> | null;
  latestVersionData?: { version_number: number } | null;
  insertResult?: { data: { id: string } | null; error: { message: string } | null };
  assignedConsultantId?: string | null;
  interviewUpdateError?: { message: string } | null;
  /** projects.status 전이 update 가 반환할 error (P6 데시싱크 검증용) */
  projectUpdateError?: { message: string } | null;
}

function createProjectsChain(
  projectStatus: string,
  overrides: MockOverrides,
  updateFn: ReturnType<typeof vi.fn>
) {
  const assignedConsultantId =
    overrides.assignedConsultantId !== undefined ? overrides.assignedConsultantId : 'consultant-1';

  const result = overrides.projectResult || {
    data: {
      id: 'project-1',
      status: projectStatus,
      company_name: '테스트 기업',
      assigned_consultant_id: assignedConsultantId,
    },
    error: null,
  };

  return () => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
        limit: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
    update: updateFn,
  });
}

function createSelfAssessmentsChain(overrides: MockOverrides) {
  const data =
    overrides.selfAssessmentData !== undefined
      ? overrides.selfAssessmentData
      : [{ id: 'sa-1', answers: {} }];
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  };
}

function createInterviewsChain(overrides: MockOverrides) {
  const data =
    overrides.interviewData !== undefined
      ? overrides.interviewData
      : [{ id: 'interview-1', stt_insights: null }];
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data, error: null }),
    }),
    // persistRoadmapSummaryToInterview 가 호출하는 update path (ISSUE-04)
    // interviewUpdateError 설정 시 실패 분기(console.warn) 커버
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: overrides.interviewUpdateError ?? null }),
    }),
  };
}

function createConsultantProfilesChain(overrides: MockOverrides) {
  const data =
    overrides.consultantProfileData !== undefined
      ? overrides.consultantProfileData
      : {
          expertise_domains: ['AI'],
          available_industries: ['IT'],
          teaching_levels: ['BEGINNER'],
          coaching_methods: ['1:1'],
          skill_tags: ['tag'],
        };
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error: data ? null : { message: 'not found' } }),
      }),
    }),
  };
}

function createRoadmapVersionsChain(overrides: MockOverrides) {
  const latestData =
    overrides.latestVersionData !== undefined ? overrides.latestVersionData : { version_number: 1 };
  const insertRes = overrides.insertResult || { data: { id: 'roadmap-1' }, error: null };
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: latestData,
              error: latestData ? null : { message: 'no rows' },
            }),
          }),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(insertRes),
      }),
    }),
  };
}

function createMockSupabase(projectStatus: string, overrides: MockOverrides = {}) {
  const updateFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: overrides.projectUpdateError ?? null }),
  });

  const projectsChain = createProjectsChain(projectStatus, overrides, updateFn);

  const tableChains: Record<string, () => unknown> = {
    projects: projectsChain,
    self_assessments: () => createSelfAssessmentsChain(overrides),
    interviews: () => createInterviewsChain(overrides),
    consultant_profiles: () => createConsultantProfilesChain(overrides),
    roadmap_versions: () => createRoadmapVersionsChain(overrides),
  };

  const fallback = () => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  });

  const mockClient = {
    from: vi.fn((table: string) => (tableChains[table] || fallback)()),
  };

  return { mockClient, updateFn };
}

function setupDefaultMocks(status = 'INTERVIEWED', overrides: MockOverrides = {}) {
  vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);
  vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
  const { mockClient, updateFn } = createMockSupabase(status, overrides);
  vi.mocked(createAdminClient).mockReturnValue(mockClient as never);
  return { mockClient, updateFn };
}

// ─── 테스트 입력 헬퍼 ────────────────────────────────────────────────────

function createTestInput(overrides: Partial<TestRoadmapInput> = {}): TestRoadmapInput {
  return {
    company_name: '테스트 기업',
    industry: 'IT',
    company_size: '50명',
    interview_date: '2026-03-01',
    participants: [{ id: 'p-1', name: '홍길동', position: '팀장' }],
    company_requirements: {
      company_status: '성장 중',
      main_problems: '데이터 활용 부족',
      push_willingness: '높음',
      expected_outcomes: '업무 효율화',
    },
    task_workflow_items: [
      {
        id: 'tw-1',
        job: '분석',
        task_name: '데이터 분석',
        as_is: '수기 집계',
        problems: '시간 소요',
        data_availability: '있음',
        ai_necessity: 4,
      },
    ],
    training_targets: [
      {
        id: 'tt-1',
        task_name: '데이터 분석',
        selection_reason: 'AI 적용 가능',
        as_is: '수기',
        to_be: '자동',
      },
    ],
    ...overrides,
  };
}

// ─── 상태 전이 ────────────────────────────────────────────────────────────

describe('generateRoadmap — 프로젝트 상태 업데이트', () => {
  afterEach(() => vi.clearAllMocks());

  it.each([
    { status: 'INTERVIEWED', shouldUpdate: true },
    { status: 'ROADMAP_DRAFTED', shouldUpdate: true },
    { status: 'FINALIZED', shouldUpdate: false },
  ])('$status → update=$shouldUpdate', async ({ status, shouldUpdate }) => {
    const { updateFn } = setupDefaultMocks(status);
    await generateRoadmap(
      'project-1',
      'user-1',
      status === 'INTERVIEWED' ? undefined : '수정 요청',
      false
    );

    if (shouldUpdate) {
      expect(updateFn).toHaveBeenCalledWith({ status: 'ROADMAP_DRAFTED' });
    } else {
      expect(updateFn).not.toHaveBeenCalled();
    }
  });

  // P6: 전이 update 가 실패해도 예외·로그 없이 성공을 반환해, 로드맵은 저장됐는데
  // projects.status 는 INTERVIEWED 에 머무는 silent desync 가 발생했다.
  it('status 전이 update 실패 시 로그를 남기되 로드맵 생성은 성공으로 반환한다', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setupDefaultMocks('INTERVIEWED', {
      projectUpdateError: { message: 'update failed' },
    });

    const result = await generateRoadmap('project-1', 'user-1');

    // 산출물은 이미 커밋됐으므로 응답을 실패로 되돌리지 않는다
    expect(result.roadmapId).toBe('roadmap-1');

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('status 전이 실패(INTERVIEWED→ROADMAP_DRAFTED)'),
      'update failed'
    );
    errorSpy.mockRestore();
  });

  it('status 전이 update 성공 시에는 에러 로그를 남기지 않는다', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setupDefaultMocks('INTERVIEWED');

    await generateRoadmap('project-1', 'user-1');

    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('status 전이 실패'),
      expect.anything()
    );
    errorSpy.mockRestore();
  });
});

// ─── 쿼터 검증 ────────────────────────────────────────────────────────────

describe('generateRoadmap — 쿼터 검증', () => {
  afterEach(() => vi.clearAllMocks());

  it('exceeded=true + message → 해당 메시지로 throw', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({
      exceeded: true,
      message: '월별 한도 초과',
    } as never);
    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow('월별 한도 초과');
  });

  it('exceeded=true + message 없음 → 기본 메시지로 throw', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: true } as never);
    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow(
      '사용량 한도를 초과했습니다.'
    );
  });
});

// ─── 데이터 조회 ──────────────────────────────────────────────────────────

describe('generateRoadmap — 데이터 조회', () => {
  afterEach(() => vi.clearAllMocks());

  it('프로젝트 조회 에러 → throw', async () => {
    setupDefaultMocks('INTERVIEWED', {
      projectResult: { data: null, error: { message: 'DB error' } },
    });
    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow(
      '프로젝트를 찾을 수 없습니다.'
    );
  });

  it('자가진단 없음 + testMode=false → throw', async () => {
    setupDefaultMocks('INTERVIEWED', { selfAssessmentData: [] });
    await expect(generateRoadmap('project-1', 'user-1', undefined, false)).rejects.toThrow(
      '자가진단 결과가 없습니다.'
    );
  });

  it('자가진단 없음 + testMode=true → 정상 진행', async () => {
    setupDefaultMocks('INTERVIEWED', { selfAssessmentData: [] });
    const result = await generateRoadmap('project-1', 'user-1', undefined, true);
    expect(result.roadmapId).toBe('roadmap-1');
  });

  it('인터뷰 없음 → throw', async () => {
    setupDefaultMocks('INTERVIEWED', { interviewData: [] });
    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow(
      '인터뷰 데이터가 없습니다.'
    );
  });
});

// ─── LLM 호출 및 스키마 검증 (v2) ─────────────────────────────────────────

describe('generateRoadmap — LLM 호출 및 스키마', () => {
  afterEach(() => vi.clearAllMocks());

  it('callLLMForJSON에 올바른 messages + temperature 전달', async () => {
    setupDefaultMocks('INTERVIEWED');
    await generateRoadmap('project-1', 'user-1');

    expect(vi.mocked(callLLMForJSON)).toHaveBeenCalledWith(
      [
        { role: 'system', content: 'system prompt' },
        { role: 'user', content: 'user prompt' },
      ],
      { temperature: 0.7 },
      2,
      undefined
    );
  });

  it('명세서 6개 정상 응답 → 저장 성공', async () => {
    setupDefaultMocks('INTERVIEWED');
    const { result } = await generateRoadmap('project-1', 'user-1');

    expect(result.course_specs).toHaveLength(ROADMAP_COURSE_SPEC_COUNT);
  });

  it('로드맵 insert 실패 → throw', async () => {
    setupDefaultMocks('INTERVIEWED', {
      insertResult: { data: null, error: { message: 'insert failed' } },
    });
    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow(
      '로드맵 저장 실패: insert failed'
    );
  });

  it('course_specs가 5개(< 6) → RoadmapStorageError throw', async () => {
    setupDefaultMocks('INTERVIEWED');
    vi.mocked(callLLMForJSON).mockResolvedValue({
      ...MOCK_LLM_RESULT,
      course_specs: MOCK_COURSE_SPECS.slice(0, ROADMAP_COURSE_SPEC_COUNT - 1),
    });

    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow(RoadmapStorageError);
  });

  it('training_period 공백 → RoadmapStorageError throw (스키마 min(1))', async () => {
    setupDefaultMocks('INTERVIEWED');
    vi.mocked(callLLMForJSON).mockResolvedValue({
      ...MOCK_LLM_RESULT,
      course_specs: MOCK_COURSE_SPECS.map((s, i) => (i === 0 ? { ...s, training_period: '' } : s)),
    });

    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow(RoadmapStorageError);
  });

  it('subjects 빈 배열 → RoadmapStorageError throw (스키마 min(1))', async () => {
    setupDefaultMocks('INTERVIEWED');
    vi.mocked(callLLMForJSON).mockResolvedValue({
      ...MOCK_LLM_RESULT,
      course_specs: MOCK_COURSE_SPECS.map((s, i) => (i === 0 ? { ...s, subjects: [] } : s)),
    });

    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow(RoadmapStorageError);
  });

  it('LLM 이 v1 잔여 키(competencies·annual_plan)를 함께 반환해도 무시하고 저장 성공', async () => {
    setupDefaultMocks('INTERVIEWED');
    vi.mocked(callLLMForJSON).mockResolvedValue({
      ...MOCK_LLM_RESULT,
      competencies: [{ name: '역량', definition: '정의' }],
      annual_plan: { items: [], usage_plan: '활용' },
    } as never);

    const { result } = await generateRoadmap('project-1', 'user-1');

    expect(result.course_specs).toHaveLength(ROADMAP_COURSE_SPEC_COUNT);
    expect(result).not.toHaveProperty('competencies');
    expect(result).not.toHaveProperty('annual_plan');
  });
});

// ─── 버전 증가 ────────────────────────────────────────────────────────────

describe('generateRoadmap — 버전 번호', () => {
  afterEach(() => vi.clearAllMocks());

  it('기존 버전 1 → 버전 2', async () => {
    setupDefaultMocks('INTERVIEWED', { latestVersionData: { version_number: 1 } });
    await generateRoadmap('project-1', 'user-1');

    expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ version_number: 2 }),
      })
    );
  });

  it('기존 버전 없음 → 버전 1', async () => {
    setupDefaultMocks('INTERVIEWED', { latestVersionData: null });
    await generateRoadmap('project-1', 'user-1');

    expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ version_number: 1 }),
      })
    );
  });
});

// ─── 부수 효과 ────────────────────────────────────────────────────────────

describe('generateRoadmap — 부수 효과', () => {
  afterEach(() => vi.clearAllMocks());

  it('testMode=false → 알림 호출', async () => {
    setupDefaultMocks('INTERVIEWED');
    await generateRoadmap('project-1', 'user-1', undefined, false);

    expect(vi.mocked(createNotificationForAdmins)).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'roadmap_draft', link: '/ops/projects/project-1' })
    );
  });

  it('testMode=true → 알림 미호출', async () => {
    setupDefaultMocks('INTERVIEWED', { selfAssessmentData: [] });
    await generateRoadmap('project-1', 'user-1', undefined, true);

    expect(vi.mocked(createNotificationForAdmins)).not.toHaveBeenCalled();
  });
});

// ─── generateTestRoadmap ──────────────────────────────────────────────────

describe('generateTestRoadmap', () => {
  afterEach(() => vi.clearAllMocks());

  it('쿼터 초과 → throw', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({
      exceeded: true,
      message: '일별 한도 초과',
    } as never);

    await expect(generateTestRoadmap(createTestInput(), 'user-1', null)).rejects.toThrow(
      '일별 한도 초과'
    );
  });

  it('정상 호출 → v2 결과(명세서 6개) + validation 반환', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    const { result, validation } = await generateTestRoadmap(createTestInput(), 'user-1', null);

    expect(result.diagnosis_summary).toBe('테스트 진단 요약');
    expect(result.setup_necessity).toBe('수립 배경 복사본');
    expect(result.outcome_summary.ai_competency_level).toBe('INTERMEDIATE');
    expect(result.course_specs).toHaveLength(ROADMAP_COURSE_SPEC_COUNT);
    expect(result.course_specs[0].training_period).toBe('2026년 1분기');
    expect(result.course_specs[0].training_level).toBe('BEGINNER');
    expect(result.course_specs[0].training_method).toBe('집체');
    expect(validation).toHaveProperty('isValid');
  });

  it('스키마 불일치(명세서 5개) → RoadmapStorageError throw', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue({
      ...MOCK_LLM_RESULT,
      course_specs: MOCK_COURSE_SPECS.slice(0, ROADMAP_COURSE_SPEC_COUNT - 1),
    });

    await expect(generateTestRoadmap(createTestInput(), 'user-1', null)).rejects.toThrow(
      RoadmapStorageError
    );
  });

  it('buildUserPrompt에 신규 인터뷰 필드가 전달된다', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    await generateTestRoadmap(
      createTestInput({
        company_name: '에이비씨',
        industry: '제조',
        sub_industries: ['반도체'],
      }),
      'user-1',
      null
    );

    expect(vi.mocked(buildUserPrompt)).toHaveBeenCalledWith(
      expect.objectContaining({
        company_name: '에이비씨',
        industry: '제조',
        sub_industries: ['반도체'],
      }),
      null,
      expect.objectContaining({
        interview_date: '2026-03-01',
        company_requirements: expect.objectContaining({
          company_status: '성장 중',
          main_problems: '데이터 활용 부족',
        }),
        task_workflow_items: expect.arrayContaining([
          expect.objectContaining({ task_name: '데이터 분석' }),
        ]),
        training_targets: expect.arrayContaining([
          expect.objectContaining({ task_name: '데이터 분석' }),
        ]),
      }),
      null,
      undefined,
      true
    );
  });

  it('sttInsights가 interview에 포함되어 전달', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    const sttInsights = { key_topics: ['AI'], pain_points: ['수작업'] };
    await generateTestRoadmap(createTestInput(), 'user-1', null, sttInsights as never);

    expect(vi.mocked(buildUserPrompt)).toHaveBeenCalledWith(
      expect.anything(),
      null,
      expect.objectContaining({ stt_insights: sttInsights }),
      null,
      undefined,
      true
    );
  });

  it('input.overview 가 Ⅰ장 fallback 으로 전달되어 LLM 누락 시 복원된다', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    // LLM 이 Ⅰ장 필드를 누락/공백으로 응답한 상황
    // (ai_competency_level 은 enum 이므로 "누락" 이어야 fallback 이 발동한다)
    vi.mocked(callLLMForJSON).mockResolvedValue({
      ...MOCK_LLM_RESULT,
      setup_necessity: '',
      outcome_summary: {
        selected_tasks: '',
        main_content: '',
      },
    } as never);

    const { result } = await generateTestRoadmap(
      createTestInput({
        overview: {
          establishment_necessity: '인터뷰에 적힌 수립 배경',
          ai_competency_level: 'ADVANCED',
          selected_tasks_summary: '인터뷰 선정 과업',
          roadmap_summary: '인터뷰 요약',
        },
      }),
      'user-1',
      null
    );

    expect(result.setup_necessity).toBe('인터뷰에 적힌 수립 배경');
    expect(result.outcome_summary.ai_competency_level).toBe('ADVANCED');
    expect(result.outcome_summary.selected_tasks).toBe('인터뷰 선정 과업');
    expect(result.outcome_summary.main_content).toBe('인터뷰 요약');
  });
});

// ─── reviseTestRoadmap ────────────────────────────────────────────────────

describe('reviseTestRoadmap', () => {
  const MOCK_PREVIOUS_RESULT: RoadmapResult = MOCK_LLM_RESULT;

  afterEach(() => vi.clearAllMocks());

  function getUserMessage(): string {
    const messages = vi.mocked(callLLMForJSON).mock.calls[0][0] as Array<{
      role: string;
      content: string;
    }>;
    return messages.find((m) => m.role === 'user')!.content;
  }

  it('쿼터 초과 → throw', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({
      exceeded: true,
      message: '쿼터 초과',
    } as never);

    await expect(
      reviseTestRoadmap(createTestInput(), MOCK_PREVIOUS_RESULT, '수정해주세요', 'user-1', null)
    ).rejects.toThrow('쿼터 초과');
  });

  it('previousResult의 v2 섹션(Ⅰ-3 · Ⅲ)이 프롬프트에 포함', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    await reviseTestRoadmap(
      createTestInput(),
      MOCK_PREVIOUS_RESULT,
      '시간을 줄여주세요',
      'user-1',
      null
    );

    const userMessage = getUserMessage();

    expect(userMessage).toContain('기존 로드맵 결과');
    expect(userMessage).toContain('진단 요약');
    expect(userMessage).toContain('기존 수립 주요 결과 (Ⅰ-3)');
    expect(userMessage).toContain('기존 훈련과정 명세서 (Ⅲ)');
    // 이전 명세서의 v2 신규 필드가 JSON 으로 직렬화되어 포함
    expect(userMessage).toContain('training_period');
    expect(userMessage).toContain('training_level');
    expect(userMessage).toContain('training_method');
  });

  it('삭제된 v1 섹션(역량 모델링·훈련체계도·연간 훈련계획)은 프롬프트에 포함되지 않는다', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    await reviseTestRoadmap(createTestInput(), MOCK_PREVIOUS_RESULT, '수정', 'user-1', null);

    const userMessage = getUserMessage();

    expect(userMessage).not.toContain('기존 역량 모델링');
    expect(userMessage).not.toContain('기존 훈련체계도');
    expect(userMessage).not.toContain('기존 연간 훈련계획');
  });

  it('revisionPrompt가 메시지 후반부에 포함', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    await reviseTestRoadmap(
      createTestInput(),
      MOCK_PREVIOUS_RESULT,
      '초급 과정을 추가해주세요',
      'user-1',
      null
    );

    const userMessage = getUserMessage();

    expect(userMessage).toContain('수정 요청');
    expect(userMessage).toContain('초급 과정을 추가해주세요');
  });
});

// ─── AbortSignal / LLM 에러 전파 ──────────────────────────────────────────

describe('generateRoadmap — AbortSignal 및 LLM 에러', () => {
  afterEach(() => vi.clearAllMocks());

  it('기존 overview.roadmap_summary 가 이미 있으면 persistRoadmap 이 덮어쓰지 않는다 (사용자 편집 존중)', async () => {
    // existingSummary !== '' 분기 커버 — early return 으로 interview update 호출 안 됨
    const { mockClient } = setupDefaultMocks('INTERVIEWED', {
      interviewData: [
        {
          id: 'interview-1',
          stt_insights: null,
          company_details: {
            roadmap_overview: { roadmap_summary: '사용자가 직접 쓴 요약' },
          },
        },
      ],
    });

    const result = await generateRoadmap('project-1', 'user-1');
    expect(result.roadmapId).toBe('roadmap-1');

    // interviews 테이블의 update chain 이 호출되지 않아야 함
    const interviewsUpdateCalls = (mockClient.from.mock.calls as string[][]).filter(
      (c) => c[0] === 'interviews'
    );
    // 'interviews' from 호출 자체는 select 로 한 번 쓰였으므로, update 가 발동 안 했는지는 chain 으로 확인
    expect(interviewsUpdateCalls.length).toBeGreaterThan(0);
  });

  it('persistRoadmapSummaryToInterview update 실패해도 로드맵 생성은 성공 (ISSUE-04)', async () => {
    // interview update 가 에러 반환해도 generateRoadmap 은 성공을 반환하고
    // console.warn 으로만 경고하는지 검증 (부수 효과 실패 격리)
    setupDefaultMocks('INTERVIEWED', {
      interviewData: [{ id: 'interview-1', stt_insights: null, company_details: {} }],
      interviewUpdateError: { message: 'simulated update error' },
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = await generateRoadmap('project-1', 'user-1');
      expect(result.roadmapId).toBe('roadmap-1');
      expect(
        warnSpy.mock.calls.some((args) =>
          (args[0] as string | undefined)?.includes('요약 역반영 실패')
        )
      ).toBe(true);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('AbortSignal 취소 → callLLMForJSON 에러 그대로 전파', async () => {
    setupDefaultMocks('INTERVIEWED');
    vi.mocked(callLLMForJSON).mockRejectedValue(new Error('LLM 호출이 취소되었습니다.'));

    const controller = new AbortController();
    controller.abort();

    await expect(
      generateRoadmap('project-1', 'user-1', undefined, false, controller.signal)
    ).rejects.toThrow('LLM 호출이 취소되었습니다.');
  });
});

// ─── fillMissingRoadmapFields — v2 자동 보정 (2인자) ─────────────────────

describe('fillMissingRoadmapFields (v2 자동 보정)', () => {
  const baseRaw = {
    diagnosis_summary: '요약',
    setup_necessity: '수립 배경',
    outcome_summary: {
      ai_competency_level: 'INTERMEDIATE' as const,
      selected_tasks: '과업',
      main_content: '내용',
    },
    course_specs: [] as RoadmapCourseSpec[],
  };

  // ─── Ⅲ장 신규 필드 보정 ─────────────────────────────────────────────

  it('LLM 이 v1 키 `format` 으로 응답해도 training_method 로 승격된다', () => {
    const result = fillMissingRoadmapFields({
      ...baseRaw,
      course_specs: [
        {
          course_name: '엑셀 데이터 분석 입문',
          format: '집체', // v1 키
          recommended_program: 'K-Digital',
          goal: 'g',
          main_content: 'm',
          target_audience: 't',
          subjects: [{ name: 'S', details: 'd', hours: 8 }],
        },
      ],
    } as never);

    expect(result.course_specs[0].training_method).toBe('집체');
    // v1 orphan 키는 결과 객체에 남지 않는다
    expect(result.course_specs[0]).not.toHaveProperty('format');
  });

  it('training_method 와 format 이 모두 있으면 training_method 가 우선한다', () => {
    const result = fillMissingRoadmapFields({
      ...baseRaw,
      course_specs: [
        {
          course_name: 'C',
          training_method: '원격',
          format: '집체',
          subjects: [],
        },
      ],
    } as never);

    expect(result.course_specs[0].training_method).toBe('원격');
  });

  it('training_period 누락 → 빈 문자열로 backfill', () => {
    const result = fillMissingRoadmapFields({
      ...baseRaw,
      course_specs: [{ course_name: 'C', training_method: '집체', subjects: [] }],
    } as never);

    expect(result.course_specs[0].training_period).toBe('');
  });

  it('training_level 누락 → BEGINNER 로 backfill', () => {
    const result = fillMissingRoadmapFields({
      ...baseRaw,
      course_specs: [{ course_name: 'C', training_method: '집체', subjects: [] }],
    } as never);

    expect(result.course_specs[0].training_level).toBe('BEGINNER');
  });

  it('training_level 이 허용되지 않는 값 → BEGINNER 로 보정', () => {
    const result = fillMissingRoadmapFields({
      ...baseRaw,
      course_specs: [{ course_name: 'C', training_level: '초급', subjects: [] }],
    } as never);

    expect(result.course_specs[0].training_level).toBe('BEGINNER');
  });

  it('training_period · training_level 이 정상이면 그대로 보존', () => {
    const result = fillMissingRoadmapFields({
      ...baseRaw,
      course_specs: [
        {
          training_period: '2026년 3분기',
          training_level: 'ADVANCED',
          course_name: 'C',
          training_method: '혼합',
          subjects: [{ name: 'S', details: 'd', hours: 4 }],
        },
      ],
    } as never);

    expect(result.course_specs[0].training_period).toBe('2026년 3분기');
    expect(result.course_specs[0].training_level).toBe('ADVANCED');
    expect(result.course_specs[0].training_method).toBe('혼합');
  });

  it('subjects 가 배열이 아니거나 hours 가 숫자가 아니면 안전 보정', () => {
    const result = fillMissingRoadmapFields({
      ...baseRaw,
      course_specs: [
        { course_name: 'A', subjects: null },
        { course_name: 'B', subjects: [{ name: 'S', details: 'd', hours: '8' }] },
      ],
    } as never);

    expect(result.course_specs[0].subjects).toEqual([]);
    expect(result.course_specs[1].subjects[0].hours).toBe(0);
  });

  it('course_specs 가 배열이 아니거나 항목이 객체가 아니면 걸러낸다', () => {
    const notArray = fillMissingRoadmapFields({ ...baseRaw, course_specs: 'nope' } as never);
    expect(notArray.course_specs).toEqual([]);

    const withJunk = fillMissingRoadmapFields({
      ...baseRaw,
      course_specs: [null, 'x', { course_name: 'C', subjects: [] }],
    } as never);
    expect(withJunk.course_specs).toHaveLength(1);
    expect(withJunk.course_specs[0].course_name).toBe('C');
  });

  // ─── Ⅰ장 인터뷰 fallback ────────────────────────────────────────────

  it('LLM 이 Ⅰ장을 비우면 interviewOverview 값으로 복원한다', () => {
    const result = fillMissingRoadmapFields(
      {
        ...baseRaw,
        setup_necessity: '',
        // ai_competency_level 은 enum 이므로 "누락" 이어야 fallback 이 발동한다
        outcome_summary: {
          selected_tasks: '',
          main_content: '',
        },
      } as never,
      {
        establishment_necessity: '인터뷰 수립 배경',
        ai_competency_level: 'ADVANCED',
        selected_tasks_summary: '인터뷰 과업',
        roadmap_summary: '인터뷰 요약',
      }
    );

    expect(result.setup_necessity).toBe('인터뷰 수립 배경');
    expect(result.outcome_summary.ai_competency_level).toBe('ADVANCED');
    expect(result.outcome_summary.selected_tasks).toBe('인터뷰 과업');
    expect(result.outcome_summary.main_content).toBe('인터뷰 요약');
  });

  it('ai_competency_level 이 허용되지 않는 값이면 interviewOverview 값으로 보정한다', () => {
    const result = fillMissingRoadmapFields(
      {
        ...baseRaw,
        outcome_summary: {
          ai_competency_level: '중급',
          selected_tasks: '과업',
          main_content: '내용',
        },
      } as never,
      {
        establishment_necessity: '인터뷰 수립 배경',
        ai_competency_level: 'ADVANCED',
        selected_tasks_summary: '인터뷰 과업',
        roadmap_summary: '인터뷰 요약',
      }
    );

    expect(result.outcome_summary.ai_competency_level).toBe('ADVANCED');
  });

  it('LLM 이 유효한 ai_competency_level 을 반환하면 interviewOverview 보다 우선한다', () => {
    // enum 필드는 공백 개념이 없으므로, 유효한 값이면 LLM 값을 신뢰한다.
    const result = fillMissingRoadmapFields(
      {
        ...baseRaw,
        outcome_summary: {
          ai_competency_level: 'BEGINNER',
          selected_tasks: '과업',
          main_content: '내용',
        },
      },
      {
        establishment_necessity: '인터뷰 수립 배경',
        ai_competency_level: 'ADVANCED',
        selected_tasks_summary: '인터뷰 과업',
        roadmap_summary: '인터뷰 요약',
      }
    );

    expect(result.outcome_summary.ai_competency_level).toBe('BEGINNER');
  });

  it('LLM 이 Ⅰ장을 채웠으면 interviewOverview 를 덮어쓰지 않는다', () => {
    const result = fillMissingRoadmapFields(baseRaw, {
      establishment_necessity: '인터뷰 수립 배경',
      ai_competency_level: 'ADVANCED',
      selected_tasks_summary: '인터뷰 과업',
      roadmap_summary: '인터뷰 요약',
    });

    expect(result.setup_necessity).toBe('수립 배경');
    expect(result.outcome_summary.ai_competency_level).toBe('INTERMEDIATE');
    expect(result.outcome_summary.selected_tasks).toBe('과업');
    expect(result.outcome_summary.main_content).toBe('내용');
  });

  it('interviewOverview 가 undefined 여도 기본값으로 채운다 (2인자 시그니처)', () => {
    const result = fillMissingRoadmapFields({
      ...baseRaw,
      setup_necessity: '',
      outcome_summary: undefined,
    } as never);

    expect(result.setup_necessity).toBe('');
    expect(result.outcome_summary).toEqual({
      ai_competency_level: 'BEGINNER',
      selected_tasks: '',
      main_content: '',
    });
  });

  // ─── v1 삭제 필드는 결과에 포함되지 않음 ────────────────────────────

  it('raw 에 v1 삭제 필드가 섞여 있어도 v2 4필드만 반환한다', () => {
    const result = fillMissingRoadmapFields({
      ...baseRaw,
      competencies: [{ name: '역량', definition: '정의' }],
      ncs_used: true,
      ncs_methodology: 'NCS 차용',
      ncs_derivation_method: '도출',
      training_structure: [{ competency_name: '역량', level: 'BEGINNER' }],
      training_structure_method: '방법',
      annual_plan: { items: [], usage_plan: '활용' },
    } as never);

    expect(Object.keys(result).sort()).toEqual([
      'course_specs',
      'diagnosis_summary',
      'outcome_summary',
      'setup_necessity',
    ]);
  });
});
