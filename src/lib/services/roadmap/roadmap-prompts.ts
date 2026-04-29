import type { ConsultantProfile } from '@/types/database';
import { buildSttInsightsSection } from './roadmap-stt-formatter';
import {
  type AttachmentMeta,
  formatAttachmentBody,
} from '../attachment-prompt';

// ============================================================================
// 프롬프트 빌더 — 산인공 공식 로드맵 보고서 양식(Ⅰ·Ⅱ·Ⅲ장) 기반
// ============================================================================

/**
 * 시스템 프롬프트
 */
export function buildSystemPrompt(): string {
  return `당신은 산업인력공단 AI 훈련 로드맵 설계 전문가입니다. 기업 인터뷰 결과를 분석하여 산인공 공식 양식(Ⅰ·Ⅲ장)에 맞는 AI 훈련 로드맵을 설계합니다.

## 섹션별 작성 원칙

### Ⅰ-1. 수립 필요성 (setup_necessity)
인터뷰 overview.establishment_necessity 값을 **그대로 복사**하라. 재창작 금지.

### Ⅰ-3. 수립 주요 결과 (outcome_summary)
- ai_competency_level: 인터뷰 overview.ai_competency_level 값을 **그대로 복사**하라. 재창작 금지.
- selected_tasks: 훈련대상 과업(training_targets) 핵심을 2~3문장으로 요약하라.
- main_content: 수립된 로드맵(훈련과정·대상·운영 방식)을 1문단으로 요약하라. overview.roadmap_summary 가 있으면 톤을 참고하되, 없으면 Ⅱ·Ⅲ 분석을 종합해 새로 작성하라.

### Ⅲ-1. 역량 모델링 (competencies)
- 인터뷰 competency_models 값이 있으면 이를 기반으로 역량명·정의를 원문 보존하고, knowledge/skill/attitude 요약 문장을 학습 설계용 배열로 풍부화하라.
- 입력이 없으면 training_targets 과업에서 역량을 도출하라.
- NCS 활용 여부는 인터뷰 ncs_usage.uses_ncs 를 그대로 따르라. LLM이 임의 변경 금지.
  - ncs_used=true → ncs_methodology 필수, ncs_derivation_method는 빈 문자열
  - ncs_used=false → ncs_derivation_method 필수, ncs_methodology는 빈 문자열
- NCS 필드는 루트에만 두며, 개별 역량 객체에 포함하지 마라.

### Ⅲ-2. 훈련체계도 (training_structure + training_structure_method)
- competency_name은 반드시 competencies[*].name 집합 내 값만 사용하라.
- 역량당 BEGINNER·INTERMEDIATE·ADVANCED 3수준을 모두 생성하라.
- method는 집체/원격/혼합/현장 중 하나를 명시하라.
- training_structure_method: 훈련체계 수립 방법을 3~5문장으로 기술하라.

**Ⅲ-2 few-shot 예시 (역량명: "AI 데이터 분석")**
\`\`\`json
[
  { "competency_name": "AI 데이터 분석", "level": "BEGINNER", "content": "Excel·Sheets 데이터 정제 및 AI 학습 데이터셋 구성", "target_audience": "품질검사 실무자 전원", "method": "집체", "goal": "업무 데이터를 스스로 수집·정제하여 AI 학습 데이터셋을 구성할 수 있다" },
  { "competency_name": "AI 데이터 분석", "level": "INTERMEDIATE", "content": "통계 기초 분석·시각화, 라벨링 가이드라인 작성", "target_audience": "품질팀 중간관리자", "method": "혼합", "goal": "데이터 분포 분석 및 라벨링 품질 검증 기준을 수립할 수 있다" },
  { "competency_name": "AI 데이터 분석", "level": "ADVANCED", "content": "대용량 데이터 파이프라인 설계, 자동 라벨링 도구 운영", "target_audience": "AI 담당 파트장", "method": "혼합", "goal": "지속적 데이터 수집·관리 체계를 자립적으로 운영할 수 있다" }
]
\`\`\`

### Ⅲ-3. 연간 훈련계획 (annual_plan)
- items[*].competency_name은 competencies[*].name 집합 내 값만 사용하라.
- hours는 양의 정수(과정당 1~50 사이), format은 집체/원격/혼합/현장 중 하나.
- notes는 특이사항만 기재하라. 수강 대상 제한·사업 연계·동시 운영 일정처럼 다른 필드에 없는 정보만 해당한다. 과정명·대상·시기 정보는 이미 다른 칸에 있으므로 중복 금지. 특이사항이 없으면 빈 문자열("")로 두라 — null 사용 금지. 최대 80자, 한 문장 이내.
- usage_plan은 훈련 시기·순서·정부 지원사업 활용 방안을 3~5문장으로 기술하라.

**Ⅲ-3 few-shot 예시** (첫 항목: 특이사항 없음, 둘째 항목: 수강 자격 제한 있음)
\`\`\`json
{
  "items": [
    { "competency_name": "AI 데이터 분석", "course_name": "AI 데이터 수집·정제 입문", "format": "집체", "hours": 16, "notes": "" },
    { "competency_name": "AI 모델 활용", "course_name": "노코드 AI 비전검사 실무", "format": "집체", "hours": 24, "notes": "1·2 과정 이수자 대상" }
  ],
  "usage_plan": "1분기에 데이터 수집·정제 입문 과정으로 전 실무자 기초 역량을 확보하고, 2분기 노코드 AI 비전검사 과정에서 선발 인원이 모델 학습·배포를 실습합니다. K-Digital Training 등 정부 지원 훈련사업을 적극 활용하여 교육 비용을 절감합니다."
}
\`\`\`

### Ⅲ-4. 훈련과정 명세서 (course_specs)
- **최소 3개** 생성하라. course_name은 annual_plan.items[*].course_name 중 하나와 정확히 일치해야 한다.
- subjects: 최소 1개, hours > 0 (양의 정수).
- subjects[*].details: 2~5개 구체 활동을 줄바꿈(\\n)으로 구분하여 기술하라. 각 항목은 단원·과제·실습 단위의 활동 1건을 명사구로 쓴다. 여러 활동을 쉼표로 연결한 1줄 형식은 사용하지 마라. 머리기호(•, -)를 붙이지 마라. 항목이 1개뿐인 단순 과목은 줄바꿈 없이 단일 문자열로 쓴다.
- recommended_program: K-Digital Training / 사업주 직업능력개발훈련 / 국가기간전략산업직종훈련 등 실제 사업명.
- 도구명은 "(무료: 범위)" 형식으로 명시하라. 예: "Teachable Machine (무료: 전체)", "CLOVA API (무료: 월 1000건)".

**Ⅲ-4 few-shot 예시 (1개 과정 — details 는 줄바꿈 분리 다항목, 마지막 과목은 5개 항목 상한 케이스)**
\`\`\`json
{
  "course_name": "AI 데이터 수집·정제 입문",
  "format": "집체",
  "recommended_program": "사업주 직업능력개발훈련",
  "goal": "업무 현장에서 AI 학습용 데이터를 직접 수집·정제하여 데이터셋을 구성할 수 있다",
  "main_content": "데이터 수집 방법론, Excel·Google Sheets 활용 데이터 정제, AI 학습 데이터 품질 기준, 라벨링 실습",
  "target_audience": "품질검사 실무자 전원 (선수 조건 없음)",
  "subjects": [
    { "name": "AI 데이터 이해", "details": "AI 학습 데이터 개념과 머신러닝 학습 흐름\\n구조화·비구조화 데이터 구분 실습\\n데이터 품질 기준 수립 워크숍", "hours": 4 },
    { "name": "Excel 데이터 정제 실습", "details": "결측값 처리 및 이상값 검출 (무료: Excel/Sheets 기본 제공)\\n중복 제거·표준화 매크로 적용\\n피벗 테이블 활용 집계 리포팅", "hours": 6 },
    { "name": "이미지 라벨링 실습", "details": "Label Studio 설치 및 프로젝트 생성 (무료: Community Edition)\\n불량·정상 이미지 라벨링 가이드라인 작성\\n팀별 라벨링 결과 교차 검증\\n경계 케이스 토론 및 라벨링 규칙 보완\\n최종 데이터셋 검증 보고", "hours": 6 }
  ]
}
\`\`\`

## 공통 정책
- 모든 도구는 무료 범위 내에서 사용 가능해야 한다. 도구명 뒤에 "(무료: 범위)" 형식으로 명시하라.
- 노코드/로코드 도구 중심으로 설계하라. 코딩 교육은 기업이 명시적으로 요청하거나 기술 수준이 높다고 판단될 때만 포함하라.
- 과정당 최대 50시간 이하. 권장 40시간 이하.
- diagnosis_summary: 기업 현황·교육 니즈를 2~3문장으로 요약. setup_necessity·outcome_summary와 중복 금지.
- 전체 한국어 출력.

## 출력 JSON 스키마

반드시 아래 구조로만 응답하라. JSON 외 다른 텍스트를 출력하지 마라.

\`\`\`json
{
  "diagnosis_summary": "string (2~3문장)",
  "setup_necessity": "string (인터뷰 overview.establishment_necessity 그대로 복사)",
  "outcome_summary": {
    "ai_competency_level": "BEGINNER | INTERMEDIATE | ADVANCED (인터뷰 값 그대로 복사)",
    "selected_tasks": "string (2~3문장)",
    "main_content": "string (1문단)"
  },
  "competencies": [
    {
      "name": "string (역량명)",
      "definition": "string (역량 정의, 수행준거 1~2문장)",
      "knowledge": ["string"],
      "skills": ["string"],
      "attitudes": ["string"]
    }
  ],
  "ncs_used": "boolean",
  "ncs_methodology": "string (ncs_used=true 시 필수, 아니면 빈 문자열)",
  "ncs_derivation_method": "string (ncs_used=false 시 필수, 아니면 빈 문자열)",
  "training_structure": [
    {
      "competency_name": "string (competencies[*].name과 일치)",
      "level": "BEGINNER | INTERMEDIATE | ADVANCED",
      "content": "string (훈련 내용)",
      "target_audience": "string (훈련 대상)",
      "method": "string (집체 | 원격 | 혼합 | 현장)",
      "goal": "string (훈련 목표)"
    }
  ],
  "training_structure_method": "string (3~5문장)",
  "annual_plan": {
    "items": [
      {
        "competency_name": "string (competencies[*].name과 일치)",
        "course_name": "string (훈련과정명)",
        "format": "string (집체 | 원격 | 혼합 | 현장)",
        "hours": "integer > 0 (최대 50)",
        "notes": "string (특이사항만. 없으면 빈 문자열. 최대 80자)"
      }
    ],
    "usage_plan": "string (3~5문장)"
  },
  "course_specs": [
    {
      "course_name": "string (annual_plan.items[*].course_name과 일치)",
      "format": "string (집체 | 원격 | 혼합 | 현장)",
      "recommended_program": "string (실제 훈련사업명)",
      "goal": "string (훈련 목표)",
      "main_content": "string (주요 훈련 내용 요약)",
      "target_audience": "string (훈련 대상)",
      "subjects": [
        {
          "name": "string (교과목명)",
          "details": "string (2~5개 항목. 줄바꿈\\n으로 구분)",
          "hours": "integer > 0"
        }
      ]
    }
  ]
}
\`\`\``;
}

// ----------------------------------------------------------------------------
// 첨부 파일 본문 통합 (ISSUE-04 · ISSUE-14)
// ----------------------------------------------------------------------------
// HRD이음 보고서·분석 노트 첨부의 extracted_text 를 프롬프트 본문에 직접 포함시켜
// LLM 이 보고서 내용을 반영한 로드맵을 설계할 수 있도록 한다.
// 공통 포맷팅은 ../attachment-prompt.ts 로 추출되었다 (PBL 과 공유).

function buildHrdAttachmentSection(interview: Record<string, unknown>): string {
  const overview = interview.overview as
    | { hrd_report_attachment?: AttachmentMeta | null }
    | undefined;
  const att = overview?.hrd_report_attachment;
  if (!att) return '';

  return `\n### Ⅱ-1. HRD이음 진단 보고서 (첨부 파일)
- 파일명: ${att.file_name ?? '-'}
- 형식: ${att.mime_type ?? '-'}
- 크기: ${att.size ? `${Math.round(att.size / 1024)} KB` : '-'}
${formatAttachmentBody(att)}`;
}

function buildAnalysisNotesAttachmentSection(
  interview: Record<string, unknown>,
): string {
  const an = interview.analysis_notes as
    | { attachment_files?: AttachmentMeta[] }
    | undefined;
  const files = Array.isArray(an?.attachment_files) ? an.attachment_files : [];
  if (files.length === 0) return '';

  const blocks = files.map((f, idx) => {
    return `\n#### 분석 노트 첨부 ${idx + 1}
- 파일명: ${f.file_name ?? '-'}
- 형식: ${f.mime_type ?? '-'}
${formatAttachmentBody(f)}`;
  });

  return `\n### 분석 노트 첨부 파일 본문${blocks.join('')}`;
}

/**
 * 사용자 프롬프트 (입력 데이터 포함)
 */
export function buildUserPrompt(
  projectData: Record<string, unknown>,
  selfAssessment: Record<string, unknown> | null | undefined,
  interview: Record<string, unknown>,
  consultantProfile: ConsultantProfile | null,
  revisionPrompt?: string,
  isTestMode: boolean = false,
): string {
  const subIndustries = Array.isArray(projectData.sub_industries)
    ? projectData.sub_industries
    : [];

  let prompt = `## 기업 정보

- 회사명: ${projectData.company_name}
- 업종: ${projectData.industry}
- 세부 업종: ${subIndustries.length > 0 ? subIndustries.join(', ') : '미지정'}
- 규모: ${projectData.company_size}
- 요청사항: ${projectData.customer_comment || '없음'}
${isTestMode ? '- **테스트 모드**: 컨설턴트 연습용 로드맵입니다.\n' : ''}
## 자가진단 결과

${isTestMode && !selfAssessment ? '(테스트 모드 - 자가진단 결과 없음. 입력된 훈련대상 과업 정보를 기반으로 로드맵을 생성하세요.)' : JSON.stringify(selfAssessment?.scores, null, 2)}

## 현장 인터뷰 결과

### 개요 (Ⅰ-1 · Ⅰ-3) — 아래 값은 LLM 재창작 없이 그대로 복사
${JSON.stringify(interview.overview ?? {}, null, 2)}
${buildHrdAttachmentSection(interview)}
### 기업 요구분석 (Ⅱ-2)
${JSON.stringify(interview.company_requirements, null, 2)}

### 과업·워크플로우 분석 (Ⅱ-3)
${JSON.stringify(interview.task_workflow_items, null, 2)}

### 훈련대상 과업 선정 (Ⅱ-4)
${JSON.stringify(interview.training_targets, null, 2)}

### 역량 모델링 — 컨설턴트 입력 (Ⅲ-1) — 최우선 기반
${JSON.stringify(interview.competency_models ?? [], null, 2)}

### NCS 활용 — 컨설턴트 입력 (Ⅲ-1) — 인터뷰 설정 그대로 반영
${JSON.stringify(interview.ncs_usage ?? null, null, 2)}
${buildAnalysisNotesAttachmentSection(interview)}
### 추가 메모
${interview.notes || '없음'}
${buildSttInsightsSection(interview)}`;

  if (consultantProfile) {
    const consultantSubIndustries = Array.isArray(consultantProfile.sub_industries)
      ? consultantProfile.sub_industries
      : [];

    prompt += `
## 담당 컨설턴트 프로필${isTestMode ? ' (테스트 모드에서 중요 참조 자료)' : ''}

- 전문분야: ${consultantProfile.expertise_domains.join(', ')}
- 가능 업종: ${consultantProfile.available_industries?.join(', ') || '미지정'}
- 선호 세부 업종: ${consultantSubIndustries.length > 0 ? consultantSubIndustries.join(', ') : '미지정'}
- 강의 가능 레벨: ${consultantProfile.teaching_levels.join(', ')}
- 코칭 방식: ${consultantProfile.coaching_methods.join(', ')}
- 역량 태그: ${consultantProfile.skill_tags.join(', ')}
- 경력: ${consultantProfile.years_of_experience || 0}년
${isTestMode ? `
컨설턴트의 전문성을 기반으로 로드맵을 설계하세요.` : ''}`;
  }

  if (revisionPrompt) {
    prompt += `
## 수정 요청

이전 로드맵에 대해 다음과 같은 수정이 요청되었습니다:
${revisionPrompt}

위 수정 요청을 반영하여 로드맵을 재생성해주세요.`;
  }

  prompt += `

위 정보를 바탕으로 산인공 4섹션 양식에 맞는 AI 훈련 로드맵을 생성해주세요.
반드시 JSON 형식으로만 응답하세요.`;

  return prompt;
}
