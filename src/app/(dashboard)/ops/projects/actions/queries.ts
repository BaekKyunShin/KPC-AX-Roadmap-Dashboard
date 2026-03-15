'use server';

import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { getWorkflowStepIndex, OPS_MANAGER_ROLES } from '@/lib/constants/status';
import { MILLISECONDS_PER_DAY } from '@/lib/constants/time';

/** Supabase 조인 결과가 배열/단일 객체 모두 가능 — 첫 번째 항목 추출 */
function unwrapJoinResult<T>(value: T | T[]): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
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
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES);
  if ('error' in auth) return { projects: [], total: 0, totalPages: 0, page: 1 };

  const { page = 1, limit = 10, search = '', status = '', industry = '' } = params;
  const offset = (page - 1) * limit;

  // 기본 쿼리
  let query = auth.supabase
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
    assigned_consultant: unwrapJoinResult(p.assigned_consultant),
    created_by_user: unwrapJoinResult(p.created_by_user),
  }));

  return {
    projects: formattedProjects,
    total,
    totalPages,
    page,
  };
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
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES);
  if ('error' in auth) return null;

  // 1. 프로젝트 기본 정보 (선행 필수 — 존재하지 않으면 조기 반환)
  const { data: project, error: projectError } = await auth.supabase
    .from('projects')
    .select('id, company_name, status, created_at')
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    console.error('[fetchProjectTimeline Error]', projectError);
    return null;
  }

  // 2. 나머지 6개 독립 쿼리를 병렬 실행 (8번 DB 왕복 → 2번으로 최적화)
  const [
    { data: selfAssessment },
    { data: matchingRecommendation },
    { data: allAssignments },
    { data: interview },
    { data: roadmapDraft },
    { data: roadmapFinal },
  ] = await Promise.all([
    // 자가진단 정보
    auth.supabase
      .from('self_assessments')
      .select('created_at, scores')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    // 매칭 추천 정보
    auth.supabase
      .from('matching_recommendations')
      .select('created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    // 전체 배정 이력 (타임라인 상세 + 현재 배정 정보 모두 포함)
    auth.supabase
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
      .order('assigned_at', { ascending: false }),
    // 인터뷰 정보
    auth.supabase
      .from('interviews')
      .select('created_at, interview_date')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    // 로드맵 초안 정보
    auth.supabase
      .from('roadmap_versions')
      .select('created_at, version_number')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    // 최종 확정 로드맵 정보
    auth.supabase
      .from('roadmap_versions')
      .select('finalized_at')
      .eq('project_id', projectId)
      .eq('status', 'FINAL')
      .order('finalized_at', { ascending: false })
      .limit(1)
      .single(),
  ]);

  // 현재 배정 정보를 allAssignments에서 추출 (별도 쿼리 제거)
  const assignment = allAssignments?.find((a) => a.is_current) ?? null;

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
        ? `담당: ${(unwrapJoinResult(assignment.consultant) as { name: string })?.name ?? ''}`
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
    consultant: unwrapJoinResult(a.consultant) as { id: string; name: string; email: string } | null,
    assigned_by_user: unwrapJoinResult(a.assigned_by_user) as { id: string; name: string } | null,
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
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES);
  if ('error' in auth) return { projects: [], total: 0, totalPages: 0, page: 1 };

  const { page = 1, limit = 10, search = '', status = '', statuses, industry = '' } = params;
  const offset = (page - 1) * limit;

  let query = auth.supabase
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
      assigned_consultant: unwrapJoinResult(p.assigned_consultant),
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
