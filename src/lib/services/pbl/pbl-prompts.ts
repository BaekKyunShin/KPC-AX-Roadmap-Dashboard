import type { ConsultantProfile } from '@/types/database';
import { PBL_EVALUATION_SCALE_DESCRIPTION } from './pbl-types';
import type { PBLHrdReportPdf } from '@/lib/schemas/interview-pbl';
// STT 인사이트 포맷터 — 두 키(stt_insights/sttInsights) 모두 인식하도록 일반화됨.
// 로드맵·PBL 양쪽에서 재사용.
import { buildSttInsightsSection } from '../roadmap/roadmap-stt-formatter';

// ISSUE-14 PBL 확장: Ⅱ-3-가 기업HRD이음컨설팅 결과 보고서 첨부를 프롬프트에 주입.
// V2 (PBLInterviewStrict) 의 `hrdReportPdf` 모양 — { fileName, url, size,
// extractedText?, parseError? } — 을 받는다.
function buildPBLHrdAttachmentSection(
  hrdReportPdf: PBLHrdReportPdf | null | undefined,
): string {
  if (!hrdReportPdf) return '';

  const sizeLabel = hrdReportPdf.size
    ? `${Math.round(hrdReportPdf.size / 1024)} KB`
    : '-';
  const body = hrdReportPdf.extractedText
    ? `\n[추출된 본문]\n${hrdReportPdf.extractedText}`
    : hrdReportPdf.parseError
      ? `\n[파싱 실패: ${hrdReportPdf.parseError}]`
      : '';

  return `\n### Ⅱ-3-가. 기업HRD이음컨설팅 결과 (첨부 보고서)
- 파일명: ${hrdReportPdf.fileName ?? '-'}
- 크기: ${sizeLabel}${body}`;
}

// ============================================================================
// 프롬프트 빌더 — 산인공 PBL 양식 2번 Ⅳ장(운영계획) + Ⅴ장(성과분석·확산 전략) 기반
// ============================================================================

/**
 * 시스템 프롬프트
 */
export function buildPBLSystemPrompt(): string {
  const evaluationScale = PBL_EVALUATION_SCALE_DESCRIPTION;

  return `당신은 산업인력공단 PBL(Problem-Based Learning) 과정개발 보고서 설계 전문가입니다. 기업 PBL 인터뷰 결과를 분석하여 산인공 공식 양식 2번 Ⅳ장(운영계획)과 Ⅴ장(성과분석·확산 전략)에 맞는 보고서를 작성합니다.

## 섹션 설계 원칙

### Ⅳ-1. 훈련 목표 (training_goal)
- 기업 인터뷰의 훈련대상 업무·문제정의·AI수준 진단을 종합하여 1~2문장으로 작성하라.
- To-Be 수준 달성을 명시하고, 구체적 업무명을 포함하라.

**Ⅳ-1 few-shot 예시**
\`\`\`
"AI 비전검사 시스템을 활용하여 품질검사 업무의 자동화 기반을 구축하고, 불량 감지 정확도를 현재 대비 20% 이상 향상시킨다. 훈련 완료 후 AI활용형(중급) 수준에 도달하여 노코드 AI 도구로 현장 데이터를 자율적으로 분석·활용할 수 있게 한다."
\`\`\`

### Ⅳ-2. AI 도구 활용 계획 (ai_tool_usage_plan) — 최소 3단계 이상
- 3단계 이상 작성하라. 권장 구성: 1단계 훈련실시 / 2단계 리뷰 및 피드백 / 3단계 최종 결과 및 평가.
- 각 단계는 stage(예: "1단계"), main_activity, ai_tools[], utilized_data, purpose, specific_method를 모두 채워라.
- 무료 범위 내 AI 도구만 사용하라 (예: ChatGPT 무료 플랜, Notion AI 무료 플랜, Gamma 무료, Canva 무료).

**Ⅳ-2 few-shot 예시**
\`\`\`json
[
  {
    "stage": "1단계",
    "main_activity": "훈련실시",
    "ai_tools": ["Teachable Machine (무료: 전체)", "ChatGPT (무료 플랜)"],
    "utilized_data": "생산라인 불량·정상 이미지 데이터셋",
    "purpose": "노코드 AI 도구로 불량검사 모델을 직접 학습·배포하는 실무 역량 강화",
    "specific_method": "Teachable Machine으로 이미지 분류 모델 학습 → ChatGPT로 모델 개선 전략 수립 및 결과 해석"
  },
  {
    "stage": "2단계",
    "main_activity": "리뷰 및 피드백",
    "ai_tools": ["ChatGPT (무료 플랜)", "Google Forms (무료)"],
    "utilized_data": "훈련 중 오류 발생 데이터, 설문 응답 데이터",
    "purpose": "체계적 피드백 수집과 데이터 분석으로 훈련 품질 개선",
    "specific_method": "Google Forms로 훈련생 피드백 설문 배포 → ChatGPT로 응답 분석 및 개선점 도출"
  },
  {
    "stage": "3단계",
    "main_activity": "최종 결과 및 평가",
    "ai_tools": ["ChatGPT (무료 플랜)", "Gamma (무료)"],
    "utilized_data": "KPI 달성 데이터, 최종 프로젝트 산출물",
    "purpose": "훈련 성과 평가 및 경영진 보고용 발표자료 작성",
    "specific_method": "ChatGPT로 KPI 달성도 분석·최종 보고서 작성 → Gamma로 발표 자료 제작"
  }
]
\`\`\`

### Ⅳ-3-가. 훈련과정 개요 (training_plan.overview)
- course_name: 인터뷰 courseName 값을 그대로 사용하라.
- training_period.start/end: 인터뷰 trainingPeriod 의 시작·종료를 파싱해 "YYYY-MM-DD" 형식으로 작성하라. 인터뷰에 없으면 합리적 추정값을 사용하라.

### Ⅳ-3-나. 학습그룹 구성 (learning_group)
- instructors: type("외부"|"내부"), role("팀원"|"팀장"), affiliation, position, name 필드를 모두 채워라.
- trainees: role("팀원"|"팀장"), affiliation, position, name 필드를 모두 채워라.
- 이름이 없을 경우 "미정"으로 작성하라.

### Ⅳ-3-다. 훈련 교과목 프로파일 (subject_profile) — PBL 핵심 섹션, 적정 풍부도

PBL 보고서에서 가장 중요한 섹션. **각 단원(unit_name)별로 핵심 활동·실습·산출물 흐름이 드러나도록 작성**하라.

- training_contents는 최소 1개, **권장 3~5개**.
- 각 행: unit_name(업무/단원명), detail(세부 내용), training_hours(훈련시간), instructor_hours({ external, internal }).
- **필수 제약: instructor_hours.external + instructor_hours.internal === training_hours** (양식 가이드 #9). 합계 불일치 시 검증 오류.
- total_sum_hours = training_contents의 training_hours 합계와 정확히 일치해야 한다.
- **total_hours 권장 상한: 30시간 이내**. 공단 훈련코치 강사료 지원 한도가 30시간이므로 AI 초안은 가급적 30시간 이내로 구성하라. 단, 인터뷰의 "적정 훈련시간" 입력이 30시간을 초과하거나 기업이 제시한 문제·프로젝트의 범위가 30시간 안에 담기 어려우면 그에 맞춰 자연스럽게 확장하라(강제 상한 아님).
- analysis_method: "LLM 기반 데이터 분석, RAG 등" 형식으로 기술하라.

**🔑 detail 필드 작성 규칙 (커리큘럼)**

- 각 단원의 detail 은 **3~5개 항목**(커리큘럼 구성)으로 작성하라. 너무 적으면 빈약, 너무 많으면 산만하다.
- **항목 사이는 \`\\n\` (실제 줄바꿈) 으로만 분리**하라. ▪ ● - 등의 머리기호는 **절대 붙이지 마라** (양식 셀이 paragraph 별로 자동 머리기호를 부여하므로 중복 표시됨).
- 각 항목은 30~80자 정도로 구체적인 활동·실습·산출물을 짧고 명확하게 기술하라.
- 활동 + 실습 + 결과물의 흐름이 자연스럽게 드러나도록 배치하라 (예: 이론 학습 → 실습 → 산출물).

\`\`\`
(예시 — 한 단원의 detail 4개 항목)
AI/머신러닝 개념 강의 및 자사 검사기준 분석 워크숍
Label Studio 로 자사 이미지 200장 결함 유형별 라벨링 실습
라벨링 가이드라인 문서 공동 작성 (검사자 일치율 80% 목표)
실습 데이터셋 (CSV + 이미지) 산출 및 다음 단원 입력 준비
\`\`\`

**Ⅳ-3-다 few-shot 예시 (훈련시간 합 검증 + detail 3~5 항목 + 머리기호 없음)**
\`\`\`json
{
  "course_name": "AI 비전검사 실무 과정",
  "total_hours": 32,
  "training_goals": ["노코드 AI 도구로 이미지 불량검사 모델을 학습·배포할 수 있다", "품질검사 데이터를 수집·정제하여 AI 학습 데이터셋을 구성할 수 있다"],
  "ai_tools": ["Teachable Machine (무료: 전체)", "ChatGPT (무료 플랜)", "Label Studio (무료: Community Edition)"],
  "utilized_data": "생산라인 불량·정상 이미지 데이터셋 (1,000장 이상)",
  "analysis_method": "노코드 이미지 분류(Teachable Machine), LLM 기반 결과 해석(ChatGPT)",
  "training_contents": [
    {
      "unit_name": "AI 데이터 이해 및 수집",
      "detail": "AI/머신러닝 기본 개념 강의 및 자사 검사기준 분석 워크숍\nLabel Studio 환경에 자사 불량·정상 이미지 200장 업로드 및 라벨링 실습\n결함 유형별(스크래치/이물/치수불량) 클래스 정의 및 라벨링 가이드라인 공동 작성\n검사자 간 라벨링 일치율 80% 이상 달성 및 데이터셋(CSV+이미지) 산출",
      "training_hours": 8,
      "instructor_hours": { "external": 6, "internal": 2 }
    },
    {
      "unit_name": "노코드 AI 모델 학습·평가",
      "detail": "Teachable Machine 으로 불량/정상 이미지 분류 모델 학습 시연 및 하이퍼파라미터 튜닝 실습\n학습된 모델을 웹 브라우저 inference 환경으로 export 및 자사 데이터셋 평가\nChatGPT 에 confusion matrix 붙여넣고 정확도·재현율·정밀도 개선점 질의\n부서별 모델 성능 비교 발표 및 개선 제안서 작성 (정확도 90% 이상 목표)",
      "training_hours": 12,
      "instructor_hours": { "external": 8, "internal": 4 }
    },
    {
      "unit_name": "현장 적용·확산 및 피드백",
      "detail": "사내 PC + 카메라로 실시간 inference 시범 운영 환경 구축 (2주)\n매일 검사 결과 vs 모델 결과 비교 및 일주일 단위 정합도 측정 (85% 목표)\n경영진 보고용 자료(PPT) 및 6개월 확산 로드맵 공동 작성\n타 부서 적용 가능성 검토 및 사내 표준화 매뉴얼 초안 작성",
      "training_hours": 12,
      "instructor_hours": { "external": 8, "internal": 4 }
    }
  ],
  "total_sum_hours": 32
}
\`\`\`

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

### Ⅳ-4-나. 결과평가 — LLM 생성 제외 (null 배열로만 채울 것)
- 이 섹션은 산인공 고정 설문 양식이므로 LLM이 생성하지 않는다.
- 설문 응답은 아직 미실시 상태이므로 **모든 항목을 null로 설정**하라.
- 반드시 아래 길이를 준수하라:
  - satisfaction_survey: 길이 **5** (만족도)
  - achievement_survey: 길이 **3** (성취도)
  - external_expert_survey: 길이 **5** (외부전문가 만족도)
  - practical_application_survey: 길이 **4** (현업적용도)
- 길이가 다르면 검증 오류가 발생한다.

### Ⅴ-1. 성과분석 측정 지표 (outcome_analysis.outcome_metrics)
- selected_goals: 인터뷰의 courseNecessity, problemDefinitionSheet.core, priority.items 를 종합해 가장 적합한 카테고리를 1~3개 선택하라. 허용값: "기술문제 해결" | "공정 최적화" | "불량률 감소" | "기술 매뉴얼 개발" | "기타"
- quantitative: 정량 지표를 구체적 수치(%, 건수, 시간)로 작성하라. 최소 2개 지표.
- qualitative: 정성 지표를 협업·역량·조직문화 관점에서 작성하라. 최소 2개 항목.

**Ⅴ-1 few-shot 예시**
\`\`\`json
{
  "selected_goals": ["불량률 감소", "공정 최적화"],
  "quantitative": "1. 훈련 이후 불량발생률 15% 감소 (월별 측정)\n2. AI 비전검사 자동화로 품질검사 소요시간 40% 단축\n3. 데이터 라벨링 오류율 10% 이하 달성",
  "qualitative": "1. 문제해결 역량 — AI 도구를 활용한 현장 데이터 분석 및 자율적 문제 해결 능력 향상\n2. 협업 및 소통 — 팀 프로젝트 수행 과정에서 부서 간 데이터 공유 및 협업 역량 발전\n3. 조직문화 — AI 도구 도입에 대한 구성원의 수용성 향상 및 데이터 기반 의사결정 문화 조성"
}
\`\`\`

### Ⅴ-2. 성과 확산 전략 (outcome_analysis.diffusion_strategy)
- internalization: 매뉴얼 제작·멘토-멘티 제도·재훈련 계획 등 내재화 방안을 3가지 이상 구체적으로 기술하라.
- company_wide_diffusion: 성과 발표회·타 부서 확대·경영진 보고 등 전사 확산 방안을 3가지 이상 기술하라.

**Ⅴ-2 few-shot 예시**
\`\`\`json
{
  "internalization": "1. 매뉴얼 및 가이드 제작 — 훈련 과정에서 도출된 AI 비전검사 활용 방법을 표준 업무 매뉴얼로 문서화하여 신규 입사자 OJT에 활용\n2. 멘토-멘티 제도 운영 — 훈련 이수자(품질팀 3명)를 내부 멘토로 지정하여 동료 직원 현장 지도 수행\n3. 주기적 재훈련 체계 마련 — AI 기술 발전에 따른 분기별 업데이트 교육 계획 수립",
  "company_wide_diffusion": "1. 성과 발표회 개최 — 훈련 완료 후 전 임직원 대상 성과 공유 및 우수 프로젝트 시상식 운영\n2. 타 부서 확대 적용 — 품질팀 파일럿 성공 경험을 생산팀·물류팀으로 단계적 확산 (다음 분기)\n3. 경영진 보고 및 투자 확보 — KPI 달성 데이터를 바탕으로 최고경영진에 AI 훈련 효과 보고, 후속 투자 확보"
}
\`\`\`

## 공통 정책
- 모든 도구는 무료 범위 내에서 활용 가능해야 한다.
- 한국어로 출력하라.
- JSON 외 다른 텍스트를 출력하지 마라.

## 출력 JSON 스키마

반드시 아래 구조로만 응답하라. JSON 외 다른 텍스트를 출력하지 마라.

\`\`\`json
{
  "operation_plan": {
    "training_goal": "string (1~2문장, To-Be 명시)",
    "ai_tool_usage_plan": [
      {
        "stage": "string (예: 1단계)",
        "main_activity": "string (주요 활동)",
        "ai_tools": ["string (도구명, 무료 범위 명시)"],
        "utilized_data": "string (활용 데이터)",
        "purpose": "string (활용 목적 2줄 이내)",
        "specific_method": "string (구체적 방법 2~4줄)"
      }
    ],
    "training_plan": {
      "overview": {
        "course_name": "string (인터뷰 과정명 그대로)",
        "training_period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" }
      },
      "learning_group": {
        "instructors": [
          { "type": "외부 | 내부", "role": "팀원 | 팀장", "affiliation": "string", "position": "string", "name": "string" }
        ],
        "trainees": [
          { "role": "팀원 | 팀장", "affiliation": "string", "position": "string", "name": "string" }
        ]
      },
      "subject_profile": {
        "course_name": "string",
        "total_hours": "integer > 0 (권장 30시간 이내, 적정 훈련시간이 초과하면 그에 맞춰 확장)",
        "training_goals": ["string (bullet)"],
        "ai_tools": ["string (도구명)"],
        "utilized_data": "string",
        "analysis_method": "string",
        "training_contents": [
          {
            "unit_name": "string",
            "detail": "string",
            "training_hours": "integer > 0",
            "instructor_hours": { "external": "integer >= 0", "internal": "integer >= 0 (external+internal === training_hours)" }
          }
        ],
        "total_sum_hours": "integer (training_contents 합과 일치)"
      },
      "facilities": [
        { "seq": "integer >= 1", "category": "시설 | 장비", "name": "string", "spec": "string", "location": "string" }
      ],
      "training_instructors": [
        {
          "name": "string",
          "internal_external": "내부 | 외부",
          "career_years": "integer >= 0",
          "work_name": "string",
          "detailed_training_content": ["string (bullet)"]
        }
      ]
    },
    "evaluation_plan": {
      "course_evaluation": {
        "course_name": "string",
        "evaluation_methods": ["포트폴리오 | 문제해결시나리오 | 작업장 평가"],
        "evaluation_target": "string",
        "evaluation_date": "string (YYYY-MM-DD 또는 예정일 서술)",
        "evaluation_criteria": "string (예: 수행 수준 4 이상 60% 이상 시 PASS)",
        "evaluation_result": "예정",
        "performance_checklist": [
          { "unit_name": "string", "evaluation_criteria": "string", "performance_level": "integer 1~5" }
        ],
        "overall_comment": "string (빈 문자열 허용)",
        "evaluation_scale": "${evaluationScale}"
      },
      "result_evaluation": {
        "satisfaction_survey": [null, null, null, null, null],
        "achievement_survey": [null, null, null],
        "external_expert_survey": [null, null, null, null, null],
        "practical_application_survey": [null, null, null, null]
      }
    }
  },
  "outcome_analysis": {
    "outcome_metrics": {
      "selected_goals": ["기술문제 해결 | 공정 최적화 | 불량률 감소 | 기술 매뉴얼 개발 | 기타"],
      "quantitative": "string (정량 지표, 최소 2개 항목)",
      "qualitative": "string (정성 지표, 최소 2개 항목)"
    },
    "diffusion_strategy": {
      "internalization": "string (내재화 방안, 최소 3가지)",
      "company_wide_diffusion": "string (전사 확산 방안, 최소 3가지)"
    }
  }
}
\`\`\``;
}

/**
 * 사용자 프롬프트 (입력 데이터 포함) — V2 (`PBLInterviewStrict`, flat camelCase) 입력.
 *
 * 인터뷰 제출(`submitPBLInterviewV2`)이 저장하는 정본 모양과 동일하다. `Record<string,
 * unknown>` 시그니처는 호출자 호환을 위해 유지하되, 본 함수 내부에서 V2 타입으로
 * 좁혀 키에 직접 접근한다.
 *
 * @param selfAssessment 기업이 입력한 사전 자가진단 행 (`self_assessments` 테이블).
 *   `scores` JSONB(역량별 점수) 를 LLM 프롬프트에 그대로 주입한다. 로드맵 측과
 *   동일한 패턴 — `null/undefined` 일 때는 자가진단 결과 섹션을 렌더하지 않는다.
 */
export function buildPBLUserPrompt(
  interview: Record<string, unknown>,
  project: Record<string, unknown>,
  consultantProfile: ConsultantProfile | null,
  diagnosisSummary: string,
  revisionPrompt?: string,
  selfAssessment?: { scores?: unknown } | null,
): string {
  // V2 (PBLInterviewStrict) 모양에 직접 접근. 자동저장 partial 케이스 대비해
  // 각 키는 ?? 폴백으로 보호한다.
  const i = interview as Partial<{
    // Ⅰ 훈련과정 개요
    companyName: string;
    courseName: string;
    ncsCode: string;
    trainingHours: number;
    trainingTarget: string;
    trainingForm: string;
    trainingPeriod: string;
    businessIssues: string;
    // Ⅱ-1 기업 현황
    companyIssues: string;
    organization: { orgTree?: unknown[]; mainWork?: unknown[] };
    // Ⅱ-2 훈련환경
    trainingEnv: {
      properTrainingHours?: string;
      internalPlace?: string;
      externalPlace?: string;
      internalInstructors?: unknown[];
      externalInstructors?: unknown[];
      aiInfrastructure?: string;
    };
    // Ⅱ-3 HRD 필요성
    hrdReportPdf: PBLHrdReportPdf | null;
    courseNecessity: string;
    // Ⅲ-1 수행활동
    activities: unknown[];
    // Ⅲ-2-가 문제 정의서
    problemDefinitionSheet: {
      background?: string;
      core?: string;
      scope?: string;
      constraints?: string;
    };
    // Ⅲ-2-나 우선순위
    priority: { method?: string; items?: unknown[] };
    // Ⅲ-3 훈련대상 업무
    target: {
      name?: string;
      code?: string;
      scope?: string;
      necessity?: string;
      necessity_score?: number;
      details?: unknown[];
    };
    // Ⅲ-4 AI 수준
    currentAiLevel: { level?: string; note?: string };
    expectedAiLevel: { level?: string; note?: string };
  }>;

  const trainingEnv = i.trainingEnv ?? {};
  const organization = i.organization ?? {};
  const problemDef = i.problemDefinitionSheet ?? {};
  const priority = i.priority ?? {};
  const target = i.target ?? {};
  const currentAiLevel = i.currentAiLevel ?? {};
  const expectedAiLevel = i.expectedAiLevel ?? {};

  const subIndustries = Array.isArray(project.sub_industries) ? project.sub_industries : [];

  let prompt = `## 기업 정보

- 회사명: ${project.company_name ?? i.companyName ?? '미입력'}
- 업종: ${project.industry ?? '미입력'}
- 세부 업종: ${subIndustries.length > 0 ? subIndustries.join(', ') : '미지정'}
- 규모: ${project.company_size ?? '미입력'}
- 요청사항: ${project.customer_comment ?? '없음'}

## 진단 요약

${diagnosisSummary}
${
  selfAssessment
    ? `\n## 자가진단 결과\n\n${JSON.stringify(selfAssessment.scores ?? {}, null, 2)}\n`
    : ''
}
## Ⅰ. 훈련과정 개요

- 과정명: ${i.courseName ?? '미입력'}
- NCS 코드: ${i.ncsCode ?? '미입력'}
- 훈련시간: ${i.trainingHours ?? 0}시간
- 훈련대상(훈련생): ${i.trainingTarget ?? '미입력'}
- 훈련형태: ${i.trainingForm ?? '미입력'}
- 훈련기간: ${i.trainingPeriod ?? '미입력'}
- 사업 쟁점 요약: ${i.businessIssues ?? '미입력'}

## Ⅱ-1. 기업 현황 분석

- 경영 이슈(bullet): ${i.companyIssues ?? '미입력'}
- 조직도: ${JSON.stringify(organization.orgTree ?? [], null, 2)}
- 부서별 주요 업무: ${JSON.stringify(organization.mainWork ?? [], null, 2)}

## Ⅱ-2. 훈련환경 분석

- 적정 훈련시간: ${trainingEnv.properTrainingHours ?? '미입력'}
- 훈련장소(사내): ${trainingEnv.internalPlace ?? '미입력'}
- 훈련장소(사외): ${trainingEnv.externalPlace ?? '미입력'}
- 사내 강사: ${JSON.stringify(trainingEnv.internalInstructors ?? [], null, 2)}
- 외부 강사: ${JSON.stringify(trainingEnv.externalInstructors ?? [], null, 2)}
- AI 인프라(사내): ${trainingEnv.aiInfrastructure ?? '미입력'}

## Ⅱ-3. HRD 제안·과정개발 필요성

- AI훈련과정 개발 필요성: ${i.courseNecessity ?? '미입력'}
${buildPBLHrdAttachmentSection(i.hrdReportPdf)}
## Ⅲ-1. 훈련과제 도출 수행활동 (차수 × 4역할 평면 배열)

${JSON.stringify(i.activities ?? [], null, 2)}

## Ⅲ-2. 문제 정의·우선순위

- 문제 배경: ${problemDef.background ?? '미입력'}
- 핵심 문제: ${problemDef.core ?? '미입력'}
- 문제 범위: ${problemDef.scope ?? '미입력'}
- 제약 조건: ${problemDef.constraints ?? '미입력'}
- 우선순위 결정 방법: ${priority.method ?? '미입력'}
- 문제 우선순위 항목: ${JSON.stringify(priority.items ?? [], null, 2)}

## Ⅲ-3. 훈련대상 업무 선정

- 업무명: ${target.name ?? '미입력'}
- NCS 분류: ${target.code ?? '미입력'}
- 업무 범위(부서·인원): ${target.scope ?? '미입력'}
- AI기반 문제해결 필요성(선정 사유): ${target.necessity ?? '미입력'}
- 필요성 점수(1~5): ${target.necessity_score ?? '-'}
- 업무 세부내용(AS-IS / TO-BE / 요구지식 / 기술): ${JSON.stringify(target.details ?? [], null, 2)}

## Ⅲ-4. AI 역량 수준

- 현재 AI 수준: ${currentAiLevel.level ?? '미입력'}
- 현재 수준 상세: ${currentAiLevel.note ?? '미입력'}
- 향후 목표 AI 수준: ${expectedAiLevel.level ?? '미입력'}
- 목표 수준 상세 · 향상 사유: ${expectedAiLevel.note ?? '미입력'}
${buildSttInsightsSection(interview)}`;

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

위 정보를 바탕으로 산인공 PBL 양식 2번 Ⅳ장(운영계획)과 Ⅴ장(성과분석·확산 전략)에 맞는 보고서를 생성해주세요.
반드시 JSON 형식으로만 응답하세요.`;

  return prompt;
}
