/**
 * roadmap-generator.ts 테스트 (산인공 4섹션 구조)
 * - generateRoadmap: 쿼터·조회·LLM·저장·부수효과
 * - generateTestRoadmap / reviseTestRoadmap
 * - LLM 결과 스키마 불일치 시 RoadmapStorageError throw
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
import type { RoadmapResult } from './roadmap-types';
import { createAdminClient } from '@/lib/supabase/admin';
import { callLLMForJSON } from '../llm';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';
import { checkAndRecordLLMUsage } from '../quota';
import { buildUserPrompt } from './roadmap-prompts';

// ─── 산인공 4섹션 유효 LLM 응답 ─────────────────────────────────────────

const MOCK_LLM_RESULT: RoadmapResult = {
  diagnosis_summary: '테스트 진단 요약',
  setup_necessity: '수립 필요성 복사본',
  outcome_summary: {
    ai_competency_level: 'INTERMEDIATE',
    selected_tasks: '데이터 분석 자동화',
    main_content: '3단계 역량 체계 구축',
  },
  competencies: [
    {
      name: '데이터 분석 역량',
      definition: '업무 데이터를 분석해 의사결정에 활용하는 역량',
      knowledge: ['통계 기초'],
      skills: ['엑셀 피벗'],
      attitudes: ['객관성'],
    },
  ],
  ncs_used: false,
  ncs_methodology: '',
  ncs_derivation_method: '현장 인터뷰 기반 도출',
  training_structure: [
    {
      competency_name: '데이터 분석 역량',
      level: 'BEGINNER',
      content: '엑셀 기초 분석',
      target_audience: '실무자',
      method: '집체',
      goal: '기초 통계 이해',
    },
  ],
  training_structure_method: '역량 기준 3수준 체계 수립',
  annual_plan: {
    items: [
      {
        competency_name: '데이터 분석 역량',
        course_name: '엑셀 데이터 분석 입문',
        format: '집체',
        hours: 16,
        notes: '',
      },
    ],
    usage_plan: '훈련 결과를 실제 업무에 활용한다.',
  },
  course_specs: [
    {
      course_name: '엑셀 데이터 분석 입문',
      format: '집체',
      recommended_program: 'K-Digital Training',
      goal: '기초 통계',
      main_content: '엑셀 분석',
      target_audience: '실무자',
      subjects: [{ name: '피벗 테이블', details: '실습', hours: 8 }],
    },
    {
      course_name: '엑셀 데이터 분석 심화',
      format: '집체',
      recommended_program: 'K-Digital Training',
      goal: '고급 분석',
      main_content: '함수 활용',
      target_audience: '실무자',
      subjects: [{ name: '함수', details: '실습', hours: 8 }],
    },
    {
      course_name: 'AI 분석 실무',
      format: '혼합',
      recommended_program: 'K-Digital Training',
      goal: 'AI 활용',
      main_content: '코파일럿',
      target_audience: '전 직원',
      subjects: [{ name: 'Copilot', details: '실습', hours: 8 }],
    },
  ],
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
}

function createProjectsChain(
  projectStatus: string,
  overrides: MockOverrides,
  updateFn: ReturnType<typeof vi.fn>,
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
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
}

function createConsultantProfilesChain(overrides: MockOverrides) {
  const data =
    overrides.consultantProfileData !== undefined
      ? overrides.consultantProfileData
      : { expertise_domains: ['AI'], available_industries: ['IT'], teaching_levels: ['BEGINNER'], coaching_methods: ['1:1'], skill_tags: ['tag'] };
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValue({ data, error: data ? null : { message: 'not found' } }),
      }),
    }),
  };
}

function createRoadmapVersionsChain(overrides: MockOverrides) {
  const latestData =
    overrides.latestVersionData !== undefined
      ? overrides.latestVersionData
      : { version_number: 1 };
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
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
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
      false,
    );

    if (shouldUpdate) {
      expect(updateFn).toHaveBeenCalledWith({ status: 'ROADMAP_DRAFTED' });
    } else {
      expect(updateFn).not.toHaveBeenCalled();
    }
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
    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow('사용량 한도를 초과했습니다.');
  });
});

// ─── 데이터 조회 ──────────────────────────────────────────────────────────

describe('generateRoadmap — 데이터 조회', () => {
  afterEach(() => vi.clearAllMocks());

  it('프로젝트 조회 에러 → throw', async () => {
    setupDefaultMocks('INTERVIEWED', {
      projectResult: { data: null, error: { message: 'DB error' } },
    });
    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow('프로젝트를 찾을 수 없습니다.');
  });

  it('자가진단 없음 + testMode=false → throw', async () => {
    setupDefaultMocks('INTERVIEWED', { selfAssessmentData: [] });
    await expect(generateRoadmap('project-1', 'user-1', undefined, false)).rejects.toThrow(
      '자가진단 결과가 없습니다.',
    );
  });

  it('자가진단 없음 + testMode=true → 정상 진행', async () => {
    setupDefaultMocks('INTERVIEWED', { selfAssessmentData: [] });
    const result = await generateRoadmap('project-1', 'user-1', undefined, true);
    expect(result.roadmapId).toBe('roadmap-1');
  });

  it('인터뷰 없음 → throw', async () => {
    setupDefaultMocks('INTERVIEWED', { interviewData: [] });
    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow('인터뷰 데이터가 없습니다.');
  });
});

// ─── LLM 호출 및 스키마 검증 ──────────────────────────────────────────────

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
      undefined,
    );
  });

  it('로드맵 insert 실패 → throw', async () => {
    setupDefaultMocks('INTERVIEWED', {
      insertResult: { data: null, error: { message: 'insert failed' } },
    });
    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow('로드맵 저장 실패: insert failed');
  });

  it('LLM 결과 스키마 불일치 → RoadmapStorageError throw', async () => {
    setupDefaultMocks('INTERVIEWED');
    // competencies가 빈 배열 → min(1) 위반
    vi.mocked(callLLMForJSON).mockResolvedValue({
      ...MOCK_LLM_RESULT,
      competencies: [],
    });

    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow(RoadmapStorageError);
  });

  it('LLM 결과 course_specs가 2개(< 3) → RoadmapStorageError throw', async () => {
    setupDefaultMocks('INTERVIEWED');
    vi.mocked(callLLMForJSON).mockResolvedValue({
      ...MOCK_LLM_RESULT,
      course_specs: MOCK_LLM_RESULT.course_specs.slice(0, 2),
    });

    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow(RoadmapStorageError);
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
      }),
    );
  });

  it('기존 버전 없음 → 버전 1', async () => {
    setupDefaultMocks('INTERVIEWED', { latestVersionData: null });
    await generateRoadmap('project-1', 'user-1');

    expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ version_number: 1 }),
      }),
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
      expect.objectContaining({ type: 'roadmap_draft', link: '/ops/projects/project-1' }),
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

    await expect(generateTestRoadmap(createTestInput(), 'user-1', null)).rejects.toThrow('일별 한도 초과');
  });

  it('정상 호출 → 신규 4섹션 결과 + validation 반환', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    const { result, validation } = await generateTestRoadmap(createTestInput(), 'user-1', null);

    expect(result.diagnosis_summary).toBe('테스트 진단 요약');
    expect(result.competencies).toHaveLength(1);
    expect(result.training_structure).toHaveLength(1);
    expect(result.annual_plan.items).toHaveLength(1);
    expect(result.course_specs).toHaveLength(3);
    expect(validation).toHaveProperty('isValid');
  });

  it('스키마 불일치 → RoadmapStorageError throw', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue({ ...MOCK_LLM_RESULT, competencies: [] });

    await expect(generateTestRoadmap(createTestInput(), 'user-1', null)).rejects.toThrow(
      RoadmapStorageError,
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
      null,
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
      true,
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
      true,
    );
  });
});

// ─── reviseTestRoadmap ────────────────────────────────────────────────────

describe('reviseTestRoadmap', () => {
  const MOCK_PREVIOUS_RESULT: RoadmapResult = MOCK_LLM_RESULT;

  afterEach(() => vi.clearAllMocks());

  it('쿼터 초과 → throw', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({
      exceeded: true,
      message: '쿼터 초과',
    } as never);

    await expect(
      reviseTestRoadmap(createTestInput(), MOCK_PREVIOUS_RESULT, '수정해주세요', 'user-1', null),
    ).rejects.toThrow('쿼터 초과');
  });

  it('previousResult의 4섹션이 프롬프트에 포함', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    await reviseTestRoadmap(
      createTestInput(),
      MOCK_PREVIOUS_RESULT,
      '시간을 줄여주세요',
      'user-1',
      null,
    );

    const messages = vi.mocked(callLLMForJSON).mock.calls[0][0] as Array<{
      role: string;
      content: string;
    }>;
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).toContain('기존 로드맵 결과');
    expect(userMessage).toContain('기존 역량 모델링');
    expect(userMessage).toContain('기존 훈련체계도');
    expect(userMessage).toContain('기존 연간 훈련계획');
    expect(userMessage).toContain('기존 훈련과정 명세서');
  });

  it('revisionPrompt가 메시지 후반부에 포함', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    await reviseTestRoadmap(
      createTestInput(),
      MOCK_PREVIOUS_RESULT,
      '초급 과정을 추가해주세요',
      'user-1',
      null,
    );

    const messages = vi.mocked(callLLMForJSON).mock.calls[0][0] as Array<{
      role: string;
      content: string;
    }>;
    const userMessage = messages.find((m) => m.role === 'user')!.content;

    expect(userMessage).toContain('수정 요청');
    expect(userMessage).toContain('초급 과정을 추가해주세요');
  });
});

// ─── AbortSignal / LLM 에러 전파 ──────────────────────────────────────────

describe('generateRoadmap — AbortSignal 및 LLM 에러', () => {
  afterEach(() => vi.clearAllMocks());

  it('AbortSignal 취소 → callLLMForJSON 에러 그대로 전파', async () => {
    setupDefaultMocks('INTERVIEWED');
    vi.mocked(callLLMForJSON).mockRejectedValue(new Error('LLM 호출이 취소되었습니다.'));

    const controller = new AbortController();
    controller.abort();

    await expect(
      generateRoadmap('project-1', 'user-1', undefined, false, controller.signal),
    ).rejects.toThrow('LLM 호출이 취소되었습니다.');
  });
});

// ─── fillMissingRoadmapFields — ISSUE-04 자동 채움 분기 ──────────────────

describe('fillMissingRoadmapFields (ISSUE-04 자동 채움)', () => {
  const baseRaw = {
    diagnosis_summary: '요약',
    setup_necessity: '필요성',
    outcome_summary: {
      ai_competency_level: 'INTERMEDIATE' as const,
      selected_tasks: '과업',
      main_content: '내용',
    },
    training_structure: [] as RoadmapResult['training_structure'],
    training_structure_method: '방법',
    annual_plan: { items: [], usage_plan: '' },
    course_specs: [] as RoadmapResult['course_specs'],
  };

  it('LLM 이 competencies=[] 를 반환해도 인터뷰 competency_models 로 자동 채운다', () => {
    const result = fillMissingRoadmapFields(
      { ...baseRaw, competencies: [] },
      undefined,
      [
        {
          id: 'cm1',
          competency_name: '데이터 해석',
          competency_definition: '정의',
          knowledge: '통계',
          skill: '엑셀',
          attitude: '객관성',
        },
      ],
      { uses_ncs: false, competency_derivation_method: '인터뷰 도출' },
    );
    expect(result.competencies).toHaveLength(1);
    expect(result.competencies[0]).toEqual({
      name: '데이터 해석',
      definition: '정의',
      knowledge: ['통계'],
      skills: ['엑셀'],
      attitudes: ['객관성'],
    });
  });

  it('인터뷰 ncs_usage 의 uses_ncs=true 를 기준값으로 채운다', () => {
    const result = fillMissingRoadmapFields(
      { ...baseRaw, competencies: [{ name: 'c', definition: 'd', knowledge: [], skills: [], attitudes: [] }] },
      undefined,
      undefined,
      { uses_ncs: true, ncs_usage_method: 'NCS 20.02.01 차용' },
    );
    expect(result.ncs_used).toBe(true);
    expect(result.ncs_methodology).toBe('NCS 20.02.01 차용');
  });

  it('LLM 이 competencies 를 반환하면 인터뷰 fallback 을 사용하지 않는다', () => {
    const llmCompetencies = [
      { name: 'LLM 역량', definition: 'd', knowledge: ['k1', 'k2'], skills: ['s1'], attitudes: ['a1'] },
    ];
    const result = fillMissingRoadmapFields(
      { ...baseRaw, competencies: llmCompetencies },
      undefined,
      [
        {
          id: 'cm1',
          competency_name: '인터뷰 역량',
          competency_definition: '정의',
          knowledge: 'k',
          skill: 's',
          attitude: 'a',
        },
      ],
    );
    expect(result.competencies).toEqual(llmCompetencies);
  });
});
