'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createCaseSchema, createSelfAssessmentSchema, assignConsultantSchema } from '@/lib/schemas/case';
import { createAuditLog } from '@/lib/services/audit';
import { revalidatePath } from 'next/cache';

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * 케이스 생성 (OPS_ADMIN)
 */
export async function createCase(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' };
  }

  // 역할 확인
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    return { success: false, error: '권한이 없습니다.' };
  }

  // 폼 데이터 파싱
  const rawData = {
    company_name: formData.get('company_name') as string,
    industry: formData.get('industry') as string,
    company_size: formData.get('company_size') as string,
    contact_name: formData.get('contact_name') as string,
    contact_email: formData.get('contact_email') as string,
    contact_phone: formData.get('contact_phone') as string || undefined,
    company_address: formData.get('company_address') as string || undefined,
    customer_comment: formData.get('customer_comment') as string || undefined,
  };

  // 서버 검증
  const validation = createCaseSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  // admin 클라이언트로 케이스 생성
  const adminSupabase = createAdminClient();
  const { data: newCase, error: insertError } = await adminSupabase
    .from('cases')
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
      action: 'CASE_CREATE',
      targetType: 'case',
      targetId: '00000000-0000-0000-0000-000000000000',
      meta: { company_name: validation.data.company_name },
      success: false,
      errorMessage: insertError.message,
    });
    return { success: false, error: `케이스 생성 실패: ${insertError.message}` };
  }

  // 감사 로그 기록
  await createAuditLog({
    actorUserId: user.id,
    action: 'CASE_CREATE',
    targetType: 'case',
    targetId: newCase.id,
    meta: { company_name: validation.data.company_name },
  });

  revalidatePath('/ops/cases');

  return { success: true, data: { caseId: newCase.id } };
}

/**
 * 자가진단 입력 (OPS_ADMIN)
 */
export async function createSelfAssessment(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' };
  }

  // 역할 확인
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    return { success: false, error: '권한이 없습니다.' };
  }

  // 폼 데이터 파싱
  const caseId = formData.get('case_id') as string;
  const templateId = formData.get('template_id') as string;
  const answersJson = formData.get('answers') as string;
  const summaryText = formData.get('summary_text') as string || undefined;

  let answers;
  try {
    answers = JSON.parse(answersJson);
  } catch {
    return { success: false, error: '응답 데이터 형식이 올바르지 않습니다.' };
  }

  const rawData = {
    case_id: caseId,
    template_id: templateId,
    answers,
    summary_text: summaryText,
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
    case_id: caseId,
    template_id: templateId,
    template_version: template.version,
    answers,
    scores,
    summary_text: summaryText,
    created_by: user.id,
  });

  if (insertError) {
    await createAuditLog({
      actorUserId: user.id,
      action: 'SELF_ASSESSMENT_CREATE',
      targetType: 'self_assessment',
      targetId: caseId,
      success: false,
      errorMessage: insertError.message,
    });
    return { success: false, error: `자가진단 저장 실패: ${insertError.message}` };
  }

  // 케이스 상태 업데이트
  await adminSupabase
    .from('cases')
    .update({ status: 'DIAGNOSED' })
    .eq('id', caseId);

  // 감사 로그 기록
  await createAuditLog({
    actorUserId: user.id,
    action: 'SELF_ASSESSMENT_CREATE',
    targetType: 'self_assessment',
    targetId: caseId,
    meta: { total_score: scores.total_score },
  });

  revalidatePath(`/ops/cases/${caseId}`);

  return { success: true };
}

/**
 * 컨설턴트 배정 (OPS_ADMIN)
 */
export async function assignConsultant(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' };
  }

  // 역할 확인
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    return { success: false, error: '권한이 없습니다.' };
  }

  // 폼 데이터 파싱
  const rawData = {
    case_id: formData.get('case_id') as string,
    consultant_id: formData.get('consultant_id') as string,
    assignment_reason: formData.get('assignment_reason') as string,
  };

  // 서버 검증
  const validation = assignConsultantSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const { case_id, consultant_id, assignment_reason } = validation.data;

  const adminSupabase = createAdminClient();

  // 기존 배정이 있는지 확인
  const { data: existingAssignment } = await adminSupabase
    .from('case_assignments')
    .select('id')
    .eq('case_id', case_id)
    .eq('is_current', true)
    .single();

  if (existingAssignment) {
    // 기존 배정 해제
    await adminSupabase
      .from('case_assignments')
      .update({
        is_current: false,
        unassigned_at: new Date().toISOString(),
        unassignment_reason: '새 배정으로 인한 변경',
      })
      .eq('id', existingAssignment.id);
  }

  // 새 배정 생성
  const { error: assignError } = await adminSupabase.from('case_assignments').insert({
    case_id,
    consultant_id,
    assigned_by: user.id,
    assignment_reason,
    is_current: true,
  });

  if (assignError) {
    await createAuditLog({
      actorUserId: user.id,
      action: 'CASE_ASSIGN',
      targetType: 'case',
      targetId: case_id,
      meta: { consultant_id, reason: assignment_reason },
      success: false,
      errorMessage: assignError.message,
    });
    return { success: false, error: `배정 실패: ${assignError.message}` };
  }

  // 케이스 상태 및 배정 컨설턴트 업데이트
  await adminSupabase
    .from('cases')
    .update({
      status: 'ASSIGNED',
      assigned_consultant_id: consultant_id,
    })
    .eq('id', case_id);

  // 감사 로그 기록
  await createAuditLog({
    actorUserId: user.id,
    action: 'CASE_ASSIGN',
    targetType: 'case',
    targetId: case_id,
    meta: { consultant_id, reason: assignment_reason },
  });

  revalidatePath(`/ops/cases/${case_id}`);
  revalidatePath('/ops/cases');

  return { success: true };
}

/**
 * 케이스 목록 조회 (OPS_ADMIN) - 페이지네이션 및 검색 지원
 */
export interface CaseListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  industry?: string;
}

export interface CaseListResult {
  cases: Array<{
    id: string;
    company_name: string;
    industry: string;
    company_size: string;
    status: string;
    created_at: string;
    contact_email: string;
    assigned_consultant?: { id: string; name: string; email: string } | null;
    created_by_user?: { id: string; name: string } | null;
  }>;
  total: number;
  totalPages: number;
  page: number;
}

export async function fetchCases(params: CaseListParams = {}): Promise<CaseListResult> {
  const supabase = await createClient();

  const { page = 1, limit = 10, search = '', status = '', industry = '' } = params;
  const offset = (page - 1) * limit;

  // 기본 쿼리
  let query = supabase
    .from('cases')
    .select(`
      id,
      company_name,
      industry,
      company_size,
      status,
      created_at,
      contact_email,
      assigned_consultant:users!cases_assigned_consultant_id_fkey(id, name, email),
      created_by_user:users!cases_created_by_fkey(id, name)
    `, { count: 'exact' });

  // 검색 조건
  if (search) {
    query = query.or(`company_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
  }

  // 상태 필터
  if (status) {
    query = query.eq('status', status);
  }

  // 업종 필터
  if (industry) {
    query = query.eq('industry', industry);
  }

  // 정렬 및 페이지네이션
  const { data: cases, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[fetchCases Error]', error);
    return { cases: [], total: 0, totalPages: 0, page };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  // Supabase 조인 결과를 적절한 형태로 변환
  const formattedCases = (cases || []).map((c) => ({
    id: c.id,
    company_name: c.company_name,
    industry: c.industry,
    company_size: c.company_size,
    status: c.status,
    created_at: c.created_at,
    contact_email: c.contact_email,
    // Supabase는 단일 조인을 배열로 반환할 수 있음
    assigned_consultant: Array.isArray(c.assigned_consultant)
      ? c.assigned_consultant[0] || null
      : c.assigned_consultant,
    created_by_user: Array.isArray(c.created_by_user)
      ? c.created_by_user[0] || null
      : c.created_by_user,
  }));

  return {
    cases: formattedCases,
    total,
    totalPages,
    page,
  };
}

/**
 * 케이스 상태 및 업종 목록 조회
 */
export async function fetchCaseFilters(): Promise<{
  statuses: string[];
  industries: string[];
}> {
  const supabase = await createClient();

  // 사용 중인 상태 목록 (고정 값)
  const statuses = [
    'NEW',
    'DIAGNOSED',
    'MATCH_RECOMMENDED',
    'ASSIGNED',
    'INTERVIEWED',
    'ROADMAP_DRAFTED',
    'FINALIZED',
  ];

  // 사용 중인 업종 목록
  const { data: industries } = await supabase
    .from('cases')
    .select('industry')
    .not('industry', 'is', null);

  const uniqueIndustries = [...new Set(industries?.map((c) => c.industry) || [])].filter(Boolean);

  return {
    statuses,
    industries: uniqueIndustries,
  };
}

/**
 * 점수 계산 헬퍼 함수
 */
function calculateScores(
  answers: { question_id: string; answer_value: string | number }[],
  questions: { id: string; dimension: string; weight: number }[]
) {
  const dimensionScores: Record<string, { score: number; max: number }> = {};

  for (const question of questions) {
    const answer = answers.find((a) => a.question_id === question.id);
    const answerValue = typeof answer?.answer_value === 'number'
      ? answer.answer_value
      : parseInt(answer?.answer_value as string || '0', 10);

    if (!dimensionScores[question.dimension]) {
      dimensionScores[question.dimension] = { score: 0, max: 0 };
    }

    dimensionScores[question.dimension].score += answerValue * question.weight;
    dimensionScores[question.dimension].max += 5 * question.weight; // 5점 척도 가정
  }

  const totalScore = Object.values(dimensionScores).reduce((sum, d) => sum + d.score, 0);
  const maxPossibleScore = Object.values(dimensionScores).reduce((sum, d) => sum + d.max, 0);

  return {
    total_score: totalScore,
    max_possible_score: maxPossibleScore,
    dimension_scores: Object.entries(dimensionScores).map(([dimension, { score, max }]) => ({
      dimension,
      score,
      max_score: max,
    })),
  };
}
