'use server';

import { requireAuth } from '@/lib/actions/auth-helpers';
import { ilikePattern } from '@/lib/utils/postgrest-sanitize';

export interface ConsultantProjectListParams {
  search?: string;
  status?: string;
}

export interface ConsultantProjectItem {
  id: string;
  company_name: string;
  industry: string;
  company_size: string;
  status: string;
  created_at: string;
  assigned_at: string | null;
  has_interview: boolean;
  has_assessment: boolean;
}

export interface ConsultantProjectListResult {
  projects: ConsultantProjectItem[];
  total: number;
  consultantName: string;
}

/**
 * 컨설턴트의 담당 프로젝트 목록 조회
 */
export async function fetchConsultantProjects(
  params: ConsultantProjectListParams = {}
): Promise<ConsultantProjectListResult> {
  const auth = await requireAuth();
  if ('error' in auth) return { projects: [], total: 0, consultantName: '' };
  const { user, supabase, role } = auth;

  if (role !== 'CONSULTANT_APPROVED') {
    return { projects: [], total: 0, consultantName: '' };
  }

  const { search = '', status = '' } = params;

  // 컨설턴트 이름 + 담당 프로젝트 목록 병렬 조회
  let projectsQuery = supabase
    .from('projects')
    .select(
      `
      id,
      company_name,
      industry,
      company_size,
      status,
      created_at,
      self_assessments(id),
      interviews(id),
      project_assignments!inner(assigned_at, is_current)
    `
    )
    .eq('assigned_consultant_id', user.id)
    .eq('project_assignments.is_current', true);

  // 검색 조건
  if (search) {
    const p = ilikePattern(search);
    projectsQuery = projectsQuery.or(`company_name.ilike.${p},industry.ilike.${p}`);
  }

  // 상태 필터
  if (status) {
    projectsQuery = projectsQuery.eq('status', status);
  }

  // Supabase에서는 관계 테이블의 컬럼으로 직접 정렬할 수 없으므로 created_at 사용
  const [profileResult, projectsResult] = await Promise.all([
    supabase.from('users').select('name').eq('id', user.id).single(),
    projectsQuery.order('created_at', { ascending: false }),
  ]);

  const { data: profile } = profileResult;
  const { data: projectsData, error } = projectsResult;

  if (error) {
    console.error('[fetchConsultantProjects Error]', error);
    return { projects: [], total: 0, consultantName: profile?.name || '' };
  }

  // 데이터 변환
  const formattedProjects: ConsultantProjectItem[] = (projectsData || []).map((p) => ({
    id: p.id,
    company_name: p.company_name,
    industry: p.industry,
    company_size: p.company_size,
    status: p.status,
    created_at: p.created_at,
    assigned_at: p.project_assignments?.[0]?.assigned_at || null,
    has_interview: Array.isArray(p.interviews) && p.interviews.length > 0,
    has_assessment: Array.isArray(p.self_assessments) && p.self_assessments.length > 0,
  }));

  return {
    projects: formattedProjects,
    total: formattedProjects.length,
    consultantName: profile?.name || '',
  };
}

/**
 * 컨설턴트 프로젝트 필터 옵션 조회
 */
export async function fetchConsultantProjectFilters(): Promise<{
  statuses: { value: string; label: string }[];
}> {
  return {
    statuses: [
      { value: 'ASSIGNED', label: '인터뷰 필요' },
      { value: 'INTERVIEWED', label: '인터뷰 완료' },
      { value: 'ROADMAP_DRAFTED', label: '로드맵 초안' },
      { value: 'FINALIZED', label: '완료' },
    ],
  };
}
