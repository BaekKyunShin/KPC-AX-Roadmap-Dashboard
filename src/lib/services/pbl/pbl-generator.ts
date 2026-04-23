import type { ConsultantProfile } from '@/types/database';
import { callLLMForJSON, type LLMMessage } from '../llm';
import type { PBLContent, PBLValidationResult } from './pbl-types';
import { pblContentSchema, validatePBLContent } from './pbl-validator';
import { buildPBLSystemPrompt, buildPBLUserPrompt } from './pbl-prompts';

// ============================================================================
// 상수 / 에러 클래스
// ============================================================================

/** LLM 온도 (창의성 적정 수준) */
const LLM_TEMPERATURE = 0.7;

/** PBL 보고서 검증 실패 시 재시도 최대 횟수 (계획서 Task 5 "최대 3회") */
const MAX_VALIDATION_RETRIES = 3;

export class PBLGenerationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PBLGenerationError';
  }
}

// ============================================================================
// 핵심 함수
// ============================================================================

export interface GeneratePBLContentInput {
  interview: Record<string, unknown>;
  project: Record<string, unknown>;
  consultantProfile: ConsultantProfile | null;
  diagnosisSummary: string;
  revisionPrompt?: string;
  signal?: AbortSignal;
}

export interface GeneratePBLContentResult {
  content: PBLContent;
  validation: PBLValidationResult;
}

/**
 * LLM 호출로 PBL 보고서 초안(PBLContent) 생성.
 *  - LLM 응답 JSON 파싱 실패는 callLLMForJSON 내부에서 2회 재시도.
 *  - 스키마(pblContentSchema) 검증 실패는 본 함수에서 최대 MAX_VALIDATION_RETRIES 회 재시도.
 *  - 모든 재시도 실패 시 PBLGenerationError throw → 상위에서 사용자에게 수동 편집 유도.
 */
export async function generatePBLContent(
  input: GeneratePBLContentInput,
): Promise<GeneratePBLContentResult> {
  const systemPrompt = buildPBLSystemPrompt();
  const baseUserPrompt = buildPBLUserPrompt(
    input.interview,
    input.project,
    input.consultantProfile,
    input.diagnosisSummary,
    input.revisionPrompt,
  );

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    const userPrompt =
      attempt === 1
        ? baseUserPrompt
        : `${baseUserPrompt}

[재시도 ${attempt}/${MAX_VALIDATION_RETRIES}] 이전 응답이 산인공 양식 2번 Ⅳ장 스키마를 만족하지 못했습니다. 다음을 반드시 준수하라:
- ai_tool_usage_plan 배열 길이 >= 3
- training_contents 각 행: instructor_hours.external + instructor_hours.internal === training_hours
- total_sum_hours === sum(training_contents.training_hours)
- evaluation_result는 반드시 "예정"
- satisfaction_survey 길이 5, achievement_survey 길이 3, external_expert_survey 길이 5, practical_application_survey 길이 4`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let raw: unknown;
    try {
      raw = await callLLMForJSON<unknown>(messages, { temperature: LLM_TEMPERATURE }, 2, input.signal);
    } catch (error) {
      lastError = error;
      console.warn(`[generatePBLContent] LLM 호출 실패 (시도 ${attempt}):`, error);
      continue;
    }

    const parsed = pblContentSchema.safeParse(raw);
    if (!parsed.success) {
      lastError = parsed.error;
      console.warn(
        `[generatePBLContent] 스키마 검증 실패 (시도 ${attempt}):`,
        JSON.stringify(parsed.error.issues).slice(0, 500),
      );
      continue;
    }

    const content = parsed.data as PBLContent;
    const validation = validatePBLContent(content);
    // 2차 validator(business rule)는 warning만 나올 수 있음. error가 있으면 재시도.
    if (!validation.isValid) {
      lastError = new Error(validation.errors.join(' / '));
      console.warn(
        `[generatePBLContent] 비즈니스 검증 실패 (시도 ${attempt}):`,
        validation.errors,
      );
      continue;
    }

    return { content, validation };
  }

  throw new PBLGenerationError(
    `LLM이 산인공 PBL 양식에 맞지 않는 결과를 ${MAX_VALIDATION_RETRIES}회 반환했습니다. 수동 편집이 필요합니다.`,
    { cause: lastError instanceof Error ? lastError : undefined },
  );
}
