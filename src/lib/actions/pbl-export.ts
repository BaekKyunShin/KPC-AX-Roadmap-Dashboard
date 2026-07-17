'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { EXPORT_ELIGIBLE_STATUSES } from '@/lib/constants/status';
import { canAccessProjectArtifact } from '@/lib/actions/auth-helpers';
import type { ProjectStatus, UserRole } from '@/types/database';
import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import type { PBLInterviewStrict } from '@/lib/schemas/interview-pbl';

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
 * pbl_data JSONB → V2 인터뷰(부분). V2 정본만 처리하며 V1 fallback 은 제거했다.
 * strict zod 재검증을 피하고 키 존재 여부만으로 판정해 자동 저장 중간 단계
 * (Ⅲ-3-다 5 컬럼 일부 누락 등) 의 데이터도 export 가능하게 한다.
 *  - V2 판정: companyName / courseName / companyIssues 중 하나라도 존재
 *  - 그 외: null (export 시 interviewOverview·requirements 누락)
 */
function extractV2Interview(raw: unknown): Partial<PBLInterviewStrict> | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if ('companyName' in r || 'courseName' in r || 'companyIssues' in r) {
    return r as Partial<PBLInterviewStrict>;
  }
  return null;
}

function buildOverviewFromV2(
  v2: Partial<PBLInterviewStrict>
): PBLExportPayload['interviewOverview'] {
  return {
    courseName: v2.courseName ?? '',
    trainingHours: v2.trainingHours ?? 0,
    // V2 schema 에 별도 필드 없음 (Ⅰ 양식의 trainee_count 는 결과 화면에서 채움).
    traineeCount: 0,
    trainingJob: v2.trainingTarget ?? '',
    // v2 양식: AI역량 자체입력 제거(로드맵 연계로만 표시). 결과 화면에서 별도 처리.
    aiLevel: '',
    trainingGoals: [],
  };
}

function buildRequirementsFromV2(
  v2: Partial<PBLInterviewStrict>
): PBLExportPayload['requirements'] {
  const env = v2.trainingEnv;
  const target = v2.target;
  if (!env && !target) return undefined;
  // R8 PBL-자체-02 — env 가 정형 객체. 6 영역을 줄바꿈으로 결합해 단일 문자열로 출력.
  const envSummary = env
    ? [
        env.properTrainingHours && `[적정 훈련시간] ${env.properTrainingHours}`,
        env.internalPlace && `[훈련장소-사내] ${env.internalPlace}`,
        env.externalPlace && `[훈련장소-사외] ${env.externalPlace}`,
        env.aiInfrastructure && `[AI 인프라] ${env.aiInfrastructure}`,
        env.internalInstructors.length > 0 &&
          `[사내강사] ${env.internalInstructors
            .map((i) => `${i.position} ${i.name} (${i.career})`)
            .join(' / ')}`,
        env.externalInstructors.length > 0 &&
          `[외부강사] ${env.externalInstructors
            .map((i) => `${i.position} ${i.name} (${i.career})`)
            .join(' / ')}`,
      ]
        .filter(Boolean)
        .join('\n')
    : undefined;
  return {
    trainingNeedsAnalysis: envSummary || undefined,
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

/**
 * PBL 내보내기용 데이터 준비 (컨설턴트·운영자 공통).
 * RLS는 pbl_reports 조회에서 이미 자동 차단하므로 역할별 화이트리스트만 추가 확인.
 */
export async function preparePBLExportData(pblId: string): Promise<ActionResult<PBLExportPayload>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const { data: row } = await supabase
      .from('pbl_reports')
      .select('*, projects!inner(company_name, assigned_consultant_id, status, track)')
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
    if (
      !canAccessProjectArtifact(profile.role as UserRole, project.assigned_consultant_id, user.id)
    ) {
      return { success: false, error: '접근 권한이 없습니다.' };
    }

    // 인터뷰 pbl_data 조회 (옵션)
    const admin = createAdminClient();
    const { data: interview } = await admin
      .from('interviews')
      .select('pbl_data')
      .eq('project_id', row.project_id)
      .maybeSingle();

    const v2 = extractV2Interview(interview?.pbl_data);

    let interviewOverview: PBLExportPayload['interviewOverview'];
    let requirements: PBLExportPayload['requirements'];
    if (v2) {
      interviewOverview = buildOverviewFromV2(v2);
      requirements = buildRequirementsFromV2(v2);
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
  format: 'PDF' | 'XLSX'
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
