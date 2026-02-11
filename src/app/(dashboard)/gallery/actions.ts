'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { revalidatePath } from 'next/cache';
import {
  galleryFiltersSchema,
  toggleLikeSchema,
  toggleShareSchema,
  copyRoadmapSchema,
} from '@/lib/schemas/gallery';
import type { ActionResult } from '@/lib/types/action-result';
import { successResult, errorResult } from '@/lib/types/action-result';

// =============================================================================
// Types
// =============================================================================

export interface GalleryRoadmapItem {
  id: string;
  title: string;
  industry: string;
  companySize: string;
  companyName: string;
  diagnosisSummary: string;
  pblCourseName: string;
  pblTotalHours: number;
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

// =============================================================================
// 갤러리 조회
// =============================================================================

export async function fetchGalleryRoadmaps(params: Record<string, string | undefined> = {}): Promise<
  ActionResult<GalleryRoadmapItem[]>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResult('인증이 필요합니다.');
  }

  // 사용자 역할 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return errorResult('사용자 정보를 찾을 수 없습니다.');
  }

  const parsed = galleryFiltersSchema.safeParse(params);
  if (!parsed.success) {
    return errorResult('잘못된 필터 값입니다.');
  }

  const { search, industry, sort, status, isShared, consultantId } = parsed.data;
  const isAdmin = ['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role);

  // 기본 쿼리: roadmap_versions + projects + users (created_by)
  let query = supabase
    .from('roadmap_versions')
    .select(`
      id,
      status,
      is_shared,
      diagnosis_summary,
      pbl_course,
      version_number,
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
      roadmap_likes (
        id,
        user_id
      )
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

  // 검색
  if (search) {
    query = query.or(
      `diagnosis_summary.ilike.%${search}%,projects.company_name.ilike.%${search}%`
    );
  }

  // 정렬
  if (sort === 'latest') {
    query = query.order('created_at', { ascending: false });
  }
  // popular 정렬은 클라이언트에서 처리 (Supabase에서 count 정렬 복잡)

  const { data, error } = await query;

  if (error) {
    console.error('갤러리 조회 오류:', error);
    return errorResult('갤러리를 불러오는 중 오류가 발생했습니다.');
  }

  // 데이터 변환
  const items: GalleryRoadmapItem[] = (data || []).map((item) => {
    const project = item.projects as unknown as {
      company_name: string;
      industry: string;
      company_size: string;
    };
    const creator = item.users as unknown as { name: string } | null;
    const likes = (item.roadmap_likes || []) as unknown as { id: string; user_id: string }[];

    const pblCourse = item.pbl_course as { course_name?: string; total_hours?: number } | null;

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
      createdBy: item.created_by,
      createdByName: creator?.name || '알 수 없음',
      likeCount: likes.length,
      isLiked: likes.some((l) => l.user_id === user.id),
      isShared: item.is_shared,
      status: item.status,
      createdAt: item.created_at,
    };
  });

  // popular 정렬
  if (sort === 'popular') {
    items.sort((a, b) => b.likeCount - a.likeCount);
  }

  return successResult(items);
}

// =============================================================================
// 상세 조회
// =============================================================================

export async function fetchRoadmapDetail(
  roadmapVersionId: string
): Promise<ActionResult<RoadmapDetailView>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResult('인증이 필요합니다.');
  }

  // 사용자 역할 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return errorResult('사용자 정보를 찾을 수 없습니다.');
  }

  const { data, error } = await supabase
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
      roadmap_likes (
        id,
        user_id
      )
    `)
    .eq('id', roadmapVersionId)
    .single();

  if (error || !data) {
    return errorResult('로드맵을 찾을 수 없습니다.');
  }

  // 권한 체크: 컨설턴트는 공유된 FINAL만 열람 가능
  const isAdmin = ['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role);
  if (!isAdmin && (!data.is_shared || data.status !== 'FINAL')) {
    return errorResult('접근 권한이 없습니다.');
  }

  const project = data.projects as unknown as {
    company_name: string;
    industry: string;
    company_size: string;
  };
  const creator = data.users as unknown as { name: string } | null;
  const likes = (data.roadmap_likes || []) as unknown as { id: string; user_id: string }[];
  const pblCourse = data.pbl_course as { course_name?: string; total_hours?: number } | null;

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
    likeCount: likes.length,
    isLiked: likes.some((l) => l.user_id === user.id),
    isShared: data.is_shared,
    status: data.status,
    versionNumber: data.version_number,
    createdAt: data.created_at,
  });
}

// =============================================================================
// 좋아요 토글
// =============================================================================

export async function toggleLike(
  roadmapVersionId: string
): Promise<ActionResult<{ liked: boolean; count: number }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResult('인증이 필요합니다.');
  }

  const parsed = toggleLikeSchema.safeParse({ roadmapVersionId });
  if (!parsed.success) {
    return errorResult('유효하지 않은 요청입니다.');
  }

  // 기존 좋아요 확인
  const { data: existing } = await supabase
    .from('roadmap_likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('roadmap_version_id', roadmapVersionId)
    .maybeSingle();

  if (existing) {
    // 좋아요 제거
    await supabase
      .from('roadmap_likes')
      .delete()
      .eq('id', existing.id);
  } else {
    // 좋아요 추가
    const { error } = await supabase
      .from('roadmap_likes')
      .insert({ user_id: user.id, roadmap_version_id: roadmapVersionId });

    if (error) {
      console.error('좋아요 추가 오류:', error);
      return errorResult('좋아요 처리 중 오류가 발생했습니다.');
    }
  }

  // 최신 카운트 조회
  const { count } = await supabase
    .from('roadmap_likes')
    .select('id', { count: 'exact', head: true })
    .eq('roadmap_version_id', roadmapVersionId);

  revalidatePath('/gallery');

  return successResult({
    liked: !existing,
    count: count || 0,
  });
}

// =============================================================================
// 공유 토글
// =============================================================================

export async function toggleShare(
  roadmapVersionId: string
): Promise<ActionResult<{ isShared: boolean }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResult('인증이 필요합니다.');
  }

  const parsed = toggleShareSchema.safeParse({ roadmapVersionId });
  if (!parsed.success) {
    return errorResult('유효하지 않은 요청입니다.');
  }

  // 역할 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    return errorResult('컨설턴트만 공유 설정을 변경할 수 있습니다.');
  }

  // 로드맵 버전 확인 (본인 작성 + FINAL만)
  const adminClient = createAdminClient();
  const { data: version } = await adminClient
    .from('roadmap_versions')
    .select('id, is_shared, status, created_by')
    .eq('id', roadmapVersionId)
    .single();

  if (!version) {
    return errorResult('로드맵을 찾을 수 없습니다.');
  }

  if (version.created_by !== user.id) {
    return errorResult('본인이 작성한 로드맵만 공유할 수 있습니다.');
  }

  if (version.status !== 'FINAL') {
    return errorResult('확정된 로드맵만 공유할 수 있습니다.');
  }

  const newShared = !version.is_shared;

  const { error } = await adminClient
    .from('roadmap_versions')
    .update({ is_shared: newShared })
    .eq('id', roadmapVersionId);

  if (error) {
    console.error('공유 토글 오류:', error);
    return errorResult('공유 설정 변경 중 오류가 발생했습니다.');
  }

  revalidatePath('/gallery');

  return successResult({ isShared: newShared });
}

// =============================================================================
// 로드맵 복제 (가져다 쓰기)
// =============================================================================

export async function copyRoadmapToProject(params: {
  sourceRoadmapVersionId: string;
  targetProjectId: string;
}): Promise<ActionResult<{ newVersionId: string; versionNumber: number }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResult('인증이 필요합니다.');
  }

  const parsed = copyRoadmapSchema.safeParse(params);
  if (!parsed.success) {
    return errorResult('유효하지 않은 요청입니다.');
  }

  // 역할 확인
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    return errorResult('컨설턴트만 로드맵을 가져올 수 있습니다.');
  }

  // 대상 프로젝트 배정 확인
  const { data: projectData } = await supabase
    .from('projects')
    .select('id, assigned_consultant_id, company_name')
    .eq('id', params.targetProjectId)
    .single();

  if (!projectData || projectData.assigned_consultant_id !== user.id) {
    return errorResult('배정되지 않은 프로젝트입니다.');
  }

  const adminClient = createAdminClient();

  // 원본 로드맵 조회
  const { data: source } = await adminClient
    .from('roadmap_versions')
    .select(`
      diagnosis_summary,
      roadmap_matrix,
      pbl_course,
      courses,
      projects!inner (company_name)
    `)
    .eq('id', params.sourceRoadmapVersionId)
    .single();

  if (!source) {
    return errorResult('원본 로드맵을 찾을 수 없습니다.');
  }

  // 대상 프로젝트의 다음 버전 번호 계산
  const { data: existingVersions } = await adminClient
    .from('roadmap_versions')
    .select('version_number')
    .eq('project_id', params.targetProjectId)
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersionNumber = existingVersions && existingVersions.length > 0
    ? existingVersions[0].version_number + 1
    : 1;

  const sourceProject = source.projects as unknown as { company_name: string };

  // 새 DRAFT 버전 생성
  const { data: newVersion, error } = await adminClient
    .from('roadmap_versions')
    .insert({
      project_id: params.targetProjectId,
      version_number: nextVersionNumber,
      status: 'DRAFT',
      diagnosis_summary: source.diagnosis_summary,
      roadmap_matrix: source.roadmap_matrix,
      pbl_course: source.pbl_course,
      courses: source.courses,
      revision_prompt: `갤러리에서 가져옴 (원본: ${sourceProject.company_name} 로드맵)`,
      created_by: user.id,
    })
    .select('id, version_number')
    .single();

  if (error || !newVersion) {
    console.error('로드맵 복제 오류:', error);
    return errorResult('로드맵 복제 중 오류가 발생했습니다.');
  }

  // 감사 로그
  await createAuditLog({
    actorUserId: user.id,
    action: 'ROADMAP_COPY',
    targetType: 'roadmap_version',
    targetId: newVersion.id,
    meta: {
      sourceRoadmapVersionId: params.sourceRoadmapVersionId,
      sourceCompany: sourceProject.company_name,
      targetProjectId: params.targetProjectId,
      targetCompany: projectData.company_name,
      newVersionNumber: nextVersionNumber,
    },
  });

  revalidatePath(`/consultant/projects/${params.targetProjectId}/roadmap`);
  revalidatePath('/gallery');

  return successResult({
    newVersionId: newVersion.id,
    versionNumber: newVersion.version_number,
  });
}

// =============================================================================
// 컨설턴트의 담당 프로젝트 목록 (사용하기 다이얼로그용)
// =============================================================================

export interface EligibleProject {
  id: string;
  companyName: string;
  status: string;
}

export async function fetchEligibleProjects(): Promise<ActionResult<EligibleProject[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResult('인증이 필요합니다.');
  }

  // INTERVIEWED 이상 상태인 프로젝트만 (로드맵 생성 가능 상태)
  const eligibleStatuses = ['INTERVIEWED', 'ROADMAP_DRAFTED', 'FINALIZED'];

  const { data, error } = await supabase
    .from('projects')
    .select('id, company_name, status')
    .eq('assigned_consultant_id', user.id)
    .in('status', eligibleStatuses)
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

export interface ConsultantOption {
  id: string;
  name: string;
}

export async function fetchConsultantOptions(): Promise<ActionResult<ConsultantOption[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResult('인증이 필요합니다.');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
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
