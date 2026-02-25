'use server';

import { after } from 'next/server';
import { requireAuth, requireAuthWithRole, requireConsultantRoadmapAccess } from '@/lib/actions/auth-helpers';
import { ROADMAP_ELIGIBLE_STATUSES } from '@/lib/constants/status';
import {
  generateRoadmap,
  finalizeRoadmap,
  fetchRoadmapVersions as fetchRoadmapVersionsService,
  fetchRoadmapVersion as fetchRoadmapVersionService,
  updateRoadmapManually,
  type RoadmapRow,
  type PBLCourse,
  type RoadmapCell,
} from '@/lib/services/roadmap';
import { insertSystemActivityLog } from '@/lib/services/activity-log';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { registerAbort, cancelAbort, cleanupAbort } from '@/lib/services/abort-registry';
import { createRoadmapInputSchema, editRoadmapUpdatesSchema } from '@/lib/schemas/roadmap';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';

/** abort 레지스트리 키 생성 */
function abortKey(userId: string) { return `roadmap:${userId}`; }

/**
 * 로드맵 생성
 */
export async function createRoadmap(
  projectId: string,
  revisionPrompt?: string
): Promise<ActionResult<Record<string, unknown>>> {
  try {
    // Zod 입력 검증
    const parsed = createRoadmapInputSchema.safeParse({ projectId, revisionPrompt });
    if (!parsed.success) {
      return { success: false, error: '입력 데이터가 올바르지 않습니다.' };
    }

    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 로드맵을 생성할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    // 프로젝트 접근 권한 확인
    const { data: projectData } = await supabase
      .from('projects')
      .select('assigned_consultant_id, status')
      .eq('id', parsed.data.projectId)
      .single();

    if (!projectData || projectData.assigned_consultant_id !== user.id) {
      return { success: false, error: '해당 프로젝트에 대한 접근 권한이 없습니다.' };
    }

    if (!ROADMAP_ELIGIBLE_STATUSES.includes(projectData.status)) {
      return { success: false, error: '인터뷰가 완료된 프로젝트만 로드맵을 생성할 수 있습니다.' };
    }

    // 취소 가능하도록 AbortController 등록
    const abortController = registerAbort(abortKey(user.id));

    try {
      // 로드맵 생성 (검증된 데이터 사용)
      const { roadmapId, result, validation } = await generateRoadmap(
        parsed.data.projectId,
        user.id,
        parsed.data.revisionPrompt,
        false,
        abortController.signal
      );

      // 활동 일지 자동 기록 (응답 차단 방지를 위해 after()로 지연)
      const logContent = parsed.data.revisionPrompt
        ? '새 로드맵 버전이 생성되었습니다.'
        : '로드맵이 생성되었습니다.';
      after(async () => {
        await insertSystemActivityLog(parsed.data.projectId, user.id, logContent);
      });

      return {
        success: true,
        data: {
          roadmapId,
          result,
          validation,
        },
      };
    } finally {
      cleanupAbort(abortKey(user.id));
    }
  } catch (error) {
    console.error('[createRoadmap Error]', error);
    return {
      success: false,
      error: getLLMUserFriendlyError(error),
    };
  }
}

/**
 * 로드맵 최종 확정
 */
export async function confirmFinalRoadmap(roadmapId: string): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 로드맵을 확정할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    const access = await requireConsultantRoadmapAccess(supabase, user.id, roadmapId);
    if ('error' in access) return { success: false, error: access.error };

    await finalizeRoadmap(roadmapId, user.id);

    // 활동 일지 자동 기록 (응답 차단 방지를 위해 after()로 지연)
    after(async () => {
      await insertSystemActivityLog(
        access.projectId,
        user.id,
        '로드맵이 최종 확정되었습니다.',
      );
    });

    return { success: true };
  } catch (error) {
    console.error('[confirmFinalRoadmap Error]', error);
    return {
      success: false,
      error: '최종 확정에 실패했습니다.',
    };
  }
}

/**
 * 로드맵 버전 목록 조회
 */
export async function fetchRoadmapVersions(projectId: string) {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return [];
    const { user, supabase, role } = auth;

    if (!role) return [];

    // 접근 권한 확인 (컨설턴트 또는 OPS_ADMIN)
    if (role === 'CONSULTANT_APPROVED') {
      const { data: projectData } = await supabase
        .from('projects')
        .select('assigned_consultant_id')
        .eq('id', projectId)
        .single();

      if (!projectData || projectData.assigned_consultant_id !== user.id) {
        return [];
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
      return [];
    }

    return await fetchRoadmapVersionsService(projectId);
  } catch {
    return [];
  }
}

/**
 * 특정 로드맵 버전 조회
 */
export async function fetchRoadmapVersion(roadmapId: string) {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return null;
    const { user, supabase, role } = auth;

    if (!role) return null;

    const roadmap = await fetchRoadmapVersionService(roadmapId);
    if (!roadmap) return null;

    // 접근 권한 확인
    if (role === 'CONSULTANT_APPROVED') {
      const { data: projectData } = await supabase
        .from('projects')
        .select('assigned_consultant_id')
        .eq('id', roadmap.project_id)
        .single();

      if (!projectData || projectData.assigned_consultant_id !== user.id) {
        return null;
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
      return null;
    }

    return roadmap;
  } catch {
    return null;
  }
}

/**
 * 로드맵 수동 편집
 */
export async function editRoadmapManually(
  roadmapId: string,
  updates: {
    diagnosis_summary?: string;
    roadmap_matrix?: RoadmapRow[];
    pbl_course?: PBLCourse;
    courses?: RoadmapCell[];
  }
): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 로드맵을 편집할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    // Zod 입력 검증
    const parsed = editRoadmapUpdatesSchema.safeParse(updates);
    if (!parsed.success) {
      console.warn('[editRoadmapManually] Zod validation failed:', parsed.error.flatten());
      return { success: false, error: '입력 데이터가 올바르지 않습니다.' };
    }

    const access = await requireConsultantRoadmapAccess(supabase, user.id, roadmapId);
    if ('error' in access) return { success: false, error: access.error };

    const result = await updateRoadmapManually(roadmapId, user.id, parsed.data);

    if (!result.success) {
      return { success: false, error: result.error || '로드맵 편집에 실패했습니다.' };
    }

    return {
      success: true,
      data: {
        validation: result.validation,
      },
    };
  } catch (error) {
    console.error('[editRoadmapManually Error]', error);
    return {
      success: false,
      error: '로드맵 편집에 실패했습니다.',
    };
  }
}

/**
 * 프로젝트 기본 정보 조회 (회사명 등)
 */
export async function fetchProjectInfo(projectId: string): Promise<ActionResult<{ companyName: string }>> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase, role } = auth;

    if (!role) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    const { data: project } = await supabase
      .from('projects')
      .select('company_name, assigned_consultant_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
    }

    // 접근 권한 확인
    if (role === 'CONSULTANT_APPROVED') {
      if (project.assigned_consultant_id !== user.id) {
        return { success: false, error: '접근 권한이 없습니다.' };
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
      return { success: false, error: '접근 권한이 없습니다.' };
    }

    return {
      success: true,
      data: { companyName: project.company_name },
    };
  } catch (error) {
    console.error('[fetchProjectInfo Error]', error);
    return {
      success: false,
      error: '프로젝트 정보 조회에 실패했습니다.',
    };
  }
}

/**
 * 진행 중인 로드맵 생성 취소
 */
export async function cancelRoadmapGeneration(): Promise<SimpleActionResult> {
  const auth = await requireAuth();
  if ('error' in auth) return { success: false, error: auth.error };

  cancelAbort(abortKey(auth.user.id));
  return { success: true };
}

