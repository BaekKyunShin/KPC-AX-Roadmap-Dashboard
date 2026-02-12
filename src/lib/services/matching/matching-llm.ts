import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '../audit';
import { callLLMForJSON } from '../llm';
import type { ConsultantProfile, SelfAssessmentScore } from '@/types/database';
import {
  fetchMatchingData,
  saveRecommendations,
  updateProjectStatusIfNeeded,
  LEVEL_LABEL_MAP,
  LLM_LIMITS,
} from './matching-helpers';
import type {
  LLMCandidateScore,
  LLMMatchingResponse,
  MatchingOptions,
} from './matching-helpers';

/**
 * LLM 기반 매칭 추천 생성
 * AI가 프로젝트 요구사항과 컨설턴트 프로필을 종합 분석하여 최적의 매칭 추천
 */
export async function generateLLMMatchingRecommendations(
  projectId: string,
  actorUserId: string,
  options: MatchingOptions = {}
): Promise<LLMCandidateScore[]> {
  const { topN = 3, preserveStatus = false } = options;
  const supabase = createAdminClient();

  // 1. 데이터 조회
  const { projectData, assessmentScores, candidatesWithProfile, nameMap } =
    await fetchMatchingData(supabase, projectId);

  // 2. LLM 프롬프트 구성 및 호출
  const llmResponse = await callLLMForJSON<LLMMatchingResponse>(
    [
      { role: 'system', content: buildLLMSystemPrompt() },
      { role: 'user', content: buildLLMUserPrompt(projectData, assessmentScores, candidatesWithProfile) },
    ],
    { temperature: 0.3, maxTokens: 4000 }
  );

  // 3. LLM 응답 변환
  const scoredCandidates: LLMCandidateScore[] = llmResponse.recommendations
    .slice(0, topN)
    .map((rec) => ({
      userId: rec.userId,
      totalScore: Math.max(0, Math.min(100, rec.score)),
      rationale: {
        analysis: rec.analysis,
        strengths: rec.strengths.slice(0, LLM_LIMITS.MAX_STRENGTHS),
        considerations: rec.considerations.slice(0, LLM_LIMITS.MAX_CONSIDERATIONS),
      },
    }));

  // 4. 추천 저장
  await saveRecommendations(supabase, projectId, scoredCandidates);

  // 5. 프로젝트 상태 업데이트
  if (!preserveStatus) {
    await updateProjectStatusIfNeeded(supabase, projectId);
  }

  // 6. 감사 로그
  await createAuditLog({
    actorUserId,
    action: 'MATCHING_EXECUTE',
    targetType: 'project',
    targetId: projectId,
    meta: {
      top_n: topN,
      candidates_count: scoredCandidates.length,
      top_candidate: scoredCandidates[0]?.userId,
      top_candidate_name: nameMap.get(scoredCandidates[0]?.userId) || '',
      is_recalculation: preserveStatus,
      matching_type: 'LLM',
    },
  });

  return scoredCandidates;
}

/** LLM 시스템 프롬프트 */
function buildLLMSystemPrompt(): string {
  return `당신은 기업 AI 교육 컨설턴트 매칭 전문가입니다.
기업의 현황과 요구사항을 분석하고, 가장 적합한 컨설턴트를 추천해야 합니다.

## 평가 기준
1. **업종 적합성**: 컨설턴트가 해당 업종 경험이 있는지
2. **전문분야 일치**: 기업이 필요로 하는 AI 역량과 컨설턴트 전문분야의 일치도
3. **역량 매칭**: 기업의 자가진단 결과에서 부족한 영역을 보완할 수 있는지
4. **강의 레벨**: 기업 수준에 맞는 교육이 가능한지
5. **경력 및 가용성**: 충분한 경력과 현재 투입 가능 여부

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요:
{
  "recommendations": [
    {
      "userId": "컨설턴트 ID",
      "score": 85,
      "analysis": "2-3문장의 종합 분석. 왜 이 컨설턴트가 적합한지 구체적으로 설명.",
      "strengths": ["강점1", "강점2", "강점3"],
      "considerations": ["고려사항1", "고려사항2"]
    }
  ]
}

## 주의사항
- 점수는 0-100 사이의 정수로 부여
- TOP 3만 선정하여 점수 순으로 정렬
- analysis는 자연스러운 한국어 문장으로 작성
- strengths는 2-3개, considerations는 1-2개로 제한
- 모든 텍스트는 한국어로 작성`;
}

/** LLM 사용자 프롬프트 */
function buildLLMUserPrompt(
  projectData: {
    industry: string;
    sub_industries: string[] | null;
    company_size: string;
    company_name: string;
  },
  assessmentScores: SelfAssessmentScore,
  candidates: {
    userId: string;
    name: string;
    profile: ConsultantProfile;
  }[]
): string {
  // 자가진단 결과 요약
  const dimensionSummary =
    assessmentScores.dimension_scores
      ?.map((d) => {
        const percentage = Math.round((d.score / d.max_score) * 100);
        const level = percentage >= 70 ? '우수' : percentage >= 50 ? '보통' : '부족';
        return `- ${d.dimension}: ${percentage}% (${level})`;
      })
      .join('\n') || '자가진단 상세 결과 없음';

  // 컨설턴트 정보 구성
  const consultantInfo = candidates
    .map((c) => {
      const p = c.profile;
      return `### 컨설턴트: ${c.name} (ID: ${c.userId})
- 업종 경험: ${p.available_industries?.join(', ') || '미지정'}
- 세부 업종: ${p.sub_industries?.join(', ') || '미지정'}
- 전문분야: ${p.expertise_domains?.join(', ') || '미지정'}
- 역량 태그: ${p.skill_tags?.join(', ') || '미지정'}
- 강의 레벨: ${p.teaching_levels?.map((l) => LEVEL_LABEL_MAP[l] || l).join(', ') || '미지정'}
- 경력: ${p.years_of_experience || 0}년
- 강점/제약: ${p.strengths_constraints || '없음'}`;
    })
    .join('\n\n');

  return `## 기업 정보
- 기업명: ${projectData.company_name}
- 업종: ${projectData.industry}
- 세부 업종: ${projectData.sub_industries?.join(', ') || '없음'}
- 기업 규모: ${projectData.company_size}

## 자가진단 결과
- 종합점수: ${assessmentScores.total_score || 0}점
${dimensionSummary}

## 후보 컨설턴트 목록

${consultantInfo}

---

위 정보를 바탕으로 가장 적합한 컨설턴트 TOP 3를 선정하고, 각각에 대해 점수와 분석을 제공해주세요.`;
}
