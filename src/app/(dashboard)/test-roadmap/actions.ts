'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { testInputSchema, type TestInputData } from '@/lib/schemas/test-roadmap';
import { generateRoadmap, type RoadmapResult, type ValidationResult } from '@/lib/services/roadmap';
import { createAuditLog } from '@/lib/services/audit';
import { revalidatePath } from 'next/cache';

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 테스트 케이스 생성 및 로드맵 생성
 */
export async function createTestRoadmap(
  input: TestInputData
): Promise<ActionResult<{ caseId: string; roadmapId: string; result: RoadmapResult; validation: ValidationResult }>> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  // 역할 확인
  const { data: profile } = await supabase.from('users').select('role, status').eq('id', user.id).single();

  if (!profile || profile.role !== 'CONSULTANT_APPROVED' || profile.status !== 'ACTIVE') {
    return { success: false, error: '승인된 컨설턴트만 테스트 로드맵을 생성할 수 있습니다.' };
  }

  // 입력 검증
  const validation = testInputSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  try {
    // 1. 테스트 케이스 생성
    const { data: newCase, error: caseError } = await adminSupabase
      .from('cases')
      .insert({
        company_name: input.company_name,
        industry: input.industry,
        company_size: input.company_size,
        contact_name: '테스트',
        contact_email: 'test@test.com',
        status: 'INTERVIEWED', // 인터뷰 완료 상태로 시작
        is_test_mode: true,
        test_created_by: user.id,
        created_by: user.id,
        assigned_consultant_id: user.id, // 본인에게 배정
      })
      .select('id')
      .single();

    if (caseError || !newCase) {
      console.error('[createTestRoadmap] Case creation error:', caseError);
      return { success: false, error: '테스트 케이스 생성에 실패했습니다.' };
    }

    // 2. 인터뷰 데이터 저장 (간소화된 형식)
    const { data: newInterview, error: interviewError } = await adminSupabase
      .from('interviews')
      .insert({
        case_id: newCase.id,
        interviewer_id: user.id,
        interview_date: new Date().toISOString().split('T')[0],
        company_details: {},
        job_tasks: input.job_tasks.map((task, index) => ({
          id: `test-task-${index}`,
          job_category: '테스트',
          task_name: task.task_name,
          task_description: task.task_description,
          current_output: '',
          current_workflow: '',
          priority: index + 1,
        })),
        pain_points: input.pain_points.map((point, index) => ({
          id: `test-pain-${index}`,
          job_task_id: `test-task-0`,
          description: point.description,
          severity: point.severity,
          priority: index + 1,
        })),
        constraints: [],
        improvement_goals: input.improvement_goals.map((goal, index) => ({
          id: `test-goal-${index}`,
          job_task_id: `test-task-0`,
          kpi_name: '개선 목표',
          goal_description: goal.goal_description,
          measurement_method: '',
        })),
        notes: '',
        customer_requirements: input.customer_requirements || '',
      })
      .select('id')
      .single();

    if (interviewError || !newInterview) {
      console.error('[createTestRoadmap] Interview creation error:', interviewError);
      // 케이스 롤백
      await adminSupabase.from('cases').delete().eq('id', newCase.id);
      return { success: false, error: '인터뷰 데이터 저장에 실패했습니다.' };
    }

    // 3. 로드맵 생성 (테스트 모드)
    const roadmapResult = await generateRoadmap(newCase.id, user.id, undefined, true);

    // 4. 감사 로그
    await createAuditLog({
      actorUserId: user.id,
      action: 'TEST_CASE_CREATE',
      targetType: 'case',
      targetId: newCase.id,
      meta: {
        company_name: input.company_name,
        industry: input.industry,
        is_test_mode: true,
      },
    });

    await createAuditLog({
      actorUserId: user.id,
      action: 'TEST_ROADMAP_CREATE',
      targetType: 'roadmap',
      targetId: roadmapResult.roadmapId,
      meta: {
        case_id: newCase.id,
        is_test_mode: true,
      },
    });

    revalidatePath('/test-roadmap');

    return {
      success: true,
      data: {
        caseId: newCase.id,
        roadmapId: roadmapResult.roadmapId,
        result: roadmapResult.result,
        validation: roadmapResult.validation,
      },
    };
  } catch (error) {
    console.error('[createTestRoadmap] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '로드맵 생성 중 오류가 발생했습니다.',
    };
  }
}

/**
 * 테스트 기록 조회
 */
export async function getTestHistory(): Promise<
  ActionResult<
    {
      id: string;
      company_name: string;
      industry: string;
      company_size: string;
      created_at: string;
      roadmap_count: number;
    }[]
  >
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  const { data: cases, error } = await supabase
    .from('cases')
    .select(
      `
      id,
      company_name,
      industry,
      company_size,
      created_at,
      roadmap_versions(count)
    `
    )
    .eq('is_test_mode', true)
    .eq('test_created_by', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[getTestHistory] Error:', error);
    return { success: false, error: '테스트 기록 조회에 실패했습니다.' };
  }

  return {
    success: true,
    data: (cases || []).map((c) => ({
      id: c.id,
      company_name: c.company_name,
      industry: c.industry,
      company_size: c.company_size,
      created_at: c.created_at,
      roadmap_count: Array.isArray(c.roadmap_versions) ? c.roadmap_versions.length : 0,
    })),
  };
}

/**
 * 테스트 케이스의 로드맵 조회
 */
export async function getTestRoadmap(caseId: string): Promise<
  ActionResult<{
    case: {
      id: string;
      company_name: string;
      industry: string;
      company_size: string;
    };
    roadmap: {
      id: string;
      version_number: number;
      status: string;
      diagnosis_summary: string;
      roadmap_matrix: unknown;
      pbl_course: unknown;
      courses: unknown;
      free_tool_validated: boolean;
      time_limit_validated: boolean;
      created_at: string;
    } | null;
  }>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  // 케이스 조회 (본인이 생성한 테스트 케이스만)
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('id, company_name, industry, company_size')
    .eq('id', caseId)
    .eq('is_test_mode', true)
    .eq('test_created_by', user.id)
    .single();

  if (caseError || !caseData) {
    return { success: false, error: '테스트 케이스를 찾을 수 없습니다.' };
  }

  // 최신 로드맵 조회
  const { data: roadmap } = await supabase
    .from('roadmap_versions')
    .select('*')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  return {
    success: true,
    data: {
      case: caseData,
      roadmap: roadmap
        ? {
            id: roadmap.id,
            version_number: roadmap.version_number,
            status: roadmap.status,
            diagnosis_summary: roadmap.diagnosis_summary,
            roadmap_matrix: roadmap.roadmap_matrix,
            pbl_course: roadmap.pbl_course,
            courses: roadmap.courses,
            free_tool_validated: roadmap.free_tool_validated,
            time_limit_validated: roadmap.time_limit_validated,
            created_at: roadmap.created_at,
          }
        : null,
    },
  };
}

/**
 * 테스트 케이스 삭제
 */
export async function deleteTestCase(caseId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  // 본인이 생성한 테스트 케이스인지 확인
  const { data: caseData } = await supabase
    .from('cases')
    .select('id')
    .eq('id', caseId)
    .eq('is_test_mode', true)
    .eq('test_created_by', user.id)
    .single();

  if (!caseData) {
    return { success: false, error: '테스트 케이스를 찾을 수 없습니다.' };
  }

  // 관련 데이터 삭제 (cascade가 설정되어 있지 않다면 수동 삭제)
  await adminSupabase.from('roadmap_versions').delete().eq('case_id', caseId);
  await adminSupabase.from('interviews').delete().eq('case_id', caseId);

  const { error } = await adminSupabase.from('cases').delete().eq('id', caseId);

  if (error) {
    console.error('[deleteTestCase] Error:', error);
    return { success: false, error: '삭제에 실패했습니다.' };
  }

  // 감사 로그
  await createAuditLog({
    actorUserId: user.id,
    action: 'TEST_CASE_DELETE',
    targetType: 'case',
    targetId: caseId,
    meta: { is_test_mode: true },
  });

  revalidatePath('/test-roadmap');

  return { success: true };
}
