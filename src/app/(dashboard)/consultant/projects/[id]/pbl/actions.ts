'use server';

import { headers } from 'next/headers';
import { after } from 'next/server';
import {
  requireAuth,
  requireAuthWithRole,
  requireConsultantProjectAccess,
} from '@/lib/actions/auth-helpers';
import { PBL_ELIGIBLE_STATUSES, validateStatusTransition } from '@/lib/constants/status';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { insertSystemActivityLog } from '@/lib/services/activity-log';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { registerAbort, cleanupAbort } from '@/lib/services/abort-registry';
import { pblInterviewSchema, PBLInterviewSchema } from '@/lib/schemas/interview-pbl';
import type { PBLInterviewStrict } from '@/lib/schemas/interview-pbl';
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
import { fetchPBLInterviewV2 } from '../interview/actions';
import { mapDbToPBLInterview, mapPBLInterviewToDb } from '@/lib/services/interview/converters';
import type { ConsultantProfile } from '@/types/database';
import type {
  PBLResultEditPayload,
  ResultPBLInterviewSnapshot,
} from './_components/result-v2/types';
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

// ============================================================================
// Task 2.8 — PBL 결과 V2 Server Action (5종)
// ----------------------------------------------------------------------------
// V2 Client (props 외주 패턴) 상위 page.tsx 가 호출할 V2 래퍼 Action.
// Legacy Action 은 삭제 금지 (Task 2.11 cleanup 예정).
//
// 설계 원칙:
//   - 5단계 패턴 (세션 → 역할 → 배정 → 비즈니스 → ActionResult)
//   - Legacy Action 재사용 (generatePBLAction / finalizePBLAction /
//     savePBLDraftAction / exportPBLAsHwpxAction)
//   - camelCase payload 수용: PBL 은 interviews.pbl_data 에 camelCase 를 그대로
//     저장하므로 Ⅰ·Ⅱ·Ⅲ patch 는 converter 를 거쳐 interviews 에 직접 반영
//   - fetchPBLPageDataV2: 버전 목록 + 선택 버전 + 인터뷰 snapshot + HRD PDF
//     signed URL 주입
// ============================================================================

/** HRD 첨부 버킷 (interview/page.tsx 의 HRD_BUCKET 과 동일). */
const HRD_BUCKET_PBL_V2 = 'interview-attachments';

/**
 * PBL 인터뷰 camelCase snapshot 의 `hrdReportPdf.url` 이 storage_path 인 경우
 * 1시간 signed URL 로 교체. 로드맵 쪽 동명 헬퍼와 동일한 패턴.
 */
async function hydratePBLHrdSignedUrl(
  interview: Partial<PBLInterviewStrict>,
): Promise<Partial<PBLInterviewStrict>> {
  const hrd = interview.hrdReportPdf;
  if (!hrd || !hrd.url) return interview;
  if (hrd.url.startsWith('http')) return interview;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(HRD_BUCKET_PBL_V2)
      .createSignedUrl(hrd.url, 3600);
    if (error || !data) return interview;
    return {
      ...interview,
      hrdReportPdf: { ...hrd, url: data.signedUrl },
    };
  } catch {
    return interview;
  }
}

/**
 * `PBLInterviewStrict` (flat camelCase) → `ResultPBLInterviewSnapshot`
 * (overview / analysis / Ⅲ flat) 로 재구조화.
 *
 * `PBLInterviewSchema` 가 `PBLOverviewSchema.merge(PBLAnalysisSchema).merge(PBLTasksSchema)`
 * 이므로 Ⅰ·Ⅱ 필드가 루트에 있는데, V2 Client 의 `TabPBLOverview` /
 * `TabPBLAnalysis` 는 `interview.overview` / `interview.analysis` 네임스페이스를
 * 기대한다. 본 함수가 그 간격을 메운다.
 */
function toPBLInterviewSnapshot(
  interview: Partial<PBLInterviewStrict>,
): Partial<ResultPBLInterviewSnapshot> {
  const out: Partial<ResultPBLInterviewSnapshot> = {};

  // Ⅰ 개요 (PBLOverview)
  const overviewFields = {
    companyName: interview.companyName,
    courseName: interview.courseName,
    ncsCode: interview.ncsCode,
    trainingHours: interview.trainingHours,
    trainingTarget: interview.trainingTarget,
    trainingForm: interview.trainingForm,
    trainingPeriod: interview.trainingPeriod,
    businessIssues: interview.businessIssues,
  };
  if (Object.values(overviewFields).some((v) => v !== undefined)) {
    out.overview = overviewFields as ResultPBLInterviewSnapshot['overview'];
  }

  // Ⅱ 요구분석 (PBLAnalysis)
  const analysisFields = {
    companyIssues: interview.companyIssues,
    organization: interview.organization,
    trainingEnv: interview.trainingEnv,
    hrdReportPdf: interview.hrdReportPdf,
    courseNecessity: interview.courseNecessity,
  };
  if (Object.values(analysisFields).some((v) => v !== undefined)) {
    out.analysis = analysisFields as ResultPBLInterviewSnapshot['analysis'];
  }

  // Ⅲ 훈련과제 도출 — flat 그대로 전달
  if (interview.activities !== undefined) out.activities = interview.activities;
  if (interview.problems !== undefined) out.problems = interview.problems;
  if (interview.priority !== undefined) out.priority = interview.priority;
  if (interview.target !== undefined) out.target = interview.target;
  if (interview.currentAiLevel !== undefined) out.currentAiLevel = interview.currentAiLevel;
  if (interview.expectedAiLevel !== undefined) out.expectedAiLevel = interview.expectedAiLevel;

  return out;
}

/**
 * PBL 결과 페이지 V2 — 새 PBL 보고서 생성 (LLM 호출).
 * Legacy `generatePBLAction` 위임. page.tsx 가 cancel 을 위해
 * `cancelPBLGeneration` 과 함께 사용.
 */
export async function createPBLV2(
  projectId: string,
  revisionPrompt?: string,
): Promise<ActionResult<{ pblId: string }>> {
  return generatePBLAction(projectId, revisionPrompt);
}

/**
 * PBL 결과 페이지 V2 — DRAFT 를 FINAL 로 확정.
 * Legacy `finalizePBLAction` 위임.
 */
export async function confirmFinalPBLV2(
  versionId: string,
): Promise<SimpleActionResult> {
  return finalizePBLAction(versionId);
}

/**
 * PBL 결과 페이지 V2 — 인라인 편집 patch 반영.
 *
 * `PBLResultEditPayload` 중 Ⅰ·Ⅱ·Ⅲ 필드는 `interviews.pbl_data` JSONB 에
 * camelCase 로 직접 병합 저장한다 (기존 `savePBLInterviewV2` 의 merge 경로를
 * 그대로 활용하기 위해, 기존 pbl_data 와 얕게 병합 후 partial 스키마 검증).
 *
 * Ⅳ·Ⅴ (LLM 결과) 편집은 Task 2.10 이후 별도 추가 (현 Task 범위 밖).
 */
export async function editPBLV2(
  versionId: string,
  patch: PBLResultEditPayload,
): Promise<SimpleActionResult> {
  try {
    // (1)+(2) 세션 + 역할
    const auth = await requireAuthWithRole(['CONSULTANT_APPROVED'], {
      roleError: '컨설턴트만 PBL 결과를 편집할 수 있습니다.',
    });
    if ('error' in auth) return { success: false, error: auth.error };
    const { user } = auth;

    // (3) 배정 + 트랙 검증 — 보고서 ID → projectId
    const access = await requireConsultantPBLReportAccess(user.id, versionId);
    if (!access.success) return { success: false, error: access.error };
    const projectId = access.data.projectId;

    // patch 가 비어 있으면 no-op
    const hasOverview = patch.overview !== undefined;
    const hasAnalysis =
      patch.companyIssues !== undefined ||
      patch.organization !== undefined ||
      patch.trainingEnv !== undefined ||
      patch.courseNecessity !== undefined;
    const hasTasks =
      patch.activities !== undefined ||
      patch.problems !== undefined ||
      patch.priority !== undefined ||
      patch.target !== undefined ||
      patch.currentAiLevel !== undefined ||
      patch.expectedAiLevel !== undefined;
    if (!hasOverview && !hasAnalysis && !hasTasks) {
      return { success: true };
    }

    // (4) 비즈니스 — 기존 pbl_data 조회 후 patch 병합 → loose partial 검증 → 업서트
    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from('interviews')
      .select('id, pbl_data')
      .eq('project_id', projectId)
      .maybeSingle();
    if (fetchError) {
      console.error('[editPBLV2] Fetch:', fetchError.message);
      return { success: false, error: '기존 인터뷰 확인에 실패했습니다.' };
    }

    const current = mapDbToPBLInterview(
      (existing as { pbl_data: Record<string, unknown> | null } | null) ?? null,
    );

    // camelCase flat 병합 — patch.overview 는 partial 이므로 spread 로 덮어씀
    const merged: Partial<PBLInterviewStrict> = {
      ...current,
      ...(patch.overview as Partial<PBLInterviewStrict>),
      ...(patch.companyIssues !== undefined ? { companyIssues: patch.companyIssues } : {}),
      ...(patch.organization !== undefined
        ? { organization: patch.organization as PBLInterviewStrict['organization'] }
        : {}),
      ...(patch.trainingEnv !== undefined ? { trainingEnv: patch.trainingEnv } : {}),
      ...(patch.courseNecessity !== undefined ? { courseNecessity: patch.courseNecessity } : {}),
      ...(patch.activities !== undefined ? { activities: patch.activities } : {}),
      ...(patch.problems !== undefined ? { problems: patch.problems } : {}),
      ...(patch.priority !== undefined
        ? { priority: patch.priority as PBLInterviewStrict['priority'] }
        : {}),
      ...(patch.target !== undefined
        ? { target: patch.target as PBLInterviewStrict['target'] }
        : {}),
      ...(patch.currentAiLevel !== undefined
        ? { currentAiLevel: patch.currentAiLevel as PBLInterviewStrict['currentAiLevel'] }
        : {}),
      ...(patch.expectedAiLevel !== undefined
        ? { expectedAiLevel: patch.expectedAiLevel as PBLInterviewStrict['expectedAiLevel'] }
        : {}),
    };

    // partial 검증 — DRAFT 중간 상태 허용 (strict NOT 적용)
    const validation = PBLInterviewSchema.partial().safeParse(merged);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message ?? 'PBL 편집 데이터가 올바르지 않습니다.',
      };
    }

    const dbPayload = mapPBLInterviewToDb(validation.data as Partial<PBLInterviewStrict>);

    if (existing) {
      const { error: updateError } = await admin
        .from('interviews')
        .update(dbPayload)
        .eq('id', existing.id);
      if (updateError) {
        console.error('[editPBLV2] Update:', updateError.message);
        return { success: false, error: 'PBL 편집 저장에 실패했습니다.' };
      }
    } else {
      const { error: insertError } = await admin.from('interviews').insert({
        project_id: projectId,
        interviewer_id: user.id,
        ...dbPayload,
      });
      if (insertError) {
        console.error('[editPBLV2] Insert:', insertError.message);
        return { success: false, error: 'PBL 편집 저장에 실패했습니다.' };
      }
    }

    // 감사로그 (after — 응답 차단 방지).
    // PBL 결과 페이지 편집은 실질적으로 인터뷰 원본(pbl_data JSONB) 을
    // 수정하는 경로이므로 기존 `PBL_INTERVIEW_SAVED` 액션을 재사용한다.
    // meta.schema_version 으로 결과 화면 경유 편집임을 식별.
    after(async () => {
      try {
        await createAuditLog({
          actorUserId: user.id,
          action: 'PBL_INTERVIEW_SAVED',
          targetType: 'pbl_report',
          targetId: versionId,
          meta: {
            projectId,
            schema_version: 'v2_result_edit',
            patchedKeys: Object.keys(patch),
          },
        });
      } catch (e) {
        console.error('[editPBLV2] 감사로그 실패:', e);
      }
    });

    return { success: true };
  } catch (error) {
    console.error('[editPBLV2 Error]', error);
    return { success: false, error: 'PBL 편집 중 오류가 발생했습니다.' };
  }
}

/**
 * PBL 결과 페이지 V2 — HWPX 다운로드.
 * Legacy `exportPBLAsHwpxAction` 위임.
 */
export async function exportPBLHwpxV2(
  versionId: string,
): Promise<ActionResult<{ fileName: string; contentBase64: string; mimeType: string }>> {
  return exportPBLAsHwpxAction(versionId);
}

/**
 * PBL 결과 페이지 V2 — 초기 데이터 일괄 조회.
 *
 * - `versions`: 최신순. 비어 있으면 빈 상태 UI.
 * - `selectedVersion`: versionId 지정 시 해당 버전, 아니면 FINAL → 없으면
 *   가장 최신 DRAFT → 없으면 첫 번째.
 * - `interview`: `fetchPBLInterviewV2` 재사용 (flat camelCase) + HRD signed URL
 *   주입 + `ResultPBLInterviewSnapshot` 구조로 재정렬.
 */
export interface PBLPageDataV2 {
  versions: PBLReportRow[];
  selectedVersion: PBLReportRow | null;
  interview: Partial<ResultPBLInterviewSnapshot>;
  /**
   * #013 fix — EmptyState 가드 강화용. 인터뷰 row 존재 여부 + 프로젝트 status
   * 를 server-side 에서 함께 조회해 클라이언트 사전 차단.
   */
  hasInterview: boolean;
  projectStatus: string;
}

export async function fetchPBLPageDataV2(
  projectId: string,
  versionId?: string,
): Promise<ActionResult<PBLPageDataV2>> {
  try {
    // (1)+(2) 세션 + 역할 — 컨설턴트 + 운영·시스템관리자
    const auth = await requireAuthWithRole(
      ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'],
      { roleError: 'PBL 결과를 조회할 권한이 없습니다.' },
    );
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, role, supabase } = auth;

    // (3) 프로젝트 배정 검증 — 컨설턴트만. OPS 는 전체 열람.
    if (role === 'CONSULTANT_APPROVED') {
      const access = await requireConsultantProjectAccess(
        supabase,
        user.id,
        projectId,
        '해당 프로젝트에 대한 접근 권한이 없습니다.',
      );
      if (access !== true) return { success: false, error: access.error };
    }

    // (4) 비즈니스
    const versions = await listVersions(projectId);

    // 선택 버전 결정: versionId > 최신(version_number DESC).
    // listVersions 는 version_number DESC 정렬이므로 versions[0] 가 최신.
    // 컨설턴트가 작업 중인 DRAFT 를 우선 표출하는 V1 정책을 유지한다.
    let selectedVersion: PBLReportRow | null = null;
    if (versionId) {
      selectedVersion = versions.find((v) => v.id === versionId) ?? null;
    }
    if (!selectedVersion) {
      selectedVersion = versions[0] ?? null;
    }

    // 인터뷰 snapshot — 컨설턴트는 `fetchPBLInterviewV2` (track 가드 포함),
    // OPS 는 admin 직접 조회.
    let rawInterview: Partial<PBLInterviewStrict> = {};
    if (role === 'CONSULTANT_APPROVED') {
      const interview = await fetchPBLInterviewV2(projectId);
      if (interview) rawInterview = interview;
    } else {
      const admin = createAdminClient();
      const { data: row } = await admin
        .from('interviews')
        .select('pbl_data')
        .eq('project_id', projectId)
        .maybeSingle();
      if (row) {
        rawInterview = mapDbToPBLInterview(
          row as { pbl_data: Record<string, unknown> | null },
        );
      }
    }

    // HRD signed URL 주입 후 snapshot 구조로 재정렬
    const hydrated = await hydratePBLHrdSignedUrl(rawInterview);
    const snapshot = toPBLInterviewSnapshot(hydrated);

    // #013 fix — 인터뷰 row 존재 여부 + 프로젝트 status (PBL_ELIGIBLE_STATUSES
    // 가드용) 를 server-side 에서 추가 조회해 클라이언트 EmptyState 가드에 prop drill.
    const admin = createAdminClient();
    const [{ data: interviewRow }, { data: projectRow }] = await Promise.all([
      admin
        .from('interviews')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle(),
      admin
        .from('projects')
        .select('status')
        .eq('id', projectId)
        .maybeSingle(),
    ]);

    return {
      success: true,
      data: {
        versions,
        selectedVersion,
        interview: snapshot,
        hasInterview: Boolean(interviewRow?.id),
        projectStatus: projectRow?.status ?? '',
      },
    };
  } catch (error) {
    console.error('[fetchPBLPageDataV2 Error]', error);
    return { success: false, error: 'PBL 결과 데이터 조회에 실패했습니다.' };
  }
}
