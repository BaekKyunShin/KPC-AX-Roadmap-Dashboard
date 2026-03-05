'use server';

import crypto from 'crypto';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';

import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { createAssessmentTokenSchema } from '@/lib/schemas/assessment-token';
import { createAuditLog } from '@/lib/services/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/lib/types/action-result';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface AssessmentTokenResult {
  token: string;
  url: string;
  expiresAt: string;
}

/**
 * 진단 링크 토큰 생성 (OPS_ADMIN용)
 * - 프로젝트 상태가 NEW일 때만 허용
 * - 기존 미사용 토큰은 무효화
 */
export async function createAssessmentToken(
  formData: FormData
): Promise<ActionResult<AssessmentTokenResult>> {
  const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN'], {
    authError: '인증되지 않은 사용자입니다.',
  });
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;

  const rawData = {
    project_id: formData.get('project_id') as string,
    expires_in_days: formData.get('expires_in_days') as string,
  };

  const validation = createAssessmentTokenSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  const { project_id, expires_in_days } = validation.data;
  const adminSupabase = createAdminClient();

  // 프로젝트 상태 확인 (NEW만 허용)
  const { data: project } = await adminSupabase
    .from('projects')
    .select('id, status, company_name')
    .eq('id', project_id)
    .single();

  if (!project) {
    return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
  }

  if (project.status !== 'NEW') {
    return {
      success: false,
      error: '진단 링크는 NEW 상태의 프로젝트에서만 생성할 수 있습니다.',
    };
  }

  // 기존 미사용 토큰 무효화
  await adminSupabase
    .from('assessment_tokens')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('project_id', project_id)
    .eq('is_used', false);

  // 새 토큰 생성
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(
    Date.now() + expires_in_days * MS_PER_DAY
  ).toISOString();

  const { error: insertError } = await adminSupabase
    .from('assessment_tokens')
    .insert({
      token,
      project_id,
      expires_at: expiresAt,
      created_by: user.id,
    });

  if (insertError) {
    console.error(
      '[createAssessmentToken] Supabase error:',
      insertError.message
    );
    return { success: false, error: '진단 링크 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = `${appUrl}/assessment/${token}`;

  after(async () => {
    await createAuditLog({
      actorUserId: user.id,
      action: 'ASSESSMENT_TOKEN_CREATE',
      targetType: 'assessment_token',
      targetId: project_id,
      meta: { expires_in_days, company_name: project.company_name },
    });
  });

  revalidatePath(`/ops/projects/${project_id}`);

  return {
    success: true,
    data: { token, url, expiresAt },
  };
}

export interface LatestTokenInfo {
  id: string;
  token: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt: string | null;
  createdAt: string;
}

/**
 * 프로젝트의 최신 토큰 조회 (OPS_ADMIN용)
 */
export async function getLatestToken(
  projectId: string
): Promise<LatestTokenInfo | null> {
  const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
  if ('error' in auth) return null;

  const adminSupabase = createAdminClient();

  const { data } = await adminSupabase
    .from('assessment_tokens')
    .select('id, token, expires_at, is_used, used_at, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    token: data.token,
    expiresAt: data.expires_at,
    isUsed: data.is_used,
    usedAt: data.used_at,
    createdAt: data.created_at,
  };
}
