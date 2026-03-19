/**
 * matching-llm.ts 테스트
 * - generateLLMMatchingRecommendations: 프롬프트 빌드, LLM 응답 파싱, 에러 핸들링
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── 모킹 ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

vi.mock('../llm', () => ({
  callLLMForJSON: vi.fn(),
}));

vi.mock('../audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./matching-helpers', () => ({
  fetchMatchingData: vi.fn(),
  filterValidRecommendations: vi.fn(),
  saveRecommendations: vi.fn().mockResolvedValue(undefined),
  updateProjectStatusIfNeeded: vi.fn().mockResolvedValue(undefined),
  LEVEL_LABEL_MAP: {
    BEGINNER: '입문',
    INTERMEDIATE: '실무',
    ADVANCED: '심화',
    LEADER: '리더',
  },
  LLM_LIMITS: {
    MAX_STRENGTHS: 3,
    MAX_CONSIDERATIONS: 2,
  },
}));

import { generateLLMMatchingRecommendations } from './matching-llm';
import { callLLMForJSON } from '../llm';
import { createAuditLog } from '../audit';
import {
  fetchMatchingData,
  filterValidRecommendations,
  saveRecommendations,
  updateProjectStatusIfNeeded,
} from './matching-helpers';

// ─── 테스트 데이터 ──────────────────────────────────────────────────────────

const MOCK_FETCH_DATA = {
  projectData: {
    industry: 'IT',
    sub_industries: ['AI', 'ML'],
    company_size: 'MEDIUM',
    company_name: '테스트 기업',
  },
  assessmentScores: {
    total_score: 70,
    dimension_scores: [
      { dimension: 'AI 활용', score: 7, max_score: 10 },
      { dimension: '데이터', score: 4, max_score: 10 },
    ],
  },
  candidatesWithProfile: [
    {
      userId: 'user-a',
      name: '컨설턴트A',
      profile: {
        available_industries: ['IT'],
        sub_industries: ['AI'],
        expertise_domains: ['머신러닝'],
        skill_tags: ['Python'],
        teaching_levels: ['BEGINNER', 'INTERMEDIATE'],
        years_of_experience: 5,
        strengths_constraints: '강점A',
      },
    },
    {
      userId: 'user-b',
      name: '컨설턴트B',
      profile: {
        available_industries: ['제조'],
        sub_industries: null,
        expertise_domains: null,
        skill_tags: null,
        teaching_levels: null,
        years_of_experience: null,
        strengths_constraints: null,
      },
    },
  ],
  nameMap: new Map([
    ['user-a', '컨설턴트A'],
    ['user-b', '컨설턴트B'],
  ]),
};

function createMockLLMResponse(overrides: Record<string, unknown>[] = []) {
  const defaults = [
    {
      userId: 'user-a',
      score: 90,
      analysis: '종합 분석 내용',
      strengths: ['강점1', '강점2'],
      considerations: ['고려1'],
    },
    {
      userId: 'user-b',
      score: 75,
      analysis: '분석B',
      strengths: ['강점B1'],
      considerations: ['고려B1'],
    },
  ];

  return {
    recommendations: overrides.length > 0 ? overrides : defaults,
  };
}

// ─── 테스트 ────────────────────────────────────────────────────────────────

describe('generateLLMMatchingRecommendations', () => {
  beforeEach(() => {
    vi.mocked(fetchMatchingData).mockResolvedValue(MOCK_FETCH_DATA as never);
    vi.mocked(callLLMForJSON).mockResolvedValue(createMockLLMResponse());
    // filterValidRecommendations: 기본적으로 입력을 그대로 통과
    vi.mocked(filterValidRecommendations).mockImplementation((recs) => recs);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── 프롬프트 빌드 검증 ──────────────────────────────────────────────────

  it('시스템 프롬프트에 매칭 전문가 역할과 평가 기준이 포함된다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    const [[messages]] = vi.mocked(callLLMForJSON).mock.calls;
    const systemMsg = (messages as { role: string; content: string }[]).find(
      (m) => m.role === 'system'
    );

    expect(systemMsg?.content).toContain('컨설턴트 매칭 전문가');
    expect(systemMsg?.content).toContain('업종 적합성');
    expect(systemMsg?.content).toContain('전문분야 일치');
    expect(systemMsg?.content).toContain('JSON');
  });

  it('사용자 프롬프트에 기업 정보와 자가진단 결과가 포함된다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    const [[messages]] = vi.mocked(callLLMForJSON).mock.calls;
    const userMsg = (messages as { role: string; content: string }[]).find(
      (m) => m.role === 'user'
    );

    expect(userMsg?.content).toContain('테스트 기업');
    expect(userMsg?.content).toContain('IT');
    expect(userMsg?.content).toContain('70');
    expect(userMsg?.content).toContain('AI 활용');
  });

  it('사용자 프롬프트에 컨설턴트 프로필 정보가 포함된다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    const [[messages]] = vi.mocked(callLLMForJSON).mock.calls;
    const userMsg = (messages as { role: string; content: string }[]).find(
      (m) => m.role === 'user'
    );

    expect(userMsg?.content).toContain('컨설턴트A');
    expect(userMsg?.content).toContain('user-a');
    expect(userMsg?.content).toContain('머신러닝');
    expect(userMsg?.content).toContain('Python');
  });

  it('프로필 필드가 null인 컨설턴트도 미지정으로 처리된다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    const [[messages]] = vi.mocked(callLLMForJSON).mock.calls;
    const userMsg = (messages as { role: string; content: string }[]).find(
      (m) => m.role === 'user'
    );

    // user-b는 대부분 null → '미지정'으로 표시
    expect(userMsg?.content).toContain('컨설턴트B');
    expect(userMsg?.content).toContain('미지정');
  });

  it('LLM 호출 시 temperature=0.3, maxTokens=4000을 사용한다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    const [, options] = vi.mocked(callLLMForJSON).mock.calls[0];
    expect(options).toEqual({ temperature: 0.3, maxTokens: 4000 });
  });

  // ─── LLM 응답 파싱 ───────────────────────────────────────────────────────

  it('점수를 0-100 범위로 클램핑한다', async () => {
    vi.mocked(callLLMForJSON).mockResolvedValue(
      createMockLLMResponse([
        { userId: 'user-a', score: 150, analysis: '분석', strengths: ['강점'], considerations: ['고려'] },
        { userId: 'user-b', score: -10, analysis: '분석', strengths: ['강점'], considerations: ['고려'] },
      ])
    );

    const result = await generateLLMMatchingRecommendations('project-1', 'actor-1');

    expect(result[0].totalScore).toBe(100);
    expect(result[1].totalScore).toBe(0);
  });

  it('strengths를 MAX_STRENGTHS(3)개로 자른다', async () => {
    vi.mocked(callLLMForJSON).mockResolvedValue(
      createMockLLMResponse([
        {
          userId: 'user-a',
          score: 90,
          analysis: '분석',
          strengths: ['강점1', '강점2', '강점3', '강점4', '강점5'],
          considerations: ['고려1'],
        },
      ])
    );

    const result = await generateLLMMatchingRecommendations('project-1', 'actor-1');

    expect(result[0].rationale.strengths).toHaveLength(3);
    expect(result[0].rationale.strengths).toEqual(['강점1', '강점2', '강점3']);
  });

  it('considerations를 MAX_CONSIDERATIONS(2)개로 자른다', async () => {
    vi.mocked(callLLMForJSON).mockResolvedValue(
      createMockLLMResponse([
        {
          userId: 'user-a',
          score: 90,
          analysis: '분석',
          strengths: ['강점1'],
          considerations: ['고려1', '고려2', '고려3', '고려4'],
        },
      ])
    );

    const result = await generateLLMMatchingRecommendations('project-1', 'actor-1');

    expect(result[0].rationale.considerations).toHaveLength(2);
    expect(result[0].rationale.considerations).toEqual(['고려1', '고려2']);
  });

  it('topN 옵션에 따라 결과를 잘라낸다', async () => {
    vi.mocked(callLLMForJSON).mockResolvedValue(
      createMockLLMResponse([
        { userId: 'user-a', score: 90, analysis: '분석A', strengths: ['강점'], considerations: ['고려'] },
        { userId: 'user-b', score: 80, analysis: '분석B', strengths: ['강점'], considerations: ['고려'] },
      ])
    );

    const result = await generateLLMMatchingRecommendations('project-1', 'actor-1', { topN: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('user-a');
  });

  it('기본 topN은 3이다', async () => {
    vi.mocked(callLLMForJSON).mockResolvedValue(
      createMockLLMResponse([
        { userId: 'u1', score: 90, analysis: '분석', strengths: ['강점'], considerations: ['고려'] },
        { userId: 'u2', score: 85, analysis: '분석', strengths: ['강점'], considerations: ['고려'] },
        { userId: 'u3', score: 80, analysis: '분석', strengths: ['강점'], considerations: ['고려'] },
        { userId: 'u4', score: 70, analysis: '분석', strengths: ['강점'], considerations: ['고려'] },
      ])
    );

    const result = await generateLLMMatchingRecommendations('project-1', 'actor-1');

    expect(result).toHaveLength(3);
  });

  it('응답 변환 결과가 LLMCandidateScore 구조를 따른다', async () => {
    const result = await generateLLMMatchingRecommendations('project-1', 'actor-1');

    expect(result[0]).toEqual({
      userId: 'user-a',
      totalScore: 90,
      rationale: {
        analysis: '종합 분석 내용',
        strengths: ['강점1', '강점2'],
        considerations: ['고려1'],
      },
    });
  });

  // ─── preserveStatus 옵션 ─────────────────────────────────────────────────

  it('preserveStatus=false(기본)이면 프로젝트 상태를 업데이트한다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    expect(updateProjectStatusIfNeeded).toHaveBeenCalledOnce();
  });

  it('preserveStatus=true이면 프로젝트 상태 업데이트를 건너뛴다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1', { preserveStatus: true });

    expect(updateProjectStatusIfNeeded).not.toHaveBeenCalled();
  });

  // ─── 빈 추천 처리 ────────────────────────────────────────────────────────

  it('유효한 추천이 없으면 빈 배열을 반환한다', async () => {
    vi.mocked(filterValidRecommendations).mockReturnValue([]);

    const result = await generateLLMMatchingRecommendations('project-1', 'actor-1');

    expect(result).toEqual([]);
  });

  it('유효한 추천이 없으면 경고 로그를 출력한다', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(filterValidRecommendations).mockReturnValue([]);

    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('유효한 후보 없음')
    );
    warnSpy.mockRestore();
  });

  // ─── 추천 저장 ───────────────────────────────────────────────────────────

  it('필터링된 추천 결과를 저장한다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    expect(saveRecommendations).toHaveBeenCalledWith(
      expect.anything(),
      'project-1',
      expect.arrayContaining([
        expect.objectContaining({ userId: 'user-a', totalScore: 90 }),
      ])
    );
  });

  // ─── 감사로그 ─────────────────────────────────────────────────────────────

  it('감사로그에 매칭 정보를 기록한다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: 'actor-1',
      action: 'MATCHING_EXECUTE',
      targetType: 'project',
      targetId: 'project-1',
      meta: expect.objectContaining({
        top_n: 3,
        candidates_count: 2,
        top_candidate: 'user-a',
        top_candidate_name: '컨설턴트A',
        is_recalculation: false,
        matching_type: 'LLM',
      }),
    });
  });

  it('preserveStatus=true이면 감사로그에 is_recalculation=true로 기록한다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1', { preserveStatus: true });

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          is_recalculation: true,
        }),
      })
    );
  });

  // ─── 프롬프트 내용 상세 검증 ──────────────────────────────────────────────

  it('시스템 프롬프트에 출력 형식(JSON 구조)이 명시되어 있다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    const [[messages]] = vi.mocked(callLLMForJSON).mock.calls;
    const systemMsg = (messages as { role: string; content: string }[]).find(
      (m) => m.role === 'system'
    );

    expect(systemMsg?.content).toContain('recommendations');
    expect(systemMsg?.content).toContain('score');
    expect(systemMsg?.content).toContain('analysis');
    expect(systemMsg?.content).toContain('strengths');
    expect(systemMsg?.content).toContain('considerations');
  });

  it('시스템 프롬프트에 평가 기준 5가지가 모두 포함되어 있다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    const [[messages]] = vi.mocked(callLLMForJSON).mock.calls;
    const systemMsg = (messages as { role: string; content: string }[]).find(
      (m) => m.role === 'system'
    );

    expect(systemMsg?.content).toContain('업종 적합성');
    expect(systemMsg?.content).toContain('전문분야 일치');
    expect(systemMsg?.content).toContain('역량 매칭');
    expect(systemMsg?.content).toContain('강의 레벨');
    expect(systemMsg?.content).toContain('경력 및 가용성');
  });

  it('사용자 프롬프트에 자가진단 차원별 수준(우수/보통/부족)이 포함된다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    const [[messages]] = vi.mocked(callLLMForJSON).mock.calls;
    const userMsg = (messages as { role: string; content: string }[]).find(
      (m) => m.role === 'user'
    );

    // AI 활용: 7/10 = 70% → 우수
    expect(userMsg?.content).toContain('우수');
    // 데이터: 4/10 = 40% → 부족
    expect(userMsg?.content).toContain('부족');
  });

  it('사용자 프롬프트에 컨설턴트 강의 레벨이 한국어 라벨로 표시된다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    const [[messages]] = vi.mocked(callLLMForJSON).mock.calls;
    const userMsg = (messages as { role: string; content: string }[]).find(
      (m) => m.role === 'user'
    );

    // BEGINNER → 입문, INTERMEDIATE → 실무
    expect(userMsg?.content).toContain('입문');
    expect(userMsg?.content).toContain('실무');
  });

  it('사용자 프롬프트에 기업 규모와 세부 업종이 포함된다', async () => {
    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    const [[messages]] = vi.mocked(callLLMForJSON).mock.calls;
    const userMsg = (messages as { role: string; content: string }[]).find(
      (m) => m.role === 'user'
    );

    expect(userMsg?.content).toContain('MEDIUM');
    expect(userMsg?.content).toContain('AI');
    expect(userMsg?.content).toContain('ML');
  });

  // ─── 에러 경로 ────────────────────────────────────────────────────────────

  it('callLLMForJSON 에러 시 예외가 전파된다', async () => {
    vi.mocked(callLLMForJSON).mockRejectedValueOnce(new Error('LLM API 호출 타임아웃'));

    await expect(
      generateLLMMatchingRecommendations('project-1', 'actor-1')
    ).rejects.toThrow('LLM API 호출 타임아웃');
  });

  it('fetchMatchingData 에러 시 예외가 전파된다', async () => {
    vi.mocked(fetchMatchingData).mockRejectedValueOnce(new Error('프로젝트를 찾을 수 없습니다'));

    await expect(
      generateLLMMatchingRecommendations('project-1', 'actor-1')
    ).rejects.toThrow('프로젝트를 찾을 수 없습니다');
  });

  it('saveRecommendations 에러 시 예외가 전파된다', async () => {
    vi.mocked(saveRecommendations).mockRejectedValueOnce(new Error('DB 저장 실패'));

    await expect(
      generateLLMMatchingRecommendations('project-1', 'actor-1')
    ).rejects.toThrow('DB 저장 실패');
  });

  // ─── 빈 추천 시 감사로그 ──────────────────────────────────────────────────

  it('유효한 추천이 없을 때 감사로그에 candidates_count=0으로 기록한다', async () => {
    vi.mocked(filterValidRecommendations).mockReturnValue([]);

    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          candidates_count: 0,
          top_candidate: undefined,
        }),
      })
    );
  });

  // ─── 자가진단 결과 없음 ──────────────────────────────────────────────────

  it('자가진단 dimension_scores가 null이면 프롬프트에 미포함 안내 표시', async () => {
    vi.mocked(fetchMatchingData).mockResolvedValue({
      ...MOCK_FETCH_DATA,
      assessmentScores: {
        total_score: 0,
        dimension_scores: null,
      },
    } as never);

    await generateLLMMatchingRecommendations('project-1', 'actor-1');

    const [[messages]] = vi.mocked(callLLMForJSON).mock.calls;
    const userMsg = (messages as { role: string; content: string }[]).find(
      (m) => m.role === 'user'
    );

    expect(userMsg?.content).toContain('자가진단 상세 결과 없음');
  });
});
