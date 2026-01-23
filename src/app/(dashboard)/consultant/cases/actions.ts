'use server';

import { createClient } from '@/lib/supabase/server';

export interface ConsultantCaseListParams {
  search?: string;
  status?: string;
}

export interface ConsultantCaseItem {
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

export interface ConsultantCaseListResult {
  cases: ConsultantCaseItem[];
  total: number;
  consultantName: string;
}

/**
 * 컨설턴트에게 배정된 케이스 목록 조회
 */
export async function fetchConsultantCases(
  params: ConsultantCaseListParams = {}
): Promise<ConsultantCaseListResult> {
  const supabase = await createClient();

  const { search = '', status = '' } = params;

  // 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { cases: [], total: 0, consultantName: '' };
  }

  // 프로필 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    return { cases: [], total: 0, consultantName: '' };
  }

  // 배정된 케이스 목록 조회
  let query = supabase
    .from('cases')
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
      case_assignments!inner(assigned_at, is_current)
    `
    )
    .eq('assigned_consultant_id', user.id)
    .eq('case_assignments.is_current', true);

  // 검색 조건
  if (search) {
    query = query.or(`company_name.ilike.%${search}%,industry.ilike.%${search}%`);
  }

  // 상태 필터
  if (status) {
    query = query.eq('status', status);
  }

  const { data: cases, error } = await query.order('case_assignments.assigned_at', {
    ascending: false,
  });

  if (error) {
    console.error('[fetchConsultantCases Error]', error);
    return { cases: [], total: 0, consultantName: profile.name || '' };
  }

  // 데이터 변환
  const formattedCases: ConsultantCaseItem[] = (cases || []).map((c) => ({
    id: c.id,
    company_name: c.company_name,
    industry: c.industry,
    company_size: c.company_size,
    status: c.status,
    created_at: c.created_at,
    assigned_at: c.case_assignments?.[0]?.assigned_at || null,
    has_interview: Array.isArray(c.interviews) && c.interviews.length > 0,
    has_assessment: Array.isArray(c.self_assessments) && c.self_assessments.length > 0,
  }));

  return {
    cases: formattedCases,
    total: formattedCases.length,
    consultantName: profile.name || '',
  };
}

/**
 * 컨설턴트 케이스 필터 옵션 조회
 */
export async function fetchConsultantCaseFilters(): Promise<{
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
