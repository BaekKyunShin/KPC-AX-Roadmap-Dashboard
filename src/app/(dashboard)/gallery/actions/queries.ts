'use server';

import { requireAuth } from '@/lib/actions/auth-helpers';
import { ROADMAP_ELIGIBLE_STATUSES } from '@/lib/constants/status';
import { ilikePattern, sanitizePostgrestFilter } from '@/lib/utils/postgrest-sanitize';
import { createAdminClient } from '@/lib/supabase/admin';
import { galleryFiltersSchema } from '@/lib/schemas/gallery';
import type { ProjectTrack } from '@/lib/constants/tracks';
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

/** fetchGalleryRoadmaps 쿼리 행 타입 (.returns<> 용) */
interface GalleryRoadmapRow {
  id: string;
  status: string;
  is_shared: boolean;
  diagnosis_summary: string;
  pbl_course: { course_name?: string; total_hours?: number } | null;
  courses: { topic?: string }[];
  version_number: number;
  created_at: string;
  created_by: string;
  like_count: number;
  projects: ProjectJoin;
  users: CreatorJoin;
  roadmap_likes: LikeCountAgg;
}

/** fetchRoadmapDetail 쿼리 행 타입 (.returns<> 용) */
interface RoadmapDetailRow extends GalleryRoadmapRow {
  roadmap_matrix: unknown[];
}

/** Supabase aggregate count 결과에서 좋아요 수 추출 */
function extractLikeCount(agg: unknown): number {
  return (agg as LikeCountAgg)?.[0]?.count ?? 0;
}

export interface GalleryRoadmapItem {
  id: string;
  /** 트랙 (ROADMAP/PBL) — 통합 갤러리 표시 시 필요 */
  track: ProjectTrack;
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
  track: 'ROADMAP';
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

/** PBL 갤러리 상세 뷰 */
export interface PBLReportDetailView {
  id: string;
  track: 'PBL';
  title: string;
  industry: string;
  companySize: string;
  companyName: string;
  createdByName: string;
  diagnosisSummary: string;
  /** 전체 PBL 콘텐츠 (양식 2번 Ⅳ장) */
  pblContent: unknown;
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

export interface GalleryPaginatedResult {
  items: GalleryRoadmapItem[];
  total: number;
  totalPages: number;
  page: number;
}

export async function fetchGalleryRoadmaps(
  params: Record<string, string | undefined> = {}
): Promise<ActionResult<GalleryPaginatedResult>> {
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

  const { search, industry, sort, status, isShared, consultantId, scope, page, limit } =
    parsed.data;
  const isAdmin = ['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role);

  // 갤러리 조회는 admin client 사용 (projects RLS가 다른 컨설턴트 프로젝트를 차단하므로)
  // 역할 기반 필터링은 아래 코드에서 수행
  const adminClient = createAdminClient();

  // 기본 쿼리: roadmap_versions + projects + users (created_by)
  let query = adminClient.from('roadmap_versions').select(
    `
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
    `,
    { count: 'exact' }
  );

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

  // 본인 산출물 필터 — scope=mine 일 때 현재 사용자가 작성한 항목만 (H2 — 갤러리 「내 산출물」)
  if (scope === 'mine') {
    query = query.eq('created_by', user.id);
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

  // 페이지네이션
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query.returns<GalleryRoadmapRow[]>();

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
    const project = item.projects;
    const creator = item.users;

    const pblCourse = item.pbl_course;
    const courses = item.courses || [];

    // 태그 추출: 과정 토픽에서 핵심 키워드를 추출 (최대 3개)
    const tags = extractTags(project.industry, courses);

    return {
      id: item.id,
      track: 'ROADMAP' as const,
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

  const total = count ?? 0;
  return successResult({
    items,
    total,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    page,
  });
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

  // 메인 쿼리와 좋아요 확인 쿼리를 병렬 실행 (서로 독립적)
  const [mainResult, likeResult] = await Promise.all([
    adminClient
      .from('roadmap_versions')
      .select(
        `
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
      `
      )
      .eq('id', roadmapVersionId)
      .returns<RoadmapDetailRow[]>()
      .single(),
    adminClient
      .from('roadmap_likes')
      .select('id')
      .eq('roadmap_version_id', roadmapVersionId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const { data, error } = mainResult;
  const { data: userLike } = likeResult;

  if (error || !data) {
    return errorResult('로드맵을 찾을 수 없습니다.');
  }

  // 권한 체크: 컨설턴트는 공유된 FINAL만 열람 가능
  const isAdmin = ['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role);
  if (!isAdmin && (!data.is_shared || data.status !== 'FINAL')) {
    return errorResult('접근 권한이 없습니다.');
  }

  const project = data.projects;
  const creator = data.users;
  const pblCourse = data.pbl_course;

  return successResult({
    id: data.id,
    track: 'ROADMAP' as const,
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
// PBL 갤러리 조회
// =============================================================================

interface GalleryPBLRow {
  id: string;
  status: string;
  is_shared: boolean;
  diagnosis_summary: string;
  pbl_content: Record<string, unknown> | null;
  version_number: number;
  created_at: string;
  created_by: string;
  like_count: number;
  projects: ProjectJoin;
  users: CreatorJoin;
}

type PBLReportDetailRow = GalleryPBLRow;

/**
 * PBL 보고서 갤러리 목록 조회 (fetchGalleryRoadmaps와 평행 구조).
 * 반환 타입은 GalleryRoadmapItem 재사용 (track 필드로 구분).
 */
export async function fetchGalleryPBLReports(
  params: Record<string, string | undefined> = {}
): Promise<ActionResult<GalleryPaginatedResult>> {
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

  const { search, industry, sort, status, isShared, consultantId, scope, page, limit } =
    parsed.data;
  const isAdmin = ['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role);

  const adminClient = createAdminClient();

  let query = adminClient.from('pbl_reports').select(
    `
      id,
      status,
      is_shared,
      diagnosis_summary,
      pbl_content,
      version_number,
      created_at,
      created_by,
      like_count,
      projects!inner (
        company_name,
        industry,
        company_size
      ),
      users!pbl_reports_created_by_fkey (
        name
      )
    `,
    { count: 'exact' }
  );

  if (!isAdmin) {
    query = query.eq('is_shared', true).eq('status', 'FINAL');
  } else {
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

  // 본인 산출물 필터 — scope=mine 일 때 현재 사용자가 작성한 항목만 (H2 — 갤러리 「내 산출물」)
  if (scope === 'mine') {
    query = query.eq('created_by', user.id);
  }

  if (industry) {
    query = query.eq('projects.industry', industry);
  }

  if (search) {
    const sanitized = sanitizePostgrestFilter(search);
    const p = ilikePattern(search);

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

  if (sort === 'latest') {
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'popular') {
    query = query.order('like_count', { ascending: false });
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query.returns<GalleryPBLRow[]>();

  if (error) {
    console.error('[fetchGalleryPBLReports Error]', error);
    return errorResult('PBL 갤러리를 불러오는 중 오류가 발생했습니다.');
  }

  const pblIds = (data || []).map((item) => item.id);
  const { data: userLikes } =
    pblIds.length > 0
      ? await adminClient
          .from('pbl_likes')
          .select('pbl_report_id')
          .eq('user_id', user.id)
          .in('pbl_report_id', pblIds)
      : { data: [] };
  const userLikedSet = new Set((userLikes || []).map((l) => l.pbl_report_id));

  const items: GalleryRoadmapItem[] = (data || []).map((item) => {
    const project = item.projects;
    const creator = item.users;
    const content = (item.pbl_content ?? {}) as Record<string, unknown>;
    const operationPlan = (content.operation_plan ?? {}) as Record<string, unknown>;
    const trainingPlan = (operationPlan.training_plan ?? {}) as Record<string, unknown>;
    const subjectProfile = (trainingPlan.subject_profile ?? {}) as Record<string, unknown>;

    const courseName = (subjectProfile.course_name as string | undefined) ?? '';
    const totalHours = (subjectProfile.total_hours as number | undefined) ?? 0;

    const trainingGoals = Array.isArray(subjectProfile.training_goals)
      ? (subjectProfile.training_goals as string[])
      : [];
    const tags: string[] = [];
    const industryShort = project.industry?.split('/')[0] || '';
    if (industryShort) tags.push(industryShort);
    for (const goal of trainingGoals) {
      if (tags.length >= 3) break;
      const words = goal
        .replace(/[()（）]/g, ' ')
        .split(/[\s,+/·]+/)
        .filter((w) => /^[가-힣]{2,6}$/.test(w));
      for (const w of words) {
        if (tags.length >= 3) break;
        if (!tags.includes(w)) tags.push(w);
      }
    }

    return {
      id: item.id,
      track: 'PBL' as const,
      title: courseName ? `${project.company_name} — ${courseName}` : `${project.company_name} PBL`,
      industry: project.industry || '',
      companySize: project.company_size || '',
      companyName: project.company_name || '',
      diagnosisSummary: item.diagnosis_summary || '',
      pblCourseName: courseName,
      pblTotalHours: totalHours,
      tags,
      createdBy: item.created_by,
      createdByName: creator?.name || '알 수 없음',
      likeCount: item.like_count ?? 0,
      isLiked: userLikedSet.has(item.id),
      isShared: item.is_shared,
      status: item.status,
      createdAt: item.created_at,
    };
  });

  const total = count ?? 0;
  return successResult({
    items,
    total,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    page,
  });
}

/**
 * 통합 갤러리 조회 — track 파라미터에 따라 ROADMAP/PBL/ALL 분기.
 *
 * ALL 일 때는 두 테이블을 **병렬 쿼리 후 TS에서 병합**.
 * SQL UNION은 컬럼 집합이 달라 비실용적(공통 컬럼만 남기면 표시 메타 손실).
 */
export async function fetchGalleryItems(
  params: Record<string, string | undefined> = {}
): Promise<ActionResult<GalleryPaginatedResult>> {
  const parsed = galleryFiltersSchema.safeParse(params);
  if (!parsed.success) {
    return errorResult('잘못된 필터 값입니다.');
  }

  const { track, sort, page, limit } = parsed.data;

  // 단일 트랙이면 단일 테이블 쿼리로 빠르게 처리
  if (track === 'ROADMAP') {
    return fetchGalleryRoadmaps(params);
  }
  if (track === 'PBL') {
    return fetchGalleryPBLReports(params);
  }

  // ALL — 양쪽 테이블을 각각 page*limit 까지(최대 50) 조회 후 TS에서 병합·정렬·페이지네이션.
  // 50은 galleryFiltersSchema.limit.max 한계.
  // page > 4(limit=12 기준)처럼 극단적 깊은 페이지는 이 방식의 한계상 정확도가 떨어질 수 있음 —
  // 트래픽 증가 시 DB 뷰(gallery_items_view) 도입을 Step 12에서 검토.
  const fetchSize = String(Math.min(50, page * limit));
  const mergedParams = { ...params, track: 'ROADMAP', page: '1', limit: fetchSize };
  const pblParams = { ...params, track: 'PBL', page: '1', limit: fetchSize };

  const [roadmapResult, pblResult] = await Promise.all([
    fetchGalleryRoadmaps(mergedParams),
    fetchGalleryPBLReports(pblParams),
  ]);

  if (!roadmapResult.success) return roadmapResult;
  if (!pblResult.success) return pblResult;

  const combined = [...roadmapResult.data.items, ...pblResult.data.items];

  // 정렬
  if (sort === 'popular') {
    combined.sort((a, b) => {
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
      return b.createdAt.localeCompare(a.createdAt);
    });
  } else {
    // latest (기본)
    combined.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const total = roadmapResult.data.total + pblResult.data.total;
  const offset = (page - 1) * limit;
  const paged = combined.slice(offset, offset + limit);

  return successResult({
    items: paged,
    total,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
    page,
  });
}

// =============================================================================
// PBL 상세 조회
// =============================================================================

export async function fetchPBLReportDetail(
  pblReportId: string
): Promise<ActionResult<PBLReportDetailView>> {
  const auth = await requireAuth();
  if ('error' in auth) return errorResult(auth.error);
  const { user, role } = auth;

  if (!role) {
    return errorResult('사용자 정보를 찾을 수 없습니다.');
  }

  const adminClient = createAdminClient();

  const [mainResult, likeResult] = await Promise.all([
    adminClient
      .from('pbl_reports')
      .select(
        `
        id,
        status,
        is_shared,
        version_number,
        diagnosis_summary,
        pbl_content,
        like_count,
        created_at,
        created_by,
        projects!inner (
          company_name,
          industry,
          company_size
        ),
        users!pbl_reports_created_by_fkey (
          name
        )
      `
      )
      .eq('id', pblReportId)
      .returns<PBLReportDetailRow[]>()
      .single(),
    adminClient
      .from('pbl_likes')
      .select('id')
      .eq('pbl_report_id', pblReportId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const { data, error } = mainResult;
  const { data: userLike } = likeResult;

  if (error || !data) {
    return errorResult('PBL 보고서를 찾을 수 없습니다.');
  }

  const isAdmin = ['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role);
  if (!isAdmin && (!data.is_shared || data.status !== 'FINAL')) {
    return errorResult('접근 권한이 없습니다.');
  }

  const project = data.projects;
  const creator = data.users;
  const content = (data.pbl_content ?? {}) as Record<string, unknown>;
  const operationPlan = (content.operation_plan ?? {}) as Record<string, unknown>;
  const trainingPlan = (operationPlan.training_plan ?? {}) as Record<string, unknown>;
  const subjectProfile = (trainingPlan.subject_profile ?? {}) as Record<string, unknown>;
  const courseName = (subjectProfile.course_name as string | undefined) ?? '';

  return successResult({
    id: data.id,
    track: 'PBL' as const,
    title: courseName ? `${project.company_name} — ${courseName}` : `${project.company_name} PBL`,
    industry: project.industry || '',
    companySize: project.company_size || '',
    companyName: project.company_name || '',
    createdByName: creator?.name || '알 수 없음',
    diagnosisSummary: data.diagnosis_summary || '',
    pblContent: data.pbl_content ?? {},
    likeCount: data.like_count ?? 0,
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
