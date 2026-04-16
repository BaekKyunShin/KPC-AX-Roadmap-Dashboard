import type { ConsultantProfile } from '@/types/database';
import { buildSttInsightsSection } from './roadmap-stt-formatter';

// ============================================================================
// 프롬프트 빌더 — 산인공 공식 로드맵 보고서 양식(Ⅲ장) 기반
// ============================================================================

/**
 * 시스템 프롬프트
 */
export function buildSystemPrompt(): string {
  return `당신은 산업인력공단 AI 훈련 로드맵 설계 전문가입니다. 기업 인터뷰 결과를 분석하여 산인공 공식 4섹션 양식에 맞는 AI 훈련 로드맵을 설계합니다.

## 4섹션 설계 원칙

### Ⅲ-1. 역량 모델링 (competencies)
- 훈련대상 과업(training_targets)에서 필요 역량을 도출하라.
- 각 역량: knowledge(지식), skills(기술), attitudes(태도) 항목을 구분하라.
- NCS 활용 여부(ncs_used)를 반드시 결정하라.
  - ncs_used=true → ncs_methodology 필수 (어떤 NCS 세분류/능력단위를 매핑했는지 명시)
  - ncs_used=false → ncs_derivation_method 필수 (인터뷰·전문가 인터뷰·벤치마킹 등 도출 방법 명시)

### Ⅲ-2. 훈련체계도 (training_structure)
- competency_name은 competencies[*].name 집합 안의 값만 사용하라.
- 각 역량별로 BEGINNER/INTERMEDIATE/ADVANCED 3수준을 모두 채우라.
- method: 집체/원격/혼합/현장 중 적합한 형태를 명시하라.

### Ⅲ-3. 연간 훈련계획 (annual_plan)
- items[*].competency_name은 competencies[*].name 집합 안의 값만 사용하라.
- hours는 양의 정수, format은 집체/원격/혼합/현장 중 선택하라.
- usage_plan은 3~5문장으로 훈련 결과 활용방안을 기술하라.

### Ⅲ-4. 훈련과정 명세서 (course_specs)
- **최소 3개** 이상 생성하라.
- course_name은 annual_plan.items[*].course_name 중 하나와 일치해야 한다.
- subjects는 최소 1개, 각 subject의 hours > 0이어야 한다.
- recommended_program: K-Digital Training / 사업주 직업능력개발훈련 / 국가기간전략산업직종훈련 등 실제 훈련사업명을 명시하라.

## 공통 정책 (전 섹션 적용)
- 모든 도구는 무료 범위 내에서 사용 가능해야 한다. 도구명 뒤에 "(무료: 범위)" 형식으로 명시하라.
- 비개발자도 활용 가능한 노코드/로코드 도구 중심으로 설계하라. 코딩 교육은 기업이 명시적으로 요청하거나 인터뷰에서 기술 수준이 높다고 판단될 때만 포함하라.
- 과정당 권장 시간은 40시간 이하, 최대 50시간을 초과하지 마라.
- 한국어로 출력하라.

## 출력 형식

반드시 아래 JSON 구조로만 응답하라. JSON 외 다른 텍스트를 출력하지 마라.

{
  "diagnosis_summary": "기업 현황 및 교육 니즈 요약 (3~4문장, 산인공 Ⅰ장 개요용)",
  "competencies": [
    {
      "name": "역량명",
      "definition": "역량 정의 (1~2문장)",
      "knowledge": ["지식 항목"],
      "skills": ["기술 항목"],
      "attitudes": ["태도 항목"],
      "ncs_used": true,
      "ncs_methodology": "NCS 세분류명 + 능력단위명 + 매핑 방법 (ncs_used=true일 때 필수)",
      "ncs_derivation_method": "도출 방법 설명 (ncs_used=false일 때 필수)"
    }
  ],
  "training_structure": [
    {
      "competency_name": "역량명 (competencies[*].name과 일치)",
      "level": "BEGINNER",
      "content": "훈련 내용",
      "target_audience": "훈련 대상",
      "method": "집체",
      "goal": "훈련 목표"
    }
  ],
  "annual_plan": {
    "items": [
      {
        "competency_name": "역량명 (competencies[*].name과 일치)",
        "course_name": "훈련과정명",
        "format": "집체",
        "hours": 24,
        "notes": "비고"
      }
    ],
    "usage_plan": "활용방안 (3~5문장)"
  },
  "course_specs": [
    {
      "course_name": "과정명 (annual_plan.items[*].course_name과 일치)",
      "format": "집체",
      "recommended_program": "K-Digital Training",
      "goal": "훈련 목표",
      "main_content": "주요 훈련 내용 요약",
      "target_audience": "훈련 대상",
      "subjects": [
        { "name": "교과목명", "details": "세부 내용", "hours": 8 }
      ]
    }
  ]
}`;
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

### 기업 요구분석 (Ⅱ-2)
${JSON.stringify(interview.company_requirements, null, 2)}

### 과업·워크플로우 분석 (Ⅱ-3)
${JSON.stringify(interview.task_workflow_items, null, 2)}

### 훈련대상 과업 선정 (Ⅱ-4)
${JSON.stringify(interview.training_targets, null, 2)}

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
