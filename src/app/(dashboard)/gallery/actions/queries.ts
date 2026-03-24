'use server';

import { requireAuth } from '@/lib/actions/auth-helpers';
import { ROADMAP_ELIGIBLE_STATUSES } from '@/lib/constants/status';
import { ilikePattern, sanitizePostgrestFilter } from '@/lib/utils/postgrest-sanitize';
import { createAdminClient } from '@/lib/supabase/admin';
import { galleryFiltersSchema } from '@/lib/schemas/gallery';
import type { ActionResult } from '@/lib/types/action-result';
import { successResult, errorResult } from '@/lib/types/action-result';
import { extractTags } from './gallery-utils';

// =============================================================================
// Types
// =============================================================================

// ─── Supabase 조인 결과 타입 ────────────────────────────────
type ProjectJoin = { company_name: string; industry: string; company_size: string };
type CreatorJoin = { name: string } | null;
type LikeCountAgg = { count: number }[];

/** Supabase aggregate count 결과에서 좋아요 수 추출 */
function extractLikeCount(agg: unknown): number {
  return (agg as LikeCountAgg)?.[0]?.count ?? 0;
}

export interface GalleryRoadmapItem {
  id: string;
  title: string;
  industry: string;
  companySize: string;
  companyName: string;
  diagnosisSummary: string;
  pblCourseName: string;
  pblTotalHours: number;
  tags: string[];
  createdBy: string;
  createdByName: string;
  likeCount: number;
  isLiked: boolean;
  isShared: boolean;
  status: string;
  createdAt: string;
}

export interface RoadmapDetailView {
  id: string;
  title: string;
  industry: string;
  companySize: string;
  companyName: string;
  createdByName: string;
  diagnosisSummary: string;
  roadmapMatrix: unknown[];
  pblCourse: unknown;
  courses: unknown[];
  likeCount: number;
  isLiked: boolean;
  isShared: boolean;
  status: string;
  versionNumber: number;
  createdAt: string;
}

export interface EligibleProject {
  id: string;
  companyName: string;
  status: string;
}

export interface ConsultantOption {
  id: string;
  name: string;
}

// =============================================================================
// 갤러리 조회
// =============================================================================

export async function fetchGalleryRoadmaps(params: Record<string, string | undefined> = {}): Promise<
  ActionResult<GalleryRoadmapItem[]>
> {
  const auth = await requireAuth();
  if ('error' in auth) return errorResult(auth.error);
  const { user, role } = auth;

  if (!role) {
    return errorResult('사용자 정보를 찾을 수 없습니다.');
  }

  const parsed = galleryFiltersSchema.safeParse(params);
  if (!parsed.success) {
    return errorResult('잘못된 필터 값입니다.');
  }

  const { search, industry, sort, status, isShared, consultantId } = parsed.data;
  const isAdmin = ['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role);

  // 갤러리 조회는 admin client 사용 (projects RLS가 다른 컨설턴트 프로젝트를 차단하므로)
  // 역할 기반 필터링은 아래 코드에서 수행
  const adminClient = createAdminClient();

  // 기본 쿼리: roadmap_versions + projects + users (created_by)
  let query = adminClient
    .from('roadmap_versions')
    .select(`
      id,
      status,
      is_shared,
      diagnosis_summary,
      pbl_course,
      courses,
      version_number,
      created_at,
      created_by,
      like_count,
      projects!inner (
        company_name,
        industry,
        company_size
      ),
      users!roadmap_versions_created_by_fkey (
        name
      ),
      roadmap_likes(count)
    `);

  // 컨설턴트: 공유된 FINAL만
  if (!isAdmin) {
    query = query.eq('is_shared', true).eq('status', 'FINAL');
  } else {
    // 관리자: 필터 적용
    if (status) {
      query = query.eq('status', status);
    }
    if (isShared === 'true') {
      query = query.eq('is_shared', true);
    } else if (isShared === 'false') {
      query = query.eq('is_shared', false);
    }
    if (consultantId) {
      query = query.eq('created_by', consultantId);
    }
  }

  // 업종 필터
  if (industry) {
    query = query.eq('projects.industry', industry);
  }

  // 검색 (2단계 쿼리: foreign table 컬럼은 .or()에서 참조 불가 — PGRST100)
  if (search) {
    const sanitized = sanitizePostgrestFilter(search);
    const p = ilikePattern(search);

    // 1단계: projects 테이블에서 company_name 매칭 id 조회
    const { data: matchedProjects } = await adminClient
      .from('projects')
      .select('id')
      .ilike('company_name', `%${sanitized}%`);

    const ids = (matchedProjects ?? []).map((r) => r.id);

    if (ids.length > 0) {
      query = query.or(`diagnosis_summary.ilike.${p},project_id.in.(${ids.join(',')})`);
    } else {
      query = query.ilike('diagnosis_summary', p);
    }
  }

  // 정렬
  if (sort === 'latest') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'popular') {
    query = query.order('like_count', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error('[fetchGalleryRoadmaps Error]', error);
    return errorResult('갤러리를 불러오는 중 오류가 발생했습니다.');
  }

  // 현재 사용자가 좋아요한 로드맵 ID를 일괄 조회
  const roadmapIds = (data || []).map((item) => item.id);
  const { data: userLikes } =
    roadmapIds.length > 0
      ? await adminClient
          .from('roadmap_likes')
          .select('roadmap_version_id')
          .eq('user_id', user.id)
          .in('roadmap_version_id', roadmapIds)
      : { data: [] };
  const userLikedSet = new Set((userLikes || []).map((l) => l.roadmap_version_id));

  // 데이터 변환
  const items: GalleryRoadmapItem[] = (data || []).map((item) => {
    const project = item.projects as unknown as ProjectJoin;
    const creator = item.users as unknown as CreatorJoin;

    const pblCourse = item.pbl_course as { course_name?: string; total_hours?: number } | null;
    const courses = (item.courses || []) as { topic?: string }[];

    // 태그 추출: 과정 토픽에서 핵심 키워드를 추출 (최대 3개)
    const tags = extractTags(project.industry, courses);

    return {
      id: item.id,
      title: pblCourse?.course_name
        ? `${project.company_name} — ${pblCourse.course_name}`
        : `${project.company_name} 로드맵`,
      industry: project.industry || '',
      companySize: project.company_size || '',
      companyName: project.company_name || '',
      diagnosisSummary: item.diagnosis_summary || '',
      pblCourseName: pblCourse?.course_name || '',
      pblTotalHours: pblCourse?.total_hours || 0,
      tags,
      createdBy: item.created_by,
      createdByName: creator?.name || '알 수 없음',
      likeCount: extractLikeCount(item.roadmap_likes),
      isLiked: userLikedSet.has(item.id),
      isShared: item.is_shared,
      status: item.status,
      createdAt: item.created_at,
    };
  });

  return successResult(items);
}

// =============================================================================
// 상세 조회
// =============================================================================

export async function fetchRoadmapDetail(
  roadmapVersionId: string
): Promise<ActionResult<RoadmapDetailView>> {
  const auth = await requireAuth();
  if ('error' in auth) return errorResult(auth.error);
  const { user, role } = auth;

  if (!role) {
    return errorResult('사용자 정보를 찾을 수 없습니다.');
  }

  // 갤러리 상세도 admin client 사용 (projects RLS 우회)
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('roadmap_versions')
    .select(`
      id,
      status,
      is_shared,
      version_number,
      diagnosis_summary,
      roadmap_matrix,
      pbl_course,
      courses,
      created_at,
      created_by,
      projects!inner (
        company_name,
        industry,
        company_size
      ),
      users!roadmap_versions_created_by_fkey (
        name
      ),
      roadmap_likes(count)
    `)
    .eq('id', roadmapVersionId)
    .single();

  if (error || !data) {
    return errorResult('로드맵을 찾을 수 없습니다.');
  }

  // 권한 체크: 컨설턴트는 공유된 FINAL만 열람 가능
  const isAdmin = ['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role);
  if (!isAdmin && (!data.is_shared || data.status !== 'FINAL')) {
    return errorResult('접근 권한이 없습니다.');
  }

  const project = data.projects as unknown as ProjectJoin;
  const creator = data.users as unknown as CreatorJoin;
  const pblCourse = data.pbl_course as { course_name?: string; total_hours?: number } | null;

  // 현재 사용자가 이 로드맵에 좋아요했는지 확인
  const { data: userLike } = await adminClient
    .from('roadmap_likes')
    .select('id')
    .eq('roadmap_version_id', roadmapVersionId)
    .eq('user_id', user.id)
    .maybeSingle();

  return successResult({
    id: data.id,
    title: pblCourse?.course_name
      ? `${project.company_name} — ${pblCourse.course_name}`
      : `${project.company_name} 로드맵`,
    industry: project.industry || '',
    companySize: project.company_size || '',
    companyName: project.company_name || '',
    createdByName: creator?.name || '알 수 없음',
    diagnosisSummary: data.diagnosis_summary || '',
    roadmapMatrix: (data.roadmap_matrix as unknown[]) || [],
    pblCourse: data.pbl_course || {},
    courses: (data.courses as unknown[]) || [],
    likeCount: extractLikeCount(data.roadmap_likes),
    isLiked: !!userLike,
    isShared: data.is_shared,
    status: data.status,
    versionNumber: data.version_number,
    createdAt: data.created_at,
  });
}

// =============================================================================
// 컨설턴트의 담당 프로젝트 목록 (사용하기 다이얼로그용)
// =============================================================================

export async function fetchEligibleProjects(): Promise<ActionResult<EligibleProject[]>> {
  const auth = await requireAuth();
  if ('error' in auth) return errorResult(auth.error);
  const { user, supabase } = auth;

  // INTERVIEWED 이상 상태인 프로젝트만 (로드맵 생성 가능 상태)
  const { data, error } = await supabase
    .from('projects')
    .select('id, company_name, status')
    .eq('assigned_consultant_id', user.id)
    .in('status', [...ROADMAP_ELIGIBLE_STATUSES])
    .order('company_name');

  if (error) {
    return errorResult('프로젝트 목록을 불러오는 중 오류가 발생했습니다.');
  }

  return successResult(
    (data || []).map((p) => ({
      id: p.id,
      companyName: p.company_name,
      status: p.status,
    }))
  );
}

// =============================================================================
// 관리자용: 컨설턴트 목록 (필터용)
// =============================================================================

export async function fetchConsultantOptions(): Promise<ActionResult<ConsultantOption[]>> {
  const auth = await requireAuth();
  if ('error' in auth) return errorResult(auth.error);
  const { supabase, role } = auth;

  if (!role || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
    return errorResult('관리자만 접근할 수 있습니다.');
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'CONSULTANT_APPROVED')
    .order('name');

  if (error) {
    return errorResult('컨설턴트 목록을 불러오는 중 오류가 발생했습니다.');
  }

  return successResult(
    (data || []).map((u) => ({
      id: u.id,
      name: u.name,
    }))
  );
}
