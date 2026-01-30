'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { interviewSchema, type InterviewInput, type SttInsights } from '@/lib/schemas/interview';
import { createAuditLog } from '@/lib/services/audit';
import { callLLMForJSON } from '@/lib/services/llm';
import {
  MAX_STT_FILE_SIZE_BYTES,
  MAX_STT_FILE_SIZE_KB,
  STT_EXTRACTION_TEMPERATURE,
} from '@/lib/constants/stt';

// ============================================================================
// 타입 정의
// ============================================================================

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface ProcessSttResult {
  success: boolean;
  insights?: SttInsights;
  error?: string;
}

interface AuthorizedUser {
  id: string;
}

// ============================================================================
// 공통 헬퍼 함수
// ============================================================================

/**
 * 프로젝트에 배정된 컨설턴트인지 확인
 * @returns 인증된 사용자 정보 또는 에러
 */
async function verifyProjectAccess(
  projectId: string
): Promise<{ user: AuthorizedUser } | { error: string }> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: '로그인이 필요합니다.' };
  }

  const { data: projectData } = await supabase
    .from('projects')
    .select('id, assigned_consultant_id')
    .eq('id', projectId)
    .eq('assigned_consultant_id', user.id)
    .single();

  if (!projectData) {
    return { error: '해당 프로젝트에 대한 접근 권한이 없습니다.' };
  }

  return { user: { id: user.id } };
}

// ============================================================================
// 인터뷰 저장/조회
// ============================================================================

export async function saveInterview(
  projectId: string,
  data: InterviewInput
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 사용자 역할 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
      return { success: false, error: '컨설턴트만 인터뷰를 입력할 수 있습니다.' };
    }

    // 프로젝트 접근 권한 확인 (배정된 컨설턴트만)
    const { data: projectData } = await supabase
      .from('projects')
      .select('id, status, assigned_consultant_id')
      .eq('id', projectId)
      .eq('assigned_consultant_id', user.id)
      .single();

    if (!projectData) {
      return { success: false, error: '해당 프로젝트에 대한 접근 권한이 없습니다.' };
    }

    // 데이터 검증
    const validation = interviewSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const adminSupabase = createAdminClient();

    // 기존 인터뷰 확인
    const { data: existingInterview } = await adminSupabase
      .from('interviews')
      .select('id')
      .eq('project_id', projectId)
      .single();

    const interviewData = {
      project_id: projectId,
      interviewer_id: user.id,
      interview_date: validation.data.interview_date,
      company_details: validation.data.company_details,
      job_tasks: validation.data.job_tasks,
      pain_points: validation.data.pain_points,
      constraints: validation.data.constraints || [],
      improvement_goals: validation.data.improvement_goals,
      notes: validation.data.notes || '',
      customer_requirements: validation.data.customer_requirements || '',
    };

    let auditAction: 'INTERVIEW_CREATE' | 'INTERVIEW_UPDATE';

    if (existingInterview) {
      const { error: updateError } = await adminSupabase
        .from('interviews')
        .update(interviewData)
        .eq('id', existingInterview.id);

      if (updateError) {
        return { success: false, error: '인터뷰 수정에 실패했습니다.' };
      }
      auditAction = 'INTERVIEW_UPDATE';
    } else {
      const { error: insertError } = await adminSupabase
        .from('interviews')
        .insert(interviewData);

      if (insertError) {
        return { success: false, error: '인터뷰 저장에 실패했습니다.' };
      }
      auditAction = 'INTERVIEW_CREATE';

      // 프로젝트 상태 업데이트 (최초 인터뷰 입력 시)
      await adminSupabase
        .from('projects')
        .update({ status: 'INTERVIEWED' })
        .eq('id', projectId);
    }

    // 감사 로그
    await createAuditLog({
      actorUserId: user.id,
      action: auditAction,
      targetType: 'interview',
      targetId: projectId,
      meta: {
        job_tasks_count: validation.data.job_tasks.length,
        pain_points_count: validation.data.pain_points.length,
        goals_count: validation.data.improvement_goals.length,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[saveInterview Error]', error);
    return { success: false, error: '인터뷰 저장 중 오류가 발생했습니다.' };
  }
}

export async function getInterview(projectId: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // 배정된 컨설턴트만 조회 가능
    const { data: projectData } = await supabase
      .from('projects')
      .select('assigned_consultant_id')
      .eq('id', projectId)
      .single();

    if (!projectData || projectData.assigned_consultant_id !== user.id) {
      return null;
    }

    const { data: interview } = await supabase
      .from('interviews')
      .select('*')
      .eq('project_id', projectId)
      .single();

    return interview;
  } catch {
    return null;
  }
}

// ============================================================================
// STT 인사이트 처리
// ============================================================================

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
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. 최대 ${MAX_STT_FILE_SIZE_KB}KB까지 업로드 가능합니다. (현재: ${currentSizeKB}KB)`,
    };
  }

  return { valid: true };
}

/**
 * STT 파일 처리 및 인사이트 추출
 */
export async function processSttFile(
  projectId: string,
  sttText: string
): Promise<ProcessSttResult> {
  try {
    // 권한 확인
    const authResult = await verifyProjectAccess(projectId);
    if ('error' in authResult) {
      return { success: false, error: authResult.error };
    }

    // 파일 크기 검증
    const sizeValidation = validateSttTextSize(sttText);
    if (!sizeValidation.valid) {
      return { success: false, error: sizeValidation.error };
    }

    // LLM으로 인사이트 추출
    const insights = await extractInsightsFromStt(sttText);

    // DB에 저장
    const adminSupabase = createAdminClient();
    const { error: updateError } = await adminSupabase
      .from('interviews')
      .update({ stt_insights: insights })
      .eq('project_id', projectId);

    if (updateError) {
      return { success: false, error: 'STT 인사이트 저장에 실패했습니다.' };
    }

    // 감사 로그
    await createAuditLog({
      actorUserId: authResult.user.id,
      action: 'INTERVIEW_UPDATE',
      targetType: 'interview',
      targetId: projectId,
      meta: {
        stt_processed: true,
        stt_text_length: sttText.length,
        insights_extracted: Object.keys(insights).length,
      },
    });

    return { success: true, insights };
  } catch (error) {
    console.error('[processSttFile Error]', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'STT 처리 중 오류가 발생했습니다.',
    };
  }
}

/**
 * STT 인사이트 삭제
 */
export async function deleteSttInsights(projectId: string): Promise<ActionResult> {
  try {
    // 권한 확인
    const authResult = await verifyProjectAccess(projectId);
    if ('error' in authResult) {
      return { success: false, error: authResult.error };
    }

    const adminSupabase = createAdminClient();
    const { error: updateError } = await adminSupabase
      .from('interviews')
      .update({ stt_insights: null })
      .eq('project_id', projectId);

    if (updateError) {
      return { success: false, error: 'STT 인사이트 삭제에 실패했습니다.' };
    }

    return { success: true };
  } catch (error) {
    console.error('[deleteSttInsights Error]', error);
    return { success: false, error: 'STT 인사이트 삭제 중 오류가 발생했습니다.' };
  }
}
