'use server';

import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase/admin'; // admin: 인터뷰/활동일지 CRUD — projects RLS 우회
import { requireAuth, requireAuthWithRole, requireConsultantProjectAccess, type AuthSuccess } from '@/lib/actions/auth-helpers';
import {
  createActivityLogSchema,
  updateActivityLogSchema,
} from '@/lib/schemas/activity-log';
import {
  guideDataSchema,
  updateGuideQuestionsSchema,
  type GuideData,
  type GuideQuestion,
} from '@/lib/schemas/interview-guide';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import {
  ACTIVITY_LOG_PAGE_SIZE,
  type ActivityLogType,
  type ManualActivityLogType,
} from '@/lib/constants/activity-log';
import { generateInterviewGuideData } from '@/lib/services/interview-guide';
import { checkAndRecordLLMUsage } from '@/lib/services/quota';
import type { SelfAssessmentScores } from '@/lib/constants/score-color';
import { COMPANY_SIZE_LABELS, type CompanySizeValue } from '@/lib/constants/company-size';

// ============================================================================
// 타입 정의
// ============================================================================

export interface ActivityLogItem {
  id: string;
  project_id: string;
  consultant_id: string;
  type: ActivityLogType;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogsResult {
  logs: ActivityLogItem[];
  total: number;
}

// ============================================================================
// 공통 헬퍼
// ============================================================================

async function verifyConsultantProjectAccess(
  projectId: string,
): Promise<{ user: { id: string }; supabase: AuthSuccess['supabase'] } | { error: string }> {
  const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
    roleError: '컨설턴트만 접근 가능합니다.',
  });
  if ('error' in auth) return auth;

  const accessCheck = await requireConsultantProjectAccess(auth.supabase, auth.user.id, projectId);
  if (accessCheck !== true) return accessCheck;

  return { user: { id: auth.user.id }, supabase: auth.supabase };
}

// ============================================================================
// 활동 일지 조회
// ============================================================================

export async function fetchActivityLogs(
  projectId: string,
  options?: {
    type?: ActivityLogType;
    limit?: number;
    offset?: number;
  },
): Promise<ActivityLogsResult> {
  const auth = await requireAuth();
  if ('error' in auth) return { logs: [], total: 0 };
  const { supabase } = auth;

  const limit = options?.limit ?? ACTIVITY_LOG_PAGE_SIZE;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from('consultant_activity_logs')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[fetchActivityLogs Error]', error);
    return { logs: [], total: 0 };
  }

  return {
    logs: (data as ActivityLogItem[]) ?? [],
    total: count ?? 0,
  };
}

// ============================================================================
// 활동 일지 생성
// ============================================================================

export async function createActivityLog(
  projectId: string,
  type: ManualActivityLogType,
  content: string,
): Promise<SimpleActionResult> {
  try {
    const auth = await verifyConsultantProjectAccess(projectId);
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const validation = createActivityLogSchema.safeParse({ type, content });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const adminSupabase = createAdminClient();

    const { error: insertError } = await adminSupabase
      .from('consultant_activity_logs')
      .insert({
        project_id: projectId,
        consultant_id: auth.user.id,
        type: validation.data.type,
        content: validation.data.content,
      });

    if (insertError) {
      console.error('[createActivityLog Error]', insertError);
      return { success: false, error: '활동 기록 저장에 실패했습니다.' };
    }

    revalidatePath(`/consultant/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('[createActivityLog Error]', error);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

// ============================================================================
// 개별 로그 소유권 확인 헬퍼
// ============================================================================

/**
 * 로그가 본인 소유이며 수동 기록인지 확인
 * - update/delete에서 공통 사용
 */
async function verifyManualLogOwnership(
  logId: string,
  userId: string,
  action: '수정' | '삭제',
): Promise<SimpleActionResult | null> {
  const adminSupabase = createAdminClient();

  const { data: log } = await adminSupabase
    .from('consultant_activity_logs')
    .select('id, consultant_id, type')
    .eq('id', logId)
    .single();

  if (!log) {
    return { success: false, error: '해당 기록을 찾을 수 없습니다.' };
  }

  if (log.consultant_id !== userId) {
    return { success: false, error: `본인의 기록만 ${action}할 수 있습니다.` };
  }

  if (log.type === 'system_auto') {
    return { success: false, error: `시스템 자동 기록은 ${action}할 수 없습니다.` };
  }

  return null; // 검증 통과
}

// ============================================================================
// 활동 일지 수정
// ============================================================================

export async function updateActivityLog(
  logId: string,
  projectId: string,
  content: string,
): Promise<SimpleActionResult> {
  try {
    const auth = await verifyConsultantProjectAccess(projectId);
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const validation = updateActivityLogSchema.safeParse({ content });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const ownershipError = await verifyManualLogOwnership(logId, auth.user.id, '수정');
    if (ownershipError) return ownershipError;

    const adminSupabase = createAdminClient();

    const { error: updateError } = await adminSupabase
      .from('consultant_activity_logs')
      .update({ content: validation.data.content })
      .eq('id', logId);

    if (updateError) {
      console.error('[updateActivityLog Error]', updateError);
      return { success: false, error: '기록 수정에 실패했습니다.' };
    }

    revalidatePath(`/consultant/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('[updateActivityLog Error]', error);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

// ============================================================================
// 활동 일지 삭제
// ============================================================================

export async function deleteActivityLog(
  logId: string,
  projectId: string,
): Promise<SimpleActionResult> {
  try {
    const auth = await verifyConsultantProjectAccess(projectId);
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const ownershipError = await verifyManualLogOwnership(logId, auth.user.id, '삭제');
    if (ownershipError) return ownershipError;

    const adminSupabase = createAdminClient();

    const { error: deleteError } = await adminSupabase
      .from('consultant_activity_logs')
      .delete()
      .eq('id', logId);

    if (deleteError) {
      console.error('[deleteActivityLog Error]', deleteError);
      return { success: false, error: '기록 삭제에 실패했습니다.' };
    }

    revalidatePath(`/consultant/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('[deleteActivityLog Error]', error);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

// ============================================================================
// 인터뷰 사전 분석 가이드 생성
// ============================================================================

export async function generateInterviewGuide(
  projectId: string,
): Promise<ActionResult<GuideData>> {
  try {
    const auth = await verifyConsultantProjectAccess(projectId);
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    // 원자적 쿼터 확인 + 사용량 기록 (동시 요청 시 한도 우회 방지)
    const quotaCheck = await checkAndRecordLLMUsage(auth.user.id);
    if (quotaCheck.exceeded) {
      return { success: false, error: quotaCheck.message || 'LLM 호출 한도를 초과했습니다.' };
    }

    // 프로젝트 + 자가진단 데이터 조회
    const { data: projectData } = await auth.supabase
      .from('projects')
      .select(`
        company_name,
        industry,
        company_size,
        customer_comment,
        self_assessments(
          scores,
          answers,
          template:self_assessment_templates(questions)
        )
      `)
      .eq('id', projectId)
      .single();

    if (!projectData) {
      return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
    }

    // UNIQUE 제약조건(1:1 관계)으로 PostgREST가 단일 객체를 반환
    const selfAssessment = projectData.self_assessments as unknown as {
      scores: unknown;
      answers: unknown;
      template: { questions?: unknown[] } | null;
    } | null;
    if (!selfAssessment) {
      return { success: false, error: '자가진단이 완료되지 않았습니다.' };
    }

    const scores = selfAssessment.scores as SelfAssessmentScores | null;
    if (!scores) {
      return { success: false, error: '자가진단 점수 데이터가 없습니다.' };
    }

    const answers = (selfAssessment.answers ?? []) as { question_id: string; answer_value: number | string }[];
    const templateQuestions = (selfAssessment.template?.questions ?? []) as {
      id: string;
      order: number;
      dimension: string;
      question_text: string;
      weight: number;
    }[];

    const companySizeLabel = COMPANY_SIZE_LABELS[projectData.company_size as CompanySizeValue]
      || projectData.company_size;

    // LLM 호출 (쿼터는 이미 원자적으로 차감됨)
    const guideData = await generateInterviewGuideData({
      companyName: projectData.company_name,
      industry: projectData.industry,
      companySize: companySizeLabel,
      customerComment: projectData.customer_comment,
      scores,
      answers,
      questions: templateQuestions,
    });

    // Zod 검증
    const validation = guideDataSchema.safeParse(guideData);
    if (!validation.success) {
      console.error('[generateInterviewGuide Error] LLM 출력 검증 실패:', validation.error.errors);
      return { success: false, error: 'AI 분석 결과 형식이 올바르지 않습니다. 다시 시도해주세요.' };
    }

    // DB UPSERT (프로젝트당 1개)
    const adminSupabase = createAdminClient();
    const { error: upsertError } = await adminSupabase
      .from('interview_guides')
      .upsert(
        {
          project_id: projectId,
          guide_data: validation.data,
        },
        { onConflict: 'project_id' },
      );

    if (upsertError) {
      console.error('[generateInterviewGuide Error] DB 저장 실패:', upsertError);
      return { success: false, error: '분석 결과 저장에 실패했습니다.' };
    }

    return { success: true, data: validation.data };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[generateInterviewGuide Error]', errMsg, error);
    // 진단용: 원인별 분류 로그
    if (errMsg.includes('토큰 한도')) {
      console.error('[generateInterviewGuide] 원인: 토큰 초과 (maxTokens=4000)');
    } else if (errMsg.includes('파싱') || errMsg.includes('JSON')) {
      console.error('[generateInterviewGuide] 원인: JSON 파싱 실패 (3회 재시도 후)');
    } else if (errMsg.includes('API 호출 실패')) {
      console.error('[generateInterviewGuide] 원인: LLM API 호출 실패');
    } else if (errMsg.includes('타임아웃')) {
      console.error('[generateInterviewGuide] 원인: LLM 타임아웃');
    }
    return { success: false, error: 'AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.' };
  }
}

// ============================================================================
// 인터뷰 가이드 질문 업데이트 (체크/추가/삭제)
// ============================================================================

export async function updateInterviewGuideQuestions(
  projectId: string,
  questions: GuideQuestion[],
): Promise<SimpleActionResult> {
  try {
    const auth = await verifyConsultantProjectAccess(projectId);
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const validation = updateGuideQuestionsSchema.safeParse({ questions });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const adminSupabase = createAdminClient();

    // 기존 가이드 조회
    const { data: existing } = await adminSupabase
      .from('interview_guides')
      .select('id, guide_data')
      .eq('project_id', projectId)
      .single();

    if (!existing) {
      return { success: false, error: '사전 분석 가이드를 찾을 수 없습니다.' };
    }

    // guide_data의 questions만 업데이트
    const updatedGuideData = {
      ...(existing.guide_data as Record<string, unknown>),
      questions: validation.data.questions,
    };

    const { error: updateError } = await adminSupabase
      .from('interview_guides')
      .update({ guide_data: updatedGuideData })
      .eq('id', existing.id);

    if (updateError) {
      console.error('[updateInterviewGuideQuestions Error]', updateError);
      return { success: false, error: '질문 업데이트에 실패했습니다.' };
    }

    revalidatePath(`/consultant/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('[updateInterviewGuideQuestions Error]', error);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}
