'use server';

import { after } from 'next/server';

import { publicSelfAssessmentSchema } from '@/lib/schemas/assessment-token';
import { createAuditLog } from '@/lib/services/audit';
import { calculateScores } from '@/lib/services/calculate-scores';
import { createNotificationForAdmins } from '@/lib/services/notification';
import { createAdminClient } from '@/lib/supabase/admin'; // admin: 공개 자가진단 (비로그인) — 토큰 검증 및 진단 저장
import type { SimpleActionResult } from '@/lib/types/action-result';

/**
 * 공개 자가진단 제출 (토큰 기반, 인증 불필요)
 */
export async function submitPublicAssessment(
  formData: FormData
): Promise<SimpleActionResult> {
  // FormData 파싱
  const token = formData.get('token') as string;
  const submittedByName = formData.get('submitted_by_name') as string;
  const submittedByTitle = formData.get('submitted_by_title') as string;
  const submittedByEmail = formData.get('submitted_by_email') as string;
  const templateId = formData.get('template_id') as string;

  let answers;
  try {
    answers = JSON.parse(formData.get('answers') as string);
  } catch {
    return { success: false, error: '응답 데이터 형식이 올바르지 않습니다.' };
  }

  // Zod 검증
  const validation = publicSelfAssessmentSchema.safeParse({
    token,
    submitted_by_name: submittedByName,
    submitted_by_title: submittedByTitle,
    submitted_by_email: submittedByEmail,
    template_id: templateId,
    answers,
  });

  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const adminSupabase = createAdminClient();

  // 토큰 검증
  const { data: tokenData } = await adminSupabase
    .from('assessment_tokens')
    .select('id, project_id, expires_at, is_used')
    .eq('token', token)
    .single();

  if (!tokenData) {
    return { success: false, error: '유효하지 않은 링크입니다.' };
  }

  if (tokenData.is_used) {
    const { data: existingByToken } = await adminSupabase
      .from('self_assessments')
      .select('id')
      .eq('assessment_token_id', tokenData.id)
      .maybeSingle();

    return {
      success: false,
      error: existingByToken
        ? '이미 진단 결과를 제출하셨습니다.'
        : '이 링크는 더 이상 유효하지 않습니다. 담당자에게 새 링크를 요청해 주세요.',
    };
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    return {
      success: false,
      error: '링크가 만료되었습니다. 담당자에게 새 링크를 요청해 주세요.',
    };
  }

  const projectId = tokenData.project_id;

  // 기존 진단 확인 (프로젝트당 1건 UNIQUE)
  const { data: existingAssessment } = await adminSupabase
    .from('self_assessments')
    .select('id, assessment_token_id')
    .eq('project_id', projectId)
    .single();

  if (existingAssessment) {
    if (existingAssessment.assessment_token_id) {
      return {
        success: false,
        error: '이미 진단 결과를 제출하셨습니다.',
      };
    }
    return {
      success: false,
      error: '진단 결과를 이미 KPC 운영 담당자가 입력 완료했습니다.',
    };
  }

  // 템플릿 조회
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
  const { error: insertError } = await adminSupabase
    .from('self_assessments')
    .insert({
      project_id: projectId,
      template_id: templateId,
      template_version: template.version,
      answers,
      scores,
      created_by: null,
      submitted_by_name: submittedByName,
      submitted_by_title: submittedByTitle,
      submitted_by_email: submittedByEmail,
      assessment_token_id: tokenData.id,
    });

  if (insertError) {
    console.error(
      '[submitPublicAssessment] Supabase error:',
      insertError.message
    );
    return { success: false, error: '진단 저장에 실패했습니다.' };
  }

  // 토큰 사용 처리
  await adminSupabase
    .from('assessment_tokens')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('id', tokenData.id);

  // 프로젝트 상태 전환 (NEW→DIAGNOSED)
  await adminSupabase
    .from('projects')
    .update({ status: 'DIAGNOSED' })
    .eq('id', projectId)
    .eq('status', 'NEW');

  // 감사로그 + OPS_ADMIN 알림 (응답 차단 방지를 위해 after()로 지연)
  after(async () => {
    // 프로젝트 정보 조회 (알림 메시지용)
    const { data: project } = await adminSupabase
      .from('projects')
      .select('company_name')
      .eq('id', projectId)
      .single();

    const companyName = project?.company_name || '알 수 없음';

    await createAuditLog({
      actorUserId: null,
      action: 'PUBLIC_SELF_ASSESSMENT_CREATE',
      targetType: 'self_assessment',
      targetId: projectId,
      meta: {
        submitted_by_name: submittedByName,
        submitted_by_email: submittedByEmail,
        company_name: companyName,
      },
    });

    await createNotificationForAdmins({
      type: 'assessment_submitted',
      title: '자가진단 완료',
      message: `${companyName}에서 자가진단을 완료했습니다. (작성자: ${submittedByName})`,
      link: `/ops/projects/${projectId}`,
    });
  });

  return { success: true };
}
