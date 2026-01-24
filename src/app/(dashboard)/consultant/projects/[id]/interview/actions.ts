'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { interviewSchema, type InterviewInput } from '@/lib/schemas/interview';
import { createAuditLog } from '@/lib/services/audit';

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function saveInterview(
  projectId: string,
  data: InterviewInput
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        success: false,
        error: '로그인이 필요합니다.',
      };
    }

    // 사용자 역할 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
      return {
        success: false,
        error: '컨설턴트만 인터뷰를 입력할 수 있습니다.',
      };
    }

    // 프로젝트 접근 권한 확인 (배정된 컨설턴트만)
    const { data: projectData } = await supabase
      .from('projects')
      .select('id, status, assigned_consultant_id')
      .eq('id', projectId)
      .eq('assigned_consultant_id', user.id)
      .single();

    if (!projectData) {
      return {
        success: false,
        error: '해당 프로젝트에 대한 접근 권한이 없습니다.',
      };
    }

    // 데이터 검증
    const validation = interviewSchema.safeParse(data);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0].message,
      };
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
      // 업데이트
      const { error: updateError } = await adminSupabase
        .from('interviews')
        .update(interviewData)
        .eq('id', existingInterview.id);

      if (updateError) {
        return {
          success: false,
          error: '인터뷰 수정에 실패했습니다.',
        };
      }
      auditAction = 'INTERVIEW_UPDATE';
    } else {
      // 새로 생성
      const { error: insertError } = await adminSupabase
        .from('interviews')
        .insert(interviewData);

      if (insertError) {
        return {
          success: false,
          error: '인터뷰 저장에 실패했습니다.',
        };
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
    return {
      success: false,
      error: '인터뷰 저장 중 오류가 발생했습니다.',
    };
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
