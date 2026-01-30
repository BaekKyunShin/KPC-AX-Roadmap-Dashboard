'use server';

import { createClient } from '@/lib/supabase/server';
import { testInputSchema, type TestInputData } from '@/lib/schemas/test-roadmap';
import { generateTestRoadmap, type RoadmapResult, type ValidationResult } from '@/lib/services/roadmap';
import { createAuditLog } from '@/lib/services/audit';
import { callLLMForJSON } from '@/lib/services/llm';
import type { SttInsights } from '@/lib/schemas/interview';
import {
  MAX_STT_FILE_SIZE_BYTES,
  STT_EXTRACTION_TEMPERATURE,
} from '@/lib/constants/stt';

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 테스트 로드맵 기능에 접근 가능한 역할 목록 */
const ALLOWED_ROLES_FOR_TEST_ROADMAP = ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

/** STT 인사이트 추출용 시스템 프롬프트 */
const STT_EXTRACTION_SYSTEM_PROMPT = `당신은 AI 교육 로드맵 수립을 위한 인터뷰 분석 전문가입니다.

다음은 기업 현장 인터뷰 녹취록입니다.
컨설턴트가 별도로 정리한 핵심 정보(세부업무, 페인포인트, 개선목표 등) 외에
추가로 로드맵 수립에 참고할 만한 정보를 추출해주세요.

## 추출 항목

1. **추가_업무**: 인터뷰에서 언급되었으나 놓치기 쉬운 세부 업무
2. **추가_페인포인트**: 명시적으로 말하지 않았지만 드러나는 어려움
3. **숨은_니즈**: 직접 요청하진 않았지만 기대하는 것
4. **조직_맥락**: 교육 방식 선호, 변화 수용도, 의사결정 구조 등
5. **AI_태도**: AI 도입에 대한 기대, 우려, 과거 경험
6. **주요_인용**: 로드맵 설계에 참고할 만한 인터뷰이의 핵심 발언

## 출력 형식

JSON 형식으로 출력하세요. 해당 사항이 없으면 빈 배열 또는 빈 문자열로 표시합니다.

{
  "추가_업무": ["...", "..."],
  "추가_페인포인트": ["...", "..."],
  "숨은_니즈": ["...", "..."],
  "조직_맥락": "...",
  "AI_태도": "...",
  "주요_인용": ["\\"...\\"", "\\"...\\""]
}`;

/**
 * STT 텍스트에서 로드맵에 필요한 정보 추출
 */
async function extractInsightsFromStt(sttText: string): Promise<SttInsights> {
  const userPrompt = `## 인터뷰 녹취록

${sttText}

위 녹취록에서 AI 교육 로드맵 수립에 필요한 정보를 추출해주세요.
반드시 JSON 형식으로만 응답하세요.`;

  return callLLMForJSON<SttInsights>(
    [
      { role: 'system', content: STT_EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { temperature: STT_EXTRACTION_TEMPERATURE }
  );
}

/**
 * STT 텍스트 크기 검증
 */
function validateSttTextSize(sttText: string): { valid: true } | { valid: false; error: string } {
  const textBytes = new TextEncoder().encode(sttText).length;

  if (textBytes > MAX_STT_FILE_SIZE_BYTES) {
    const currentSizeKB = Math.round(textBytes / 1024);
    const maxSizeKB = Math.round(MAX_STT_FILE_SIZE_BYTES / 1024);
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. 최대 ${maxSizeKB}KB까지 업로드 가능합니다. (현재: ${currentSizeKB}KB)`,
    };
  }

  return { valid: true };
}

/**
 * 테스트 로드맵 생성 (DB 저장 없이 LLM 결과만 반환)
 */
export async function createTestRoadmap(
  input: TestInputData
): Promise<ActionResult<{ result: RoadmapResult; validation: ValidationResult }>> {
  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  // 역할 확인 (승인된 컨설턴트 또는 운영관리자)
  const { data: profile } = await supabase.from('users').select('role, status').eq('id', user.id).single();

  if (
    !profile ||
    !ALLOWED_ROLES_FOR_TEST_ROADMAP.includes(profile.role as (typeof ALLOWED_ROLES_FOR_TEST_ROADMAP)[number]) ||
    profile.status !== 'ACTIVE'
  ) {
    return { success: false, error: '승인된 컨설턴트 또는 운영관리자만 테스트 로드맵을 생성할 수 있습니다.' };
  }

  // 입력 검증
  const validation = testInputSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  try {
    // 컨설턴트 프로필 조회 (있으면 로드맵 생성에 활용)
    const { data: consultantProfile } = await supabase
      .from('consultant_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // STT 텍스트가 있으면 인사이트 추출
    let sttInsights: SttInsights | undefined;
    if (input.stt_text) {
      // 크기 검증
      const sizeValidation = validateSttTextSize(input.stt_text);
      if (!sizeValidation.valid) {
        return { success: false, error: sizeValidation.error };
      }

      // LLM으로 인사이트 추출
      sttInsights = await extractInsightsFromStt(input.stt_text);
    }

    // 테스트 로드맵 생성 (DB 저장 없이 LLM 결과만 반환)
    const roadmapResult = await generateTestRoadmap(input, user.id, consultantProfile, sttInsights);

    // 감사 로그 (테스트 로드맵 생성 기록)
    await createAuditLog({
      actorUserId: user.id,
      action: 'TEST_ROADMAP_CREATE',
      targetType: 'roadmap',
      targetId: 'test-mode', // 실제 ID 없음
      meta: {
        company_name: input.company_name,
        industry: input.industry,
        is_test_mode: true,
        no_db_save: true,
        has_stt_insights: !!sttInsights,
      },
    });

    return {
      success: true,
      data: {
        result: roadmapResult.result,
        validation: roadmapResult.validation,
      },
    };
  } catch (error) {
    console.error('[createTestRoadmap] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '로드맵 생성 중 오류가 발생했습니다.',
    };
  }
}
