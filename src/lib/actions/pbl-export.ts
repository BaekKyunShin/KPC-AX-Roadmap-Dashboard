'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { EXPORT_ELIGIBLE_STATUSES, isOpsManager } from '@/lib/constants/status';
import type { ProjectStatus, UserRole } from '@/types/database';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import {
  PBL_AI_LEVEL_LABEL,
  pblInterviewAutoSaveSchema,
  type AILevel,
  type PBLAILevel,
  type PBLInterviewStrict,
  type TrainingGoal,
} from '@/lib/schemas/interview-pbl';

export interface PBLExportPayload {
  companyName: string;
  projectId: string;
  versionNumber: number;
  status: string;
  diagnosisSummary: string;
  pblContent: PBLContent;
  createdAt: string;
  finalizedAt: string | null;
  interviewOverview?: {
    courseName: string;
    trainingHours: number;
    traineeCount: number;
    trainingJob: string;
    aiLevel: string;
    trainingGoals: string[];
  };
  requirements?: {
    trainingNeedsAnalysis?: string;
    selectionReason?: string;
    targetTaskDetails?: Array<{
      task_name: string;
      as_is: string;
      to_be: string;
      required_knowledge: string;
      required_skill: string;
    }>;
  };
}

/**
 * pbl_data JSONB 분기 — V2 (camelCase, PR #28 정본) vs V1 (snake_case legacy).
 * `hwpx-payload-pbl.ts` 의 `classifyInterview` 와 동일한 키 시그니처·분기 패턴을
 * 사용한다 — strict zod 재검증을 피하고 키 존재 여부만으로 판정해 자동 저장 중간
 * 단계 (Ⅲ-3-다 5 컬럼 일부 누락 등) 의 데이터도 export 가능하게 한다.
 *  - V2 판정: companyName / courseName / companyIssues 중 하나라도 존재
 *  - V1 판정: courseOverview / companyStatus 중 하나라도 존재 + autoSave schema 통과
 *  - 그 외: empty (export 시 interviewOverview·requirements 누락)
 */
type PblDataBranch =
  | { kind: 'v2'; data: Partial<PBLInterviewStrict> }
  | { kind: 'v1'; data: Record<string, unknown> }
  | { kind: 'empty' };

function classifyPblData(raw: unknown): PblDataBranch {
  if (!raw || typeof raw !== 'object') return { kind: 'empty' };
  const r = raw as Record<string, unknown>;
  if ('companyName' in r || 'courseName' in r || 'companyIssues' in r) {
    return { kind: 'v2', data: r as Partial<PBLInterviewStrict> };
  }
  if ('courseOverview' in r || 'companyStatus' in r) {
    const v1 = pblInterviewAutoSaveSchema.safeParse(r);
    return v1.success ? { kind: 'v1', data: v1.data } : { kind: 'empty' };
  }
  return { kind: 'empty' };
}

function buildOverviewFromV2(
  v2: Partial<PBLInterviewStrict>,
): PBLExportPayload['interviewOverview'] {
  const level = v2.currentAiLevel?.level as PBLAILevel | undefined;
  return {
    courseName: v2.courseName ?? '',
    trainingHours: v2.trainingHours ?? 0,
    // V2 schema 에 별도 필드 없음 (Ⅰ 양식의 trainee_count 는 결과 화면에서 채움).
    traineeCount: 0,
    trainingJob: v2.trainingTarget ?? '',
    aiLevel: level ? PBL_AI_LEVEL_LABEL[level] : '',
    trainingGoals: [],
  };
}

function buildRequirementsFromV2(
  v2: Partial<PBLInterviewStrict>,
): PBLExportPayload['requirements'] {
  const env = v2.trainingEnv;
  const target = v2.target;
  if (!env && !target) return undefined;
  return {
    trainingNeedsAnalysis: env || undefined,
    selectionReason: target?.necessity || undefined,
    targetTaskDetails: target?.details?.map((d) => ({
      task_name: d.title ?? '',
      as_is: d.as_is ?? '',
      to_be: d.to_be ?? '',
      required_knowledge: d.required_knowledge ?? '',
      required_skill: d.required_skill ?? '',
    })),
  };
}

function buildOverviewFromV1(
  overview: Record<string, unknown> | undefined,
): PBLExportPayload['interviewOverview'] {
  if (!overview) return undefined;
  return {
    courseName: (overview.course_name as string | undefined) ?? '',
    trainingHours: (overview.training_hours as number | undefined) ?? 0,
    traineeCount: (overview.trainee_count as number | undefined) ?? 0,
    trainingJob: (overview.training_job as string | undefined) ?? '',
    aiLevel: ((overview.ai_level as AILevel | undefined) ?? '') as string,
    trainingGoals:
      ((overview.training_goals as TrainingGoal[] | undefined) ?? []) as string[],
  };
}

function buildRequirementsFromV1(
  env: Record<string, unknown> | undefined,
  targets: Record<string, unknown> | undefined,
): PBLExportPayload['requirements'] {
  if (!env && !targets) return undefined;
  return {
    trainingNeedsAnalysis:
      (env?.training_needs_analysis as string | undefined) ?? undefined,
    selectionReason: (targets?.selection_reason as string | undefined) ?? undefined,
    targetTaskDetails:
      (targets?.target_task_details as PBLExportPayload['requirements'] extends
        | { targetTaskDetails: infer T }
        | undefined
        ? T
        : never) ?? undefined,
  };
}

/**
 * PBL 내보내기용 데이터 준비 (컨설턴트·운영자 공통).
 * RLS는 pbl_reports 조회에서 이미 자동 차단하므로 역할별 화이트리스트만 추가 확인.
 */
export async function preparePBLExportData(
  pblId: string,
): Promise<ActionResult<PBLExportPayload>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const { data: row } = await supabase
      .from('pbl_reports')
      .select(
        '*, projects!inner(company_name, assigned_consultant_id, status, track)',
      )
      .eq('id', pblId)
      .single();

    if (!row) return { success: false, error: 'PBL 보고서를 찾을 수 없습니다.' };

    const project = row.projects as {
      company_name: string;
      assigned_consultant_id: string | null;
      status: string;
      track: 'ROADMAP' | 'PBL';
    };

    if (project.track !== 'PBL') {
      return { success: false, error: 'PBL 트랙 프로젝트가 아닙니다.' };
    }
    if (!EXPORT_ELIGIBLE_STATUSES.includes(project.status as ProjectStatus)) {
      return { success: false, error: '내보내기할 수 없는 프로젝트 상태입니다.' };
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    if (profile.role === 'CONSULTANT_APPROVED') {
      if (project.assigned_consultant_id !== user.id) {
        return { success: false, error: '접근 권한이 없습니다.' };
      }
    } else if (!isOpsManager(profile.role as UserRole)) {
      return { success: false, error: '접근 권한이 없습니다.' };
    }

    // 인터뷰 pbl_data 조회 (옵션)
    const admin = createAdminClient();
    const { data: interview } = await admin
      .from('interviews')
      .select('pbl_data')
      .eq('project_id', row.project_id)
      .maybeSingle();

    const branch = classifyPblData(interview?.pbl_data);

    let interviewOverview: PBLExportPayload['interviewOverview'];
    let requirements: PBLExportPayload['requirements'];
    if (branch.kind === 'v2') {
      interviewOverview = buildOverviewFromV2(branch.data);
      requirements = buildRequirementsFromV2(branch.data);
    } else if (branch.kind === 'v1') {
      const v1 = branch.data;
      interviewOverview = buildOverviewFromV1(
        v1.courseOverview as Record<string, unknown> | undefined,
      );
      requirements = buildRequirementsFromV1(
        v1.trainingEnvironment as Record<string, unknown> | undefined,
        v1.targetTasks as Record<string, unknown> | undefined,
      );
    }

    const payload: PBLExportPayload = {
      companyName: project.company_name,
      projectId: row.project_id,
      versionNumber: row.version_number,
      status: row.status,
      diagnosisSummary: row.diagnosis_summary ?? '',
      pblContent: row.pbl_content as PBLContent,
      createdAt: row.created_at,
      finalizedAt: row.finalized_at,
      interviewOverview,
      requirements,
    };

    return { success: true, data: payload };
  } catch (error) {
    console.error('[preparePBLExportData Error]', error);
    return { success: false, error: '데이터 준비에 실패했습니다.' };
  }
}

/** 다운로드 감사로그 */
export async function logPBLDownload(
  pblId: string,
  format: 'PDF' | 'XLSX',
): Promise<SimpleActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const { data: row } = await supabase
      .from('pbl_reports')
      .select('project_id, version_number, status')
      .eq('id', pblId)
      .single();
    if (!row) return { success: false, error: 'PBL 보고서를 찾을 수 없습니다.' };

    await createAuditLog({
      actorUserId: user.id,
      action: format === 'PDF' ? 'DOWNLOAD_PDF' : 'DOWNLOAD_XLSX',
      targetType: 'pbl_report',
      targetId: pblId,
      meta: {
        project_id: row.project_id,
        version_number: row.version_number,
        status: row.status,
        track: 'PBL',
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[logPBLDownload Error]', error);
    return { success: false, error: '감사로그 기록에 실패했습니다.' };
  }
}
