'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, requireAuthWithRole, requireConsultantProjectAccess } from '@/lib/actions/auth-helpers';
import { interviewSchema, type InterviewInput, type SttInsights } from '@/lib/schemas/interview';
import { createAuditLog } from '@/lib/services/audit';
import { insertSystemActivityLog } from '@/lib/services/activity-log';
import { createNotificationForAdmins } from '@/lib/services/notification';
import { extractInsightsFromStt, validateSttTextSize } from '@/lib/services/stt';

import type { SimpleActionResult } from '@/lib/types/action-result';

export interface ProcessSttResult {
  success: boolean;
  insights?: SttInsights;
  error?: string;
}

// ============================================================================
// 공통 헬퍼 함수
// ============================================================================

/**
 * 프로젝트에 배정된 컨설턴트인지 확인
 * @returns 인증된 사용자 정보 또는 에러
 */
async function verifyProjectAccess(
  projectId: string,
): Promise<{ user: { id: string } } | { error: string }> {
  const auth = await requireAuth();
  if ('error' in auth) return auth;

  const accessCheck = await requireConsultantProjectAccess(
    auth.supabase, auth.user.id, projectId,
    '해당 프로젝트에 대한 접근 권한이 없습니다.',
  );
  if (accessCheck !== true) return accessCheck;

  return { user: { id: auth.user.id } };
}

// ============================================================================
// 인터뷰 저장/조회
// ============================================================================

export async function saveInterview(
  projectId: string,
  data: InterviewInput,
  options?: { skipValidation?: boolean }
): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 인터뷰를 입력할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    // 프로젝트 접근 권한 확인 (배정된 컨설턴트만)
    const { data: projectData } = await supabase
      .from('projects')
      .select('id, status, assigned_consultant_id, company_name, is_test_mode')
      .eq('id', projectId)
      .eq('assigned_consultant_id', user.id)
      .single();

    if (!projectData) {
      return { success: false, error: '해당 프로젝트에 대한 접근 권한이 없습니다.' };
    }

    // 데이터 검증 (skipValidation이 true면 자동 저장 모드 - 검증 건너뜀)
    let validatedData = data;
    if (!options?.skipValidation) {
      const validation = interviewSchema.safeParse(data);
      if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message };
      }
      validatedData = validation.data;
    }

    const adminSupabase = createAdminClient();

    // 기존 인터뷰 확인 (maybeSingle을 사용하여 없는 경우에도 에러 없이 null 반환)
    const { data: existingInterview, error: fetchError } = await adminSupabase
      .from('interviews')
      .select('id')
      .eq('project_id', projectId)
      .maybeSingle();

    if (fetchError) {
      console.error('[saveInterview Error] Fetch:', fetchError);
      return { success: false, error: `기존 인터뷰 확인 실패: ${fetchError.message}` };
    }

    const interviewData = {
      project_id: projectId,
      interviewer_id: user.id,
      interview_date: validatedData.interview_date,
      participants: validatedData.participants,
      company_details: validatedData.company_details,
      job_tasks: validatedData.job_tasks,
      pain_points: validatedData.pain_points,
      constraints: validatedData.constraints || [],
      improvement_goals: validatedData.improvement_goals,
      notes: validatedData.notes || '',
      customer_requirements: validatedData.customer_requirements || '',
    };

    let auditAction: 'INTERVIEW_CREATE' | 'INTERVIEW_UPDATE';

    if (existingInterview) {
      const { error: updateError } = await adminSupabase
        .from('interviews')
        .update(interviewData)
        .eq('id', existingInterview.id);

      if (updateError) {
        console.error('[saveInterview Error] Update:', updateError);
        return { success: false, error: `인터뷰 수정 실패: ${updateError.message}` };
      }
      auditAction = 'INTERVIEW_UPDATE';
    } else {
      const { error: insertError } = await adminSupabase
        .from('interviews')
        .insert(interviewData);

      if (insertError) {
        console.error('[saveInterview Error] Insert:', insertError);
        return { success: false, error: `인터뷰 저장 실패: ${insertError.message}` };
      }
      auditAction = 'INTERVIEW_CREATE';

      // 프로젝트 상태 업데이트 (최초 인터뷰 입력 시)
      await adminSupabase
        .from('projects')
        .update({ status: 'INTERVIEWED' })
        .eq('id', projectId);

      // 운영관리자에게 인터뷰 완료 알림 (테스트 프로젝트 제외)
      if (!projectData.is_test_mode) {
        await createNotificationForAdmins({
          type: 'interview_complete',
          title: '인터뷰 완료',
          message: `${projectData.company_name || '(알 수 없는 기업)'} 프로젝트 인터뷰가 완료되었습니다.`,
          link: `/ops/projects/${projectId}`,
        });
      }
    }

    // 감사 로그
    await createAuditLog({
      actorUserId: user.id,
      action: auditAction,
      targetType: 'interview',
      targetId: projectId,
      meta: {
        job_tasks_count: validatedData.job_tasks.length,
        pain_points_count: validatedData.pain_points.length,
        goals_count: validatedData.improvement_goals.length,
      },
    });

    // 활동 일지 자동 기록 (자동저장 모드가 아닌 경우에만)
    if (!options?.skipValidation) {
      const logContent = auditAction === 'INTERVIEW_CREATE'
        ? '인터뷰가 저장되었습니다.'
        : '인터뷰가 수정되었습니다.';
      await insertSystemActivityLog(projectId, user.id, logContent);
    }

    return { success: true };
  } catch (error) {
    console.error('[saveInterview Error]', error);
    return { success: false, error: '인터뷰 저장 중 오류가 발생했습니다.' };
  }
}

export async function getInterview(projectId: string) {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return null;
    const { user, supabase } = auth;

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
export async function deleteSttInsights(projectId: string): Promise<SimpleActionResult> {
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
