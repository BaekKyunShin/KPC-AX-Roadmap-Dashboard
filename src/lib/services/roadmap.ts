import { createAdminClient } from '@/lib/supabase/admin';
import { callLLMForJSON } from './llm';
import { createAuditLog } from './audit';
import { cleanupOldFinalFiles, saveFinalXLSX, prepareExportDataServer } from './roadmap-storage';
import { checkQuotaExceeded, recordLLMUsage } from './quota';
import { PAID_TOOL_KEYWORDS, MAX_COURSE_HOURS } from '@/lib/utils/roadmap';
import type { ConsultantProfile } from '@/types/database';
import type { SttInsights } from '@/lib/schemas/interview';

// ============================================================================
// STT 인사이트 관련 헬퍼
// ============================================================================

/** STT 인사이트 타입 가드 */
function isSttInsights(value: unknown): value is SttInsights {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  // 최소한 하나의 유효한 필드가 있는지 확인
  return (
    Array.isArray(obj['추가_업무']) ||
    Array.isArray(obj['추가_페인포인트']) ||
    Array.isArray(obj['숨은_니즈']) ||
    typeof obj['조직_맥락'] === 'string' ||
    typeof obj['AI_태도'] === 'string' ||
    Array.isArray(obj['주요_인용'])
  );
}

/** 배열 항목 존재 여부 확인 */
function hasItems(arr: unknown): arr is string[] {
  return Array.isArray(arr) && arr.length > 0;
}

/** 배열을 마크다운 리스트로 변환 */
function toMarkdownList(items: string[]): string {
  return items.map(item => `- ${item}`).join('\n');
}

/**
 * STT 인사이트를 프롬프트용 문자열로 포맷팅
 */
function formatSttInsights(insights: SttInsights): string {
  const sections: string[] = [];

  if (hasItems(insights.추가_업무)) {
    sections.push(`**추가로 파악된 업무:**\n${toMarkdownList(insights.추가_업무)}`);
  }

  if (hasItems(insights.추가_페인포인트)) {
    sections.push(`**추가 페인포인트:**\n${toMarkdownList(insights.추가_페인포인트)}`);
  }

  if (hasItems(insights.숨은_니즈)) {
    sections.push(`**숨은 니즈:**\n${toMarkdownList(insights.숨은_니즈)}`);
  }

  if (insights.조직_맥락) {
    sections.push(`**조직 맥락:**\n${insights.조직_맥락}`);
  }

  if (insights.AI_태도) {
    sections.push(`**AI 도입에 대한 태도:**\n${insights.AI_태도}`);
  }

  if (hasItems(insights.주요_인용)) {
    sections.push(`**인터뷰 주요 발언:**\n${toMarkdownList(insights.주요_인용)}`);
  }

  return sections.join('\n\n');
}

/**
 * 인터뷰 데이터에서 STT 인사이트 섹션 생성
 */
function buildSttInsightsSection(interview: Record<string, unknown>): string {
  const sttInsights = interview.stt_insights;

  if (!isSttInsights(sttInsights)) {
    return '';
  }

  return `
### STT 인터뷰 분석 인사이트

인터뷰 녹취록에서 AI가 추출한 추가 정보입니다. 로드맵 설계 시 참고하세요.

${formatSttInsights(sttInsights)}
`;
}

// 과정 상세 타입 (courses 배열용)
export interface RoadmapCell {
  course_name: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  target_task: string; // 대상 업무
  target_audience: string; // 교육 대상
  recommended_hours: number; // 권장 시간 (≤40)
  curriculum: string[]; // 커리큘럼 항목
  practice_assignments: string[]; // 실습/과제
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

  // PBL 상세 설계
  course_name: string; // PBL 과정명 (선정된 과정 기반)
  total_hours: number; // ≤40
  target_tasks: string[]; // 대상 업무들
  target_audience: string;

  // PBL 모듈별 상세 커리큘럼
  curriculum: {
    module_name: string;
    hours: number;
    description: string;
    practice: string; // 구체적인 실습 내용
    deliverables: string[]; // 각 모듈에서 산출되는 결과물
    tools: {
      name: string;
      free_tier_info: string;
    }[];
  }[];

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

/**
 * courses 배열에서 roadmap_matrix 자동 생성
 * 한 셀에 여러 과정이 있을 수 있음
 */
function buildRoadmapMatrixFromCourses(courses: RoadmapCell[]): RoadmapRow[] {
  // 업무별로 그룹화
  const taskMap = new Map<string, RoadmapRow>();

  courses.forEach((course, index) => {
    const taskKey = course.target_task;

    if (!taskMap.has(taskKey)) {
      taskMap.set(taskKey, {
        task_id: `task_${index + 1}`,
        task_name: taskKey,
        beginner: [],
        intermediate: [],
        advanced: [],
      });
    }

    const row = taskMap.get(taskKey)!;
    const matrixCell: RoadmapMatrixCell = {
      course_name: course.course_name,
      recommended_hours: course.recommended_hours,
    };

    // 레벨에 따라 배열에 추가
    switch (course.level) {
      case 'BEGINNER':
        row.beginner.push(matrixCell);
        break;
      case 'INTERMEDIATE':
        row.intermediate.push(matrixCell);
        break;
      case 'ADVANCED':
        row.advanced.push(matrixCell);
        break;
    }
  });

  return Array.from(taskMap.values());
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
  const llmResult = await callLLMForJSON<LLMRoadmapResult>(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7 } // maxTokens는 기본값(20000) 사용
  );

  // 사용량 기록
  await recordLLMUsage(actorUserId);

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

  return {
    roadmapId: newRoadmap.id,
    result,
    validation,
  };
}

// ============================================================================
// 테스트 전용 함수 (DB 저장 없음)
// ============================================================================

/** 테스트 로드맵 생성용 입력 데이터 */
export interface TestRoadmapInput {
  company_name: string;
  industry: string;
  company_size: string;
  job_tasks: { task_name: string; task_description: string }[];
  pain_points: { description: string; severity: string }[];
  improvement_goals: { goal_description: string }[];
  customer_requirements?: string;
}

/** 테스트용 프로젝트 데이터 구성 */
function buildTestProjectData(input: TestRoadmapInput) {
  return {
    company_name: input.company_name,
    industry: input.industry,
    company_size: input.company_size,
    customer_comment: input.customer_requirements || '',
  };
}

/** 테스트용 인터뷰 데이터 구성 */
function buildTestInterviewData(input: TestRoadmapInput, sttInsights?: SttInsights) {
  return {
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
      job_task_id: 'test-task-0',
      description: point.description,
      severity: point.severity,
      priority: index + 1,
    })),
    constraints: [],
    improvement_goals: input.improvement_goals.map((goal, index) => ({
      id: `test-goal-${index}`,
      job_task_id: 'test-task-0',
      kpi_name: '개선 목표',
      goal_description: goal.goal_description,
      measurement_method: '',
    })),
    notes: '',
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

  const llmResult = await callLLMForJSON<LLMRoadmapResult>(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7 }
  );

  // 4. 사용량 기록
  await recordLLMUsage(actorUserId);

  // 5. 결과 생성 및 검증
  const result: RoadmapResult = {
    ...llmResult,
    roadmap_matrix: buildRoadmapMatrixFromCourses(llmResult.courses),
  };
  const validation = validateRoadmap(result);

  return { result, validation };
}

/**
 * 시스템 프롬프트
 */
function buildSystemPrompt(): string {
  return `당신은 기업 AI 교육 로드맵 전문가입니다. 기업의 현황과 니즈를 분석하여 맞춤형 AI 활용 교육 로드맵을 설계합니다.

## 핵심 원칙

1. **업무(target_task) 제한 - 매우 중요**:
   - courses의 target_task는 반드시 인터뷰의 "세부업무(job_tasks)"에 입력된 업무만 사용해야 합니다.
   - 페인포인트나 개선목표에서 업무를 추가로 생성하지 마세요.
   - 입력된 업무 외의 업무를 만들어내면 안 됩니다.

2. **셀 채우기 (권장)**:
   - 각 업무(target_task)별로 초급(BEGINNER), 중급(INTERMEDIATE), 고급(ADVANCED) 과정을 가급적 모두 생성하세요.
   - 빈 셀을 최소화하되, 해당 업무×레벨에 적합한 과정이 정말 없다면 비워둘 수 있습니다.
   - 한 셀(업무×레벨)에 여러 과정을 배치할 수 있습니다.

3. **무료 도구 전제**: 모든 교육에서 사용하는 도구는 반드시 무료 범위 내에서 사용 가능해야 합니다.
   - 각 도구마다 "무료 범위"를 명확히 표기해야 합니다.
   - 예: "ChatGPT (무료: 일 제한 있음)", "Google Sheets (무료: 전체 기능)"
   - 유료 전용 도구는 사용하지 마세요.

4. **40시간 제한**: 각 과정의 권장 시간은 가급적 40시간 이하여야 합니다.
   - PBL 과정 전체 합계도 40시간 이하여야 합니다.
   - 필요에 따라 40시간 이상이 될 수도 있지만, 그렇더라도 무조건 50시간 이하여야 합니다.

5. **실용성 중심**: 이론보다 실습 중심의 커리큘럼을 설계하세요.

6. **측정 가능한 성과**: 모든 과정에 명확한 기대 효과와 측정 방법을 포함하세요.

7. **PBL 과정은 반드시 courses에서 선정**:
   - PBL 과정은 별도로 새로 만드는 것이 아니라, courses 배열에 포함된 과정 중 하나를 선정해야 합니다.
   - **PBL 과정의 시간(total_hours)은 선정된 과정의 recommended_hours와 동일해야 합니다.**
   - 선정 기준:
     a. 담당 컨설턴트의 전문성/프로필과의 적합도
     b. 고객사의 페인포인트 및 요구사항과의 연관성
     c. 현실 가능성 (교육 인프라, 시간, 인원 등)
   - 위 기준을 종합적으로 고려하여 가장 효과적인 과정을 PBL로 선정하세요.
   - PBL은 선정된 과정을 더 구체화/상세화한 것이므로, 기본 정보(시간, 대상 등)는 동일해야 합니다.

8. **교육 난이도 원칙**:
   - 원칙적으로, 비개발자도 즉시 활용 가능한 노코드/로우코드 도구 중심으로 설계해야 합니다.
   - 코딩/프로그래밍이 필요한 교육은 다음 경우에만 포함:
     a. 고객사가 명시적으로 요청한 경우
     b. 인터뷰 결과 기술 수준이 높다고 판단되는 경우
     c. 업무 특성상 코딩이 필수적인 경우
   - 코딩 교육 포함 시에도 ADVANCED 레벨에 배치하고, BEGINNER/INTERMEDIATE는 노코드 중심 유지      

## 출력 형식

반드시 아래 JSON 구조로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.
중요: roadmap_matrix는 출력하지 마세요. courses와 pbl_course만 출력합니다.

{
  "diagnosis_summary": "기업 현황 및 교육 니즈 요약 (3~4문장)",
  "courses": [/* 모든 과정 상세 배열 (RoadmapCell[]) */],
  "pbl_course": {
    /* 중요: courses 배열에서 하나의 과정을 선정하여 PBL로 확장 */
    "selected_course_name": "선택된 과정명 (courses 배열의 course_name과 정확히 일치해야 함)",
    "selected_course_level": "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
    "selected_course_task": "선택된 과정의 대상 업무",
    "selection_rationale": {
      "consultant_expertise_fit": "컨설턴트의 어떤 전문성이 이 과정과 잘 맞는지 설명",
      "pain_point_alignment": "고객사의 어떤 페인포인트를 이 과정이 해결할 수 있는지 설명",
      "feasibility_assessment": "이 과정을 PBL로 수행하기에 현실적으로 가능한 이유 (시간, 인프라, 난이도 등)",
      "summary": "종합적인 선정 이유 2~3문장으로 요약"
    },
    "course_name": "PBL: [선택된 과정 기반 PBL 과정명]",
    "total_hours": 40,
    "target_tasks": ["대상 업무1", "대상 업무2"],
    "target_audience": "교육 대상",
    "curriculum": [
      {
        "module_name": "모듈명",
        "hours": 8,
        "description": "모듈 설명",
        "practice": "구체적인 실습 내용 (어떤 데이터로 무엇을 하는지 상세히)",
        "deliverables": ["이 모듈에서 산출되는 결과물1", "결과물2"],
        "tools": [{"name": "도구명", "free_tier_info": "무료 범위"}]
      }
    ],
    "final_deliverables": ["PBL 완료 시 최종 산출물1", "최종 산출물2"],
    "expected_outcomes": ["기대 효과1", "기대 효과2"],
    "business_impact": "이 PBL을 통해 기대되는 비즈니스 임팩트/ROI 설명",
    "measurement_methods": ["측정 방법1"],
    "prerequisites": ["준비물1"]
  }
}

RoadmapCell 구조:
{
  "course_name": "과정명",
  "level": "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
  "target_task": "대상 업무",
  "target_audience": "교육 대상",
  "recommended_hours": 8,
  "curriculum": ["항목1", "항목2"],
  "practice_assignments": ["실습1", "과제1"],
  "tools": [{"name": "도구명", "free_tier_info": "무료 범위 설명"}],
  "expected_outcome": "기대 효과",
  "measurement_method": "측정 방법",
  "prerequisites": ["준비물1"]
}

## PBL 과정 상세 작성 지침

PBL 과정은 선정된 과정을 프로젝트 기반 학습으로 심화 확장한 것입니다:

1. **실습 내용 상세화**: 각 모듈의 practice 필드에 구체적으로 어떤 실습을 하는지 명시
   - 예: "회사의 실제 고객 CS 데이터 100건을 ChatGPT로 감성 분석하여 불만 유형별 분류"

2. **결과물 명시**: 각 모듈별 deliverables와 최종 final_deliverables를 구체적으로 작성
   - 예: "감성 분석 결과 대시보드", "자동 분류 프롬프트 템플릿", "분석 보고서"

3. **비즈니스 임팩트**: business_impact에 정량적/정성적 효과 기술
   - 예: "CS 응대 시간 30% 단축 예상", "불만 고객 조기 감지로 이탈률 감소"

4. **현실적 측정 방법**: 실제로 측정 가능한 KPI 제시
   - 예: "교육 전후 업무 처리 시간 비교", "AI 도구 활용률 주간 모니터링"`;
}

/**
 * 사용자 프롬프트 (입력 데이터 포함)
 */
function buildUserPrompt(
  projectData: Record<string, unknown>,
  selfAssessment: Record<string, unknown> | null | undefined,
  interview: Record<string, unknown>,
  consultantProfile: ConsultantProfile | null,
  revisionPrompt?: string,
  isTestMode: boolean = false
): string {
  let prompt = `## 기업 정보

- 회사명: ${projectData.company_name}
- 업종: ${projectData.industry}
- 규모: ${projectData.company_size}
- 요청사항: ${projectData.customer_comment || '없음'}
${isTestMode ? '- **테스트 모드**: 컨설턴트 연습용 로드맵입니다.\n' : ''}
## 자가진단 결과

${isTestMode && !selfAssessment ? '(테스트 모드 - 자가진단 결과 없음. 입력된 업무/페인포인트 정보를 기반으로 로드맵을 생성하세요.)' : JSON.stringify(selfAssessment?.scores, null, 2)}

요약: ${isTestMode && !selfAssessment ? '테스트 모드로 자가진단 없이 로드맵 생성' : (selfAssessment?.summary_text || '없음')}

## 현장 인터뷰 결과

### 세부업무
${JSON.stringify(interview.job_tasks, null, 2)}

### 페인포인트
${JSON.stringify(interview.pain_points, null, 2)}

### 제약사항
${JSON.stringify(interview.constraints, null, 2)}

### 개선 목표
${JSON.stringify(interview.improvement_goals, null, 2)}

### 기업 요구사항
${interview.customer_requirements || '없음'}

### 추가 메모
${interview.notes || '없음'}
${buildSttInsightsSection(interview)}
`;

  if (consultantProfile) {
    prompt += `
## 담당 컨설턴트 프로필${isTestMode ? ' (테스트 모드에서 중요 참조 자료)' : ''}

- 전문분야: ${consultantProfile.expertise_domains.join(', ')}
- 가능 업종: ${consultantProfile.available_industries?.join(', ') || '미지정'}
- 강의 가능 레벨: ${consultantProfile.teaching_levels.join(', ')}
- 코칭 방식: ${consultantProfile.coaching_methods.join(', ')}
- 역량 태그: ${consultantProfile.skill_tags.join(', ')}
- 경력: ${consultantProfile.years_of_experience || 0}년
${isTestMode ? `
컨설턴트의 전문성을 기반으로 로드맵을 설계하세요.` : ''}
`;
  }

  if (revisionPrompt) {
    prompt += `
## 수정 요청

이전 로드맵에 대해 다음과 같은 수정이 요청되었습니다:
${revisionPrompt}

위 수정 요청을 반영하여 로드맵을 재생성해주세요.
`;
  }

  prompt += `
위 정보를 바탕으로 맞춤형 AI 교육 로드맵을 생성해주세요.
반드시 JSON 형식으로만 응답하세요.`;

  return prompt;
}

// ============================================================================
// 검증 헬퍼 함수들
// ============================================================================

interface ToolInfo {
  name: string;
  free_tier_info: string;
}

/**
 * 도구의 무료 범위 정책 검증
 */
function validateToolFreeTier(
  tool: ToolInfo,
  contextName?: string
): { error?: string } {
  if (!tool.free_tier_info || tool.free_tier_info.trim() === '') {
    const context = contextName ? ` (${contextName})` : '';
    return { error: `무료 범위 미표기: ${tool.name}${context}` };
  }

  const hasPaidKeyword = PAID_TOOL_KEYWORDS.some(kw =>
    tool.free_tier_info?.toLowerCase().includes(kw.toLowerCase())
  );

  if (hasPaidKeyword) {
    return { error: `유료 도구 사용 감지: ${tool.name} - ${tool.free_tier_info}` };
  }

  return {};
}

/**
 * 과정별 도구 검증
 */
function validateCourseTools(
  courses: RoadmapCell[],
  errors: string[]
): void {
  courses.forEach(course => {
    course.tools?.forEach(tool => {
      const result = validateToolFreeTier(tool, course.course_name);
      if (result.error) {
        errors.push(result.error);
      }
    });
  });
}

/**
 * PBL 과정 도구 검증
 */
function validatePBLTools(
  pblCourse: PBLCourse,
  errors: string[]
): void {
  pblCourse.curriculum?.forEach(module => {
    module.tools?.forEach(tool => {
      const result = validateToolFreeTier(tool);
      if (result.error) {
        errors.push(result.error);
      }
    });
  });
}

/**
 * 과정별 시간 제한 검증
 */
function validateCourseHours(
  courses: RoadmapCell[],
  errors: string[]
): void {
  courses.forEach(course => {
    if (course.recommended_hours > MAX_COURSE_HOURS) {
      errors.push(
        `시간 초과: ${course.course_name} (${course.recommended_hours}시간 > ${MAX_COURSE_HOURS}시간)`
      );
    }
  });
}

/**
 * PBL 과정 시간 제한 검증
 */
function validatePBLHours(
  pblCourse: PBLCourse,
  errors: string[]
): void {
  if (pblCourse.total_hours > MAX_COURSE_HOURS) {
    errors.push(
      `PBL 과정 시간 초과: ${pblCourse.total_hours}시간 > ${MAX_COURSE_HOURS}시간`
    );
  }

  const pblTotalHours = pblCourse.curriculum?.reduce((sum, m) => sum + m.hours, 0) || 0;
  if (pblTotalHours > MAX_COURSE_HOURS) {
    errors.push(
      `PBL 모듈 합계 시간 초과: ${pblTotalHours}시간 > ${MAX_COURSE_HOURS}시간`
    );
  }
}

/**
 * PBL 과정이 courses에서 선정되었는지 검증
 */
function validatePBLCourseSelection(
  pblCourse: PBLCourse,
  courses: RoadmapCell[],
  errors: string[],
  warnings: string[]
): void {
  const { selected_course_name, selected_course_level, selected_course_task } = pblCourse;

  if (!selected_course_name) {
    errors.push('PBL 과정에 선정된 과정명(selected_course_name)이 없습니다.');
    return;
  }

  // 완전 일치 검색
  const matchingCourse = courses.find(
    course =>
      course.course_name === selected_course_name &&
      course.level === selected_course_level &&
      course.target_task === selected_course_task
  );

  if (matchingCourse) {
    return; // 완전 일치하면 검증 통과
  }

  // 과정명만으로 검색
  const courseByName = courses.find(c => c.course_name === selected_course_name);

  if (!courseByName) {
    errors.push(
      `PBL 선정 과정 "${selected_course_name}"이(가) 과정 상세(courses)에 존재하지 않습니다.`
    );
  } else {
    warnings.push(
      `PBL 선정 과정의 레벨 또는 업무가 일치하지 않습니다. ` +
      `선정: ${selected_course_level}/${selected_course_task}, ` +
      `실제: ${courseByName.level}/${courseByName.target_task}`
    );
  }
}

/**
 * PBL 선정 이유 검증
 */
function validatePBLSelectionRationale(
  pblCourse: PBLCourse,
  errors: string[],
  warnings: string[]
): void {
  if (!pblCourse.selection_rationale) {
    errors.push('PBL 과정 선정 이유(selection_rationale)가 없습니다.');
    return;
  }

  const { selection_rationale: rationale } = pblCourse;

  if (!rationale.consultant_expertise_fit) {
    warnings.push('PBL 선정 이유에 컨설턴트 전문성 적합도 설명이 없습니다.');
  }
  if (!rationale.pain_point_alignment) {
    warnings.push('PBL 선정 이유에 페인포인트 연관성 설명이 없습니다.');
  }
  if (!rationale.feasibility_assessment) {
    warnings.push('PBL 선정 이유에 현실 가능성 평가가 없습니다.');
  }
  if (!rationale.summary) {
    warnings.push('PBL 선정 이유 요약이 없습니다.');
  }
}

/**
 * PBL 상세 필드 검증
 */
function validatePBLDetailFields(
  pblCourse: PBLCourse,
  warnings: string[]
): void {
  if (!pblCourse.final_deliverables || pblCourse.final_deliverables.length === 0) {
    warnings.push('PBL 최종 산출물(final_deliverables)이 없습니다.');
  }

  if (!pblCourse.business_impact) {
    warnings.push('PBL 비즈니스 임팩트(business_impact) 설명이 없습니다.');
  }

  // 각 모듈의 deliverables 검증
  pblCourse.curriculum?.forEach((module, idx) => {
    if (!module.deliverables || module.deliverables.length === 0) {
      warnings.push(
        `PBL 모듈 ${idx + 1}(${module.module_name})에 결과물(deliverables)이 없습니다.`
      );
    }
  });
}

// ============================================================================
// 메인 검증 함수
// ============================================================================

/**
 * 로드맵 검증
 */
export function validateRoadmap(result: RoadmapResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 무료 도구 정책 검증
  validateCourseTools(result.courses, errors);
  if (result.pbl_course?.curriculum) {
    validatePBLTools(result.pbl_course, errors);
  }

  // 2. 시간 제한 검증
  validateCourseHours(result.courses, errors);
  if (result.pbl_course) {
    validatePBLHours(result.pbl_course, errors);
  }

  // 3. 필수 필드 검증
  if (!result.diagnosis_summary) {
    warnings.push('진단 요약이 비어있습니다.');
  }

  if (!result.roadmap_matrix || result.roadmap_matrix.length === 0) {
    errors.push('로드맵 매트릭스가 비어있습니다.');
  }

  if (!result.pbl_course) {
    errors.push('PBL 과정이 없습니다.');
  }

  // 4. PBL 과정 상세 검증
  if (result.pbl_course && result.courses && result.courses.length > 0) {
    validatePBLCourseSelection(result.pbl_course, result.courses, errors, warnings);
    validatePBLSelectionRationale(result.pbl_course, errors, warnings);
    validatePBLDetailFields(result.pbl_course, warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 로드맵 FINAL 확정
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

  // 배정된 컨설턴트만 FINAL 가능
  const projectData = roadmap.projects as { assigned_consultant_id: string };
  if (projectData.assigned_consultant_id !== actorUserId) {
    throw new Error('배정된 컨설턴트만 FINAL 확정할 수 있습니다.');
  }

  // 검증 통과 확인
  if (!roadmap.free_tool_validated || !roadmap.time_limit_validated) {
    throw new Error('검증을 통과하지 못한 로드맵은 FINAL 확정할 수 없습니다.');
  }

  // 기존 FINAL 파일 정리
  await cleanupOldFinalFiles(roadmap.project_id);

  // 기존 FINAL → ARCHIVED
  await supabase
    .from('roadmap_versions')
    .update({ status: 'ARCHIVED', storage_path_pdf: null, storage_path_xlsx: null })
    .eq('project_id', roadmap.project_id)
    .eq('status', 'FINAL');

  // 현재 로드맵 → FINAL
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

  // FINAL 버전 파일 스토리지 저장
  try {
    const exportData = await prepareExportDataServer(roadmapId);
    if (exportData) {
      await saveFinalXLSX(roadmapId, roadmap.project_id, exportData);
    }
  } catch (storageError) {
    console.error('[finalizeRoadmap] Storage save error:', storageError);
    // 스토리지 저장 실패해도 FINAL 확정은 성공으로 처리
  }

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
