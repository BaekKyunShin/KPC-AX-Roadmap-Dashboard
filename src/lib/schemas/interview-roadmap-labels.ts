/**
 * 로드맵 인터뷰 (V2) Zod path → 사용자용 라벨 매핑.
 *
 * `formatZodIssuesForToast(error, ROADMAP_FIELD_LABELS)` 의 dictionary 로 사용.
 * 각 라벨은 어느 Step·항목인지 사용자가 즉시 식별 가능하도록 작성.
 */
export const ROADMAP_FIELD_LABELS: Record<string, string> = {
  // ── Step Ⅰ. 개요 ────────────────────────────────────────────
  establishmentNecessity: 'Step Ⅰ-1. 수립 필요성',
  performanceActivities: 'Step Ⅰ-2. 수행 활동',
  'performanceActivities.*': 'Step Ⅰ-2. 수행 활동 - 차수 행',
  'performanceActivities.*.round': 'Step Ⅰ-2. 수행 활동 - 차수',
  'performanceActivities.*.date': 'Step Ⅰ-2. 수행 활동 - 일시',
  'performanceActivities.*.timeRange': 'Step Ⅰ-2. 수행 활동 - 시간',
  'performanceActivities.*.content': 'Step Ⅰ-2. 수행 활동 - 내용',
  'performanceActivities.*.method': 'Step Ⅰ-2. 수행 활동 - 방법',
  'performanceActivities.*.pmName': 'Step Ⅰ-2. 수행 활동 - PM 성명',
  'performanceActivities.*.expertName': 'Step Ⅰ-2. 수행 활동 - 내부전문가 성명',
  aiLevel: 'Step Ⅰ-3. 현재 AI 수준',
  selectedTask: 'Step Ⅰ-4. 선정 과업',

  // ── Step Ⅱ-1. HRD이음 진단 보고서 ───────────────────────────
  hrdReportPdf: 'Step Ⅱ-1. HRD이음 진단 보고서 PDF',

  // ── Step Ⅱ-2. 기업 요구분석 ────────────────────────────────
  'companyRequirements.status': 'Step Ⅱ-2. 기업 요구분석 - 기업 현황',
  'companyRequirements.problem': 'Step Ⅱ-2. 기업 요구분석 - 주요 문제',
  'companyRequirements.will': 'Step Ⅱ-2. 기업 요구분석 - 추진 의지',
  'companyRequirements.outcomes': 'Step Ⅱ-2. 기업 요구분석 - 기대 성과',

  // ── Step Ⅱ-3. 과업·워크플로우 분석 ─────────────────────────
  // 양식 v2: problem·dataTiming·aiScore·분석내용(taskAnalysisNote) 이
  // improvement(개선점 및 AI 적용 가능성) 1필드로 통합됐다.
  taskAnalysis: 'Step Ⅱ-3. 과업·워크플로우 분석 - 항목 (최소 1개)',
  'taskAnalysis.*': 'Step Ⅱ-3. 과업·워크플로우 분석 - 행',
  'taskAnalysis.*.domain': 'Step Ⅱ-3. 과업·워크플로우 분석 - 직무',
  'taskAnalysis.*.task': 'Step Ⅱ-3. 과업·워크플로우 분석 - 과업',
  'taskAnalysis.*.asIs': 'Step Ⅱ-3. 과업·워크플로우 분석 - 현행 방식(As-Is)',
  'taskAnalysis.*.improvement': 'Step Ⅱ-3. 과업·워크플로우 분석 - 개선점 및 AI 적용 가능성',

  // ── Step Ⅱ-4. AI 적용 대상 과업 선정 ────────────────────────
  'targetTask.name': 'Step Ⅱ-4. AI 적용 대상 과업 - 과업명',
  'targetTask.reason': 'Step Ⅱ-4. AI 적용 대상 과업 - 선정 사유',
  'targetTask.expectedAsIs': 'Step Ⅱ-4. AI 적용 대상 과업 - 기대효과 As-Is',
  'targetTask.expectedToBe': 'Step Ⅱ-4. AI 적용 대상 과업 - 기대효과 To-Be',

  // 양식 v2: Ⅲ-1 역량 모델링·NCS 스텝이 삭제되어 관련 라벨(competencies·ncsUsed·
  // ncsMethodology·ncsDerivationMethod)도 제거됐다.
};
