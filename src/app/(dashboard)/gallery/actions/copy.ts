'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { revalidatePath } from 'next/cache';
import { copyRoadmapSchema } from '@/lib/schemas/gallery';
import type { ActionResult } from '@/lib/types/action-result';
import { successResult, errorResult } from '@/lib/types/action-result';

// =============================================================================
// Helpers
// =============================================================================

/** 과정 토픽에서 핵심 키워드 태그를 추출 (최대 3개) */
export function extractTags(industry: string, courses: { topic?: string }[]): string[] {
  // 업종에서 슬래시 앞부분만 추출 (예: "의료/헬스케어" → "의료")
  const industryShort = industry?.split('/')[0] || '';

  // 과정 토픽에서 핵심 키워드 추출
  const topicKeywords: string[] = [];
  for (const course of courses) {
    if (!course.topic) continue;
    // 긴 토픽에서 핵심 명사구 추출 (2~6자 한국어 단어)
    const words = course.topic
      .replace(/[()（）]/g, ' ')
      .split(/[\s,+/·]+/)
      .filter((w) => /^[가-힣]{2,6}$/.test(w))
      .filter((w) => !['기초', '개론', '활용', '이해', '실습', '실전', '입문', '기반'].includes(w));
    topicKeywords.push(...words);
  }

  // 중복 제거 후 빈도 높은 순 + 업종 태그 합산
  const freq = new Map<string, number>();
  for (const kw of topicKeywords) {
    freq.set(kw, (freq.get(kw) || 0) + 1);
  }
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const tags: string[] = industryShort ? [industryShort] : [];
  for (const [kw] of sorted) {
    if (tags.length >= 3) break;
    if (!tags.includes(kw)) tags.push(kw);
  }
  return tags;
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
