'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { toggleLikeSchema, toggleShareSchema } from '@/lib/schemas/gallery';
import type { ActionResult } from '@/lib/types/action-result';
import { successResult, errorResult } from '@/lib/types/action-result';
import { requireAuth, requireAuthWithRole } from '@/lib/actions/auth-helpers';

// =============================================================================
// 좋아요 토글
// =============================================================================

export async function toggleLike(
  roadmapVersionId: string
): Promise<ActionResult<{ liked: boolean; count: number }>> {
  const auth = await requireAuth('인증이 필요합니다.');
  if ('error' in auth) return errorResult(auth.error);
  const { user, supabase } = auth;

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
  const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
    authError: '인증이 필요합니다.',
    roleError: '컨설턴트만 공유 설정을 변경할 수 있습니다.',
  });
  if ('error' in auth) return errorResult(auth.error);
  const { user } = auth;

  const parsed = toggleShareSchema.safeParse({ roadmapVersionId });
  if (!parsed.success) {
    return errorResult('유효하지 않은 요청입니다.');
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
