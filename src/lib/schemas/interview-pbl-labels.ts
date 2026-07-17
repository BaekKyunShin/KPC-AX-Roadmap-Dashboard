/**
 * PBL 인터뷰 (V2) Zod path → 사용자용 라벨 매핑.
 *
 * `formatZodIssuesForToast(error, PBL_FIELD_LABELS)` 의 dictionary 로 사용.
 * 각 라벨은 어느 Step·항목인지 사용자가 즉시 식별 가능하도록 작성:
 *   "Step Ⅰ. 훈련과정 개요 - 과정명"
 *
 * 배열 index 는 헬퍼에서 '*' 로 정규화되므로 와일드카드로 키를 작성한다
 *   ex) `target.details.*.title`
 */
export const PBL_FIELD_LABELS: Record<string, string> = {
  // ── Step Ⅰ. 훈련과정 개요 ──────────────────────────────────
  companyName: 'Step Ⅰ. 훈련과정 개요 - 기업명',
  courseName: 'Step Ⅰ. 훈련과정 개요 - 과정명',
  ncsCode: 'Step Ⅰ. 훈련과정 개요 - NCS 코드',
  trainingHours: 'Step Ⅰ. 훈련과정 개요 - 훈련시간',
  trainingTarget: 'Step Ⅰ. 훈련과정 개요 - 훈련대상',
  trainingForm: 'Step Ⅰ. 훈련과정 개요 - 훈련형태',
  trainingPeriod: 'Step Ⅰ. 훈련과정 개요 - 훈련기간',
  businessIssues: 'Step Ⅰ. 훈련과정 개요 - 사업적 이슈',

  // ── Step Ⅱ-1-가. 기업 경영 이슈 ────────────────────────────
  companyIssues: 'Step Ⅱ-1-가. 기업 경영 이슈',

  // ── Step Ⅱ-1-나. 조직 및 주요 업무 ─────────────────────────
  organization: 'Step Ⅱ-1-나. 조직 및 주요 업무',
  'organization.orgTree': 'Step Ⅱ-1-나. 조직 및 주요 업무 - 조직도',
  'organization.mainWork': 'Step Ⅱ-1-나. 조직 및 주요 업무 - 주요 업무',
  'organization.orgTree.*': 'Step Ⅱ-1-나. 조직 및 주요 업무 - 조직도 항목',
  'organization.mainWork.*': 'Step Ⅱ-1-나. 조직 및 주요 업무 - 주요 업무 항목',

  // ── Step Ⅱ-2. 훈련환경 분석 ────────────────────────────────
  trainingEnv: 'Step Ⅱ-2. 훈련환경 분석',
  'trainingEnv.properTrainingHours': 'Step Ⅱ-2. 훈련환경 - 적정 훈련시간',
  'trainingEnv.internalPlace': 'Step Ⅱ-2. 훈련환경 - 사내 훈련장소',
  'trainingEnv.externalPlace': 'Step Ⅱ-2. 훈련환경 - 사외 훈련장소',
  'trainingEnv.internalInstructors': 'Step Ⅱ-2. 훈련환경 - 사내 강사',
  'trainingEnv.externalInstructors': 'Step Ⅱ-2. 훈련환경 - 외부 강사',
  'trainingEnv.aiInfrastructure': 'Step Ⅱ-2. 훈련환경 - AI 인프라',

  // ── Step Ⅱ-3. AI훈련과정 개발 필요성 ────────────────────────
  hrdReportPdf: 'Step Ⅱ-3-가. HRD이음 보고서 PDF',
  courseNecessity: 'Step Ⅱ-3-나. AI훈련과정 개발 필요성',

  // ── Step Ⅲ-1. 수행활동 (V2: 로드맵 연동 — PBL 미입력, 검증 경로 없음) ──

  // ── Step Ⅲ-2-가. 문제 정의서 ───────────────────────────────
  'problemDefinitionSheet.background': 'Step Ⅲ-2-가. 문제 정의서 - 문제 배경',
  'problemDefinitionSheet.core': 'Step Ⅲ-2-가. 문제 정의서 - 핵심 문제',
  'problemDefinitionSheet.scope': 'Step Ⅲ-2-가. 문제 정의서 - 문제 범위',
  'problemDefinitionSheet.constraints': 'Step Ⅲ-2-가. 문제 정의서 - 제약 조건',

  // ── Step Ⅲ-2-나. 문제 우선순위 (V2: 제거 — 검증 경로 없음) ─────

  // ── Step Ⅲ-3. 훈련대상 업무 ─────────────────────────────────
  // Ⅲ-3-가: 로드맵 과업별 PBL 선정 (4열 로드맵 연동 + 2열 PBL 입력)
  'target.taskSelections': 'Step Ⅲ-3-가. 훈련대상 과업 선정 (로드맵 과업 1:1)',
  'target.taskSelections.*': 'Step Ⅲ-3-가. 훈련대상 과업 선정 - 과업 행',
  'target.taskSelections.*.ai_necessity': 'Step Ⅲ-3-가. 훈련대상 과업 선정 - AI도입·활용 필요도',
  'target.taskSelections.*.training_selected': 'Step Ⅲ-3-가. 훈련대상 과업 선정 - 훈련 선정',
  'target.necessity': 'Step Ⅲ-3-나. 훈련대상 - 선정 사유(AI 필요성)',
  'target.details': 'Step Ⅲ-3-다. 훈련대상 업무 세부내용',
  'target.details.*': 'Step Ⅲ-3-다. 훈련대상 업무 세부내용 - 행',
  'target.details.*.title': 'Step Ⅲ-3-다. 훈련대상 세부내용 - 업무명',
  'target.details.*.as_is': 'Step Ⅲ-3-다. 훈련대상 세부내용 - 현재 업무방식(AS-IS)',
  'target.details.*.to_be': 'Step Ⅲ-3-다. 훈련대상 세부내용 - AI 활용방식(TO-BE)',
  'target.details.*.required_knowledge': 'Step Ⅲ-3-다. 훈련대상 세부내용 - 요구지식',
  'target.details.*.required_skill': 'Step Ⅲ-3-다. 훈련대상 세부내용 - 기술',
};
