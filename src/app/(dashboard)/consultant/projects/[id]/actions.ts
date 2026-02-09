'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createActivityLogSchema,
  updateActivityLogSchema,
} from '@/lib/schemas/activity-log';
import type { SimpleActionResult } from '@/lib/types/action-result';
import type { ActivityLogType, ManualActivityLogType } from '@/lib/constants/activity-log';
import { ACTIVITY_LOG_PAGE_SIZE } from '@/lib/constants/activity-log';

// ============================================================================
// 타입 정의
// ============================================================================

export interface ActivityLogItem {
  id: string;
  project_id: string;
  consultant_id: string;
  type: ActivityLogType;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogsResult {
  logs: ActivityLogItem[];
  total: number;
}

interface AuthorizedUser {
  id: string;
}

// ============================================================================
// 공통 헬퍼
// ============================================================================

async function verifyConsultantProjectAccess(
  projectId: string,
): Promise<{ user: AuthorizedUser } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: '로그인이 필요합니다.' };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    return { error: '컨설턴트만 접근 가능합니다.' };
  }

  const { data: projectData } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('assigned_consultant_id', user.id)
    .single();

  if (!projectData) {
    return { error: '배정되지 않은 프로젝트입니다.' };
  }

  return { user: { id: user.id } };
}

// ============================================================================
// 활동 일지 조회
// ============================================================================

export async function fetchActivityLogs(
  projectId: string,
  options?: {
    type?: ActivityLogType;
    limit?: number;
    offset?: number;
  },
): Promise<ActivityLogsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { logs: [], total: 0 };
  }

  const limit = options?.limit ?? ACTIVITY_LOG_PAGE_SIZE;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from('consultant_activity_logs')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.type) {
    query = query.eq('type', options.type);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[fetchActivityLogs]', error);
    return { logs: [], total: 0 };
  }

  return {
    logs: (data as ActivityLogItem[]) ?? [],
    total: count ?? 0,
  };
}

// ============================================================================
// 활동 일지 생성
// ============================================================================

export async function createActivityLog(
  projectId: string,
  type: ManualActivityLogType,
  content: string,
): Promise<SimpleActionResult> {
  try {
    const auth = await verifyConsultantProjectAccess(projectId);
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const validation = createActivityLogSchema.safeParse({ type, content });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const adminSupabase = createAdminClient();

    const { error: insertError } = await adminSupabase
      .from('consultant_activity_logs')
      .insert({
        project_id: projectId,
        consultant_id: auth.user.id,
        type: validation.data.type,
        content: validation.data.content,
      });

    if (insertError) {
      console.error('[createActivityLog]', insertError);
      return { success: false, error: '활동 기록 저장에 실패했습니다.' };
    }

    revalidatePath(`/consultant/projects/${projectId}`);
    return { success: true };
  } catch (err) {
    console.error('[createActivityLog] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

// ============================================================================
// 활동 일지 수정
// ============================================================================

export async function updateActivityLog(
  logId: string,
  projectId: string,
  content: string,
): Promise<SimpleActionResult> {
  try {
    const auth = await verifyConsultantProjectAccess(projectId);
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const validation = updateActivityLogSchema.safeParse({ content });
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    const adminSupabase = createAdminClient();

    // 본인의 수동 기록인지 확인
    const { data: log } = await adminSupabase
      .from('consultant_activity_logs')
      .select('id, consultant_id, type')
      .eq('id', logId)
      .single();

    if (!log) {
      return { success: false, error: '해당 기록을 찾을 수 없습니다.' };
    }

    if (log.consultant_id !== auth.user.id) {
      return { success: false, error: '본인의 기록만 수정할 수 있습니다.' };
    }

    if (log.type === 'system_auto') {
      return { success: false, error: '시스템 자동 기록은 수정할 수 없습니다.' };
    }

    const { error: updateError } = await adminSupabase
      .from('consultant_activity_logs')
      .update({ content: validation.data.content })
      .eq('id', logId);

    if (updateError) {
      console.error('[updateActivityLog]', updateError);
      return { success: false, error: '기록 수정에 실패했습니다.' };
    }

    revalidatePath(`/consultant/projects/${projectId}`);
    return { success: true };
  } catch (err) {
    console.error('[updateActivityLog] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

// ============================================================================
// 활동 일지 삭제
// ============================================================================

export async function deleteActivityLog(
  logId: string,
  projectId: string,
): Promise<SimpleActionResult> {
  try {
    const auth = await verifyConsultantProjectAccess(projectId);
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const adminSupabase = createAdminClient();

    // 본인의 수동 기록인지 확인
    const { data: log } = await adminSupabase
      .from('consultant_activity_logs')
      .select('id, consultant_id, type')
      .eq('id', logId)
      .single();

    if (!log) {
      return { success: false, error: '해당 기록을 찾을 수 없습니다.' };
    }

    if (log.consultant_id !== auth.user.id) {
      return { success: false, error: '본인의 기록만 삭제할 수 있습니다.' };
    }

    if (log.type === 'system_auto') {
      return { success: false, error: '시스템 자동 기록은 삭제할 수 없습니다.' };
    }

    const { error: deleteError } = await adminSupabase
      .from('consultant_activity_logs')
      .delete()
      .eq('id', logId);

    if (deleteError) {
      console.error('[deleteActivityLog]', deleteError);
      return { success: false, error: '기록 삭제에 실패했습니다.' };
    }

    revalidatePath(`/consultant/projects/${projectId}`);
    return { success: true };
  } catch (err) {
    console.error('[deleteActivityLog] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}
