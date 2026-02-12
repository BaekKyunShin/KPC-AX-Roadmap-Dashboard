import { createAdminClient } from '@/lib/supabase/admin';
import { callLLMForJSON } from './llm';
import { createAuditLog } from './audit';
import { createNotificationForAdmins } from './notification';
import { checkQuotaExceeded, recordLLMUsage } from './quota';
import type { ConsultantProfile } from '@/types/database';
import type { SttInsights } from '@/lib/schemas/interview';

// 추출된 모듈에서 re-export
export { isSttInsights, hasItems, toMarkdownList, formatSttInsights, buildSttInsightsSection } from './roadmap/roadmap-stt-formatter';
export { sumModuleHours, normalizeCoursesHours, normalizePBLHours, normalizeRoadmapHours } from './roadmap/roadmap-time-utils';
export { buildRoadmapMatrixFromCourses } from './roadmap/roadmap-matrix-builder';
export { validateRoadmap } from './roadmap/roadmap-validator';
export { buildSystemPrompt, buildUserPrompt } from './roadmap/roadmap-prompts';

// 추출된 모듈에서 내부 사용을 위한 import
import { normalizeRoadmapHours } from './roadmap/roadmap-time-utils';
import { buildRoadmapMatrixFromCourses } from './roadmap/roadmap-matrix-builder';
import { validateRoadmap } from './roadmap/roadmap-validator';
import { buildSystemPrompt, buildUserPrompt } from './roadmap/roadmap-prompts';

// 커리큘럼 모듈 타입 (courses용)
export interface CurriculumModule {
  module_name: string; // 모듈명
  hours: number; // 모듈 시간 (각 모듈마다 다를 수 있음)
  details: string[]; // 세부 커리큘럼 (개조식, 2~5개)
  practice: string; // 실습/과제 내용
}

// 과정 상세 타입 (courses 배열용)
export interface RoadmapCell {
  course_name: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  target_task: string; // 대상 업무
  target_audience: string; // 교육 대상
  recommended_hours: number; // 권장 시간 (= curriculum 모듈 시간 합계)
  curriculum: CurriculumModule[]; // 커리큘럼 모듈 배열
  tools: {
    name: string;
    free_tier_info: string; // 무료 범위 표기 (필수)
  }[];
  expected_outcome: string; // 기대 효과
  measurement_method: string; // 측정 방법
  prerequisites: string[]; // 준비물/데이터/권한
}

// 로드맵 매트릭스 셀 타입 (간소화된 버전 - UI 표시용)
export interface RoadmapMatrixCell {
  course_name: string;
  recommended_hours: number;
}

// 로드맵 행 (업무별) - 한 셀에 여러 과정 가능
export interface RoadmapRow {
  task_id: string;
  task_name: string;
  beginner: RoadmapMatrixCell[]; // 한 셀에 여러 과정 가능
  intermediate: RoadmapMatrixCell[];
  advanced: RoadmapMatrixCell[];
}

// PBL 커리큘럼 모듈 타입 (courses의 CurriculumModule 확장)
export interface PBLCurriculumModule extends CurriculumModule {
  // CurriculumModule 기본 필드: module_name, hours, details, practice
  // PBL 확장 필드:
  deliverables: string[]; // 각 모듈에서 산출되는 결과물
  tools: {
    name: string;
    free_tier_info: string;
  }[];
}

// PBL 최적 과정 (과정 상세에서 선정된 과정)
export interface PBLCourse {
  // 선정된 과정 정보 (courses 배열에서 선택)
  selected_course_name: string; // courses 배열에 있는 과정명과 일치해야 함
  selected_course_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'; // 선택된 과정의 레벨
  selected_course_task: string; // 선택된 과정의 대상 업무

  // 선정 이유 (컨설턴트 전문성, 페인포인트, 현실 가능성 종합 고려)
  selection_rationale: {
    consultant_expertise_fit: string; // 컨설턴트 전문성 적합도 설명
    pain_point_alignment: string; // 고객사 페인포인트와의 연관성
    feasibility_assessment: string; // 현실 가능성 평가
    summary: string; // 종합 선정 이유 요약
  };

  // PBL 상세 설계 (선정된 과정과 기본 구조 동일)
  course_name: string; // PBL 과정명 (선정된 과정 기반)
  total_hours: number; // = curriculum 모듈 시간 합계 (선정된 과정의 recommended_hours와 동일)
  target_tasks: string[]; // 대상 업무들
  target_audience: string;

  // PBL 커리큘럼 (선정된 과정의 curriculum 기반 + PBL 상세화)
  // - module_name, hours, details: 선정된 과정과 동일
  // - practice: 더 구체적인 실습 내용으로 확장
  // - deliverables, tools: PBL 전용 상세 정보
  curriculum: PBLCurriculumModule[];

  // 최종 결과물 및 효과
  final_deliverables: string[]; // PBL 완료 시 최종 산출물
  expected_outcomes: string[]; // 기대 효과
  business_impact: string; // 비즈니스 임팩트/ROI 설명
  measurement_methods: string[]; // 측정 방법
  prerequisites: string[]; // 준비물/데이터/권한
}

// LLM 출력용 로드맵 결과 (roadmap_matrix 없음)
interface LLMRoadmapResult {
  diagnosis_summary: string;
  pbl_course: PBLCourse;
  courses: RoadmapCell[]; // 모든 과정 상세 리스트
}

// 전체 로드맵 결과 (UI/DB용 - roadmap_matrix 포함)
export interface RoadmapResult {
  diagnosis_summary: string;
  roadmap_matrix: RoadmapRow[]; // courses에서 자동 생성
  pbl_course: PBLCourse;
  courses: RoadmapCell[]; // 모든 과정 상세 리스트
}


// 검증 결과
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

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

  // 쿼터 확인
  const quotaCheck = await checkQuotaExceeded(actorUserId);
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
    console.error('[generateRoadmap] 프로젝트 조회 실패:', projectResult.error);
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

  // LLM 호출 (roadmap_matrix 없이 courses만 생성)
  const rawLlmResult = await callLLMForJSON<LLMRoadmapResult>(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7 } // maxTokens는 기본값(20000) 사용
  );

  // 사용량 기록
  await recordLLMUsage(actorUserId);

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

  // 프로젝트 상태 업데이트
  await supabase
    .from('projects')
    .update({ status: 'ROADMAP_DRAFTED' })
    .eq('id', projectId);

  // 감사 로그
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
  // 1. 쿼터 확인
  const quotaCheck = await checkQuotaExceeded(actorUserId);
  if (quotaCheck.exceeded) {
    throw new Error(quotaCheck.message || '사용량 한도를 초과했습니다.');
  }

  // 2. 데이터 구성
  const projectData = buildTestProjectData(input);
  const interview = buildTestInterviewData(input, sttInsights);

  // 3. LLM 호출
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(projectData, null, interview, consultantProfile, undefined, true);

  const rawLlmResult = await callLLMForJSON<LLMRoadmapResult>(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7 }
  );

  // 4. 사용량 기록
  await recordLLMUsage(actorUserId);

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
  // 1. 쿼터 확인
  const quotaCheck = await checkQuotaExceeded(actorUserId);
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

  // 4. LLM 호출
  const rawLlmResult = await callLLMForJSON<LLMRoadmapResult>(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: revisionUserPrompt },
    ],
    { temperature: 0.7 }
  );

  // 5. 사용량 기록
  await recordLLMUsage(actorUserId);

  // 6. 시간 보정 적용
  const llmResult = normalizeRoadmapHours(rawLlmResult);

  // 7. 결과 생성 및 검증
  const result: RoadmapResult = {
    ...llmResult,
    roadmap_matrix: buildRoadmapMatrixFromCourses(llmResult.courses),
  };
  const validation = validateRoadmap(result);

  return { result, validation };
}


/**
 * 로드맵 최종 확정
 */
export async function finalizeRoadmap(
  roadmapId: string,
  actorUserId: string
): Promise<void> {
  const supabase = createAdminClient();

  // 현재 로드맵 조회
  const { data: roadmap } = await supabase
    .from('roadmap_versions')
    .select('*, projects!inner(assigned_consultant_id)')
    .eq('id', roadmapId)
    .single();

  if (!roadmap) {
    throw new Error('로드맵을 찾을 수 없습니다.');
  }

  // 배정된 컨설턴트만 최종 확정 가능
  const projectData = roadmap.projects as { assigned_consultant_id: string };
  if (projectData.assigned_consultant_id !== actorUserId) {
    throw new Error('배정된 컨설턴트만 최종 확정할 수 있습니다.');
  }

  // 기존 확정본 → 이전 확정본
  await supabase
    .from('roadmap_versions')
    .update({ status: 'ARCHIVED' })
    .eq('project_id', roadmap.project_id)
    .eq('status', 'FINAL');

  // 현재 로드맵 → 확정본
  await supabase
    .from('roadmap_versions')
    .update({
      status: 'FINAL',
      finalized_by: actorUserId,
      finalized_at: new Date().toISOString(),
    })
    .eq('id', roadmapId);

  // 프로젝트 상태 업데이트
  await supabase
    .from('projects')
    .update({ status: 'FINALIZED' })
    .eq('id', roadmap.project_id);

  // 감사 로그
  await createAuditLog({
    actorUserId,
    action: 'ROADMAP_FINALIZE',
    targetType: 'roadmap',
    targetId: roadmapId,
    meta: {
      project_id: roadmap.project_id,
      version_number: roadmap.version_number,
    },
  });

  // 운영관리자에게 로드맵 확정 알림 (테스트 모드 제외)
  const { data: projectInfo } = await supabase
    .from('projects')
    .select('company_name, is_test_mode')
    .eq('id', roadmap.project_id)
    .single();

  if (!projectInfo?.is_test_mode) {
    await createNotificationForAdmins({
      type: 'roadmap_finalized',
      title: '로드맵 확정',
      message: `${projectInfo?.company_name || '(알 수 없는 기업)'} 프로젝트 로드맵이 최종 확정되었습니다.`,
      link: `/ops/projects/${roadmap.project_id}`,
    });
  }
}

/**
 * 로드맵 조회
 */
export async function getRoadmapVersions(projectId: string) {
  const supabase = createAdminClient();

  const { data: versions } = await supabase
    .from('roadmap_versions')
    .select('*')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false });

  return versions || [];
}

/**
 * 특정 로드맵 버전 조회
 */
export async function getRoadmapVersion(roadmapId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('roadmap_versions')
    .select('*')
    .eq('id', roadmapId)
    .single();

  return data;
}

/**
 * 로드맵 수동 편집
 * DRAFT 상태의 로드맵만 편집 가능
 */
export async function updateRoadmapManually(
  roadmapId: string,
  actorUserId: string,
  updates: {
    diagnosis_summary?: string;
    roadmap_matrix?: RoadmapRow[];
    pbl_course?: PBLCourse;
    courses?: RoadmapCell[];
  }
): Promise<{ success: boolean; validation: ValidationResult; error?: string }> {
  const supabase = createAdminClient();

  // 현재 로드맵 조회
  const { data: roadmap, error: fetchError } = await supabase
    .from('roadmap_versions')
    .select('*, projects!inner(assigned_consultant_id)')
    .eq('id', roadmapId)
    .single();

  if (fetchError || !roadmap) {
    return { success: false, validation: { isValid: false, errors: [], warnings: [] }, error: '로드맵을 찾을 수 없습니다.' };
  }

  // DRAFT 상태만 편집 가능
  if (roadmap.status !== 'DRAFT') {
    return { success: false, validation: { isValid: false, errors: [], warnings: [] }, error: 'DRAFT 상태의 로드맵만 편집할 수 있습니다.' };
  }

  // 배정된 컨설턴트 확인
  const projectData = roadmap.projects as { assigned_consultant_id: string };
  if (projectData.assigned_consultant_id !== actorUserId) {
    return { success: false, validation: { isValid: false, errors: [], warnings: [] }, error: '배정된 컨설턴트만 로드맵을 편집할 수 있습니다.' };
  }

  // 새 데이터 구성
  const newCourses = updates.courses ?? roadmap.courses;
  const newResult: RoadmapResult = {
    diagnosis_summary: updates.diagnosis_summary ?? roadmap.diagnosis_summary,
    // courses가 업데이트되면 roadmap_matrix 자동 재생성
    roadmap_matrix: updates.courses
      ? buildRoadmapMatrixFromCourses(newCourses)
      : (updates.roadmap_matrix ?? roadmap.roadmap_matrix),
    pbl_course: updates.pbl_course ?? roadmap.pbl_course,
    courses: newCourses,
  };

  // 검증 실행
  const validation = validateRoadmap(newResult);

  // DB 업데이트
  const { error: updateError } = await supabase
    .from('roadmap_versions')
    .update({
      diagnosis_summary: newResult.diagnosis_summary,
      roadmap_matrix: newResult.roadmap_matrix,
      pbl_course: newResult.pbl_course,
      courses: newResult.courses,
      free_tool_validated: validation.errors.filter(e => e.includes('무료') || e.includes('유료')).length === 0,
      time_limit_validated: validation.errors.filter(e => e.includes('시간')).length === 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roadmapId);

  if (updateError) {
    return { success: false, validation, error: updateError.message };
  }

  // 감사 로그
  await createAuditLog({
    actorUserId,
    action: 'ROADMAP_UPDATE',
    targetType: 'roadmap',
    targetId: roadmapId,
    meta: {
      project_id: roadmap.project_id,
      version_number: roadmap.version_number,
      edited_fields: Object.keys(updates),
      validation_result: {
        isValid: validation.isValid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
      },
    },
  });

  return { success: true, validation };
}
