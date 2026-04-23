import type { ConsultantProfile } from '@/types/database';
import { PBL_EVALUATION_SCALE_DESCRIPTION } from './pbl-types';
import {
  type AttachmentMeta,
  formatAttachmentBody,
} from '../attachment-prompt';

// ISSUE-14 PBL 확장: Ⅱ-3-가 기업HRD이음컨설팅 결과 보고서 첨부를 프롬프트에 주입
function buildPBLHrdAttachmentSection(
  hrdNecessity: Record<string, unknown>,
): string {
  const att = hrdNecessity.hrd_report_attachment as
    | AttachmentMeta
    | null
    | undefined;
  if (!att) return '';

  return `\n### Ⅱ-3-가. 기업HRD이음컨설팅 결과 (첨부 보고서)
- 파일명: ${att.file_name ?? '-'}
- 형식: ${att.mime_type ?? '-'}
- 크기: ${att.size ? `${Math.round(att.size / 1024)} KB` : '-'}
${formatAttachmentBody(att)}`;
}

// ============================================================================
// 프롬프트 빌더 — 산인공 PBL 양식 2번 Ⅳ장 기반
// ============================================================================

/**
 * 시스템 프롬프트
 */
export function buildPBLSystemPrompt(): string {
  const evaluationScale = PBL_EVALUATION_SCALE_DESCRIPTION;

  return `당신은 산업인력공단 PBL(Problem-Based Learning) 과정개발 보고서 설계 전문가입니다. 기업 PBL 인터뷰 결과를 분석하여 산인공 공식 양식 2번 Ⅳ장에 맞는 운영계획을 작성합니다.

## 섹션 설계 원칙

### Ⅳ-1. 훈련 목표 (training_goal)
- 기업 인터뷰의 훈련대상 업무·문제정의·AI수준 진단을 종합하여 1~2문장으로 작성하라.
- To-Be 수준 달성을 명시하고, 구체적 업무명을 포함하라.

### Ⅳ-2. AI 도구 활용 계획 (ai_tool_usage_plan) — 최소 3단계 이상
- 3단계 이상 작성하라. 권장 구성: 1단계 훈련실시 / 2단계 리뷰 및 피드백 / 3단계 최종 결과 및 평가.
- 각 단계는 stage(예: "1단계"), main_activity, ai_tools[], utilized_data, purpose, specific_method를 모두 채워라.
- 무료 범위 내 AI 도구만 사용하라 (예: ChatGPT 무료 플랜, Notion AI 무료 플랜, Gamma, Canva 무료).

### Ⅳ-3-가. 훈련과정 개요 (training_plan.overview)
- course_name: 인터뷰 courseOverview.course_name 값을 그대로 사용하라.
- training_period.start/end: "YYYY-MM-DD" 형식으로 작성하라. 인터뷰에 없으면 합리적 추정값을 사용하라.

### Ⅳ-3-나. 학습그룹 구성 (learning_group)
- instructors: type("외부"|"내부"), role("팀원"|"팀장"), affiliation, position, name 필드를 모두 채워라.
- trainees: role("팀원"|"팀장"), affiliation, position, name 필드를 모두 채워라.
- 이름이 없을 경우 "미정"으로 작성하라.

### Ⅳ-3-다. 훈련 교과목 프로파일 (subject_profile) — training_contents 3개 이상 권장
- training_contents는 최소 1개, 권장 3개 이상 작성하라.
- 각 행: unit_name(업무/단원명), detail(세부 내용), training_hours(훈련시간), instructor_hours({ external, internal }) 필드를 채워라.
- **필수 제약: instructor_hours.external + instructor_hours.internal === training_hours** (양식 가이드 #9). 이 합계가 맞지 않으면 검증 오류가 발생한다. 반드시 준수하라.
- total_sum_hours = training_contents의 training_hours 합계와 정확히 일치해야 한다.
- analysis_method: "LLM 기반 데이터 분석, RAG 등" 형식으로 기술하라.

### Ⅳ-3-라. 시설·장비 (facilities)
- seq(1부터 순차), category("시설"|"장비"), name, spec, location을 모두 채워라.
- 훈련 환경 분석의 ai_infrastructure 정보를 반영하라.

### Ⅳ-3-마. 훈련강사 (training_instructors)
- name, internal_external("내부"|"외부"), career_years(정수), work_name, detailed_training_content[] 필드를 모두 채워라.

### Ⅳ-4-가. 과정평가 (course_evaluation)
- evaluation_methods: ["포트폴리오", "문제해결시나리오", "작업장 평가"] 중 1개 이상 선택하라.
- performance_checklist: 훈련 교과목별로 최소 1개 이상 작성하라. performance_level은 1~5 정수만 사용하라.
- **evaluation_result는 반드시 "예정"으로 설정하라.** LLM 초안 단계에서는 Pass/Fail을 입력하지 마라.
- **evaluation_scale: 아래 텍스트를 그대로 복사하라. 재창작하지 마라.**
  "${evaluationScale}"

### Ⅳ-4-나. 결과평가 (result_evaluation) — 설문 문항 수 고정
- 설문 응답은 아직 미실시 상태이므로 **모든 항목을 null로 설정**하라.
- 반드시 아래 길이를 준수하라:
  - satisfaction_survey: 길이 **5** (만족도)
  - achievement_survey: 길이 **3** (성취도)
  - external_expert_survey: 길이 **5** (외부전문가 만족도)
  - practical_application_survey: 길이 **4** (현업적용도)
- 길이가 다르면 검증 오류가 발생한다.

## 공통 정책
- 모든 도구는 무료 범위 내에서 활용 가능해야 한다.
- 한국어로 출력하라.
- JSON 외 다른 텍스트를 출력하지 마라.

## 출력 JSON 스키마

반드시 아래 구조로만 응답하라. JSON 외 다른 텍스트를 출력하지 마라.

{
  "operation_plan": {
    "training_goal": "훈련 목표 1~2문장",
    "ai_tool_usage_plan": [
      {
        "stage": "1단계",
        "main_activity": "훈련실시",
        "ai_tools": ["ChatGPT(무료 플랜)", "Notion AI(무료 플랜)"],
        "utilized_data": "활용 데이터 설명",
        "purpose": "활용 목적 2줄 이내",
        "specific_method": "구체적 활용 방법 2~4줄"
      }
    ],
    "training_plan": {
      "overview": {
        "course_name": "과정명",
        "training_period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" }
      },
      "learning_group": {
        "instructors": [
          { "type": "외부", "role": "팀장", "affiliation": "소속", "position": "직위", "name": "성명" }
        ],
        "trainees": [
          { "role": "팀원", "affiliation": "소속", "position": "직위", "name": "성명" }
        ]
      },
      "subject_profile": {
        "course_name": "과정명",
        "total_hours": 32,
        "training_goals": ["훈련목표 bullet"],
        "ai_tools": ["활용 AI 도구"],
        "utilized_data": "활용 데이터",
        "analysis_method": "LLM 기반 데이터 분석, RAG 등",
        "training_contents": [
          {
            "unit_name": "업무(단원)명",
            "detail": "세부 내용",
            "training_hours": 8,
            "instructor_hours": { "external": 6, "internal": 2 }
          }
        ],
        "total_sum_hours": 8
      },
      "facilities": [
        { "seq": 1, "category": "시설", "name": "교육장", "spec": "30인 수용", "location": "본사 3층" }
      ],
      "training_instructors": [
        {
          "name": "강사명",
          "internal_external": "외부",
          "career_years": 10,
          "work_name": "AI 데이터 분석",
          "detailed_training_content": ["세부 교육훈련 내용"]
        }
      ]
    },
    "evaluation_plan": {
      "course_evaluation": {
        "course_name": "과정명",
        "evaluation_methods": ["포트폴리오"],
        "evaluation_target": "평가 대상",
        "evaluation_date": "YYYY-MM-DD",
        "evaluation_criteria": "수행 수준 4 이상 60% 이상 시 PASS",
        "evaluation_result": "예정",
        "performance_checklist": [
          { "unit_name": "단원명", "evaluation_criteria": "평가기준", "performance_level": 3 }
        ],
        "overall_comment": "",
        "evaluation_scale": "${evaluationScale}"
      },
      "result_evaluation": {
        "satisfaction_survey": [null, null, null, null, null],
        "achievement_survey": [null, null, null],
        "external_expert_survey": [null, null, null, null, null],
        "practical_application_survey": [null, null, null, null]
      }
    }
  }
}`;
}

/**
 * 사용자 프롬프트 (입력 데이터 포함)
 */
export function buildPBLUserPrompt(
  interview: Record<string, unknown>,
  project: Record<string, unknown>,
  consultantProfile: ConsultantProfile | null,
  diagnosisSummary: string,
  revisionPrompt?: string,
): string {
  // 인터뷰 섹션 안전 추출
  const courseOverview = (interview.courseOverview ?? {}) as Record<string, unknown>;
  const companyStatus = (interview.companyStatus ?? {}) as Record<string, unknown>;
  const trainingEnvironment = (interview.trainingEnvironment ?? {}) as Record<string, unknown>;
  const expectation = (trainingEnvironment.expectation ?? {}) as Record<string, unknown>;
  const hrdNecessity = (interview.hrdNecessity ?? {}) as Record<string, unknown>;
  const performanceActivities = (interview.performanceActivities ?? {}) as Record<string, unknown>;
  const problemDefinition = (interview.problemDefinition ?? {}) as Record<string, unknown>;
  const problemDef = (
    (problemDefinition.problem_definition ?? {}) as Record<string, unknown>
  );
  const targetTasks = (interview.targetTasks ?? {}) as Record<string, unknown>;
  const aiLevelDiagnosis = (interview.aiLevelDiagnosis ?? {}) as Record<string, unknown>;

  const subIndustries = Array.isArray(project.sub_industries) ? project.sub_industries : [];

  let prompt = `## 기업 정보

- 회사명: ${project.company_name ?? courseOverview.company_name ?? '미입력'}
- 업종: ${project.industry ?? courseOverview.industry_main ?? '미입력'}
- 세부 업종: ${subIndustries.length > 0 ? subIndustries.join(', ') : '미지정'}
- 규모: ${project.company_size ?? '미입력'}
- 요청사항: ${project.customer_comment ?? '없음'}

## 진단 요약

${diagnosisSummary}

## Ⅰ. 훈련과정 개요

- 과정명: ${courseOverview.course_name ?? '미입력'}
- NCS 코드: ${courseOverview.ncs_code ?? '미입력'}
- 훈련시간: ${courseOverview.training_hours ?? 0}시간
- 훈련생 수: ${courseOverview.trainee_count ?? 0}명
- 훈련 직무: ${courseOverview.training_job ?? '미입력'}
- AI 역량 수준: ${courseOverview.ai_level ?? '미입력'}
- 훈련 목표(체크): ${Array.isArray(courseOverview.training_goals) ? (courseOverview.training_goals as string[]).join(', ') : '미입력'}

## Ⅱ-1. 기업 현황 분석

- 경영 이슈: ${companyStatus.business_issues ?? '미입력'}
- 조직도: ${JSON.stringify(companyStatus.organization ?? [], null, 2)}

## Ⅱ-2. 훈련환경 분석

- 적정 훈련시간: ${(trainingEnvironment.proper_training_hours as number | undefined) ?? 0}시간
- 훈련장소: ${JSON.stringify((trainingEnvironment.training_place as Record<string, unknown> | undefined) ?? {}, null, 2)}
- 내부 강사: ${JSON.stringify((trainingEnvironment.internal_instructor as Record<string, unknown> | undefined) ?? {}, null, 2)}
- 대상 인원: ${(trainingEnvironment.target_count as number | undefined) ?? 0}명
- 대상자 특성: ${JSON.stringify((trainingEnvironment.target_characteristics as Record<string, unknown> | undefined) ?? {}, null, 2)}
- AI 인프라: ${JSON.stringify((trainingEnvironment.ai_infrastructure as Record<string, unknown> | undefined) ?? {}, null, 2)}
- AI 훈련 요구분석: ${trainingEnvironment.training_needs_analysis ?? '미입력'}
- 기대효과 As-Is: ${(expectation.as_is as string | undefined) ?? '미입력'}
- 기대효과 To-Be: ${(expectation.to_be as string | undefined) ?? '미입력'}

## Ⅱ-3. HRD 제안·과정개발 필요성

- 과정개발 필요성: ${hrdNecessity.course_development_necessity ?? '미입력'}
- 훈련 이력: ${JSON.stringify(hrdNecessity.training_history ?? [], null, 2)}
- 추천 사업: ${JSON.stringify(hrdNecessity.recommendations ?? [], null, 2)}
${buildPBLHrdAttachmentSection(hrdNecessity)}
## Ⅲ-1. 훈련과제 도출 수행활동

${JSON.stringify(performanceActivities.performance_activities ?? [], null, 2)}

## Ⅲ-2. 문제 도출·우선순위

- 문제 배경: ${(problemDef.background as string | undefined) ?? '미입력'}
- 핵심 문제: ${(problemDef.core_problem as string | undefined) ?? '미입력'}
- 문제 범위: ${(problemDef.scope as string | undefined) ?? '미입력'}
- 제약 조건: ${(problemDef.constraints as string | undefined) ?? '미입력'}
- 문제 우선순위: ${JSON.stringify(problemDefinition.problem_priorities ?? [], null, 2)}

## Ⅲ-3. 훈련대상 업무 선정

- 선정 사유: ${(targetTasks.selection_reason as string | undefined) ?? '미입력'}
- 훈련대상 업무 목록: ${JSON.stringify((targetTasks.target_tasks as unknown[] | undefined) ?? [], null, 2)}
- 업무 세부내용: ${JSON.stringify((targetTasks.target_task_details as unknown[] | undefined) ?? [], null, 2)}

## Ⅲ-4. AI수준 진단

- 현재 AI 수준: ${aiLevelDiagnosis.current_ai_level ?? '미입력'}
- 향후 목표 AI 수준: ${aiLevelDiagnosis.expected_ai_level ?? '미입력'}
- 향상 사유: ${aiLevelDiagnosis.improvement_reason ?? '미입력'}`;

  if (consultantProfile) {
    const consultantSubIndustries = Array.isArray(consultantProfile.sub_industries)
      ? consultantProfile.sub_industries
      : [];

    prompt += `

## 담당 컨설턴트 프로필

- 전문분야: ${consultantProfile.expertise_domains.join(', ')}
- 가능 업종: ${consultantProfile.available_industries?.join(', ') || '미지정'}
- 선호 세부 업종: ${consultantSubIndustries.length > 0 ? consultantSubIndustries.join(', ') : '미지정'}
- 강의 가능 레벨: ${consultantProfile.teaching_levels.join(', ')}
- 코칭 방식: ${consultantProfile.coaching_methods.join(', ')}
- 역량 태그: ${consultantProfile.skill_tags.join(', ')}
- 경력: ${consultantProfile.years_of_experience || 0}년`;
  }

  if (revisionPrompt) {
    prompt += `

## 수정 요청

이전 PBL 보고서에 대해 다음과 같은 수정이 요청되었습니다:
${revisionPrompt}

위 수정 요청을 반영하여 Ⅳ장 전체를 재생성해주세요.`;
  }

  prompt += `

위 정보를 바탕으로 산인공 PBL 양식 2번 Ⅳ장에 맞는 운영계획을 생성해주세요.
반드시 JSON 형식으로만 응답하세요.`;

  return prompt;
}
