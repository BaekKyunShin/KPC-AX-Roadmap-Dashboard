'use server';

import { after } from 'next/server';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { registerAbort, cancelAbort, cleanupAbort } from '@/lib/services/abort-registry';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { generatePBLContent, PBLGenerationError } from '@/lib/services/pbl/pbl-generator';
import { createDraftVersion } from '@/lib/services/pbl/pbl-crud';
import type { ConsultantProfile } from '@/types/database';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import type { PBLInterviewSample } from '../../../../e2e/fixtures/pbl-interview-sample';

const ALLOWED_ROLES = ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

function abortKey(userId: string) {
  return `test-pbl:${userId}`;
}

export interface TestPBLResult {
  pblId: string;
  projectId: string;
}

/**
 * /test-pbl 에서 호출되는 샘플 기반 PBL 생성 액션.
 *
 * 흐름:
 *  1. 테스트 프로젝트(is_test_mode=true) 생성 — PBL 트랙
 *  2. 샘플 인터뷰 JSONB를 interviews 테이블에 저장
 *  3. generatePBLContent 호출 → PBLContent 초안 생성
 *  4. createDraftVersion 으로 pbl_reports 에 DRAFT 저장
 *  5. 프로젝트 상태를 PBL_DRAFTED로 전이
 *
 * 반환: 생성된 pbl_report id + 테스트 프로젝트 id
 */
export async function generateTestPBL(
  interviewData: PBLInterviewSample,
): Promise<ActionResult<TestPBLResult>> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  const { user } = auth;
  const adminSupabase = createAdminClient();

  const courseOverview = interviewData.courseOverview;

  // 프로젝트 생성 — 테스트 모드, PBL 트랙
  const { data: project, error: projectError } = await adminSupabase
    .from('projects')
    .insert({
      company_name: `[테스트] ${courseOverview.company_name}`,
      industry: courseOverview.industry_main || '제조업',
      company_size: 'medium',
      contact_name: courseOverview.contact.name || '담당자',
      contact_email: courseOverview.contact.email || `test-${Date.now()}@example.com`,
      contact_phone: courseOverview.contact.phone || '',
      status: 'INTERVIEWED',
      track: 'PBL',
      is_test_mode: true,
      assigned_consultant_id: user.id,
      created_by: user.id,
    })
    .select('id, company_name, status, track, is_test_mode')
    .single();

  if (projectError || !project) {
    console.error('[generateTestPBL] 프로젝트 생성 실패', projectError);
    return { success: false, error: '테스트 프로젝트 생성에 실패했습니다.' };
  }

  // 인터뷰 데이터 저장 (pbl_data JSONB)
  const { error: interviewError } = await adminSupabase.from('interviews').insert({
    project_id: project.id,
    interview_date: new Date().toISOString().slice(0, 10),
    pbl_data: interviewData,
    conducted_by: user.id,
  });
  if (interviewError) {
    console.error('[generateTestPBL] 인터뷰 저장 실패', interviewError);
    return { success: false, error: '테스트 인터뷰 저장에 실패했습니다.' };
  }

  // 컨설턴트 프로필 (있으면 스냅샷에 반영)
  let consultantProfile: ConsultantProfile | null = null;
  const { data: profile } = await adminSupabase
    .from('consultant_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (profile) consultantProfile = profile as ConsultantProfile;

  // 진단 요약
  const diagnosisSummary = [
    `[테스트] ${courseOverview.company_name} 대상`,
    courseOverview.training_job ? `${courseOverview.training_job} 직무의` : '',
    `AI 기반 PBL 과정(${courseOverview.course_name ?? '과정명 미지정'})`,
  ]
    .filter(Boolean)
    .join(' ');

  const abortController = registerAbort(abortKey(user.id));

  try {
    const { content } = await generatePBLContent({
      interview: interviewData as unknown as Record<string, unknown>,
      project: project as unknown as Record<string, unknown>,
      consultantProfile,
      diagnosisSummary,
      signal: abortController.signal,
    });

    const draft = await createDraftVersion(
      project.id,
      content,
      user.id,
      diagnosisSummary,
      null,
    );

    // 프로젝트 상태 전이
    await adminSupabase
      .from('projects')
      .update({ status: 'PBL_DRAFTED' })
      .eq('id', project.id);

    after(async () => {
      await createAuditLog({
        actorUserId: user.id,
        action: 'TEST_PROJECT_CREATE',
        targetType: 'project',
        targetId: project.id,
        meta: {
          is_test_mode: true,
          track: 'PBL',
          pbl_report_id: draft.id,
          source: '/test-pbl',
        },
      });
    });

    return {
      success: true,
      data: { pblId: draft.id, projectId: project.id },
    };
  } catch (error) {
    console.error('[generateTestPBL Error]', error);
    if (error instanceof PBLGenerationError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: getLLMUserFriendlyError(error) };
  } finally {
    cleanupAbort(abortKey(user.id));
  }
}

export async function cancelTestPBLGeneration(): Promise<SimpleActionResult> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };
  cancelAbort(abortKey(auth.user.id));
  return { success: true };
}
