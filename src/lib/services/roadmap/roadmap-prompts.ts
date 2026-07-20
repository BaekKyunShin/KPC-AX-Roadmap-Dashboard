import type { ConsultantProfile } from '@/types/database';
import { buildSttInsightsSection } from './roadmap-stt-formatter';
import { type AttachmentMeta, formatAttachmentBody } from '../attachment-prompt';
import { ROADMAP_COURSE_SPEC_COUNT } from './roadmap-types';

// ============================================================================
// 프롬프트 빌더 — 산인공 공식 양식 v2 (2026-07-13 개정)
// ----------------------------------------------------------------------------
// v2 에서 Ⅲ장이 "훈련체계 수립"에서 "훈련실시 계획 제안"으로 재설계되어
// 역량 모델링·NCS·훈련체계도·연간 훈련계획 표가 삭제됐다.
// LLM 이 생성하는 것은 이제 둘뿐이다:
//   1. outcome_summary.main_content (Ⅰ-3 수립 주요내용 요약)
//   2. course_specs[6]              (Ⅲ 훈련과정 명세서)
// 나머지는 전부 인터뷰 입력값을 그대로 복사한다.
// ============================================================================

/**
 * 시스템 프롬프트
 */
export function buildSystemPrompt(): string {
  return `당신은 산업인력공단 AI 훈련 로드맵 설계 전문가입니다. 기업 인터뷰 결과를 분석하여 산인공 공식 양식(Ⅰ·Ⅲ장)에 맞는 AI 훈련 로드맵을 설계합니다.

## 섹션별 작성 원칙

### Ⅰ-1. 수립 배경 (setup_necessity)
인터뷰 overview.establishment_necessity 값을 **그대로 복사**하라. 재창작 금지.

### Ⅰ-3. 수립 주요 결과 (outcome_summary)
- ai_competency_level: 인터뷰 overview.ai_competency_level 값을 **그대로 복사**하라. 재창작 금지.
- selected_tasks: 인터뷰 overview.selected_tasks_summary 값을 **그대로 복사**하라. 재창작 금지.
- main_content: **이 필드만 새로 작성한다.** 수립된 로드맵(훈련과정 구성·대상·운영 방식)을 1문단으로 요약하라.

### Ⅲ. 훈련실시 계획 제안 (course_specs) — 훈련과정 명세서
- **정확히 ${ROADMAP_COURSE_SPEC_COUNT}개** 생성하라. 양식의 명세서 표가 ${ROADMAP_COURSE_SPEC_COUNT}개다.
- training_period (훈련시기): 훈련 실시 시기를 기재하라. 예: "2026년 1분기", "2026년 상반기".
- training_level (훈련수준): BEGINNER(초급) | INTERMEDIATE(중급) | ADVANCED(고급).
  ${ROADMAP_COURSE_SPEC_COUNT}개 과정을 **난이도 순으로 배치**하여 초급 → 중급 → 고급 성장 경로가 드러나게 하라.
- training_method (훈련방법): 집체 | 원격 | 혼합 | 현장 중 하나.
- recommended_program: K-Digital Training / 사업주 직업능력개발훈련 / 국가기간전략산업직종훈련 등 실제 사업명.
- subjects (교과목): 과정당 **최대 3개** (양식의 교과목 행이 3개다). hours 는 양의 정수.
- subjects[*].details: **교과목당 4~5개** 구체 활동을 줄바꿈(\\n)으로 구분하여 기술하라. 각 항목은 "활동유형(강의·실습·워크숍·과제) + 구체 내용 + (가능하면 사용 도구·산출물)"을 담은 25~55자 명사구로 쓴다. 예: "결측·이상치 탐지 규칙 정의 및 검증 실습", "라벨링 스키마 설계와 데이터 명세서 작성 (산출물)". 여러 활동을 쉼표로 연결한 1줄 형식은 사용하지 마라. 머리기호(•, -)를 붙이지 마라.
- 도구명은 "(무료: 범위)" 형식으로 명시하라. 예: "Teachable Machine (무료: 전체)", "CLOVA API (무료: 월 1000건)".

**Ⅲ few-shot 예시 (1개 과정 — details 는 줄바꿈 분리 4~5항목, 활동유형+구체내용+도구·산출물)**
\`\`\`json
{
  "training_period": "2026년 1분기",
  "training_level": "BEGINNER",
  "course_name": "AI 데이터 수집·정제 입문",
  "training_method": "집체",
  "recommended_program": "사업주 직업능력개발훈련",
  "goal": "업무 현장에서 AI 학습용 데이터를 직접 수집·정제하여 데이터셋을 구성할 수 있다",
  "main_content": "AI 학습 데이터의 개념과 품질 기준(완전성·정확성·일관성)을 이해하고, Excel·Google Sheets로 결측·이상값을 정제하는 실습을 수행한다. Label Studio로 불량·정상 이미지를 직접 라벨링하고 교차 검증까지 진행하며, 재사용 가능한 데이터 명세서와 라벨링 가이드라인을 산출물로 완성한다.",
  "target_audience": "품질검사 실무자 전원 (선수 조건 없음)",
  "subjects": [
    { "name": "AI 데이터 이해", "details": "AI 학습 데이터의 개념·유형과 머신러닝 학습 파이프라인 이해 (강의)\\n정형·비정형 데이터 구분 및 수집 소스 매핑 실습\\n데이터 품질 기준(완전성·정확성·일관성) 수립 워크숍\\n결측·이상치 탐지 규칙 정의 및 검증 실습\\n라벨링 스키마 설계와 데이터 명세서 작성 (산출물)", "hours": 4 },
    { "name": "Excel 데이터 정제 실습", "details": "결측값 대치·이상값 검출 함수 실습 (무료: Excel/Sheets 기본 제공)\\n중복 제거·표기 표준화 매크로 작성 및 적용\\n피벗 테이블·조건부 서식으로 집계 리포트 작성\\n정규표현식·텍스트 함수로 비정형 항목 정규화 실습\\n정제 전후 데이터 품질 비교표 작성 (산출물)", "hours": 6 },
    { "name": "이미지 라벨링 실습", "details": "Label Studio 설치 및 프로젝트 생성 (무료: Community Edition)\\n불량·정상 이미지 라벨링 가이드라인 공동 작성\\n바운딩 박스·분류 라벨 부여 실습 및 단축키 숙달\\n팀별 라벨링 결과 교차 검증 및 불일치 조정\\n라벨 품질 지표 측정과 재작업 기준 수립 (산출물)", "hours": 6 }
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
    "selected_tasks": "string (인터뷰 overview.selected_tasks_summary 그대로 복사)",
    "main_content": "string (1문단 — LLM 이 새로 작성)"
  },
  "course_specs": [
    {
      "training_period": "string (훈련시기)",
      "training_level": "BEGINNER | INTERMEDIATE | ADVANCED",
      "course_name": "string (과정명)",
      "training_method": "string (집체 | 원격 | 혼합 | 현장)",
      "recommended_program": "string (실제 훈련사업명)",
      "goal": "string (훈련목표)",
      "main_content": "string (주요 훈련 내용 요약)",
      "target_audience": "string (훈련대상)",
      "subjects": [
        {
          "name": "string (교과목명)",
          "details": "string (4~5개 항목. 줄바꿈\\n으로 구분)",
          "hours": "integer > 0"
        }
      ]
    }
  ]
}
\`\`\`

course_specs 는 **정확히 ${ROADMAP_COURSE_SPEC_COUNT}개**여야 한다.`;
}

// ----------------------------------------------------------------------------
// 첨부 파일 본문 통합 (ISSUE-04 · ISSUE-14)
// ----------------------------------------------------------------------------
// HRD이음 보고서·과업 분석 첨부의 extracted_text 를 프롬프트 본문에 직접 포함시켜
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

// 컨설턴트가 직접 작성한 과업 분석 메모.
// v2 양식에서 "분석내용" 표는 삭제되어 HWPX 로는 출력되지 않지만,
// 명세서 설계의 핵심 맥락이므로 **LLM 입력 전용**으로 계속 전달한다.
// (PBL 의 "기업 경영 이슈" 와 동일한 처리 원칙)
function buildAnalysisNotesTextSection(interview: Record<string, unknown>): string {
  const an = interview.analysis_notes as { text?: string } | undefined;
  const text = typeof an?.text === 'string' ? an.text.trim() : '';
  if (text === '') return '';
  return `\n### 과업 분석 메모 (컨설턴트 작성 — 설계 참고용)\n${text}`;
}

// 과업·워크플로우 분석에 첨부한 추가 자료(공정 분석 등)의 본문.
// v2 양식의 "(추가 업로드 자료 예시) 공정 분석" 영역에 대응한다.
function buildAnalysisNotesAttachmentSection(interview: Record<string, unknown>): string {
  const an = interview.analysis_notes as { attachment_files?: AttachmentMeta[] } | undefined;
  const files = Array.isArray(an?.attachment_files) ? an.attachment_files : [];
  if (files.length === 0) return '';

  const blocks = files.map((f, idx) => {
    return `\n#### 과업 분석 첨부 ${idx + 1}
- 파일명: ${f.file_name ?? '-'}
- 형식: ${f.mime_type ?? '-'}
${formatAttachmentBody(f)}`;
  });

  return `\n### 과업 분석 첨부 파일 본문${blocks.join('')}`;
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
  isTestMode: boolean = false
): string {
  const subIndustries = Array.isArray(projectData.sub_industries) ? projectData.sub_industries : [];

  let prompt = `## 기업 정보

- 회사명: ${projectData.company_name}
- 업종: ${projectData.industry}
- 세부 업종: ${subIndustries.length > 0 ? subIndustries.join(', ') : '미지정'}
- 규모: ${projectData.company_size}
- 요청사항: ${projectData.customer_comment || '없음'}
${isTestMode ? '- **테스트 모드**: 컨설턴트 연습용 로드맵입니다.\n' : ''}
## 자가진단 결과

${isTestMode && !selfAssessment ? '(테스트 모드 - 자가진단 결과 없음. 입력된 AI 적용 대상 과업 정보를 기반으로 로드맵을 생성하세요.)' : JSON.stringify(selfAssessment?.scores, null, 2)}

## 현장 인터뷰 결과

### 개요 (Ⅰ-1 · Ⅰ-3) — 아래 값은 LLM 재창작 없이 그대로 복사
${JSON.stringify(interview.overview ?? {}, null, 2)}
${buildHrdAttachmentSection(interview)}
### 기업 요구분석 (Ⅱ-2)
${JSON.stringify(interview.company_requirements, null, 2)}

### 과업·워크플로우 분석표 (Ⅱ-3)
${JSON.stringify(interview.task_workflow_items, null, 2)}

### AI 적용 대상 과업 선정 (Ⅱ-3)
${JSON.stringify(interview.training_targets, null, 2)}
${buildAnalysisNotesTextSection(interview)}
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
${
  isTestMode
    ? `
컨설턴트의 전문성을 기반으로 로드맵을 설계하세요.`
    : ''
}`;
  }

  if (revisionPrompt) {
    prompt += `
## 수정 요청

이전 로드맵에 대해 다음과 같은 수정이 요청되었습니다:
${revisionPrompt}

위 수정 요청을 반영하여 로드맵을 재생성해주세요.`;
  }

  prompt += `

위 정보를 바탕으로 산인공 양식(Ⅰ·Ⅲ장)에 맞는 AI 훈련 로드맵을 생성해주세요.
훈련과정 명세서는 반드시 ${ROADMAP_COURSE_SPEC_COUNT}개를 생성하세요.
반드시 JSON 형식으로만 응답하세요.`;

  return prompt;
}
