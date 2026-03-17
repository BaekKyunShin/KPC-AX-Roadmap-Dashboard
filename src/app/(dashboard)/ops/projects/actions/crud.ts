'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createProjectSchema, createSelfAssessmentSchema, assignConsultantSchema } from '@/lib/schemas/project';
import { createAuditLog } from '@/lib/services/audit';
import { createNotification } from '@/lib/services/notification';
import { revalidatePath, revalidateTag } from 'next/cache';
import { after } from 'next/server';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { NULL_UUID } from '@/lib/constants/database';
import { calculateScores } from '@/lib/services/calculate-scores';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';

/** RPC assign_consultant 함수의 반환 타입 */
interface AssignConsultantResult {
  success: boolean;
  error?: string;
}

/**
 * 프로젝트 생성 (OPS_ADMIN)
 */
export async function createProject(formData: FormData): Promise<ActionResult<{ projectId: string }>> {
  const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN'], {
    authError: '인증되지 않은 사용자입니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  // 폼 데이터 파싱
  const subIndustriesStr = formData.get('sub_industries') as string | null;
  let subIndustries: string[] = [];
  try {
    if (subIndustriesStr) {
      subIndustries = JSON.parse(subIndustriesStr);
    }
  } catch {
    // JSON 파싱 실패 시 빈 배열
  }

  const rawData = {
    company_name: formData.get('company_name') as string,
    industry: formData.get('industry') as string,
    sub_industries: subIndustries.length > 0 ? subIndustries : undefined,
    company_size: formData.get('company_size') as string,
    contact_name: formData.get('contact_name') as string,
    contact_email: formData.get('contact_email') as string,
    contact_phone: formData.get('contact_phone') as string || undefined,
    company_address: formData.get('company_address') as string || undefined,
    customer_comment: formData.get('customer_comment') as string || undefined,
  };

  // 서버 검증
  const validation = createProjectSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  // admin 클라이언트로 프로젝트 생성
  const adminSupabase = createAdminClient();
  const { data: newProject, error: insertError } = await adminSupabase
    .from('projects')
    .insert({
      ...validation.data,
      status: 'NEW',
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    await createAuditLog({
      actorUserId: user.id,
      action: 'PROJECT_CREATE',
      targetType: 'project',
      targetId: NULL_UUID,
      meta: { company_name: validation.data.company_name },
      success: false,
      errorMessage: insertError.message,
    });
    console.error('[createProject] Supabase error:', insertError.message);
    return { success: false, error: '프로젝트 생성에 실패했습니다.' };
  }

  // 감사로그 기록 (응답 차단 방지를 위해 after()로 지연)
  after(async () => {
    await createAuditLog({
      actorUserId: user.id,
      action: 'PROJECT_CREATE',
      targetType: 'project',
      targetId: newProject.id,
      meta: { company_name: validation.data.company_name },
    });
  });

  revalidatePath('/ops/projects');
  revalidateTag('project-filters', { expire: 1800 });

  return { success: true, data: { projectId: newProject.id } };
}

/**
 * 자가진단 입력 (OPS_ADMIN)
 */
export async function createSelfAssessment(formData: FormData): Promise<SimpleActionResult> {
  const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN'], {
    authError: '인증되지 않은 사용자입니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  // 폼 데이터 파싱
  const projectId = formData.get('project_id') as string;
  const templateId = formData.get('template_id') as string;
  const answersJson = formData.get('answers') as string;

  let answers;
  try {
    answers = JSON.parse(answersJson);
  } catch {
    return { success: false, error: '응답 데이터 형식이 올바르지 않습니다.' };
  }

  const rawData = {
    project_id: projectId,
    template_id: templateId,
    answers,
  };

  // 서버 검증
  const validation = createSelfAssessmentSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  // 템플릿 정보 조회
  const adminSupabase = createAdminClient();
  const { data: template } = await adminSupabase
    .from('self_assessment_templates')
    .select('version, questions')
    .eq('id', templateId)
    .single();

  if (!template) {
    return { success: false, error: '템플릿을 찾을 수 없습니다.' };
  }

  // 점수 계산
  const scores = calculateScores(answers, template.questions);

  // 자가진단 저장
  const { error: insertError } = await adminSupabase.from('self_assessments').insert({
    project_id: projectId,
    template_id: templateId,
    template_version: template.version,
    answers,
    scores,
    created_by: user.id,
  });

  if (insertError) {
    await createAuditLog({
      actorUserId: user.id,
      action: 'SELF_ASSESSMENT_CREATE',
      targetType: 'self_assessment',
      targetId: projectId,
      success: false,
      errorMessage: insertError.message,
    });
    console.error('[createSelfAssessment] Supabase error:', insertError.message);
    return { success: false, error: '자가진단 저장에 실패했습니다.' };
  }

  // 프로젝트 상태 업데이트 — SQL 조건으로 NEW→DIAGNOSED 전이만 허용 (동시성 안전한 원자적 가드)
  await adminSupabase
    .from('projects')
    .update({ status: 'DIAGNOSED' })
    .eq('id', projectId)
    .eq('status', 'NEW');

  // 감사로그 기록 (응답 차단 방지를 위해 after()로 지연)
  after(async () => {
    await createAuditLog({
      actorUserId: user.id,
      action: 'SELF_ASSESSMENT_CREATE',
      targetType: 'self_assessment',
      targetId: projectId,
      meta: { total_score: scores.total_score },
    });
  });

  revalidatePath(`/ops/projects/${projectId}`);

  return { success: true };
}

/**
 * 컨설턴트 배정 (OPS_ADMIN)
 */
export async function assignConsultant(formData: FormData): Promise<SimpleActionResult> {
  const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN'], {
    authError: '인증되지 않은 사용자입니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  // 폼 데이터 파싱
  const rawData = {
    project_id: formData.get('project_id') as string,
    consultant_id: formData.get('consultant_id') as string,
    assignment_reason: formData.get('assignment_reason') as string,
  };

  // 서버 검증
  const validation = assignConsultantSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const { project_id, consultant_id, assignment_reason } = validation.data;

  const adminSupabase = createAdminClient();

  // RPC로 원자적 배정 (검증 + 기존 해제 + 새 배정 + 상태 업데이트를 단일 트랜잭션에서 실행)
  const { data: rpcResult, error: rpcError } = await adminSupabase.rpc('assign_consultant', {
    p_project_id: project_id,
    p_consultant_id: consultant_id,
    p_assigned_by: user.id,
    p_assignment_reason: assignment_reason || null,
  });

  const result: AssignConsultantResult = (rpcError || !rpcResult)
    ? { success: false }
    : (rpcResult as AssignConsultantResult);

  if (!result.success) {
    const errorDetail = rpcError?.message || result.error || '배정 실패';
    await createAuditLog({
      actorUserId: user.id,
      action: 'PROJECT_ASSIGN',
      targetType: 'project',
      targetId: project_id,
      meta: { consultant_id, reason: assignment_reason },
      success: false,
      errorMessage: errorDetail,
    });
    console.error('[assignConsultant] 에러:', errorDetail);
    return { success: false, error: result.error || '컨설턴트 배정에 실패했습니다.' };
  }

  // 감사로그 + 알림 (응답 차단 방지를 위해 after()로 지연)
  after(async () => {
    await createAuditLog({
      actorUserId: user.id,
      action: 'PROJECT_ASSIGN',
      targetType: 'project',
      targetId: project_id,
      meta: { consultant_id, reason: assignment_reason },
    });

    // 컨설턴트에게 배정 알림 전송
    const { data: project } = await adminSupabase
      .from('projects')
      .select('company_name')
      .eq('id', project_id)
      .single();

    await createNotification({
      userId: consultant_id,
      type: 'assignment',
      title: '새 프로젝트 배정',
      message: `${project?.company_name || '새'} 프로젝트가 배정되었습니다.`,
      link: `/consultant/projects/${project_id}`,
    });
  });

  revalidatePath(`/ops/projects/${project_id}`);
  revalidatePath('/ops/projects');

  return { success: true };
}

