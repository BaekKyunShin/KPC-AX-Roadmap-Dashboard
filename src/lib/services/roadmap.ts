import { createAdminClient } from '@/lib/supabase/admin';
import { callLLMForJSON } from './llm';
import { createAuditLog } from './audit';
import { cleanupOldFinalFiles, saveFinalXLSX, prepareExportDataServer } from './roadmap-storage';
import { checkQuotaExceeded, recordLLMUsage } from './quota';
import type { ConsultantProfile } from '@/types/database';

// 로드맵 매트릭스 셀 타입
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

// 로드맵 행 (업무별)
export interface RoadmapRow {
  task_id: string;
  task_name: string;
  beginner?: RoadmapCell;
  intermediate?: RoadmapCell;
  advanced?: RoadmapCell;
}

// PBL 최적 과정
export interface PBLCourse {
  course_name: string;
  total_hours: number; // ≤40
  target_tasks: string[]; // 대상 업무들
  target_audience: string;
  curriculum: {
    module_name: string;
    hours: number;
    description: string;
    practice: string;
    tools: {
      name: string;
      free_tier_info: string;
    }[];
  }[];
  expected_outcomes: string[];
  measurement_methods: string[];
  prerequisites: string[];
}

// 전체 로드맵 결과
export interface RoadmapResult {
  diagnosis_summary: string;
  roadmap_matrix: RoadmapRow[];
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
 */
export async function generateRoadmap(
  caseId: string,
  actorUserId: string,
  revisionPrompt?: string
): Promise<{ roadmapId: string; result: RoadmapResult; validation: ValidationResult }> {
  const supabase = createAdminClient();

  // 쿼터 확인
  const quotaCheck = await checkQuotaExceeded(actorUserId);
  if (quotaCheck.exceeded) {
    throw new Error(quotaCheck.message || '사용량 한도를 초과했습니다.');
  }

  // 케이스 및 관련 데이터 조회
  const { data: caseData } = await supabase
    .from('cases')
    .select(`
      *,
      self_assessments(*),
      interviews(*),
      assigned_consultant_id
    `)
    .eq('id', caseId)
    .single();

  if (!caseData) {
    throw new Error('케이스를 찾을 수 없습니다.');
  }

  const selfAssessment = caseData.self_assessments?.[0];
  const interview = caseData.interviews?.[0];

  if (!selfAssessment) {
    throw new Error('자가진단 결과가 없습니다.');
  }

  if (!interview) {
    throw new Error('인터뷰 데이터가 없습니다.');
  }

  // 컨설턴트 프로필 스냅샷
  let consultantSnapshot: ConsultantProfile | null = null;
  if (caseData.assigned_consultant_id) {
    const { data: profile } = await supabase
      .from('consultant_profiles')
      .select('*')
      .eq('user_id', caseData.assigned_consultant_id)
      .single();
    consultantSnapshot = profile;
  }

  // LLM 프롬프트 생성
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(caseData, selfAssessment, interview, consultantSnapshot, revisionPrompt);

  // LLM 호출
  const result = await callLLMForJSON<RoadmapResult>(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 8000 }
  );

  // 사용량 기록
  await recordLLMUsage(actorUserId);

  // 검증
  const validation = validateRoadmap(result);

  // 버전 번호 결정
  const { data: latestVersion } = await supabase
    .from('roadmap_versions')
    .select('version_number')
    .eq('case_id', caseId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  const newVersionNumber = (latestVersion?.version_number || 0) + 1;

  // 로드맵 버전 저장
  const { data: newRoadmap, error: insertError } = await supabase
    .from('roadmap_versions')
    .insert({
      case_id: caseId,
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

  // 케이스 상태 업데이트
  await supabase
    .from('cases')
    .update({ status: 'ROADMAP_DRAFTED' })
    .eq('id', caseId);

  // 감사 로그
  await createAuditLog({
    actorUserId,
    action: 'ROADMAP_CREATE',
    targetType: 'roadmap',
    targetId: newRoadmap.id,
    meta: {
      case_id: caseId,
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

/**
 * 시스템 프롬프트
 */
function buildSystemPrompt(): string {
  return `당신은 기업 AI 교육 로드맵 전문가입니다. 기업의 현황과 니즈를 분석하여 맞춤형 AI 활용 교육 로드맵을 설계합니다.

## 핵심 원칙

1. **무료 도구 전제**: 모든 교육에서 사용하는 도구는 반드시 무료 범위 내에서 사용 가능해야 합니다.
   - 각 도구마다 "무료 범위"를 명확히 표기해야 합니다.
   - 예: "ChatGPT (무료: GPT-3.5, 일 제한 있음)", "Google Sheets (무료: 전체 기능)"
   - 유료 전용 도구는 사용하지 마세요.

2. **40시간 제한**: 각 과정의 권장 시간은 40시간을 초과할 수 없습니다.
   - PBL 과정 전체 합계도 40시간 이하여야 합니다.

3. **실용성 중심**: 이론보다 실습 중심의 커리큘럼을 설계하세요.

4. **측정 가능한 성과**: 모든 과정에 명확한 기대 효과와 측정 방법을 포함하세요.

## 출력 형식

반드시 아래 JSON 구조로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.

{
  "diagnosis_summary": "기업 현황 및 교육 니즈 요약 (2-3문장)",
  "roadmap_matrix": [
    {
      "task_id": "업무 ID",
      "task_name": "업무명",
      "beginner": { /* RoadmapCell 또는 null */ },
      "intermediate": { /* RoadmapCell 또는 null */ },
      "advanced": { /* RoadmapCell 또는 null */ }
    }
  ],
  "pbl_course": {
    "course_name": "PBL 과정명",
    "total_hours": 40,
    "target_tasks": ["대상 업무1", "대상 업무2"],
    "target_audience": "교육 대상",
    "curriculum": [
      {
        "module_name": "모듈명",
        "hours": 8,
        "description": "모듈 설명",
        "practice": "실습 내용",
        "tools": [{"name": "도구명", "free_tier_info": "무료 범위"}]
      }
    ],
    "expected_outcomes": ["기대 효과1", "기대 효과2"],
    "measurement_methods": ["측정 방법1"],
    "prerequisites": ["준비물1"]
  },
  "courses": [/* 모든 RoadmapCell 배열 */]
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
}`;
}

/**
 * 사용자 프롬프트 (입력 데이터 포함)
 */
function buildUserPrompt(
  caseData: Record<string, unknown>,
  selfAssessment: Record<string, unknown>,
  interview: Record<string, unknown>,
  consultantProfile: ConsultantProfile | null,
  revisionPrompt?: string
): string {
  let prompt = `## 기업 정보

- 회사명: ${caseData.company_name}
- 업종: ${caseData.industry}
- 규모: ${caseData.company_size}
- 요청사항: ${caseData.customer_comment || '없음'}

## 자가진단 결과

${JSON.stringify(selfAssessment.scores, null, 2)}

요약: ${selfAssessment.summary_text || '없음'}

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
`;

  if (consultantProfile) {
    prompt += `
## 담당 컨설턴트 프로필

- 전문분야: ${consultantProfile.expertise_domains.join(', ')}
- 강의 가능 레벨: ${consultantProfile.teaching_levels.join(', ')}
- 코칭 방식: ${consultantProfile.coaching_methods.join(', ')}
- 역량 태그: ${consultantProfile.skill_tags.join(', ')}
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

/**
 * 로드맵 검증
 */
export function validateRoadmap(result: RoadmapResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 무료 도구 정책 검증
  const allCourses = [...result.courses];
  if (result.pbl_course?.curriculum) {
    result.pbl_course.curriculum.forEach(module => {
      module.tools?.forEach(tool => {
        if (!tool.free_tier_info || tool.free_tier_info.trim() === '') {
          errors.push(`무료 범위 미표기: ${tool.name}`);
        }
        // 유료 키워드 검출
        const paidKeywords = ['구독 필요', '유료', '결제', 'paid', 'premium', 'pro 버전'];
        if (paidKeywords.some(kw => tool.free_tier_info?.toLowerCase().includes(kw.toLowerCase()))) {
          errors.push(`유료 도구 사용 감지: ${tool.name} - ${tool.free_tier_info}`);
        }
      });
    });
  }

  allCourses.forEach(course => {
    course.tools?.forEach(tool => {
      if (!tool.free_tier_info || tool.free_tier_info.trim() === '') {
        errors.push(`무료 범위 미표기: ${tool.name} (${course.course_name})`);
      }
      const paidKeywords = ['구독 필요', '유료', '결제', 'paid', 'premium', 'pro 버전'];
      if (paidKeywords.some(kw => tool.free_tier_info?.toLowerCase().includes(kw.toLowerCase()))) {
        errors.push(`유료 도구 사용 감지: ${tool.name} - ${tool.free_tier_info}`);
      }
    });
  });

  // 2. 40시간 제한 검증
  allCourses.forEach(course => {
    if (course.recommended_hours > 40) {
      errors.push(`시간 초과: ${course.course_name} (${course.recommended_hours}시간 > 40시간)`);
    }
  });

  if (result.pbl_course?.total_hours > 40) {
    errors.push(`PBL 과정 시간 초과: ${result.pbl_course.total_hours}시간 > 40시간`);
  }

  // PBL 모듈 합계 확인
  const pblTotalHours = result.pbl_course?.curriculum?.reduce((sum, m) => sum + m.hours, 0) || 0;
  if (pblTotalHours > 40) {
    errors.push(`PBL 모듈 합계 시간 초과: ${pblTotalHours}시간 > 40시간`);
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
    .select('*, cases!inner(assigned_consultant_id)')
    .eq('id', roadmapId)
    .single();

  if (!roadmap) {
    throw new Error('로드맵을 찾을 수 없습니다.');
  }

  // 배정된 컨설턴트만 FINAL 가능
  const caseData = roadmap.cases as { assigned_consultant_id: string };
  if (caseData.assigned_consultant_id !== actorUserId) {
    throw new Error('배정된 컨설턴트만 FINAL 확정할 수 있습니다.');
  }

  // 검증 통과 확인
  if (!roadmap.free_tool_validated || !roadmap.time_limit_validated) {
    throw new Error('검증을 통과하지 못한 로드맵은 FINAL 확정할 수 없습니다.');
  }

  // 기존 FINAL 파일 정리
  await cleanupOldFinalFiles(roadmap.case_id);

  // 기존 FINAL → ARCHIVED
  await supabase
    .from('roadmap_versions')
    .update({ status: 'ARCHIVED', storage_path_pdf: null, storage_path_xlsx: null })
    .eq('case_id', roadmap.case_id)
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

  // 케이스 상태 업데이트
  await supabase
    .from('cases')
    .update({ status: 'FINALIZED' })
    .eq('id', roadmap.case_id);

  // FINAL 버전 파일 스토리지 저장
  try {
    const exportData = await prepareExportDataServer(roadmapId);
    if (exportData) {
      await saveFinalXLSX(roadmapId, roadmap.case_id, exportData);
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
      case_id: roadmap.case_id,
      version_number: roadmap.version_number,
    },
  });
}

/**
 * 로드맵 조회
 */
export async function getRoadmapVersions(caseId: string) {
  const supabase = createAdminClient();

  const { data: versions } = await supabase
    .from('roadmap_versions')
    .select('*')
    .eq('case_id', caseId)
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
