'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createProjectSchema, createSelfAssessmentSchema, assignConsultantSchema } from '@/lib/schemas/project';
import { createAuditLog } from '@/lib/services/audit';
import { revalidatePath } from 'next/cache';

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * 프로젝트 생성 (OPS_ADMIN)
 */
export async function createProject(formData: FormData): Promise<ActionResult> {
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
      targetId: '00000000-0000-0000-0000-000000000000',
      meta: { company_name: validation.data.company_name },
      success: false,
      errorMessage: insertError.message,
    });
    return { success: false, error: `프로젝트 생성 실패: ${insertError.message}` };
  }

  // 감사 로그 기록
  await createAuditLog({
    actorUserId: user.id,
    action: 'PROJECT_CREATE',
    targetType: 'project',
    targetId: newProject.id,
    meta: { company_name: validation.data.company_name },
  });

  revalidatePath('/ops/projects');

  return { success: true, data: { projectId: newProject.id } };
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
  const projectId = formData.get('project_id') as string;
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
    project_id: projectId,
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
    project_id: projectId,
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
      targetId: projectId,
      success: false,
      errorMessage: insertError.message,
    });
    return { success: false, error: `자가진단 저장 실패: ${insertError.message}` };
  }

  // 프로젝트 상태 업데이트
  await adminSupabase
    .from('projects')
    .update({ status: 'DIAGNOSED' })
    .eq('id', projectId);

  // 감사 로그 기록
  await createAuditLog({
    actorUserId: user.id,
    action: 'SELF_ASSESSMENT_CREATE',
    targetType: 'self_assessment',
    targetId: projectId,
    meta: { total_score: scores.total_score },
  });

  revalidatePath(`/ops/projects/${projectId}`);

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

  // 기존 배정이 있는지 확인
  const { data: existingAssignment } = await adminSupabase
    .from('project_assignments')
    .select('id')
    .eq('project_id', project_id)
    .eq('is_current', true)
    .single();

  if (existingAssignment) {
    // 기존 배정 해제
    await adminSupabase
      .from('project_assignments')
      .update({
        is_current: false,
        unassigned_at: new Date().toISOString(),
        unassignment_reason: '새 배정으로 인한 변경',
      })
      .eq('id', existingAssignment.id);
  }

  // 새 배정 생성
  const { error: assignError } = await adminSupabase.from('project_assignments').insert({
    project_id,
    consultant_id,
    assigned_by: user.id,
    assignment_reason,
    is_current: true,
  });

  if (assignError) {
    await createAuditLog({
      actorUserId: user.id,
      action: 'PROJECT_ASSIGN',
      targetType: 'project',
      targetId: project_id,
      meta: { consultant_id, reason: assignment_reason },
      success: false,
      errorMessage: assignError.message,
    });
    return { success: false, error: `배정 실패: ${assignError.message}` };
  }

  // 프로젝트 상태 및 배정 컨설턴트 업데이트
  await adminSupabase
    .from('projects')
    .update({
      status: 'ASSIGNED',
      assigned_consultant_id: consultant_id,
    })
    .eq('id', project_id);

  // 감사 로그 기록
  await createAuditLog({
    actorUserId: user.id,
    action: 'PROJECT_ASSIGN',
    targetType: 'project',
    targetId: project_id,
    meta: { consultant_id, reason: assignment_reason },
  });

  revalidatePath(`/ops/projects/${project_id}`);
  revalidatePath('/ops/projects');

  return { success: true };
}

/**
 * 프로젝트 목록 조회 (OPS_ADMIN) - 페이지네이션 및 검색 지원
 */
export interface ProjectListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  industry?: string;
}

export interface ProjectListResult {
  projects: Array<{
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

export async function fetchProjects(params: ProjectListParams = {}): Promise<ProjectListResult> {
  const supabase = await createClient();

  const { page = 1, limit = 10, search = '', status = '', industry = '' } = params;
  const offset = (page - 1) * limit;

  // 기본 쿼리
  let query = supabase
    .from('projects')
    .select(`
      id,
      company_name,
      industry,
      company_size,
      status,
      created_at,
      contact_email,
      assigned_consultant:users!projects_assigned_consultant_id_fkey(id, name, email),
      created_by_user:users!projects_created_by_fkey(id, name)
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
  const { data: projects, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[fetchProjects Error]', error);
    return { projects: [], total: 0, totalPages: 0, page };
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  // Supabase 조인 결과를 적절한 형태로 변환
  const formattedProjects = (projects || []).map((p) => ({
    id: p.id,
    company_name: p.company_name,
    industry: p.industry,
    company_size: p.company_size,
    status: p.status,
    created_at: p.created_at,
    contact_email: p.contact_email,
    // Supabase는 단일 조인을 배열로 반환할 수 있음
    assigned_consultant: Array.isArray(p.assigned_consultant)
      ? p.assigned_consultant[0] || null
      : p.assigned_consultant,
    created_by_user: Array.isArray(p.created_by_user)
      ? p.created_by_user[0] || null
      : p.created_by_user,
  }));

  return {
    projects: formattedProjects,
    total,
    totalPages,
    page,
  };
}

/**
 * 프로젝트 상태 및 업종 목록 조회
 */
export async function fetchProjectFilters(): Promise<{
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
    .from('projects')
    .select('industry')
    .not('industry', 'is', null);

  const uniqueIndustries = [...new Set(industries?.map((c) => c.industry) || [])].filter(Boolean);

  return {
    statuses,
    industries: uniqueIndustries,
  };
}

/**
 * 수동 배정용 컨설턴트 후보 목록 조회 (OPS_ADMIN)
 */
export interface ConsultantCandidateParams {
  page?: number;
  limit?: number;
  search?: string;
  industries?: string[];
  skills?: string[];
}

export interface ConsultantCandidate {
  id: string;
  name: string;
  email: string;
  consultant_profile: {
    expertise_domains: string[];
    available_industries: string[];
    teaching_levels: string[];
    skill_tags: string[];
    years_of_experience: number;
    representative_experience?: string;
  } | null;
}

export interface ConsultantCandidateListResult {
  consultants: ConsultantCandidate[];
  total: number;
  totalPages: number;
  page: number;
}

export async function fetchConsultantCandidates(
  params: ConsultantCandidateParams = {}
): Promise<ConsultantCandidateListResult> {
  const supabase = await createClient();

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { consultants: [], total: 0, totalPages: 0, page: 1 };
  }

  // 역할 확인
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    return { consultants: [], total: 0, totalPages: 0, page: 1 };
  }

  const { page = 1, limit = 10, search = '', industries = [], skills = [] } = params;
  const offset = (page - 1) * limit;

  // admin 클라이언트 사용하여 컨설턴트 프로필 조회
  const adminSupabase = createAdminClient();

  // 기본 쿼리 - CONSULTANT_APPROVED + ACTIVE 사용자
  let query = adminSupabase
    .from('users')
    .select(`
      id,
      name,
      email,
      consultant_profile:consultant_profiles(
        expertise_domains,
        available_industries,
        teaching_levels,
        skill_tags,
        years_of_experience,
        representative_experience
      )
    `, { count: 'exact' })
    .eq('role', 'CONSULTANT_APPROVED')
    .eq('status', 'ACTIVE');

  // 검색 조건 (이름 또는 이메일)
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // 정렬 및 페이지네이션
  const { data: consultants, count, error } = await query
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[fetchConsultantCandidates Error]', error);
    return { consultants: [], total: 0, totalPages: 0, page };
  }

  // 프로필 데이터 정리 및 필터링
  let formattedConsultants: ConsultantCandidate[] = (consultants || []).map((c) => {
    const profile = Array.isArray(c.consultant_profile)
      ? c.consultant_profile[0] || null
      : c.consultant_profile;

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      consultant_profile: profile ? {
        expertise_domains: profile.expertise_domains || [],
        available_industries: profile.available_industries || [],
        teaching_levels: profile.teaching_levels || [],
        skill_tags: profile.skill_tags || [],
        years_of_experience: profile.years_of_experience || 0,
        representative_experience: profile.representative_experience,
      } : null,
    };
  });

  // 클라이언트 측 필터링 (업종, 스킬)
  // 주의: 데이터가 많아지면 DB 레벨 필터링으로 변경 필요
  if (industries.length > 0) {
    formattedConsultants = formattedConsultants.filter((c) =>
      c.consultant_profile?.available_industries.some((i) => industries.includes(i))
    );
  }

  if (skills.length > 0) {
    formattedConsultants = formattedConsultants.filter((c) =>
      c.consultant_profile?.skill_tags.some((s) => skills.includes(s))
    );
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    consultants: formattedConsultants,
    total,
    totalPages,
    page,
  };
}

/**
 * 컨설턴트 필터 옵션 조회 (업종, 스킬 목록)
 */
export async function fetchConsultantFilterOptions(): Promise<{
  industries: string[];
  skills: string[];
}> {
  const adminSupabase = createAdminClient();

  // 활성 컨설턴트(CONSULTANT_APPROVED + ACTIVE)의 프로필에서 업종과 스킬 목록 수집
  const { data: consultants } = await adminSupabase
    .from('users')
    .select(`
      consultant_profile:consultant_profiles(
        available_industries,
        skill_tags
      )
    `)
    .eq('role', 'CONSULTANT_APPROVED')
    .eq('status', 'ACTIVE');

  if (!consultants) {
    return { industries: [], skills: [] };
  }

  const industriesSet = new Set<string>();
  const skillsSet = new Set<string>();

  for (const consultant of consultants) {
    const profile = Array.isArray(consultant.consultant_profile)
      ? consultant.consultant_profile[0]
      : consultant.consultant_profile;

    if (profile) {
      (profile.available_industries || []).forEach((i: string) => industriesSet.add(i));
      (profile.skill_tags || []).forEach((s: string) => skillsSet.add(s));
    }
  }

  return {
    industries: Array.from(industriesSet).sort(),
    skills: Array.from(skillsSet).sort(),
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
