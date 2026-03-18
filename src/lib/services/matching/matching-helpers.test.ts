/**
 * matching-helpers.ts 테스트
 * - filterValidRecommendations: LLM 응답에서 유효한 후보만 필터링
 * - fetchMatchingData: 매칭에 필요한 데이터 조회
 * - saveRecommendations: 추천 결과 저장
 * - updateProjectStatusIfNeeded: 프로젝트 상태 업데이트
 */

import { describe, it, expect, vi } from 'vitest';
import {
  filterValidRecommendations,
  fetchMatchingData,
  saveRecommendations,
  updateProjectStatusIfNeeded,
} from './matching-helpers';
import type { LLMMatchingResponse, LLMCandidateScore } from './matching-helpers';

describe('filterValidRecommendations', () => {
  const validCandidateIds = ['user-a', 'user-b', 'user-c'];

  it('유효한 userId만 포함된 추천은 그대로 반환', () => {
    const recommendations: LLMMatchingResponse['recommendations'] = [
      { userId: 'user-a', score: 90, analysis: '분석A', strengths: ['강점'], considerations: ['고려'] },
      { userId: 'user-b', score: 80, analysis: '분석B', strengths: ['강점'], considerations: ['고려'] },
    ];

    const result = filterValidRecommendations(recommendations, validCandidateIds);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.userId)).toEqual(['user-a', 'user-b']);
  });

  it('hallucinated userId는 필터링됨', () => {
    const recommendations: LLMMatchingResponse['recommendations'] = [
      { userId: 'user-a', score: 90, analysis: '분석A', strengths: ['강점'], considerations: ['고려'] },
      { userId: 'hallucinated-id', score: 85, analysis: '분석X', strengths: ['강점'], considerations: ['고려'] },
      { userId: 'user-c', score: 70, analysis: '분석C', strengths: ['강점'], considerations: ['고려'] },
    ];

    const result = filterValidRecommendations(recommendations, validCandidateIds);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.userId)).toEqual(['user-a', 'user-c']);
  });

  it('모든 userId가 hallucinated이면 빈 배열 반환', () => {
    const recommendations: LLMMatchingResponse['recommendations'] = [
      { userId: 'fake-1', score: 90, analysis: '분석', strengths: ['강점'], considerations: ['고려'] },
      { userId: 'fake-2', score: 80, analysis: '분석', strengths: ['강점'], considerations: ['고려'] },
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
      { data: [{ id: 'c-1', name: 'A' }, { id: 'c-2', name: 'B' }, { id: 'c-3', name: 'C' }] },
      { data: [{ user_id: 'c-1', specialty: 'AI' }] }, // c-2, c-3는 프로필 없음
    ]);

    const result = await fetchMatchingData(supabase as never, projectId);

    expect(result.candidatesWithProfile).toHaveLength(1);
    expect(result.candidatesWithProfile[0].userId).toBe('c-1');
  });

  it('프로젝트 미존재(data:null) → 에러 throw', async () => {
    const supabase = createSequentialSupabase([
      { data: null },
    ]);

    await expect(fetchMatchingData(supabase as never, projectId))
      .rejects.toThrow('프로젝트 정보를 찾을 수 없습니다');
  });

  it('자가진단 미완료(data:null) → 에러 throw', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: null },
    ]);

    await expect(fetchMatchingData(supabase as never, projectId))
      .rejects.toThrow('자가진단이 완료되지 않았습니다');
  });

  it('활성 컨설턴트 빈 배열 → 에러 throw', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      { data: [] },
    ]);

    await expect(fetchMatchingData(supabase as never, projectId))
      .rejects.toThrow('활성화된 컨설턴트가 없습니다');
  });

  it('candidates null → 에러 throw', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      { data: null },
    ]);

    await expect(fetchMatchingData(supabase as never, projectId))
      .rejects.toThrow('활성화된 컨설턴트가 없습니다');
  });

  it('프로필 빈 배열 → 에러 throw', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      { data: candidates },
      { data: [] },
    ]);

    await expect(fetchMatchingData(supabase as never, projectId))
      .rejects.toThrow('컨설턴트 프로필이 등록되지 않았습니다');
  });

  it('profiles null → 에러 throw', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      { data: candidates },
      { data: null },
    ]);

    await expect(fetchMatchingData(supabase as never, projectId))
      .rejects.toThrow('컨설턴트 프로필이 등록되지 않았습니다');
  });

  it('profiles 있지만 candidates와 매칭되는 user_id 없으면 에러 throw', async () => {
    const supabase = createSequentialSupabase([
      { data: projectData },
      { data: { scores: assessmentScores } },
      { data: [{ id: 'c-1', name: 'A' }] },
      { data: [{ user_id: 'c-999', specialty: 'AI' }] }, // c-1과 매칭 안 됨
    ]);

    await expect(fetchMatchingData(supabase as never, projectId))
      .rejects.toThrow('컨설턴트 프로필이 등록되지 않았습니다');
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

  it('candidates를 rank(index+1) 포함하여 올바르게 매핑', async () => {
    const candidates = makeCandidates(3);
    const supabase = createSequentialSupabase([
      { data: null }, // delete
      { data: null },  // insert
    ]);

    await saveRecommendations(supabase as never, projectId, candidates);

    const insertChain = supabase._chains()[1];
    const insertCall = insertChain.insert.mock.calls[0][0];

    expect(insertCall).toHaveLength(3);
    insertCall.forEach((rec: Record<string, unknown>, idx: number) => {
      expect(rec.project_id).toBe(projectId);
      expect(rec.candidate_user_id).toBe(`user-${idx}`);
      expect(rec.total_score).toBe(90 - idx * 10);
      expect(rec.score_breakdown).toEqual([]);
      expect(rec.rank).toBe(idx + 1);
      expect(rec.rationale).toEqual(candidates[idx].rationale);
    });
  });

  it('insert 호출 시 올바른 필드 전달 검증', async () => {
    const candidates = makeCandidates(1);
    const supabase = createSequentialSupabase([
      { data: null },
      { data: null },
    ]);

    await saveRecommendations(supabase as never, projectId, candidates);

    const insertChain = supabase._chains()[1];
    const insertCall = insertChain.insert.mock.calls[0][0];
    const rec = insertCall[0];

    expect(Object.keys(rec).sort()).toEqual(
      ['candidate_user_id', 'project_id', 'rank', 'rationale', 'score_breakdown', 'total_score'].sort()
    );
  });

  it('insert 실패 시 에러 throw', async () => {
    const candidates = makeCandidates(1);
    const supabase = createSequentialSupabase([
      { data: null },
      { data: null, error: { message: 'DB 에러' } },
    ]);

    await expect(saveRecommendations(supabase as never, projectId, candidates))
      .rejects.toThrow('매칭 추천 저장 실패: DB 에러');
  });

  it('delete 후 insert 순서 호출 확인', async () => {
    const candidates = makeCandidates(2);
    const supabase = createSequentialSupabase([
      { data: null }, // delete
      { data: null }, // insert
    ]);

    await saveRecommendations(supabase as never, projectId, candidates);

    // from() 2회 호출, 모두 matching_recommendations 테이블
    expect(supabase.from).toHaveBeenCalledTimes(2);
    expect(supabase.from).toHaveBeenNthCalledWith(1, 'matching_recommendations');
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'matching_recommendations');

    // 첫 번째 체인에서 delete, 두 번째에서 insert 호출
    const chains = supabase._chains();
    expect(chains[0].delete).toHaveBeenCalled();
    expect(chains[1].insert).toHaveBeenCalled();
  });

  it('빈 candidates → 빈 배열 insert', async () => {
    const supabase = createSequentialSupabase([
      { data: null },
      { data: null },
    ]);

    await saveRecommendations(supabase as never, projectId, []);

    const insertChain = supabase._chains()[1];
    expect(insertChain.insert).toHaveBeenCalledWith([]);
  });
});

// ─── updateProjectStatusIfNeeded ───

describe('updateProjectStatusIfNeeded', () => {
  const projectId = 'proj-1';

  it('DIAGNOSED → MATCH_RECOMMENDED 전이 가능 시 update 실행', async () => {
    const supabase = createSequentialSupabase([
      { data: { status: 'DIAGNOSED' } },
      { data: null }, // update
    ]);

    await updateProjectStatusIfNeeded(supabase as never, projectId);

    // from() 두 번 호출 (select + update)
    expect(supabase.from).toHaveBeenCalledTimes(2);
    const updateChain = supabase._chains()[1];
    expect(updateChain.update).toHaveBeenCalledWith({ status: 'MATCH_RECOMMENDED' });
  });

  it('FINALIZED → MATCH_RECOMMENDED 전이 불가 시 update 스킵', async () => {
    const supabase = createSequentialSupabase([
      { data: { status: 'FINALIZED' } },
    ]);

    await updateProjectStatusIfNeeded(supabase as never, projectId);

    // from() 한 번만 호출 (select만, update 없음)
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('project 조회 null → update 스킵', async () => {
    const supabase = createSequentialSupabase([
      { data: null },
    ]);

    await updateProjectStatusIfNeeded(supabase as never, projectId);

    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('NEW → MATCH_RECOMMENDED 전이 가능 시 update 실행', async () => {
    const supabase = createSequentialSupabase([
      { data: { status: 'NEW' } },
      { data: null },
    ]);

    await updateProjectStatusIfNeeded(supabase as never, projectId);

    expect(supabase.from).toHaveBeenCalledTimes(2);
    const updateChain = supabase._chains()[1];
    expect(updateChain.update).toHaveBeenCalledWith({ status: 'MATCH_RECOMMENDED' });
  });
});
