'use server';

import { unstable_cache } from 'next/cache';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getStatusFilterOptions,
  OPS_MANAGER_ROLES,
  type StatusFilterOption,
} from '@/lib/constants/status';
import {
  CACHE_TAG_PROJECT_FILTERS,
  CACHE_TAG_CONSULTANT_FILTERS,
  FILTER_CACHE_TTL_SECONDS,
} from '@/lib/constants/cache';
import { ilikePattern } from '@/lib/utils/postgrest-sanitize';

/** 프로젝트 필터 옵션 반환 타입 */
export interface ProjectFilterOptions {
  statuses: StatusFilterOption[];
  industries: string[];
}

// 캐싱된 업종 목록 조회 (admin 클라이언트 사용)
const getCachedProjectIndustries = unstable_cache(
  async () => {
    const adminSupabase = createAdminClient();
    const { data: industries } = await adminSupabase
      .from('projects')
      .select('industry')
      .not('industry', 'is', null);
    return [...new Set(industries?.map((c) => c.industry) || [])].filter(Boolean);
  },
  ['project-industries'],
  { revalidate: FILTER_CACHE_TTL_SECONDS, tags: [CACHE_TAG_PROJECT_FILTERS] }
);

/**
 * 프로젝트 상태 및 업종 목록 조회
 */
export async function fetchProjectFilters(): Promise<ProjectFilterOptions> {
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES);
  if ('error' in auth) return { statuses: [], industries: [] };

  const statuses = getStatusFilterOptions();
  const industries = await getCachedProjectIndustries();
  return { statuses, industries };
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
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES);
  if ('error' in auth) return { consultants: [], total: 0, totalPages: 0, page: 1 };

  const { page = 1, limit = 10, search = '', industries = [], skills = [] } = params;
  const offset = (page - 1) * limit;

  // admin 클라이언트 사용하여 컨설턴트 프로필 조회
  const adminSupabase = createAdminClient();

  // 기본 쿼리 - CONSULTANT_APPROVED + ACTIVE 사용자
  // 업종/스킬 필터 시 !inner 조인으로 DB 레벨 필터링 적용
  const needsProfileFilter = industries.length > 0 || skills.length > 0;

  let query = adminSupabase
    .from('users')
    .select(`
      id,
      name,
      email,
      consultant_profile:consultant_profiles${needsProfileFilter ? '!inner' : ''}(
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

  // 업종 필터 (DB 레벨)
  if (industries.length > 0) {
    query = query.overlaps('consultant_profiles.available_industries', industries);
  }

  // 스킬 필터 (DB 레벨)
  if (skills.length > 0) {
    query = query.overlaps('consultant_profiles.skill_tags', skills);
  }

  // 검색 조건 (이름 또는 이메일)
  if (search) {
    const p = ilikePattern(search);
    query = query.or(`name.ilike.${p},email.ilike.${p}`);
  }

  // 정렬 및 페이지네이션
  const { data: consultants, count, error } = await query
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[fetchConsultantCandidates Error]', error);
    return { consultants: [], total: 0, totalPages: 0, page };
  }

  // 프로필 데이터 정리
  const formattedConsultants: ConsultantCandidate[] = (consultants || []).map((c) => {
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

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    consultants: formattedConsultants,
    total,
    totalPages,
    page,
  };
}

// 캐싱된 컨설턴트 필터 옵션 조회 (admin 클라이언트 사용)
const getCachedConsultantFilterOptions = unstable_cache(
  async () => {
    const adminSupabase = createAdminClient();
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

    if (!consultants) return { industries: [] as string[], skills: [] as string[] };

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
  },
  ['consultant-filter-options'],
  { revalidate: FILTER_CACHE_TTL_SECONDS, tags: [CACHE_TAG_CONSULTANT_FILTERS] }
);

/**
 * 컨설턴트 필터 옵션 조회 (업종, 스킬 목록)
 */
export async function fetchConsultantFilterOptions(): Promise<{
  industries: string[];
  skills: string[];
}> {
  const auth = await requireAuthWithRole(OPS_MANAGER_ROLES);
  if ('error' in auth) return { industries: [], skills: [] };

  return await getCachedConsultantFilterOptions();
}
