'use server';

import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAttachmentSignedUrl } from '@/lib/services/notice';
import type { ActionResult } from '@/lib/types/action-result';
import type { UserRole } from '@/types/database';

const VIEW_ROLES: readonly UserRole[] = [
  'CONSULTANT_APPROVED',
  'OPS_ADMIN',
  'SYSTEM_ADMIN',
];

/**
 * 첨부 서명 URL 생성 — 컨설턴트·운영자·시스템관리자 모두 다운로드 가능.
 * Storage RLS 때문에 admin client로 서명 URL을 만들고, 권한은 Server Action 레벨에서 검증한다.
 */
export async function getAttachmentDownloadUrl(
  storagePath: string,
): Promise<ActionResult<{ url: string }>> {
  const auth = await requireAuthWithRole(VIEW_ROLES, {
    authError: '로그인이 필요합니다.',
    roleError: '다운로드 권한이 없습니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };

  if (!storagePath || typeof storagePath !== 'string') {
    return { success: false, error: '파일 경로가 유효하지 않습니다.' };
  }

  const adminClient = createAdminClient();
  const url = await createAttachmentSignedUrl(storagePath, adminClient, 300);
  if (!url) {
    return { success: false, error: '다운로드 링크 생성에 실패했습니다.' };
  }

  return { success: true, data: { url } };
}
