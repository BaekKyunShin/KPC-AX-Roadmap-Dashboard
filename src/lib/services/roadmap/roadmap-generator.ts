import { createAdminClient } from '@/lib/supabase/admin';
import type { ConsultantProfile } from '@/types/database';
import type { SttInsights } from '@/lib/schemas/interview';
import { callLLMForJSON } from '../llm';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';
import { checkAndRecordLLMUsage } from '../quota';
import type { LLMRoadmapResult, RoadmapResult, ValidationResult } from './roadmap-types';
import { normalizeRoadmapHours } from './roadmap-time-utils';
import { buildRoadmapMatrixFromCourses } from './roadmap-matrix-builder';
import { validateRoadmap } from './roadmap-validator';
import { buildSystemPrompt, buildUserPrompt } from './roadmap-prompts';

// ============================================================================
// 상수
// ============================================================================

/** 로드맵 생성 LLM 온도값 (0.7 = 적절한 창의성) */
const LLM_TEMPERATURE = 0.7;

// ============================================================================
// 로드맵 생성
// ============================================================================

/**
 * 로드맵 생성
 * @param projectId - 프로젝트 ID
 * @param actorUserId - 생성자 user ID
 * @param revisionPrompt - 수정 요청 (선택)
 * @param isTestMode - 테스트 모드 여부 (자가진단 없이 생성)
 */
export async function generateRoadmap(
  projectId: string,
  actorUserId: string,
  revisionPrompt?: string,
  isTestMode: boolean = false
): Promise<{ roadmapId: string; result: RoadmapResult; validation: ValidationResult }> {
  const supabase = createAdminClient();

  // 원자적 쿼터 확인 + 사용량 기록 (동시 요청 시 한도 우회 방지)
  const quotaCheck = await checkAndRecordLLMUsage(actorUserId);
  if (quotaCheck.exceeded) {
    throw new Error(quotaCheck.message || '사용량 한도를 초과했습니다.');
  }

  // 프로젝트, 자가진단, 인터뷰 병렬 조회 (성능 최적화)
  const [projectResult, selfAssessmentResult, interviewResult] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('self_assessments').select('*').eq('project_id', projectId),
    supabase.from('interviews').select('*').eq('project_id', projectId),
  ]);

  if (projectResult.error || !projectResult.data) {
    console.error('[generateRoadmap Error] 프로젝트 조회:', projectResult.error);
    throw new Error('프로젝트를 찾을 수 없습니다.');
  }

  const projectData = projectResult.data;
  const selfAssessment = selfAssessmentResult.data?.[0];
  const interview = interviewResult.data?.[0];

  // 테스트 모드가 아닐 경우에만 자가진단 필수
  if (!selfAssessment && !isTestMode) {
    throw new Error('자가진단 결과가 없습니다.');
  }

  if (!interview) {
    throw new Error('인터뷰 데이터가 없습니다.');
  }

  // 컨설턴트 프로필 스냅샷
  let consultantSnapshot: ConsultantProfile | null = null;
  if (projectData.assigned_consultant_id) {
    const { data: profile } = await supabase
      .from('consultant_profiles')
      .select('*')
      .eq('user_id', projectData.assigned_consultant_id)
      .single();
    consultantSnapshot = profile;
  }

  // LLM 프롬프트 생성
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(projectData, selfAssessment, interview, consultantSnapshot, revisionPrompt, isTestMode);

  // LLM 호출 (roadmap_matrix 없이 courses만 생성, 쿼터는 이미 원자적으로 차감됨)
  const rawLlmResult = await callLLMForJSON<LLMRoadmapResult>(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: LLM_TEMPERATURE } // maxTokens는 기본값(20000) 사용
  );

  // 시간 보정 적용 (recommended_hours와 커리큘럼 시간 일치시키기)
  const llmResult = normalizeRoadmapHours(rawLlmResult);

  // courses에서 roadmap_matrix 자동 생성
  const result: RoadmapResult = {
    ...llmResult,
    roadmap_matrix: buildRoadmapMatrixFromCourses(llmResult.courses),
  };

  // 검증
  const validation = validateRoadmap(result);

  // 버전 번호 결정
  const { data: latestVersion } = await supabase
    .from('roadmap_versions')
    .select('version_number')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  const newVersionNumber = (latestVersion?.version_number || 0) + 1;

  // 로드맵 버전 저장
  const { data: newRoadmap, error: insertError } = await supabase
    .from('roadmap_versions')
    .insert({
      project_id: projectId,
      version_number: newVersionNumber,
      status: 'DRAFT',
      consultant_profile_snapshot: consultantSnapshot || {},
      diagnosis_summary: result.diagnosis_summary,
      roadmap_matrix: result.roadmap_matrix,
      pbl_course: result.pbl_course,
      courses: result.courses,
      revision_prompt: revisionPrompt || null,
      free_tool_validated: validation.errors.filter(e => e.includes('무료')).length === 0,
      time_limit_validated: validation.errors.filter(e => e.includes('시간')).length === 0,
      created_by: actorUserId,
    })
    .select('id')
    .single();

  if (insertError || !newRoadmap) {
    throw new Error(`로드맵 저장 실패: ${insertError?.message}`);
  }

  // 프로젝트 상태 업데이트 (FINALIZED에서는 역방향 전이 방지)
  if (projectData.status !== 'FINALIZED') {
    await supabase
      .from('projects')
      .update({ status: 'ROADMAP_DRAFTED' })
      .eq('id', projectId);
  }

  // 감사로그
  await createAuditLog({
    actorUserId,
    action: 'ROADMAP_CREATE',
    targetType: 'roadmap',
    targetId: newRoadmap.id,
    meta: {
      project_id: projectId,
      version_number: newVersionNumber,
      has_revision_prompt: !!revisionPrompt,
      validation_passed: validation.isValid,
    },
  });

  // 운영관리자에게 로드맵 초안 알림 (테스트 모드 제외)
  if (!isTestMode) {
    const { data: projectInfo } = await supabase
      .from('projects')
      .select('company_name')
      .eq('id', projectId)
      .single();

    await createNotificationForAdmins({
      type: 'roadmap_draft',
      title: '로드맵 초안 생성',
      message: `${projectInfo?.company_name || '(알 수 없는 기업)'} 프로젝트 로드맵 초안이 생성되었습니다.`,
      link: `/ops/projects/${projectId}`,
    });
  }

  return {
    roadmapId: newRoadmap.id,
    result,
    validation,
  };
}

// ============================================================================
// 테스트 전용 함수 (DB 저장 없음)
// ============================================================================

/** 테스트 로드맵 생성용 입력 데이터 (실제 인터뷰와 동일한 구조) */
export interface TestRoadmapInput {
  // 기업 기본정보
  company_name: string;
  industry: string;
  sub_industries?: string[];
  company_size: string;
  // 인터뷰 데이터
  interview_date: string;
  participants: { id: string; name: string; position?: string }[];
  company_details: {
    systems_and_tools?: string[];
    ai_experience: string;
  };
  job_tasks: { id: string; task_name: string; task_description: string }[];
  pain_points: { id: string; description: string; severity: string; related_task_ids?: string[] }[];
  constraints?: { id: string; type: string; description: string; severity: string; workaround?: string }[];
  improvement_goals: {
    id: string;
    goal_description: string;
    kpi?: string;
    measurement_method?: string;
    target_value?: string;
    before_value?: string;
    related_task_ids?: string[];
  }[];
  notes?: string;
  customer_requirements?: string;
}

/** 테스트용 프로젝트 데이터 구성 */
function buildTestProjectData(input: TestRoadmapInput) {
  return {
    company_name: input.company_name,
    industry: input.industry,
    sub_industries: input.sub_industries || [],
    company_size: input.company_size,
    customer_comment: input.customer_requirements || '',
  };
}

/** 테스트용 인터뷰 데이터 구성 (실제 인터뷰와 동일한 구조) */
function buildTestInterviewData(input: TestRoadmapInput, sttInsights?: SttInsights) {
  return {
    interview_date: input.interview_date,
    participants: input.participants,
    company_details: input.company_details,
    job_tasks: input.job_tasks.map((task, index) => ({
      id: task.id || `test-task-${index}`,
      job_category: '테스트',
      task_name: task.task_name,
      task_description: task.task_description,
      current_output: '',
      current_workflow: '',
      priority: index + 1,
    })),
    pain_points: input.pain_points.map((point, index) => ({
      id: point.id || `test-pain-${index}`,
      job_task_id: point.related_task_ids?.[0] || 'test-task-0',
      description: point.description,
      severity: point.severity,
      priority: index + 1,
    })),
    constraints: input.constraints?.map((constraint, index) => ({
      id: constraint.id || `test-constraint-${index}`,
      type: constraint.type,
      description: constraint.description,
      severity: constraint.severity,
      workaround: constraint.workaround || '',
    })) || [],
    improvement_goals: input.improvement_goals.map((goal, index) => ({
      id: goal.id || `test-goal-${index}`,
      job_task_id: goal.related_task_ids?.[0] || 'test-task-0',
      kpi_name: goal.kpi || '개선 목표',
      goal_description: goal.goal_description,
      measurement_method: goal.measurement_method || '',
      target_value: goal.target_value || '',
      before_value: goal.before_value || '',
    })),
    notes: input.notes || '',
    customer_requirements: input.customer_requirements || '',
    stt_insights: sttInsights || null,
  };
}

/**
 * 테스트 로드맵 생성 (DB 저장 없이 LLM 결과만 반환)
 *
 * 테스트/연습 목적으로 사용되며, 프로젝트나 로드맵 버전을 DB에 저장하지 않습니다.
 */
export async function generateTestRoadmap(
  input: TestRoadmapInput,
  actorUserId: string,
  consultantProfile: ConsultantProfile | null,
  sttInsights?: SttInsights
): Promise<{ result: RoadmapResult; validation: ValidationResult }> {
  // 1. 원자적 쿼터 확인 + 사용량 기록
  const quotaCheck = await checkAndRecordLLMUsage(actorUserId);
  if (quotaCheck.exceeded) {
    throw new Error(quotaCheck.message || '사용량 한도를 초과했습니다.');
  }

  // 2. 데이터 구성
  const projectData = buildTestProjectData(input);
  const interview = buildTestInterviewData(input, sttInsights);

  // 3. LLM 호출 (쿼터는 이미 원자적으로 차감됨)
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(projectData, null, interview, consultantProfile, undefined, true);

  const rawLlmResult = await callLLMForJSON<LLMRoadmapResult>(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: LLM_TEMPERATURE }
  );

  // 4. 시간 보정 적용
  const llmResult = normalizeRoadmapHours(rawLlmResult);

  // 5. 결과 생성 및 검증
  const result: RoadmapResult = {
    ...llmResult,
    roadmap_matrix: buildRoadmapMatrixFromCourses(llmResult.courses),
  };
  const validation = validateRoadmap(result);

  return { result, validation };
}

/**
 * 테스트 로드맵 수정 요청 (DB 저장 없이 LLM 결과만 반환)
 *
 * 기존 로드맵 결과와 수정 요청을 받아서 수정된 로드맵을 생성합니다.
 */
export async function reviseTestRoadmap(
  input: TestRoadmapInput,
  previousResult: RoadmapResult,
  revisionPrompt: string,
  actorUserId: string,
  consultantProfile: ConsultantProfile | null
): Promise<{ result: RoadmapResult; validation: ValidationResult }> {
  // 1. 원자적 쿼터 확인 + 사용량 기록
  const quotaCheck = await checkAndRecordLLMUsage(actorUserId);
  if (quotaCheck.exceeded) {
    throw new Error(quotaCheck.message || '사용량 한도를 초과했습니다.');
  }

  // 2. 데이터 구성
  const projectData = buildTestProjectData(input);
  const interview = buildTestInterviewData(input);

  // 3. 수정 요청 프롬프트 구성
  const systemPrompt = buildSystemPrompt();
  const baseUserPrompt = buildUserPrompt(projectData, null, interview, consultantProfile, undefined, true);

  const revisionUserPrompt = `${baseUserPrompt}

## 기존 로드맵 결과

아래는 이전에 생성된 로드맵입니다. 이 로드맵을 기반으로 수정 요청을 반영해주세요.

### 진단 요약
${previousResult.diagnosis_summary}

### 기존 과정 목록
${JSON.stringify(previousResult.courses, null, 2)}

### 기존 PBL 과정
${JSON.stringify(previousResult.pbl_course, null, 2)}

## 수정 요청

사용자가 다음과 같은 수정을 요청했습니다:
${revisionPrompt}

위 수정 요청을 반영하여 로드맵을 재생성해주세요. 수정 요청에 언급되지 않은 부분은 기존 내용을 유지해도 됩니다.
단, 최종 출력은 반드시 완전한 JSON 형식으로 전체 로드맵을 출력해야 합니다.`;

  // 4. LLM 호출 (쿼터는 이미 원자적으로 차감됨)
  const rawLlmResult = await callLLMForJSON<LLMRoadmapResult>(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: revisionUserPrompt },
    ],
    { temperature: LLM_TEMPERATURE }
  );

  // 5. 시간 보정 적용
  const llmResult = normalizeRoadmapHours(rawLlmResult);

  // 6. 결과 생성 및 검증
  const result: RoadmapResult = {
    ...llmResult,
    roadmap_matrix: buildRoadmapMatrixFromCourses(llmResult.courses),
  };
  const validation = validateRoadmap(result);

  return { result, validation };
}
