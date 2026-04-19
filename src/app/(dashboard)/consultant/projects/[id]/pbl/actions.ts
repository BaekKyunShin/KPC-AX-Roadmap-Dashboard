'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import {
  requireAuth,
  requireAuthWithRole,
} from '@/lib/actions/auth-helpers';
import { PBL_ELIGIBLE_STATUSES, validateStatusTransition } from '@/lib/constants/status';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { insertSystemActivityLog } from '@/lib/services/activity-log';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { registerAbort, cleanupAbort } from '@/lib/services/abort-registry';
import { pblInterviewSchema } from '@/lib/schemas/interview-pbl';
import {
  createDraftVersion,
  deleteDraft,
  finalizePBL,
  getPBLReport,
  listVersions,
  sharePBL,
  updateDraft,
  type PBLReportRow,
} from '@/lib/services/pbl/pbl-crud';
import { generatePBLContent, PBLGenerationError } from '@/lib/services/pbl/pbl-generator';
import { pblContentSchema } from '@/lib/services/pbl/pbl-validator';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import { buildPBLHwpxPayload, generatePBLHwpx } from '@/lib/services/export/hwpx';
import type { ConsultantProfile } from '@/types/database';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';

// ============================================================================
// 공통 헬퍼
// ============================================================================

function abortKey(userId: string) {
  return `pbl:${userId}`;
}

interface PBLAccessResult {
  projectId: string;
  status: string;
  isTestMode: boolean;
  companyName: string | null;
}

/**
 * 컨설턴트 + PBL 보고서 ID → (트랙 PBL + 배정 컨설턴트) 검증.
 * 5단계 패턴의 "배정 확인 + 트랙 가드" 통합 헬퍼.
 */
async function requireConsultantPBLReportAccess(
  userId: string,
  pblId: string,
): Promise<ActionResult<PBLAccessResult>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pbl_reports')
    .select(
      'project_id, projects!inner(status, track, assigned_consultant_id, is_test_mode, company_name)',
    )
    .eq('id', pblId)
    .returns<
      Array<{
        project_id: string;
        projects: {
          status: string;
          track: 'ROADMAP' | 'PBL';
          assigned_consultant_id: string | null;
          is_test_mode: boolean;
          company_name: string | null;
        };
      }>
    >()
    .single();

  if (error || !data) {
    return { success: false, error: 'PBL 보고서를 찾을 수 없습니다.' };
  }
  if (data.projects.track !== 'PBL') {
    return { success: false, error: 'PBL 트랙 프로젝트가 아닙니다.' };
  }
  if (data.projects.assigned_consultant_id !== userId) {
    return { success: false, error: '해당 프로젝트에 대한 접근 권한이 없습니다.' };
  }

  return {
    success: true,
    data: {
      projectId: data.project_id,
      status: data.projects.status,
      isTestMode: data.projects.is_test_mode,
      companyName: data.projects.company_name,
    },
  };
}

// ============================================================================
// 조회
// ============================================================================

export async function fetchPBLProjectInfo(
  projectId: string,
): Promise<ActionResult<{ companyName: string; track: string; status: string }>> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase, role } = auth;
    if (!role) return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };

    const { data: project } = await supabase
      .from('projects')
      .select('company_name, track, status, assigned_consultant_id')
      .eq('id', projectId)
      .single();

    if (!project) return { success: false, error: '프로젝트를 찾을 수 없습니다.' };

    if (role === 'CONSULTANT_APPROVED') {
      if (project.assigned_consultant_id !== user.id) {
        return { success: false, error: '접근 권한이 없습니다.' };
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
      return { success: false, error: '접근 권한이 없습니다.' };
    }

    return {
      success: true,
      data: {
        companyName: project.company_name,
        track: project.track,
        status: project.status,
      },
    };
  } catch (error) {
    console.error('[fetchPBLProjectInfo Error]', error);
    return { success: false, error: '프로젝트 정보 조회에 실패했습니다.' };
  }
}

export async function fetchPBLReport(pblId: string): Promise<PBLReportRow | null> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return null;
    const { user, supabase, role } = auth;
    if (!role) return null;

    const row = await getPBLReport(pblId);
    if (!row) return null;

    if (role === 'CONSULTANT_APPROVED') {
      const { data: project } = await supabase
        .from('projects')
        .select('assigned_consultant_id, track')
        .eq('id', row.project_id)
        .single();
      if (!project || project.assigned_consultant_id !== user.id || project.track !== 'PBL') {
        return null;
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
      return null;
    }

    return row;
  } catch {
    return null;
  }
}

export async function fetchPBLVersions(projectId: string): Promise<PBLReportRow[]> {
  try {
    const auth = await requireAuth();
    if ('error' in auth) return [];
    const { user, supabase, role } = auth;
    if (!role) return [];

    if (role === 'CONSULTANT_APPROVED') {
      const { data: project } = await supabase
        .from('projects')
        .select('assigned_consultant_id, track')
        .eq('id', projectId)
        .single();
      if (!project || project.assigned_consultant_id !== user.id || project.track !== 'PBL') {
        return [];
      }
    } else if (!['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
      return [];
    }

    return await listVersions(projectId);
  } catch {
    return [];
  }
}

// ============================================================================
// mutation: 생성
// ============================================================================

export async function generatePBLAction(
  projectId: string,
  revisionPrompt?: string,
): Promise<ActionResult<{ pblId: string }>> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 PBL 보고서를 생성할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;

    // 프로젝트 조회 + 트랙/배정/상태 가드
    const { data: project } = await supabase
      .from('projects')
      .select('id, status, track, assigned_consultant_id, company_name, is_test_mode, industry, sub_industries, company_size, customer_comment')
      .eq('id', projectId)
      .single();

    if (!project || project.assigned_consultant_id !== user.id) {
      return { success: false, error: '해당 프로젝트에 대한 접근 권한이 없습니다.' };
    }
    if (project.track !== 'PBL') {
      return { success: false, error: 'PBL 트랙 프로젝트만 PBL 보고서를 생성할 수 있습니다.' };
    }
    if (!PBL_ELIGIBLE_STATUSES.includes(project.status)) {
      return {
        success: false,
        error: 'PBL 인터뷰가 완료된 프로젝트만 PBL 보고서를 생성할 수 있습니다.',
      };
    }

    // 인터뷰 pbl_data 조회 + 엄격 검증
    const adminSupabase = createAdminClient();
    const { data: interview } = await adminSupabase
      .from('interviews')
      .select('pbl_data')
      .eq('project_id', projectId)
      .maybeSingle();

    if (!interview || !interview.pbl_data) {
      return { success: false, error: 'PBL 인터뷰 데이터가 없습니다.' };
    }

    const pblDataValidation = pblInterviewSchema.safeParse(interview.pbl_data);
    if (!pblDataValidation.success) {
      return {
        success: false,
        error:
          'PBL 인터뷰가 완성되지 않았습니다. 인터뷰 페이지로 돌아가 모든 필수 항목을 입력해주세요.',
      };
    }

    // 컨설턴트 프로필 스냅샷
    let consultantProfile: ConsultantProfile | null = null;
    if (project.assigned_consultant_id) {
      const { data: profile } = await adminSupabase
        .from('consultant_profiles')
        .select('*')
        .eq('user_id', project.assigned_consultant_id)
        .single();
      consultantProfile = (profile as ConsultantProfile | null) ?? null;
    }

    // 진단 요약 구성 (인터뷰 기반 간단 요약)
    const courseOverview =
      (pblDataValidation.data.courseOverview ?? {}) as { course_name?: string; training_job?: string };
    const diagnosisSummary = [
      `${project.company_name ?? '기업'} 대상`,
      courseOverview.training_job ? `${courseOverview.training_job} 직무의` : '',
      `AI 기반 PBL 과정(${courseOverview.course_name ?? '과정명 미지정'})`,
    ]
      .filter(Boolean)
      .join(' ');

    // 취소 가능하도록 AbortController 등록
    const abortController = registerAbort(abortKey(user.id));

    try {
      // LLM 생성
      const { content } = await generatePBLContent({
        interview: pblDataValidation.data as unknown as Record<string, unknown>,
        project: project as unknown as Record<string, unknown>,
        consultantProfile,
        diagnosisSummary,
        revisionPrompt,
        signal: abortController.signal,
      });

      // DRAFT 저장
      const draft = await createDraftVersion(
        projectId,
        content,
        user.id,
        diagnosisSummary,
        revisionPrompt ?? null,
      );

      // 프로젝트 상태 전이 (INTERVIEWED → PBL_DRAFTED)
      if (validateStatusTransition(project.status, 'PBL_DRAFTED')) {
        await adminSupabase
          .from('projects')
          .update({ status: 'PBL_DRAFTED' })
          .eq('id', projectId);
      }

      // 감사로그 + 활동 일지
      await createAuditLog({
        actorUserId: user.id,
        action: 'PBL_REPORT_CREATED',
        targetType: 'pbl_report',
        targetId: draft.id,
        meta: {
          project_id: projectId,
          version_number: draft.version_number,
          has_revision_prompt: !!revisionPrompt,
        },
      });

      const logContent = revisionPrompt
        ? '새 PBL 보고서 버전이 생성되었습니다.'
        : 'PBL 보고서가 생성되었습니다.';
      after(async () => {
        await insertSystemActivityLog(projectId, user.id, logContent);
      });

      return { success: true, data: { pblId: draft.id } };
    } finally {
      cleanupAbort(abortKey(user.id));
    }
  } catch (error) {
    console.error('[generatePBLAction Error]', error);
    if (error instanceof PBLGenerationError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: getLLMUserFriendlyError(error),
    };
  }
}

// ============================================================================
// mutation: 저장
// ============================================================================

export async function savePBLDraftAction(
  pblId: string,
  patch: { pbl_content?: unknown; diagnosis_summary?: string },
): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 PBL 보고서를 편집할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user } = auth;

    const access = await requireConsultantPBLReportAccess(user.id, pblId);
    if (!access.success) return { success: false, error: access.error };

    // 콘텐츠 Zod 검증
    let content: PBLContent | undefined;
    if (patch.pbl_content !== undefined) {
      const parsed = pblContentSchema.safeParse(patch.pbl_content);
      if (!parsed.success) {
        return {
          success: false,
          error: `입력한 PBL 보고서 데이터가 양식에 맞지 않습니다. (${parsed.error.issues[0]?.message ?? '스키마 오류'})`,
        };
      }
      content = parsed.data as PBLContent;
    }

    const diagnosisSummary =
      typeof patch.diagnosis_summary === 'string' ? patch.diagnosis_summary : undefined;

    await updateDraft(pblId, {
      pbl_content: content,
      diagnosis_summary: diagnosisSummary,
    });

    return { success: true };
  } catch (error) {
    console.error('[savePBLDraftAction Error]', error);
    const message = error instanceof Error ? error.message : 'PBL 보고서 저장에 실패했습니다.';
    return { success: false, error: message };
  }
}

// ============================================================================
// mutation: 확정
// ============================================================================

export async function finalizePBLAction(pblId: string): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 PBL 보고서를 확정할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user } = auth;

    const access = await requireConsultantPBLReportAccess(user.id, pblId);
    if (!access.success) return { success: false, error: access.error };

    await finalizePBL(pblId, user.id);

    after(async () => {
      await insertSystemActivityLog(
        access.data.projectId,
        user.id,
        'PBL 보고서가 최종 확정되었습니다.',
      );
    });

    return { success: true };
  } catch (error) {
    console.error('[finalizePBLAction Error]', error);
    const message = error instanceof Error ? error.message : 'PBL 보고서 확정에 실패했습니다.';
    return { success: false, error: message };
  }
}

// ============================================================================
// mutation: 삭제 (DRAFT)
// ============================================================================

export async function deletePBLAction(pblId: string): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 PBL DRAFT를 삭제할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user } = auth;

    const access = await requireConsultantPBLReportAccess(user.id, pblId);
    if (!access.success) return { success: false, error: access.error };

    await deleteDraft(pblId);
    return { success: true };
  } catch (error) {
    console.error('[deletePBLAction Error]', error);
    const message = error instanceof Error ? error.message : 'PBL DRAFT 삭제에 실패했습니다.';
    return { success: false, error: message };
  }
}

// ============================================================================
// mutation: 공유 토글
// ============================================================================

export async function togglePBLShareAction(
  pblId: string,
  isShared: boolean,
): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 PBL 공유 설정을 변경할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user } = auth;

    const access = await requireConsultantPBLReportAccess(user.id, pblId);
    if (!access.success) return { success: false, error: access.error };

    await sharePBL(pblId, isShared);

    try {
      await createAuditLog({
        actorUserId: user.id,
        action: 'PBL_REPORT_SHARED',
        targetType: 'pbl_report',
        targetId: pblId,
        meta: { is_shared: isShared },
      });
    } catch (e) {
      console.error('[togglePBLShareAction] 감사로그 실패:', e);
    }

    return { success: true };
  } catch (error) {
    console.error('[togglePBLShareAction Error]', error);
    const message = error instanceof Error ? error.message : 'PBL 공유 설정 변경에 실패했습니다.';
    return { success: false, error: message };
  }
}

// ============================================================================
// mutation: 생성 취소
// ============================================================================

export async function cancelPBLGeneration(): Promise<SimpleActionResult> {
  const auth = await requireAuth();
  if ('error' in auth) return { success: false, error: auth.error };
  const { user } = auth;
  const { cancelAbort } = await import('@/lib/services/abort-registry');
  cancelAbort(abortKey(user.id));
  return { success: true };
}

// ============================================================================
// mutation: HWPX 내보내기 (Step 10)
// ============================================================================

/**
 * PBL HWPX 내보내기.
 *
 * 5단계 패턴:
 *   1. 세션 + 역할 (CONSULTANT_APPROVED)
 *   2. PBL 보고서 접근 권한 (PBL 트랙 + 배정 컨설턴트) — `requireConsultantPBLReportAccess`
 *   3. 입력 검증 (pblId 형식)
 *   4. 데이터 조회 → payload 변환 → Python 함수 호출 → base64
 *   5. 감사로그(PBL_HWPX_EXPORTED) + ActionResult
 *
 * 반환값은 Buffer가 아닌 base64 문자열 — Next.js Server Action 직렬화 제약.
 */
export async function exportPBLAsHwpxAction(
  pblId: string,
): Promise<ActionResult<{ fileName: string; contentBase64: string; mimeType: string }>> {
  try {
    // 1) 인증 + 역할 — 컨설턴트 + 운영·시스템관리자
    const auth = await requireAuthWithRole(
      ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'],
      { roleError: 'PBL HWPX를 내보낼 권한이 없습니다.' },
    );
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, role } = auth;

    // 2) 입력 검증
    if (!pblId || typeof pblId !== 'string') {
      return { success: false, error: 'PBL 보고서 ID가 올바르지 않습니다.' };
    }

    // 3) 접근 권한 확인 — 컨설턴트만 배정 체크, OPS/시스템관리자는 전체 열람 가능
    const admin = createAdminClient();
    let projectId: string;
    if (role === 'CONSULTANT_APPROVED') {
      const consultantAccess = await requireConsultantPBLReportAccess(user.id, pblId);
      if (!consultantAccess.success) return { success: false, error: consultantAccess.error };
      projectId = consultantAccess.data.projectId;
    } else {
      const { data: row } = await admin
        .from('pbl_reports')
        .select('project_id')
        .eq('id', pblId)
        .single();
      if (!row) return { success: false, error: 'PBL 보고서를 찾을 수 없습니다.' };
      projectId = row.project_id;
    }
    const access = { data: { projectId } } as const;

    // 4) 데이터 조회 — pbl_reports + projects + interviews
    const { data: pblRow, error: pblError } = await admin
      .from('pbl_reports')
      .select('*')
      .eq('id', pblId)
      .single();
    if (pblError || !pblRow) {
      return { success: false, error: 'PBL 보고서를 찾을 수 없습니다.' };
    }

    const { data: projectRow, error: projectError } = await admin
      .from('projects')
      .select('*')
      .eq('id', access.data.projectId)
      .single();
    if (projectError || !projectRow) {
      return { success: false, error: '프로젝트를 찾을 수 없습니다.' };
    }

    const { data: interviewRow } = await admin
      .from('interviews')
      .select('*')
      .eq('project_id', access.data.projectId)
      .maybeSingle();

    // 5) payload 변환 + Python 함수 호출
    const payload = buildPBLHwpxPayload({
      pbl: pblRow as unknown as Parameters<typeof buildPBLHwpxPayload>[0]['pbl'],
      project: projectRow as unknown as Parameters<typeof buildPBLHwpxPayload>[0]['project'],
      interview: (interviewRow ?? null) as unknown as Parameters<typeof buildPBLHwpxPayload>[0]['interview'],
    });

    // Server Action 요청 host 기반으로 현재 deployment Python 함수 호출
    const reqHeaders = await headers();
    const host = reqHeaders.get('x-forwarded-host') ?? reqHeaders.get('host');
    const proto = reqHeaders.get('x-forwarded-proto') ?? 'https';
    const baseUrl = host ? `${proto}://${host}` : undefined;

    let buffer: Buffer;
    try {
      buffer = await generatePBLHwpx(payload, { baseUrl });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[exportPBLAsHwpxAction generatePBLHwpx Error]', { baseUrl, error: message });
      // 로컬 dev 환경 안내(Vercel Python 런타임 설명)는 hwpx-client에서 throw한
      // 메시지 그대로 표출해 사용자에게 구체적 해결 옵션을 제공한다.
      const isLocalDevFallback = message.includes('Vercel Python 런타임');
      return {
        success: false,
        error: isLocalDevFallback
          ? message
          : 'HWPX 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
      };
    }

    // 6) Buffer → base64
    const contentBase64 = buffer.toString('base64');

    // 7) 감사로그
    after(async () => {
      try {
        await createAuditLog({
          actorUserId: user.id,
          action: 'PBL_HWPX_EXPORTED',
          targetType: 'pbl_report',
          targetId: pblId,
          meta: {
            projectId: access.data.projectId,
            versionNumber: pblRow.version_number,
            fileSize: buffer.length,
          },
        });
      } catch (e) {
        console.error('[exportPBLAsHwpxAction] 감사로그 실패:', e);
      }
    });

    return {
      success: true,
      data: {
        fileName: payload.fileName,
        contentBase64,
        mimeType: 'application/vnd.hancom.hwpx',
      },
    };
  } catch (error) {
    console.error('[exportPBLAsHwpxAction Error]', error);
    return { success: false, error: 'PBL HWPX 내보내기에 실패했습니다.' };
  }
}
