'use server';

import { after } from 'next/server';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { registerAbort, cancelAbort, cleanupAbort } from '@/lib/services/abort-registry';
import { getLLMUserFriendlyError } from '@/lib/services/llm';
import { generatePBLContent, PBLGenerationError } from '@/lib/services/pbl/pbl-generator';
import { createDraftVersion } from '@/lib/services/pbl/pbl-crud';
import { pblInterviewSchema } from '@/lib/schemas/interview-pbl';
import type { PBLInterviewInput } from '@/lib/schemas/interview-pbl';
import type { ConsultantProfile } from '@/types/database';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';

const ALLOWED_ROLES = ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'] as const;

function abortKey(userId: string) {
  return `test-pbl:${userId}`;
}

export interface TestPBLResult {
  pblId: string;
  projectId: string;
}

/**
 * /test-pbl 에서 호출되는 PBL 생성 액션 (OFA-11 재작성).
 *
 * 기존: 고정 fixture(PBL_INTERVIEW_SAMPLE)만 수용 → 폼 편집 불가
 * 신규: 사용자가 폼에서 편집한 `PBLInterviewInput` 전체를 수용
 *
 * 흐름:
 *  1. 인터뷰 스키마 엄격 검증
 *  2. 테스트 프로젝트(is_test_mode=true, track=PBL) 생성
 *  3. 인터뷰 JSONB 저장
 *  4. generatePBLContent 호출 → PBLContent 초안 생성
 *  5. createDraftVersion으로 pbl_reports에 DRAFT 저장
 *  6. 프로젝트 상태를 PBL_DRAFTED로 전이
 */
export async function generateTestPBL(
  interviewData: PBLInterviewInput,
): Promise<ActionResult<TestPBLResult>> {
  const auth = await requireAuthWithRole(ALLOWED_ROLES);
  if ('error' in auth) return { success: false, error: auth.error };

  // 엄격 검증
  const parsed = pblInterviewSchema.safeParse(interviewData);
  if (!parsed.success) {
    return {
      success: false,
      error: `PBL 인터뷰 데이터 검증 실패: ${parsed.error.errors[0]?.message ?? '알 수 없는 오류'}`,
    };
  }
  const validatedInput = parsed.data;

  const { user } = auth;
  const adminSupabase = createAdminClient();

  const courseOverview = validatedInput.courseOverview;

  // 프로젝트 생성 — 테스트 모드, PBL 트랙
  const { data: project, error: projectError } = await adminSupabase
    .from('projects')
    .insert({
      company_name: `[테스트] ${courseOverview.company_name || '샘플기업'}`,
      industry: courseOverview.industry_main || '제조업',
      company_size: 'medium',
      contact_name: courseOverview.contact?.name || '담당자',
      contact_email: courseOverview.contact?.email || `test-${Date.now()}@example.com`,
      contact_phone: courseOverview.contact?.phone || '',
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
    pbl_data: validatedInput,
    conducted_by: user.id,
  });
  if (interviewError) {
    console.error('[generateTestPBL] 인터뷰 저장 실패', interviewError);
    return { success: false, error: '테스트 인터뷰 저장에 실패했습니다.' };
  }

  let consultantProfile: ConsultantProfile | null = null;
  const { data: profile } = await adminSupabase
    .from('consultant_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (profile) consultantProfile = profile as ConsultantProfile;

  const diagnosisSummary = [
    `[테스트] ${courseOverview.company_name || '샘플기업'} 대상`,
    courseOverview.training_job ? `${courseOverview.training_job} 직무의` : '',
    `AI 기반 PBL 과정(${courseOverview.course_name ?? '과정명 미지정'})`,
  ]
    .filter(Boolean)
    .join(' ');

  const abortController = registerAbort(abortKey(user.id));

  try {
    const { content } = await generatePBLContent({
      interview: validatedInput as unknown as Record<string, unknown>,
      project: project as unknown as Record<string, unknown>,
      consultantProfile,
      diagnosisSummary,
      signal: abortController.signal,
    });

    const draft = await createDraftVersion(project.id, content, user.id, diagnosisSummary, null);

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
