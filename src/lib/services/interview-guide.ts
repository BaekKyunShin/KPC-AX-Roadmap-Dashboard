/**
 * 인터뷰 사전 분석 가이드 LLM 서비스
 * 자가진단 데이터 + 기업 정보 → AI 분석 가이드 생성
 */

import type { GuideData } from '@/lib/schemas/interview-guide';
import type { SelfAssessmentScores, DimensionScore } from '@/lib/constants/score-color';
import { callLLMForJSON } from './llm';

// ============================================================================
// 상수
// ============================================================================

/** 인터뷰 가이드 LLM 최대 토큰 수 */
const INTERVIEW_GUIDE_LLM_MAX_TOKENS = 4000;

// ============================================================================
// 타입 정의
// ============================================================================

interface AssessmentAnswer {
  question_id: string;
  answer_value: number | string;
}

interface AssessmentQuestion {
  id: string;
  order: number;
  dimension: string;
  question_text: string;
  question_type: string;
  weight: number;
}

export interface InterviewGuideInput {
  // 기업 정보
  companyName: string;
  industry: string;
  companySize: string;
  customerComment?: string | null;

  // 자가진단 데이터
  scores: SelfAssessmentScores;
  answers: AssessmentAnswer[];
  questions: AssessmentQuestion[];
}

// ============================================================================
// 프롬프트 빌드
// ============================================================================

function buildSystemPrompt(): string {
  return `당신은 기업 AI 교육 진단 분석 전문가입니다. 기업의 자가진단 결과를 분석하고, 현장 인터뷰를 준비하는 컨설턴트를 위한 사전 분석 보고서를 작성합니다.

## 역할
- 5개 영역(AI 성숙도, 데이터 준비도, 인프라 준비도, 인력 준비도, 문제 명확성)의 자가진단 점수와 개별 문항 응답을 교차 분석합니다
- 약한 영역을 우선적으로 분석하고, 강한 영역도 맥락을 파악합니다
- 업종 특성을 반영한 실용적인 질문을 생성합니다

## 출력 형식
반드시 아래 JSON 스키마에 맞춰 응답하세요. JSON만 출력하고 다른 텍스트는 포함하지 마세요.

{
  "company_summary": "기업 현황을 2~3문장으로 요약. 업종, 규모, AI 준비 수준의 핵심 특징을 간결히 서술",
  "key_points": [
    {
      "dimension": "영역명 (5개 영역 중 하나)",
      "score_percent": 0-100 사이 정수,
      "status": "critical | warning | good",
      "insight": "해당 영역의 진단 결과를 1~2문장으로 요약. 구체적 수치나 응답 패턴을 근거로 포함"
    }
  ],
  "questions": [
    {
      "id": "q1부터 순차 채번",
      "dimension": "관련 영역명",
      "question": "인터뷰에서 물어볼 구체적 질문",
      "intent": "이 질문의 의도를 10~20자로 요약",
      "checked": true,
      "is_custom": false
    }
  ],
  "cautions": [
    "인터뷰 시 유의할 사항 (2~4개)"
  ]
}

## 분석 지침
1. key_points: 5개 영역 모두 포함. score_percent < 30이면 "critical", 30~60이면 "warning", > 60이면 "good"
2. questions: 총 10~15개. 약한 영역(critical/warning)에 더 많은 질문 배정 (영역당 2~4개)
3. 교차 분석: "AI 성숙도는 높은데 데이터 준비가 안 된 경우" 같은 영역 간 갭을 발견하면 그에 맞는 질문 생성
4. 업종 맥락: 해당 업종에서 흔히 겪는 AI 도입 과제를 질문에 반영
5. cautions: 영역 간 갭, 기대 관리, 인프라 제약 등 인터뷰 시 주의할 점`;
}

function buildUserPrompt(input: InterviewGuideInput): string {
  const { scores, answers, questions } = input;
  const totalScore = Math.round(scores.total_score || 0);
  const maxScore = Math.round(scores.max_possible_score || 100);
  const totalPct = Math.round((totalScore / maxScore) * 100);

  // 영역별 점수 정리
  const dimensionSummary = (scores.dimension_scores || [])
    .map((ds: DimensionScore) => {
      const pct = Math.round((ds.score / ds.max_score) * 100);
      return `- ${ds.dimension}: ${Math.round(ds.score)}/${Math.round(ds.max_score)} (${pct}%)`;
    })
    .join('\n');

  // 문항별 응답 정리
  const answerMap = new Map<string, number | string>();
  for (const a of answers) {
    answerMap.set(a.question_id, a.answer_value);
  }

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);

  // 영역별로 그룹핑
  const dimensionGroups = new Map<string, string[]>();
  for (const q of sortedQuestions) {
    const answer = answerMap.get(q.id);
    const answerText = answer !== undefined ? String(answer) : '미응답';
    const line = `  - ${q.question_text} → ${answerText}점`;

    if (!dimensionGroups.has(q.dimension)) {
      dimensionGroups.set(q.dimension, []);
    }
    dimensionGroups.get(q.dimension)!.push(line);
  }

  const detailedAnswers = Array.from(dimensionGroups.entries())
    .map(([dim, lines]) => `[${dim}]\n${lines.join('\n')}`)
    .join('\n\n');

  return `## 기업 정보
- 기업명: ${input.companyName}
- 업종: ${input.industry}
- 규모: ${input.companySize}
${input.customerComment ? `- 고객 요청사항: ${input.customerComment}` : ''}

## 자가진단 종합 점수
총점: ${totalScore}/${maxScore} (${totalPct}%)

## 영역별 점수
${dimensionSummary}

## 문항별 응답 (5점 척도)
${detailedAnswers}`;
}

// ============================================================================
// 메인 함수
// ============================================================================

export async function generateInterviewGuideData(
  input: InterviewGuideInput,
): Promise<GuideData> {
  const messages = [
    { role: 'system' as const, content: buildSystemPrompt() },
    { role: 'user' as const, content: buildUserPrompt(input) },
  ];

  const result = await callLLMForJSON<GuideData>(messages, {
    maxTokens: INTERVIEW_GUIDE_LLM_MAX_TOKENS,
  });

  return result;
}
