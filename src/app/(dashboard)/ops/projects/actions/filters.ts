'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getStatusFilterOptions,
  type StatusFilterOption,
} from '@/lib/constants/status';

/** 프로젝트 필터 옵션 반환 타입 */
export interface ProjectFilterOptions {
  statuses: StatusFilterOption[];
  industries: string[];
}

/**
 * 프로젝트 상태 및 업종 목록 조회
 */
export async function fetchProjectFilters(): Promise<ProjectFilterOptions> {
  const supabase = await createClient();

  // 워크플로우 단계 기반 상태 옵션 (중복 라벨 없음)
  const statuses = getStatusFilterOptions();

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
  const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
  if ('error' in auth) return { consultants: [], total: 0, totalPages: 0, page: 1 };

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
