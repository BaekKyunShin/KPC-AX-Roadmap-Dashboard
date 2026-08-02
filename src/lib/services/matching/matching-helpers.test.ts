/**
 * matching-helpers.ts 테스트
 * - filterValidRecommendations: LLM 응답에서 유효한 후보만 필터링
 * - fetchMatchingData: 매칭에 필요한 데이터 조회
 * - saveRecommendations: 추천 결과 저장
 * - resolveMatchRecommendedTransition: 전이 대상 상태 판정
 */

import { describe, it, expect, vi } from 'vitest';
import {
  filterValidRecommendations,
  fetchMatchingData,
  saveRecommendations,
  resolveMatchRecommendedTransition,
  llmMatchingResponseSchema,
  validateLlmMatchingResponse,
} from './matching-helpers';
import type { LLMMatchingResponse, LLMCandidateScore } from './matching-helpers';

describe('filterValidRecommendations', () => {
  const validCandidateIds = ['user-a', 'user-b', 'user-c'];

  it('유효한 userId만 포함된 추천은 그대로 반환', () => {
    const recommendations: LLMMatchingResponse['recommendations'] = [
      {
        userId: 'user-a',
        score: 90,
        analysis: '분석A',
        strengths: ['강점'],
        considerations: ['고려'],
      },
      {
        userId: 'user-b',
        score: 80,
        analysis: '분석B',
        strengths: ['강점'],
        considerations: ['고려'],
      },
    ];

    const result = filterValidRecommendations(recommendations, validCandidateIds);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.userId)).toEqual(['user-a', 'user-b']);
  });

  it('hallucinated userId는 필터링됨', () => {
    const recommendations: LLMMatchingResponse['recommendations'] = [
      {
        userId: 'user-a',
        score: 90,
        analysis: '분석A',
        strengths: ['강점'],
        considerations: ['고려'],
      },
      {
        userId: 'hallucinated-id',
        score: 85,
        analysis: '분석X',
        strengths: ['강점'],
        considerations: ['고려'],
      },
      {
        userId: 'user-c',
        score: 70,
        analysis: '분석C',
        strengths: ['강점'],
        considerations: ['고려'],
      },
    ];

    const result = filterValidRecommendations(recommendations, validCandidateIds);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.userId)).toEqual(['user-a', 'user-c']);
  });

  it('모든 userId가 hallucinated이면 빈 배열 반환', () => {
    const recommendations: LLMMatchingResponse['recommendations'] = [
      {
        userId: 'fake-1',
        score: 90,
        analysis: '분석',
        strengths: ['강점'],
        considerations: ['고려'],
      },
      {
        userId: 'fake-2',
        score: 80,
        analysis: '분석',
        strengths: ['강점'],
        considerations: ['고려'],
      },
    ];

    const result = filterValidRecommendations(recommendations, validCandidateIds);
    expect(result).toHaveLength(0);
  });

  it('빈 추천 목록은 빈 배열 반환', () => {
    const result = filterValidRecommendations([], validCandidateIds);
    expect(result).toHaveLength(0);
  });
});

// ─── 모킹 헬퍼 ───

/**
 * Supabase 호출 순서 기반 모킹 헬퍼
 *
 * from() 호출마다 미리 설정한 체이닝 결과를 순차 반환한다.
 * 각 step은 해당 from() 호출에서 사용할 체이닝 메서드 결과를 정의한다.
 */
interface MockStep {
  data?: unknown;
  error?: { message: string } | null;
}

function createChainMock(result: MockStep) {
  const resolved = { data: result.data ?? null, error: result.error ?? null };

  const single = vi.fn().mockResolvedValue(resolved);
  const mockIn = vi.fn().mockResolvedValue(resolved);
  const insert = vi.fn().mockResolvedValue(resolved);

  // eq는 체이닝 가능(자기 자신 반환) + thenable(await 가능)해야 함
  // Supabase 체이닝: .eq().eq() → await하면 { data, error }
  // .eq().single() → await하면 { data, error }
  const eqObj: Record<string, unknown> = {};
  const eq = vi.fn().mockReturnValue(eqObj);
  eqObj.eq = eq;
  eqObj.single = single;
  eqObj.in = mockIn;
  // thenable: await eqObj → resolved
  eqObj.then = (resolve: (v: unknown) => void) => Promise.resolve(resolved).then(resolve);

  const select = vi.fn().mockReturnValue({ eq, in: mockIn, single });

  const deleteEq = vi.fn().mockResolvedValue(resolved);
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq });

  const updateEq = vi.fn().mockResolvedValue(resolved);
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  return { select, delete: deleteFn, insert, update, eq, _resolved: resolved };
}

function createSequentialSupabase(steps: MockStep[]) {
  let callIndex = 0;
  const chains: ReturnType<typeof createChainMock>[] = [];

  const from = vi.fn(() => {
    const step = steps[callIndex] ?? { data: null, error: null };
    callIndex++;
    const chain = createChainMock(step);
    chains.push(chain);
    return chain;
  });

  return { from, _chains: () => chains, _callIndex: () => callIndex };
}

// ─── fetchMatchingData ───

describe('fetchMatchingData', () => {
  const projectId = 'proj-1';

  const projectData = {
    industry: 'IT',
    sub_industries: ['AI'],
    company_size: 'MEDIUM',
    company_name: '테스트 회사',
  };

  const assessmentScores = { leadership: 4, data_literacy: 3 };

  const candidates = [
    { id: 'c-1', name: '컨설턴트A' },
    { id: 'c-2', name: '컨설턴트B' },
  ];

  const profiles = [
    { user_id: 'c-1', specialty: 'AI', experience_years: 5 },
    { user_id: 'c-2', specialty: 'Data', experience_years: 3 },
  ];

  it('모든 데이터 정상 조회 시 projectData, assessmentScores, candidatesWithProfile, nameMap 반환', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      { data: candidates },
      { data: profiles },
    ]);

    const result = await fetchMatchingData(supabase as never, projectId);

    expect(result.projectData).toEqual(projectData);
    expect(result.assessmentScores).toEqual(assessmentScores);
    expect(result.candidatesWithProfile).toHaveLength(2);
    expect(result.candidatesWithProfile[0].userId).toBe('c-1');
    expect(result.candidatesWithProfile[0].name).toBe('컨설턴트A');
    expect(result.candidatesWithProfile[0].profile).toEqual(profiles[0]);
    expect(result.nameMap).toBeInstanceOf(Map);
    expect(result.nameMap.get('c-1')).toBe('컨설턴트A');
    expect(result.nameMap.get('c-2')).toBe('컨설턴트B');
  });

  it('일부 컨설턴트에 프로필 없으면 프로필 있는 컨설턴트만 필터링', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      {
        data: [
          { id: 'c-1', name: 'A' },
          { id: 'c-2', name: 'B' },
          { id: 'c-3', name: 'C' },
        ],
      },
      { data: [{ user_id: 'c-1', specialty: 'AI' }] }, // c-2, c-3는 프로필 없음
    ]);

    const result = await fetchMatchingData(supabase as never, projectId);

    expect(result.candidatesWithProfile).toHaveLength(1);
    expect(result.candidatesWithProfile[0].userId).toBe('c-1');
  });

  it('프로젝트 미존재(data:null) → 에러 throw', async () => {
    const supabase = createSequentialSupabase([{ data: null }]);

    await expect(fetchMatchingData(supabase as never, projectId)).rejects.toThrow(
      '프로젝트 정보를 찾을 수 없습니다'
    );
  });

  it('자가진단 미완료(data:null) → 에러 throw', async () => {
    const supabase = createSequentialSupabase([{ data: projectData }, { data: null }]);

    await expect(fetchMatchingData(supabase as never, projectId)).rejects.toThrow(
      '자가진단이 완료되지 않았습니다'
    );
  });

  it('활성 컨설턴트 빈 배열 → 에러 throw', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      { data: [] },
    ]);

    await expect(fetchMatchingData(supabase as never, projectId)).rejects.toThrow(
      '활성화된 컨설턴트가 없습니다'
    );
  });

  it('candidates null → 에러 throw', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      { data: null },
    ]);

    await expect(fetchMatchingData(supabase as never, projectId)).rejects.toThrow(
      '활성화된 컨설턴트가 없습니다'
    );
  });

  it('프로필 빈 배열 → 에러 throw', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      { data: candidates },
      { data: [] },
    ]);

    await expect(fetchMatchingData(supabase as never, projectId)).rejects.toThrow(
      '컨설턴트 프로필이 등록되지 않았습니다'
    );
  });

  it('profiles null → 에러 throw', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      { data: candidates },
      { data: null },
    ]);

    await expect(fetchMatchingData(supabase as never, projectId)).rejects.toThrow(
      '컨설턴트 프로필이 등록되지 않았습니다'
    );
  });

  it('profiles 있지만 candidates와 매칭되는 user_id 없으면 에러 throw', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      { data: [{ id: 'c-1', name: 'A' }] },
      { data: [{ user_id: 'c-999', specialty: 'AI' }] }, // c-1과 매칭 안 됨
    ]);

    await expect(fetchMatchingData(supabase as never, projectId)).rejects.toThrow(
      '컨설턴트 프로필이 등록되지 않았습니다'
    );
  });

  it('nameMap이 candidates의 id→name 매핑과 일치', async () => {
    const theCandidates = [
      { id: 'x-1', name: '이름1' },
      { id: 'x-2', name: '이름2' },
      { id: 'x-3', name: '이름3' },
    ];
    const theProfiles = [
      { user_id: 'x-1', specialty: 'A' },
      { user_id: 'x-2', specialty: 'B' },
      { user_id: 'x-3', specialty: 'C' },
    ];

    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      { data: theCandidates },
      { data: theProfiles },
    ]);

    const result = await fetchMatchingData(supabase as never, projectId);

    for (const c of theCandidates) {
      expect(result.nameMap.get(c.id)).toBe(c.name);
    }
    expect(result.nameMap.size).toBe(theCandidates.length);
  });
});

// ─── saveRecommendations ───

describe('saveRecommendations', () => {
  const projectId = 'proj-1';

  const makeCandidates = (count: number): LLMCandidateScore[] =>
    Array.from({ length: count }, (_, i) => ({
      userId: `user-${i}`,
      totalScore: 90 - i * 10,
      rationale: { analysis: `분석${i}`, strengths: ['강점'], considerations: ['고려'] },
    }));

  /** P6 2차: 삭제·저장·상태 전이가 단일 RPC 로 묶였으므로 rpc 만 모킹한다. */
  function createRpcSupabase(result: { data?: unknown; error?: { message: string } } = {}) {
    return {
      rpc: vi.fn().mockResolvedValue({
        data: result.data === undefined ? { success: true, inserted_count: 0 } : result.data,
        error: result.error ?? null,
      }),
    };
  }

  function rpcArgs(supabase: { rpc: ReturnType<typeof vi.fn> }) {
    return supabase.rpc.mock.calls[0][1] as {
      p_project_id: string;
      p_recommendations: Record<string, unknown>[];
      p_transition_to_status: string | null;
    };
  }

  it('candidates를 rank(index+1) 포함하여 올바르게 매핑', async () => {
    const candidates = makeCandidates(3);
    const supabase = createRpcSupabase();

    await saveRecommendations(supabase as never, projectId, candidates);

    const recs = rpcArgs(supabase).p_recommendations;
    expect(recs).toHaveLength(3);
    recs.forEach((rec, idx) => {
      expect(rec.project_id).toBe(projectId);
      expect(rec.candidate_user_id).toBe(`user-${idx}`);
      expect(rec.total_score).toBe(90 - idx * 10);
      expect(rec.score_breakdown).toEqual([]);
      expect(rec.rank).toBe(idx + 1);
      expect(rec.rationale).toEqual(candidates[idx].rationale);
    });
  });

  it('추천 항목의 필드 구성은 종전과 동일하다', async () => {
    const supabase = createRpcSupabase();

    await saveRecommendations(supabase as never, projectId, makeCandidates(1));

    const rec = rpcArgs(supabase).p_recommendations[0];
    expect(Object.keys(rec).sort()).toEqual(
      [
        'candidate_user_id',
        'project_id',
        'rank',
        'rationale',
        'score_breakdown',
        'total_score',
      ].sort()
    );
  });

  it('삭제·저장·상태 전이를 단일 RPC 로 요청한다', async () => {
    const supabase = createRpcSupabase();

    await saveRecommendations(supabase as never, projectId, makeCandidates(2), 'MATCH_RECOMMENDED');

    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith(
      'save_matching_recommendations',
      expect.objectContaining({
        p_project_id: projectId,
        p_transition_to_status: 'MATCH_RECOMMENDED',
      })
    );
  });

  it('전이 대상을 주지 않으면 상태를 건드리지 않는다 (재계산 경로)', async () => {
    const supabase = createRpcSupabase();

    await saveRecommendations(supabase as never, projectId, makeCandidates(1));

    expect(rpcArgs(supabase).p_transition_to_status).toBeNull();
  });

  it('RPC 오류 시 에러 throw', async () => {
    const supabase = createRpcSupabase({ error: { message: 'DB 에러' } });

    await expect(
      saveRecommendations(supabase as never, projectId, makeCandidates(1))
    ).rejects.toThrow('매칭 추천 저장 실패: DB 에러');
  });

  it('RPC 가 success=false 를 반환하면 에러 throw (기존 추천도 보존됨)', async () => {
    const supabase = createRpcSupabase({
      data: { success: false, error: '프로젝트를 찾을 수 없습니다.' },
    });

    await expect(
      saveRecommendations(supabase as never, projectId, makeCandidates(1))
    ).rejects.toThrow('매칭 추천 저장 실패: 프로젝트를 찾을 수 없습니다.');
  });

  it('빈 candidates → 빈 배열 전달', async () => {
    const supabase = createRpcSupabase();

    await saveRecommendations(supabase as never, projectId, []);

    expect(rpcArgs(supabase).p_recommendations).toEqual([]);
  });
});

// ─── resolveMatchRecommendedTransition ───
// P6 2차: 상태 전이는 추천 저장 RPC 안에서 함께 일어나므로 이 함수는 "전이 대상 판정"만
// 담당한다. 어떤 상태에서 전이 가능한지의 규칙은 종전(updateProjectStatusIfNeeded)과 동일.

describe('resolveMatchRecommendedTransition', () => {
  const projectId = 'proj-1';

  it.each([
    { status: 'DIAGNOSED', expected: 'MATCH_RECOMMENDED' },
    { status: 'NEW', expected: 'MATCH_RECOMMENDED' },
    { status: 'FINALIZED', expected: null },
    { status: 'ASSIGNED', expected: null },
    { status: 'MATCH_RECOMMENDED', expected: null },
  ])('$status → $expected', async ({ status, expected }) => {
    const supabase = createSequentialSupabase([{ data: { status } }]);

    await expect(resolveMatchRecommendedTransition(supabase as never, projectId)).resolves.toBe(
      expected
    );
  });

  it('project 조회 null → 전이 없음', async () => {
    const supabase = createSequentialSupabase([{ data: null }]);

    await expect(
      resolveMatchRecommendedTransition(supabase as never, projectId)
    ).resolves.toBeNull();
  });

  it('상태 조회만 하고 직접 update 하지 않는다 (전이는 저장 RPC 안에서 수행)', async () => {
    const supabase = createSequentialSupabase([{ data: { status: 'DIAGNOSED' } }]);

    await resolveMatchRecommendedTransition(supabase as never, projectId);

    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase._chains()[0].update).not.toHaveBeenCalled();
  });
});

// ─── filterValidRecommendations — 빈 validCandidateIds ───

describe('filterValidRecommendations — 빈 validCandidateIds', () => {
  it('validCandidateIds가 빈 배열이면 모든 추천이 필터링된다', () => {
    const recommendations: LLMMatchingResponse['recommendations'] = [
      {
        userId: 'user-a',
        score: 90,
        analysis: '분석A',
        strengths: ['강점'],
        considerations: ['고려'],
      },
    ];

    const result = filterValidRecommendations(recommendations, []);
    expect(result).toHaveLength(0);
  });
});

// ─── llmMatchingResponseSchema / validateLlmMatchingResponse (ISSUE-06) ─────

describe('llmMatchingResponseSchema', () => {
  it('recommendations 배열이 없는 응답은 검증 실패', () => {
    const result = llmMatchingResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('recommendations 가 null 이면 검증 실패', () => {
    const result = llmMatchingResponseSchema.safeParse({ recommendations: null });
    expect(result.success).toBe(false);
  });

  it('정상 응답은 검증 통과하며 strengths/considerations 기본값 적용', () => {
    const result = llmMatchingResponseSchema.safeParse({
      recommendations: [{ userId: 'u1', score: 90, analysis: '분석' }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recommendations[0].strengths).toEqual([]);
      expect(result.data.recommendations[0].considerations).toEqual([]);
    }
  });
});

describe('validateLlmMatchingResponse', () => {
  it('recommendations 누락 시 success:false 반환', () => {
    const r = validateLlmMatchingResponse({ foo: 'bar' });
    expect(r.success).toBe(false);
  });

  it('정상 응답 시 success:true 와 파싱된 데이터 반환', () => {
    const r = validateLlmMatchingResponse({
      recommendations: [
        { userId: 'u1', score: 85, analysis: '텍스트', strengths: ['s'], considerations: ['c'] },
      ],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.recommendations).toHaveLength(1);
    }
  });
});
