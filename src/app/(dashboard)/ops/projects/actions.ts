'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createProjectSchema, createSelfAssessmentSchema, assignConsultantSchema } from '@/lib/schemas/project';
import { createAuditLog } from '@/lib/services/audit';
import { revalidatePath } from 'next/cache';
import { PROJECT_STALL_THRESHOLDS, ALL_PROJECT_STATUSES, getWorkflowStepIndex } from '@/lib/constants/status';

/** 1일을 밀리초로 환산한 값 */
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

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
  statuses?: string[];
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

  // 사용 중인 상태 목록 (ALL_PROJECT_STATUSES에서 파생)
  const statuses = [...ALL_PROJECT_STATUSES];

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

// ============================================
// 대시보드 통계 관련 함수들
// ============================================

/**
 * 상태별 프로젝트 통계 조회
 */
export interface ProjectStats {
  total: number;
  byStatus: Record<string, number>;
}

export async function fetchProjectStats(): Promise<ProjectStats> {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from('projects')
    .select('status');

  if (error || !projects) {
    console.error('[fetchProjectStats Error]', error);
    return { total: 0, byStatus: {} };
  }

  const byStatus: Record<string, number> = {};
  for (const project of projects) {
    byStatus[project.status] = (byStatus[project.status] || 0) + 1;
  }

  return {
    total: projects.length,
    byStatus,
  };
}

/**
 * 월별 로드맵 확정 현황 조회 (최근 6개월)
 */
export interface MonthlyCompletion {
  month: string; // YYYY-MM
  label: string; // 표시용 (예: "1월")
  count: number;
}

export async function fetchMonthlyCompletions(): Promise<MonthlyCompletion[]> {
  const supabase = await createClient();

  // 최근 6개월 범위 계산
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { data: versions, error } = await supabase
    .from('roadmap_versions')
    .select('finalized_at')
    .eq('status', 'FINAL')
    .not('finalized_at', 'is', null)
    .gte('finalized_at', sixMonthsAgo.toISOString());

  if (error) {
    console.error('[fetchMonthlyCompletions Error]', error);
    return [];
  }

  // 월별 집계
  const monthlyCount: Record<string, number> = {};

  // 최근 6개월 초기화
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyCount[key] = 0;
  }

  // 데이터 집계
  for (const version of versions || []) {
    if (version.finalized_at) {
      const date = new Date(version.finalized_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (key in monthlyCount) {
        monthlyCount[key]++;
      }
    }
  }

  // 결과 변환 (첫 월 + 연도 변경 시점에 연도 표시)
  const entries = Object.entries(monthlyCount);
  let prevYear: string | null = null;

  return entries.map(([month, count], index) => {
    const [year, monthNum] = month.split('-');
    const isFirst = index === 0;
    const yearChanged = prevYear !== null && prevYear !== year;
    const showYear = isFirst || yearChanged;
    prevYear = year;

    return {
      month,
      label: showYear ? `${year.slice(2)}년 ${parseInt(monthNum)}월` : `${parseInt(monthNum)}월`,
      count,
    };
  });
}

/**
 * 컨설턴트별 프로젝트 진행 현황 조회
 */
export interface ConsultantProgress {
  id: string;
  name: string;
  email: string;
  assigned: number; // 배정 대기 (ASSIGNED 상태)
  interviewing: number; // 인터뷰 중 (INTERVIEWED 상태)
  drafting: number; // 로드맵 작업 중 (ROADMAP_DRAFTED 상태)
  completed: number; // 완료 (FINALIZED 상태)
  total: number;
}

export async function fetchConsultantProgress(): Promise<ConsultantProgress[]> {
  const adminSupabase = createAdminClient();

  // 승인된 컨설턴트 목록 조회
  const { data: consultants, error: consultantError } = await adminSupabase
    .from('users')
    .select('id, name, email')
    .eq('role', 'CONSULTANT_APPROVED')
    .eq('status', 'ACTIVE');

  if (consultantError || !consultants) {
    console.error('[fetchConsultantProgress Error]', consultantError);
    return [];
  }

  // 프로젝트별 컨설턴트 배정 현황 조회
  const { data: projects, error: projectError } = await adminSupabase
    .from('projects')
    .select('assigned_consultant_id, status')
    .not('assigned_consultant_id', 'is', null);

  if (projectError) {
    console.error('[fetchConsultantProgress Error]', projectError);
    return [];
  }

  // 컨설턴트별 통계 계산
  const progressMap: Record<string, ConsultantProgress> = {};

  for (const consultant of consultants) {
    progressMap[consultant.id] = {
      id: consultant.id,
      name: consultant.name,
      email: consultant.email,
      assigned: 0,
      interviewing: 0,
      drafting: 0,
      completed: 0,
      total: 0,
    };
  }

  for (const project of projects || []) {
    const consultantId = project.assigned_consultant_id;
    if (consultantId && progressMap[consultantId]) {
      progressMap[consultantId].total++;

      switch (project.status) {
        case 'ASSIGNED':
          progressMap[consultantId].assigned++;
          break;
        case 'INTERVIEWED':
          progressMap[consultantId].interviewing++;
          break;
        case 'ROADMAP_DRAFTED':
          progressMap[consultantId].drafting++;
          break;
        case 'FINALIZED':
          progressMap[consultantId].completed++;
          break;
      }
    }
  }

  // 담당 프로젝트가 있는 컨설턴트만 필터링하고 총합 기준 정렬
  return Object.values(progressMap)
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

/**
 * 정체 프로젝트 조회 (특정 일수 이상 동일 상태 유지)
 */
export interface StalledProject {
  id: string;
  company_name: string;
  contact_email: string;
  status: string;
  days_stalled: number;
  assigned_consultant?: { id: string; name: string } | null;
  severity: 'high' | 'medium'; // 14일 이상: high, 7-13일: medium
}

export async function fetchStalledProjects(minDays: number = 7): Promise<StalledProject[]> {
  const supabase = await createClient();

  // 완료되지 않은 프로젝트 조회
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id,
      company_name,
      contact_email,
      status,
      updated_at,
      assigned_consultant:users!projects_assigned_consultant_id_fkey(id, name)
    `)
    .neq('status', 'FINALIZED');

  if (error || !projects) {
    console.error('[fetchStalledProjects Error]', error);
    return [];
  }

  const now = new Date();
  const stalledProjects: StalledProject[] = [];

  for (const project of projects) {
    const updatedAt = new Date(project.updated_at);
    const daysDiff = Math.floor((now.getTime() - updatedAt.getTime()) / MILLISECONDS_PER_DAY);

    if (daysDiff >= minDays) {
      stalledProjects.push({
        id: project.id,
        company_name: project.company_name,
        contact_email: project.contact_email,
        status: project.status,
        days_stalled: daysDiff,
        assigned_consultant: Array.isArray(project.assigned_consultant)
          ? project.assigned_consultant[0] || null
          : project.assigned_consultant,
        severity: daysDiff >= PROJECT_STALL_THRESHOLDS.SEVERE ? 'high' : 'medium',
      });
    }
  }

  // 정체 일수 기준 내림차순 정렬
  return stalledProjects.sort((a, b) => b.days_stalled - a.days_stalled);
}

/**
 * 프로젝트 타임라인 조회 (단계별 날짜)
 */
export interface ProjectTimelineStep {
  step: string;
  label: string;
  date: string | null;
  detail?: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface ProjectAssignmentHistory {
  id: string;
  consultant: { id: string; name: string; email: string } | null;
  assigned_by_user: { id: string; name: string } | null;
  assignment_reason: string;
  is_current: boolean;
  assigned_at: string;
  unassigned_at: string | null;
  unassignment_reason: string | null;
}

export interface ProjectTimeline {
  projectId: string;
  companyName: string;
  currentStatus: string;
  steps: ProjectTimelineStep[];
  assignments: ProjectAssignmentHistory[];
}

export async function fetchProjectTimeline(projectId: string): Promise<ProjectTimeline | null> {
  const supabase = await createClient();

  // 프로젝트 기본 정보
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, company_name, status, created_at')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    console.error('[fetchProjectTimeline Error]', projectError);
    return null;
  }

  // 자가진단 정보
  const { data: selfAssessment } = await supabase
    .from('self_assessments')
    .select('created_at, scores')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 매칭 추천 정보
  const { data: matchingRecommendation } = await supabase
    .from('matching_recommendations')
    .select('created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 현재 배정 정보 (타임라인 단계용)
  const { data: assignment } = await supabase
    .from('project_assignments')
    .select('assigned_at, consultant:users!project_assignments_consultant_id_fkey(name)')
    .eq('project_id', projectId)
    .eq('is_current', true)
    .single();

  // 전체 배정 이력 (타임라인 상세 표시용)
  const { data: allAssignments } = await supabase
    .from('project_assignments')
    .select(`
      id,
      assignment_reason,
      is_current,
      assigned_at,
      unassigned_at,
      unassignment_reason,
      consultant:users!project_assignments_consultant_id_fkey(id, name, email),
      assigned_by_user:users!project_assignments_assigned_by_fkey(id, name)
    `)
    .eq('project_id', projectId)
    .order('assigned_at', { ascending: false });

  // 인터뷰 정보
  const { data: interview } = await supabase
    .from('interviews')
    .select('created_at, interview_date')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 로드맵 정보
  const { data: roadmapDraft } = await supabase
    .from('roadmap_versions')
    .select('created_at, version_number')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // 최종 확정 로드맵 정보
  const { data: roadmapFinal } = await supabase
    .from('roadmap_versions')
    .select('finalized_at')
    .eq('project_id', projectId)
    .eq('status', 'FINAL')
    .order('finalized_at', { ascending: false })
    .limit(1)
    .single();

  // 워크플로우 단계 인덱스 (DIAGNOSED와 MATCH_RECOMMENDED는 같은 단계)
  const currentStepIndex = getWorkflowStepIndex(project.status);

  // 타임라인 구성 (6단계 - 워크플로우 기준)
  // - isCompleted: 해당 단계까지 완료됨 (currentStepIndex >= stepIndex)
  // - isCurrent: 다음에 해야 할 단계 (currentStepIndex + 1 === stepIndex)
  //   예) status가 ASSIGNED(2)면 → INTERVIEWED(3)가 current
  //   예) status가 FINALIZED(5)면 → 모든 단계 완료, current 없음
  const steps: ProjectTimelineStep[] = [
    {
      step: 'NEW',
      label: '신규 프로젝트 생성',
      date: project.created_at,
      isCompleted: currentStepIndex >= 0,
      isCurrent: currentStepIndex + 1 === 0, // 항상 false (이전 단계가 없음)
    },
    {
      step: 'DIAGNOSED',
      label: '자가진단결과 입력',
      date: selfAssessment?.created_at || matchingRecommendation?.created_at || null,
      detail: selfAssessment?.scores?.total_score
        ? `총점: ${Math.round(selfAssessment.scores.total_score)}점`
        : undefined,
      isCompleted: currentStepIndex >= 1,
      isCurrent: currentStepIndex + 1 === 1, // NEW(0)일 때 current
    },
    {
      step: 'ASSIGNED',
      label: '컨설턴트 배정',
      date: assignment?.assigned_at || null,
      detail: assignment?.consultant
        ? `담당: ${Array.isArray(assignment.consultant)
            ? (assignment.consultant[0] as { name: string })?.name ?? ''
            : (assignment.consultant as { name: string }).name}`
        : undefined,
      isCompleted: currentStepIndex >= 2,
      isCurrent: currentStepIndex + 1 === 2, // DIAGNOSED(1)일 때 current
    },
    {
      step: 'INTERVIEWED',
      label: '현장 인터뷰',
      date: interview?.created_at || null,
      detail: interview?.interview_date
        ? `인터뷰 일자: ${new Date(interview.interview_date).toLocaleDateString('ko-KR')}`
        : undefined,
      isCompleted: currentStepIndex >= 3,
      isCurrent: currentStepIndex + 1 === 3, // ASSIGNED(2)일 때 current
    },
    {
      step: 'ROADMAP_DRAFTED',
      label: '로드맵 초안 생성',
      date: roadmapDraft?.created_at || null,
      detail: roadmapDraft?.version_number
        ? `버전 ${roadmapDraft.version_number}`
        : undefined,
      isCompleted: currentStepIndex >= 4,
      isCurrent: currentStepIndex + 1 === 4, // INTERVIEWED(3)일 때 current
    },
    {
      step: 'FINALIZED',
      label: '로드맵 최종 확정',
      date: roadmapFinal?.finalized_at || null,
      isCompleted: currentStepIndex >= 5,
      isCurrent: currentStepIndex + 1 === 5, // ROADMAP_DRAFTED(4)일 때 current
    },
  ];

  // 배정 이력 데이터 변환
  const assignments: ProjectAssignmentHistory[] = (allAssignments || []).map((a) => ({
    id: a.id,
    consultant: Array.isArray(a.consultant)
      ? (a.consultant[0] as { id: string; name: string; email: string } | null)
      : (a.consultant as { id: string; name: string; email: string } | null),
    assigned_by_user: Array.isArray(a.assigned_by_user)
      ? (a.assigned_by_user[0] as { id: string; name: string } | null)
      : (a.assigned_by_user as { id: string; name: string } | null),
    assignment_reason: a.assignment_reason,
    is_current: a.is_current,
    assigned_at: a.assigned_at,
    unassigned_at: a.unassigned_at,
    unassignment_reason: a.unassignment_reason,
  }));

  return {
    projectId: project.id,
    companyName: project.company_name,
    currentStatus: project.status,
    steps,
    assignments,
  };
}

/**
 * 프로젝트 목록 조회 (타임라인 포함) - 대시보드용
 */
export interface ProjectWithTimeline {
  id: string;
  company_name: string;
  industry: string;
  status: string;
  created_at: string;
  updated_at: string;
  contact_email: string;
  assigned_consultant?: { id: string; name: string; email: string } | null;
  days_in_current_status: number;
}

export async function fetchProjectsWithTimeline(params: ProjectListParams = {}): Promise<{
  projects: ProjectWithTimeline[];
  total: number;
  totalPages: number;
  page: number;
}> {
  const supabase = await createClient();

  const { page = 1, limit = 10, search = '', status = '', statuses, industry = '' } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('projects')
    .select(`
      id,
      company_name,
      industry,
      status,
      created_at,
      updated_at,
      contact_email,
      assigned_consultant:users!projects_assigned_consultant_id_fkey(id, name, email)
    `, { count: 'exact' });

  if (search) {
    query = query.or(`company_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
  }

  // 다중 상태 필터링 (statuses 배열 우선, 없으면 단일 status)
  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  } else if (status) {
    query = query.eq('status', status);
  }

  if (industry) {
    query = query.eq('industry', industry);
  }

  const { data: projects, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[fetchProjectsWithTimeline Error]', error);
    return { projects: [], total: 0, totalPages: 0, page };
  }

  const now = new Date();

  const formattedProjects: ProjectWithTimeline[] = (projects || []).map((p) => {
    const updatedAt = new Date(p.updated_at);
    const daysInCurrentStatus = Math.floor((now.getTime() - updatedAt.getTime()) / MILLISECONDS_PER_DAY);

    return {
      id: p.id,
      company_name: p.company_name,
      industry: p.industry,
      status: p.status,
      created_at: p.created_at,
      updated_at: p.updated_at,
      contact_email: p.contact_email,
      assigned_consultant: Array.isArray(p.assigned_consultant)
        ? p.assigned_consultant[0] || null
        : p.assigned_consultant,
      days_in_current_status: daysInCurrentStatus,
    };
  });

  return {
    projects: formattedProjects,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
    page,
  };
}
