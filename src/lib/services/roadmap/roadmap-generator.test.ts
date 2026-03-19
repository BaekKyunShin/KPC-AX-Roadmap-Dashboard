/**
 * roadmap-generator.ts 테스트
 * - generateRoadmap: FINALIZED 프로젝트에서 역방향 상태 전이 방지 (#37)
 * - generateRoadmap: 쿼터 검증, 데이터 조회, LLM 호출/저장, 부수 효과
 * - generateTestRoadmap / reviseTestRoadmap
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import { generateRoadmap, generateTestRoadmap, reviseTestRoadmap } from './roadmap-generator';
import type { TestRoadmapInput } from './roadmap-generator';
import { createAdminClient } from '@/lib/supabase/admin';
import { callLLMForJSON } from '../llm';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';
import { checkAndRecordLLMUsage } from '../quota';
import { buildUserPrompt } from './roadmap-prompts';

// ─── 헬퍼: Supabase 체인 모킹 ─────────────────────────────────────────────

/** 시나리오별 오버라이드 옵션 */
interface MockSupabaseOverrides {
  /** projects 조회 결과 오버라이드 */
  projectResult?: { data: Record<string, unknown> | null; error: { message: string } | null };
  /** self_assessments 조회 결과 오버라이드 */
  selfAssessmentData?: Record<string, unknown>[] | null;
  /** interviews 조회 결과 오버라이드 */
  interviewData?: Record<string, unknown>[] | null;
  /** consultant_profiles 조회 결과 오버라이드 */
  consultantProfileData?: Record<string, unknown> | null;
  /** roadmap_versions 최신 버전 결과 오버라이드 */
  latestVersionData?: { version_number: number } | null;
  /** roadmap_versions insert 결과 오버라이드 */
  insertResult?: { data: { id: string } | null; error: { message: string } | null };
  /** assigned_consultant_id 오버라이드 (null → 컨설턴트 프로필 조회 안 함) */
  assignedConsultantId?: string | null;
}

// ── 테이블별 체인 빌더 ──────────────────────────────────────────────────

/** projects 테이블 — 메인 데이터 조회 + 상태 업데이트 */
function createProjectsChain(
  projectStatus: string,
  overrides: MockSupabaseOverrides,
  updateFn: ReturnType<typeof vi.fn>,
) {
  const assignedConsultantId = overrides.assignedConsultantId !== undefined
    ? overrides.assignedConsultantId
    : 'consultant-1';

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

/** self_assessments 테이블 */
function createSelfAssessmentsChain(overrides: MockSupabaseOverrides) {
  const data = overrides.selfAssessmentData !== undefined
    ? overrides.selfAssessmentData
    : [{ id: 'sa-1', answers: {} }];
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  };
}

/** interviews 테이블 */
function createInterviewsChain(overrides: MockSupabaseOverrides) {
  const data = overrides.interviewData !== undefined
    ? overrides.interviewData
    : [{ id: 'interview-1', stt_insights: { key_topics: [], pain_points: [] } }];
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  };
}

/** consultant_profiles 테이블 */
function createConsultantProfilesChain(overrides: MockSupabaseOverrides) {
  const data = overrides.consultantProfileData !== undefined
    ? overrides.consultantProfileData
    : { specialties: ['AI'], industries: ['IT'] };
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data,
          error: data ? null : { message: 'not found' },
        }),
      }),
    }),
  };
}

/** roadmap_versions 테이블 — select(최신 버전) + insert(저장) */
function createRoadmapVersionsChain(overrides: MockSupabaseOverrides) {
  const latestData = overrides.latestVersionData !== undefined
    ? overrides.latestVersionData
    : { version_number: 1 };
  const insertRes = overrides.insertResult || {
    data: { id: 'roadmap-1' },
    error: null,
  };
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

// ── 조합 함수 ───────────────────────────────────────────────────────────

/** 프로젝트 상태 업데이트 호출을 추적하기 위한 모킹 */
function createMockSupabase(projectStatus: string, overrides: MockSupabaseOverrides = {}) {
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

// ─── LLM 응답 모킹 ──────────────────────────────────────────────────────

const MOCK_LLM_RESULT = {
  diagnosis_summary: '테스트 진단 요약',
  courses: [
    {
      name: 'AI 기초',
      description: '설명',
      category: 'AI',
      level: '입문',
      recommended_hours: 8,
      curriculum: [{ topic: '주제', hours: 8 }],
      tools: [{ name: '도구', is_free: true }],
    },
  ],
  pbl_course: {
    name: 'PBL',
    description: '설명',
    category: 'PBL',
    level: '중급',
    recommended_hours: 16,
    curriculum: [{ topic: '주제', hours: 16 }],
    tools: [],
  },
};

// ─── 테스트 ────────────────────────────────────────────────────────────────

describe('generateRoadmap — 프로젝트 상태 업데이트', () => {
  beforeEach(() => {
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { status: 'INTERVIEWED', shouldUpdate: true, desc: '정상 전이' },
    { status: 'ROADMAP_DRAFTED', shouldUpdate: true, desc: '재생성 시 상태 유지' },
    { status: 'FINALIZED', shouldUpdate: false, desc: '역방향 전이 방지' },
  ])('$status → $desc (update=$shouldUpdate)', async ({ status, shouldUpdate }) => {
    const { mockClient, updateFn } = createMockSupabase(status);
    vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

    await generateRoadmap('project-1', 'user-1', status === 'INTERVIEWED' ? undefined : '수정 요청', false);

    if (shouldUpdate) {
      expect(updateFn).toHaveBeenCalledWith({ status: 'ROADMAP_DRAFTED' });
    } else {
      expect(updateFn).not.toHaveBeenCalled();
    }
  });
});

// ─── 추가 테스트 ──────────────────────────────────────────────────────────

// ─── 공용 테스트 입력 헬퍼 ────────────────────────────────────────────────

function createTestInput(overrides: Partial<TestRoadmapInput> = {}): TestRoadmapInput {
  return {
    company_name: '테스트 기업',
    industry: 'IT',
    company_size: '50명',
    interview_date: '2026-03-01',
    participants: [{ id: 'p-1', name: '홍길동', position: '팀장' }],
    company_details: { systems_and_tools: ['Excel'], ai_experience: '없음' },
    job_tasks: [{ id: 'task-1', task_name: '데이터 분석', task_description: '엑셀 데이터 분석' }],
    pain_points: [{ id: 'pain-1', description: '수작업 과다', severity: 'HIGH' }],
    improvement_goals: [{ id: 'goal-1', goal_description: 'AI 자동화' }],
    ...overrides,
  };
}

/** 기본 mock 설정 + Supabase 클라이언트 주입 */
function setupDefaultMocks(status = 'INTERVIEWED', overrides: MockSupabaseOverrides = {}) {
  vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);
  vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
  const { mockClient, updateFn } = createMockSupabase(status, overrides);
  vi.mocked(createAdminClient).mockReturnValue(mockClient as never);
  return { mockClient, updateFn };
}

// ─── 쿼터 검증 ─────────────────────────────────────────────────────────────

describe('generateRoadmap — 쿼터 검증', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('checkAndRecordLLMUsage가 exceeded: true + message 반환 → 해당 메시지로 throw', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({
      exceeded: true,
      message: '월별 한도 초과',
    } as never);

    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow('월별 한도 초과');
  });

  it('checkAndRecordLLMUsage가 exceeded: true + message 없음 → 기본 메시지로 throw', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({
      exceeded: true,
    } as never);

    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow('사용량 한도를 초과했습니다.');
  });
});

// ─── 데이터 조회 ─────────────────────────────────────────────────────────

describe('generateRoadmap — 데이터 조회', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('프로젝트 조회 에러 → throw', async () => {
    setupDefaultMocks('INTERVIEWED', {
      projectResult: { data: null, error: { message: 'DB error' } },
    });

    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow('프로젝트를 찾을 수 없습니다.');
  });

  it('자가진단 없음 + testMode=false → throw', async () => {
    setupDefaultMocks('INTERVIEWED', {
      selfAssessmentData: [],
    });

    await expect(generateRoadmap('project-1', 'user-1', undefined, false)).rejects.toThrow(
      '자가진단 결과가 없습니다.'
    );
  });

  it('자가진단 없음 + testMode=true → 인터뷰가 있으면 정상 진행', async () => {
    setupDefaultMocks('INTERVIEWED', {
      selfAssessmentData: [],
    });

    const result = await generateRoadmap('project-1', 'user-1', undefined, true);

    expect(result.roadmapId).toBe('roadmap-1');
  });

  it('인터뷰 없음 → throw', async () => {
    setupDefaultMocks('INTERVIEWED', {
      interviewData: [],
    });

    await expect(generateRoadmap('project-1', 'user-1')).rejects.toThrow('인터뷰 데이터가 없습니다.');
  });

  it('컨설턴트 프로필 없음 → consultantSnapshot null로 정상 진행', async () => {
    setupDefaultMocks('INTERVIEWED', {
      assignedConsultantId: null,
    });

    const result = await generateRoadmap('project-1', 'user-1');

    expect(result.roadmapId).toBe('roadmap-1');
    // buildUserPrompt에 consultantSnapshot=null 전달 확인
    expect(vi.mocked(buildUserPrompt)).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      null,
      undefined,
      false,
    );
  });
});

// ─── LLM 호출 및 저장 ──────────────────────────────────────────────────────

describe('generateRoadmap — LLM 호출 및 저장', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('callLLMForJSON에 올바른 messages 전달', async () => {
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

  it('기존 버전 1 → 버전 2로 증가', async () => {
    const { mockClient } = setupDefaultMocks('INTERVIEWED', {
      latestVersionData: { version_number: 1 },
    });

    await generateRoadmap('project-1', 'user-1');

    // insert가 version_number: 2로 호출되었는지 확인
    const roadmapVersionsCalls = mockClient.from.mock.calls.filter(
      (c: [string]) => c[0] === 'roadmap_versions'
    );
    // roadmap_versions는 2번 호출됨: select(버전 조회) + insert(저장)
    // insert 호출의 인자를 검증
    expect(roadmapVersionsCalls.length).toBeGreaterThanOrEqual(1);

    // createAuditLog의 meta에서 version_number 확인
    expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          version_number: 2,
        }),
      }),
    );
  });

  it('기존 버전 없음 → 버전 1', async () => {
    setupDefaultMocks('INTERVIEWED', {
      latestVersionData: null,
    });

    await generateRoadmap('project-1', 'user-1');

    expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          version_number: 1,
        }),
      }),
    );
  });

  it('revision_prompt가 감사로그 meta에 포함', async () => {
    setupDefaultMocks('INTERVIEWED');

    await generateRoadmap('project-1', 'user-1', '시간을 줄여주세요');

    expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          has_revision_prompt: true,
        }),
      }),
    );
  });
});

// ─── 부수 효과 ──────────────────────────────────────────────────────────────

describe('generateRoadmap — 부수 효과', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('createAuditLog에 올바른 meta 전달', async () => {
    setupDefaultMocks('INTERVIEWED', {
      latestVersionData: { version_number: 3 },
    });

    await generateRoadmap('project-1', 'user-1', '수정 요청');

    expect(vi.mocked(createAuditLog)).toHaveBeenCalledWith({
      actorUserId: 'user-1',
      action: 'ROADMAP_CREATE',
      targetType: 'roadmap',
      targetId: 'roadmap-1',
      meta: {
        project_id: 'project-1',
        version_number: 4,
        has_revision_prompt: true,
        validation_passed: expect.any(Boolean),
      },
    });
  });

  it('testMode=false → createNotificationForAdmins 호출', async () => {
    setupDefaultMocks('INTERVIEWED');

    await generateRoadmap('project-1', 'user-1', undefined, false);

    expect(vi.mocked(createNotificationForAdmins)).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'roadmap_draft',
        title: '로드맵 초안 생성',
        link: '/ops/projects/project-1',
      }),
    );
  });

  it('testMode=true → 알림 미호출', async () => {
    setupDefaultMocks('INTERVIEWED', {
      selfAssessmentData: [],
    });

    await generateRoadmap('project-1', 'user-1', undefined, true);

    expect(vi.mocked(createNotificationForAdmins)).not.toHaveBeenCalled();
  });

  it('알림 메시지에 projectData의 company_name을 사용한다', async () => {
    setupDefaultMocks('INTERVIEWED');

    await generateRoadmap('project-1', 'user-1', undefined, false);

    expect(vi.mocked(createNotificationForAdmins)).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('테스트 기업'),
      }),
    );
  });
});

// ─── generateTestRoadmap ──────────────────────────────────────────────────

describe('generateTestRoadmap', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('쿼터 초과 → throw', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({
      exceeded: true,
      message: '일별 한도 초과',
    } as never);

    const input = createTestInput();
    await expect(generateTestRoadmap(input, 'user-1', null)).rejects.toThrow('일별 한도 초과');
  });

  it('정상 호출 → LLM 결과 + validation 반환', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    const input = createTestInput();
    const { result, validation } = await generateTestRoadmap(input, 'user-1', null);

    expect(result.diagnosis_summary).toBe('테스트 진단 요약');
    expect(result).toHaveProperty('roadmap_matrix');
    expect(validation).toHaveProperty('isValid');
    expect(validation).toHaveProperty('errors');
  });

  it('sttInsights가 interview 데이터에 포함되어 buildUserPrompt로 전달', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    const input = createTestInput();
    const sttInsights = { key_topics: ['AI 활용'], pain_points: ['수작업'] };

    await generateTestRoadmap(input, 'user-1', null, sttInsights as never);

    // buildUserPrompt가 호출될 때 interview 인자에 stt_insights 포함 확인
    expect(vi.mocked(buildUserPrompt)).toHaveBeenCalledWith(
      expect.anything(),
      null,
      expect.objectContaining({
        stt_insights: sttInsights,
      }),
      null,
      undefined,
      true,
    );
  });

  it('buildTestProjectData/buildTestInterviewData가 올바르게 데이터 구성', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    const input = createTestInput({
      company_name: '에이비씨 주식회사',
      industry: '제조',
      sub_industries: ['반도체'],
      company_size: '100명',
      customer_requirements: '빠른 도입',
      constraints: [
        { id: 'c-1', type: '인프라', description: '서버 없음', severity: 'HIGH', workaround: '클라우드 사용' },
      ],
    });

    await generateTestRoadmap(input, 'user-1', null);

    // buildUserPrompt의 첫 번째 인자(projectData) 검증
    expect(vi.mocked(buildUserPrompt)).toHaveBeenCalledWith(
      expect.objectContaining({
        company_name: '에이비씨 주식회사',
        industry: '제조',
        sub_industries: ['반도체'],
        company_size: '100명',
        customer_comment: '빠른 도입',
      }),
      null,
      expect.objectContaining({
        interview_date: '2026-03-01',
        participants: expect.arrayContaining([
          expect.objectContaining({ name: '홍길동' }),
        ]),
        job_tasks: expect.arrayContaining([
          expect.objectContaining({
            task_name: '데이터 분석',
            job_category: '테스트',
          }),
        ]),
        pain_points: expect.arrayContaining([
          expect.objectContaining({ description: '수작업 과다' }),
        ]),
        improvement_goals: expect.arrayContaining([
          expect.objectContaining({ goal_description: 'AI 자동화' }),
        ]),
        constraints: expect.arrayContaining([
          expect.objectContaining({
            type: '인프라',
            description: '서버 없음',
            workaround: '클라우드 사용',
          }),
        ]),
      }),
      null,
      undefined,
      true,
    );
  });
});

// ─── reviseTestRoadmap ──────────────────────────────────────────────────────

describe('reviseTestRoadmap', () => {
  const MOCK_PREVIOUS_RESULT = {
    diagnosis_summary: '기존 진단 요약',
    roadmap_matrix: [],
    courses: [
      {
        course_name: '기존 과정',
        level: 'BEGINNER' as const,
        target_task: '업무',
        target_audience: '대상',
        recommended_hours: 8,
        curriculum: [],
        tools: [],
        expected_outcome: '효과',
        measurement_method: '측정',
        prerequisites: [],
      },
    ],
    pbl_course: {
      selected_course_name: '기존 과정',
      selected_course_level: 'BEGINNER' as const,
      selected_course_task: '업무',
      selection_rationale: {
        consultant_expertise_fit: '적합',
        pain_point_alignment: '연관',
        feasibility_assessment: '가능',
        summary: '요약',
      },
      course_name: 'PBL: 기존 과정',
      total_hours: 8,
      target_tasks: ['업무'],
      target_audience: '대상',
      curriculum: [],
      final_deliverables: ['결과물'],
      expected_outcomes: ['효과'],
      business_impact: '임팩트',
      measurement_methods: ['측정'],
      prerequisites: [],
    },
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('쿼터 초과 → throw', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({
      exceeded: true,
      message: '쿼터 초과',
    } as never);

    const input = createTestInput();
    await expect(
      reviseTestRoadmap(input, MOCK_PREVIOUS_RESULT, '수정해주세요', 'user-1', null)
    ).rejects.toThrow('쿼터 초과');
  });

  it('previousResult가 프롬프트에 포함 (callLLMForJSON의 user 메시지에 기존 로드맵 정보 포함)', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    // buildUserPrompt mock은 기본 'user prompt'를 반환 → reviseTestRoadmap은 이것에 추가 텍스트를 붙임
    const input = createTestInput();
    await reviseTestRoadmap(input, MOCK_PREVIOUS_RESULT, '시간을 줄여주세요', 'user-1', null);

    // callLLMForJSON의 user 메시지에 기존 로드맵 정보가 포함되어야 함
    const messages = vi.mocked(callLLMForJSON).mock.calls[0][0] as Array<{ role: string; content: string }>;
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('기존 로드맵 결과');
    expect(userMessage).toContain('기존 진단 요약');
    expect(userMessage).toContain('기존 과정');
  });

  it('revisionPrompt가 프롬프트 끝에 추가', async () => {
    vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({ exceeded: false } as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);

    const input = createTestInput();
    await reviseTestRoadmap(input, MOCK_PREVIOUS_RESULT, '초급 과정을 추가해주세요', 'user-1', null);

    const messages = vi.mocked(callLLMForJSON).mock.calls[0][0] as Array<{ role: string; content: string }>;
    const userMessage = messages.find(m => m.role === 'user')!.content;

    expect(userMessage).toContain('수정 요청');
    expect(userMessage).toContain('초급 과정을 추가해주세요');
    // revisionPrompt는 메시지 후반부에 위치
    const revisionIdx = userMessage.indexOf('초급 과정을 추가해주세요');
    const diagnosisIdx = userMessage.indexOf('기존 진단 요약');
    expect(revisionIdx).toBeGreaterThan(diagnosisIdx);
  });
});
