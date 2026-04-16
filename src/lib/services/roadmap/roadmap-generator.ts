import { createAdminClient } from '@/lib/supabase/admin';
import type { ConsultantProfile } from '@/types/database';
import type { SttInsights } from '@/lib/schemas/interview';
import { roadmapContentSchema } from '@/lib/schemas/roadmap';
import { callLLMForJSON, type LLMMessage } from '../llm';
import { createAuditLog } from '../audit';
import { createNotificationForAdmins } from '../notification';
import { checkAndRecordLLMUsage } from '../quota';
import type { LLMRoadmapResult, RoadmapResult, ValidationResult } from './roadmap-types';
import { normalizeRoadmapHours } from './roadmap-time-utils';
import { validateRoadmap } from './roadmap-validator';
import { buildSystemPrompt, buildUserPrompt } from './roadmap-prompts';
import { toRoadmapVersionColumns } from './roadmap-storage-mapper';
import { validateStatusTransition } from '@/lib/constants/status';

// ============================================================================
// 상수 / 에러 클래스
// ============================================================================

/** 로드맵 생성 LLM 온도값 (0.7 = 적절한 창의성) */
const LLM_TEMPERATURE = 0.7;

/**
 * LLM 응답이 산인공 양식 스키마에 맞지 않을 때 throw.
 * UI는 이 에러를 잡아 "수동 편집이 필요합니다" 메시지를 노출.
 */
export class RoadmapStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RoadmapStorageError';
  }
}

/** LLM 호출 + 스키마 검증 + 시간 안전 보정 + validateRoadmap 실행 */
async function callLLMAndBuildRoadmap(
  messages: LLMMessage[],
  signal?: AbortSignal,
): Promise<{ result: RoadmapResult; validation: ValidationResult }> {
  const rawLlmResult = await callLLMForJSON<LLMRoadmapResult>(
    messages,
    { temperature: LLM_TEMPERATURE },
    2,
    signal,
  );

  // Zod 스키마 검증 — 실패 시 수동편집 유도
  const parsed = roadmapContentSchema.safeParse(rawLlmResult);
  if (!parsed.success) {
    throw new RoadmapStorageError(
      'LLM이 산인공 양식에 맞지 않는 결과를 반환했습니다. 수동 편집이 필요합니다.',
      { cause: parsed.error },
    );
  }

  const result: RoadmapResult = normalizeRoadmapHours(parsed.data);
  const validation = validateRoadmap(result);
  return { result, validation };
}

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
  isTestMode: boolean = false,
  signal?: AbortSignal,
): Promise<{ roadmapId: string; result: RoadmapResult; validation: ValidationResult }> {
  const supabase = createAdminClient();

  // 원자적 쿼터 확인 + 사용량 기록
  const quotaCheck = await checkAndRecordLLMUsage(actorUserId);
  if (quotaCheck.exceeded) {
    throw new Error(quotaCheck.message || '사용량 한도를 초과했습니다.');
  }

  // 프로젝트, 자가진단, 인터뷰 병렬 조회
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
  const userPrompt = buildUserPrompt(
    projectData,
    selfAssessment,
    interview,
    consultantSnapshot,
    revisionPrompt,
    isTestMode,
  );

  // LLM 호출 + 버전 번호 조회 병렬 실행
  const [{ result, validation }, { data: latestVersion }] = await Promise.all([
    callLLMAndBuildRoadmap(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      signal,
    ),
    supabase
      .from('roadmap_versions')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single(),
  ]);

  const newVersionNumber = (latestVersion?.version_number || 0) + 1;

  // 신규 구조를 legacy 컬럼에 매핑
  const cols = toRoadmapVersionColumns(result);

  // 로드맵 버전 저장
  // free_tool_validated / time_limit_validated 컬럼은 Step 12에서 제거 예정. 현재는 true 고정.
  const { data: newRoadmap, error: insertError } = await supabase
    .from('roadmap_versions')
    .insert({
      project_id: projectId,
      version_number: newVersionNumber,
      status: 'DRAFT',
      consultant_profile_snapshot: consultantSnapshot || {},
      diagnosis_summary: cols.diagnosis_summary,
      roadmap_matrix: cols.roadmap_matrix,
      pbl_course: cols.pbl_course,
      courses: cols.courses,
      revision_prompt: revisionPrompt || null,
      free_tool_validated: true,
      time_limit_validated: true,
      created_by: actorUserId,
    })
    .select('id')
    .single();

  if (insertError || !newRoadmap) {
    throw new Error(`로드맵 저장 실패: ${insertError?.message}`);
  }

  // 프로젝트 상태 업데이트 (중앙 전이 검증 — FINALIZED 역방향 전이 방지 포함)
  if (validateStatusTransition(projectData.status, 'ROADMAP_DRAFTED')) {
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
    await createNotificationForAdmins({
      type: 'roadmap_draft',
      title: '로드맵 초안 생성',
      message: `${projectData.company_name || '(알 수 없는 기업)'} 프로젝트 로드맵 초안이 생성되었습니다.`,
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

/** 테스트 로드맵 생성용 입력 데이터 (산인공 신규 인터뷰 양식) */
export interface TestRoadmapInput {
  // 기업 기본정보
  company_name: string;
  industry: string;
  sub_industries?: string[];
  company_size: string;
  customer_requirements?: string;

  // Ⅰ 장 개요 (선택 — 없으면 LLM이 재창작하지 않고 빈 값 유지)
  overview?: {
    establishment_necessity: string;
    ai_competency_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    selected_tasks_summary: string;
    roadmap_summary: string;
    hrd_report_attachment_url?: string;
  };

  // 인터뷰 헤더
  interview_date: string;
  interview_round?: number;
  interview_time?: string;
  interview_method?: 'ONSITE' | 'VIDEO' | 'WORKSHOP' | 'OTHER';
  participants: { id: string; name: string; position?: string }[];

  // Ⅱ-2 기업 요구분석
  company_requirements: {
    company_status: string;
    main_problems: string;
    push_willingness: string;
    expected_outcomes: string;
  };

  // Ⅱ-3 과업·워크플로우 분석
  task_workflow_items: {
    id: string;
    job: string;
    task_name: string;
    as_is: string;
    problems: string;
    data_availability: string;
    ai_necessity: number;
  }[];

  // Ⅱ-4 훈련대상 과업 선정
  training_targets: {
    id: string;
    task_name: string;
    selection_reason: string;
    as_is: string;
    to_be: string;
  }[];

  notes?: string;
  analysis_notes?: { text: string; attachment_urls: string[] };
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

/** 테스트용 인터뷰 데이터 구성 (buildUserPrompt가 요구하는 필드를 그대로 노출) */
function buildTestInterviewData(input: TestRoadmapInput, sttInsights?: SttInsights) {
  return {
    overview: input.overview ?? {
      establishment_necessity: '',
      ai_competency_level: 'BEGINNER',
      selected_tasks_summary: '',
      roadmap_summary: '',
    },
    interview_date: input.interview_date,
    interview_round: input.interview_round ?? 1,
    interview_time: input.interview_time ?? '',
    interview_method: input.interview_method ?? 'ONSITE',
    participants: input.participants,
    company_requirements: input.company_requirements,
    task_workflow_items: input.task_workflow_items,
    training_targets: input.training_targets,
    analysis_notes: input.analysis_notes ?? { text: '', attachment_urls: [] },
    notes: input.notes || '',
    customer_requirements: input.customer_requirements || '',
    stt_insights: sttInsights || null,
  };
}

/**
 * 테스트 로드맵 생성 (DB 저장 없이 LLM 결과만 반환)
 */
export async function generateTestRoadmap(
  input: TestRoadmapInput,
  actorUserId: string,
  consultantProfile: ConsultantProfile | null,
  sttInsights?: SttInsights,
  signal?: AbortSignal,
): Promise<{ result: RoadmapResult; validation: ValidationResult }> {
  const quotaCheck = await checkAndRecordLLMUsage(actorUserId);
  if (quotaCheck.exceeded) {
    throw new Error(quotaCheck.message || '사용량 한도를 초과했습니다.');
  }

  const projectData = buildTestProjectData(input);
  const interview = buildTestInterviewData(input, sttInsights);

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(projectData, null, interview, consultantProfile, undefined, true);

  return callLLMAndBuildRoadmap(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    signal,
  );
}

/**
 * 테스트 로드맵 수정 (DB 저장 없이 LLM 결과만 반환).
 * previousResult의 4섹션(competencies / training_structure / annual_plan / course_specs)을
 * 프롬프트에 포함하여 재생성.
 */
export async function reviseTestRoadmap(
  input: TestRoadmapInput,
  previousResult: RoadmapResult,
  revisionPrompt: string,
  actorUserId: string,
  consultantProfile: ConsultantProfile | null,
  signal?: AbortSignal,
): Promise<{ result: RoadmapResult; validation: ValidationResult }> {
  const quotaCheck = await checkAndRecordLLMUsage(actorUserId);
  if (quotaCheck.exceeded) {
    throw new Error(quotaCheck.message || '사용량 한도를 초과했습니다.');
  }

  const projectData = buildTestProjectData(input);
  const interview = buildTestInterviewData(input);

  const systemPrompt = buildSystemPrompt();
  const baseUserPrompt = buildUserPrompt(projectData, null, interview, consultantProfile, undefined, true);

  const revisionUserPrompt = `${baseUserPrompt}

## 기존 로드맵 결과

아래는 이전에 생성된 로드맵입니다. 이 로드맵을 기반으로 수정 요청을 반영해주세요.

### 진단 요약
${previousResult.diagnosis_summary}

### 기존 역량 모델링 (Ⅲ-1)
${JSON.stringify(previousResult.competencies, null, 2)}

### 기존 훈련체계도 (Ⅲ-2)
${JSON.stringify(previousResult.training_structure, null, 2)}

### 기존 연간 훈련계획 (Ⅲ-3)
${JSON.stringify(previousResult.annual_plan, null, 2)}

### 기존 훈련과정 명세서 (Ⅲ-4)
${JSON.stringify(previousResult.course_specs, null, 2)}

## 수정 요청

사용자가 다음과 같은 수정을 요청했습니다:
${revisionPrompt}

위 수정 요청을 반영하여 로드맵을 재생성해주세요. 수정 요청에 언급되지 않은 부분은 기존 내용을 유지해도 됩니다.
단, 최종 출력은 반드시 산인공 4섹션(diagnosis_summary / competencies / training_structure / annual_plan / course_specs) 완전한 JSON 형식이어야 합니다.`;

  return callLLMAndBuildRoadmap(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: revisionUserPrompt },
    ],
    signal,
  );
}
