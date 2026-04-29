// ============================================================================
// 로드맵 타입 정의 — 산인공 공식 로드맵 보고서 양식(Ⅰ·Ⅱ·Ⅲ장) 기반
//   Ⅰ-1. 수립 필요성        → setup_necessity
//   Ⅰ-3. 수립 주요 결과      → outcome_summary (3필드)
//   Ⅲ-1. 역량 모델링        → RoadmapCompetency[] + ncs_* (표 전체 단위)
//   Ⅲ-2. 훈련체계도         → RoadmapTrainingStructureItem[] + training_structure_method
//   Ⅲ-3. 연간 훈련계획      → RoadmapAnnualPlan
//   Ⅲ-4. 훈련과정 명세서    → RoadmapCourseSpec[] (최소 3개)
// ============================================================================

// 훈련 수준
export type TrainingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

// 훈련 수준 한글 라벨 (Ⅲ-2 훈련체계도 등 결과 표시용)
export const TRAINING_LEVEL_LABEL: Record<TrainingLevel, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
};

// ----------------------------------------------------------------------------
// Ⅰ-3. 수립 주요 결과
// ----------------------------------------------------------------------------
// ai_competency_level: Ⅰ-3 기업 AI 역량 수준
//   BEGINNER=초급(AI기초형) / INTERMEDIATE=중급(AI탐구형) / ADVANCED=고급(AI활용형·선도형)
export interface RoadmapOutcomeSummary {
  ai_competency_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  selected_tasks: string;
  main_content: string;
}

// ----------------------------------------------------------------------------
// Ⅲ-1. 역량 모델링 (NCS 관련 필드는 루트로 이동 — 양식상 표 전체 단위이므로)
// ----------------------------------------------------------------------------
export interface RoadmapCompetency {
  name: string;               // 역량명
  definition: string;         // 역량 정의(수행준거)
  knowledge: string[];        // 지식(학술, 업무지식)
  skills: string[];           // 기술(기능)
  attitudes: string[];        // 태도
}

// ----------------------------------------------------------------------------
// Ⅲ-2. 훈련체계도 (역량 × 수준)
// ----------------------------------------------------------------------------
export interface RoadmapTrainingStructureItem {
  competency_name: string;   // 역량명 (RoadmapCompetency.name 참조)
  level: TrainingLevel;      // 훈련 수준
  content: string;           // 훈련 내용
  target_audience: string;   // 훈련 대상
  method: string;            // 훈련 방법
  goal: string;              // 훈련 목표
}

// ----------------------------------------------------------------------------
// Ⅲ-3. 연간 훈련계획
// ----------------------------------------------------------------------------
export interface RoadmapAnnualPlanItem {
  competency_name: string;   // 역량명 (RoadmapCompetency.name 참조)
  course_name: string;       // 훈련과정명
  format: string;            // 훈련형태 (집체/원격/혼합 등)
  hours: number;             // 훈련시간
  notes: string;             // 비고
}

export interface RoadmapAnnualPlan {
  items: RoadmapAnnualPlanItem[];
  usage_plan: string;        // 활용방안
}

// ----------------------------------------------------------------------------
// Ⅲ-4. 훈련과정 명세서 (최소 3개)
// ----------------------------------------------------------------------------
export interface RoadmapCourseSubject {
  name: string;              // 과목명
  details: string;           // 세부 내용 (단원, 과제명)
  hours: number;             // 시간
}

export interface RoadmapCourseSpec {
  course_name: string;       // 과정명
  format: string;            // 훈련형태
  recommended_program: string; // 추천 훈련사업
  goal: string;              // 훈련목표
  main_content: string;      // 주요 훈련내용
  target_audience: string;   // 훈련대상
  subjects: RoadmapCourseSubject[]; // 교과목
}

// ----------------------------------------------------------------------------
// 최상위 결과 구조
// ----------------------------------------------------------------------------
export interface LLMRoadmapResult {
  diagnosis_summary: string;

  // Ⅰ-1 · Ⅰ-3 — 인터뷰 입력값을 그대로 복사 (LLM 재창작 금지)
  setup_necessity: string;
  outcome_summary: RoadmapOutcomeSummary;

  // Ⅲ-1 역량 모델링
  competencies: RoadmapCompetency[];
  ncs_used: boolean;              // 표 전체 단위 NCS 활용 여부
  ncs_methodology: string;        // ncs_used=true → 필수
  ncs_derivation_method: string;  // ncs_used=false → 필수

  // Ⅲ-2 훈련체계도
  training_structure: RoadmapTrainingStructureItem[];
  training_structure_method: string; // Ⅲ-2 수립 방법 텍스트 박스

  // Ⅲ-3 연간 훈련계획 / Ⅲ-4 훈련과정 명세서
  annual_plan: RoadmapAnnualPlan;
  course_specs: RoadmapCourseSpec[];
}

// 현재는 LLM 출력 = DB/UI 표현이 동일한 구조
export type RoadmapResult = LLMRoadmapResult;

// ----------------------------------------------------------------------------
// 검증 결과
// ----------------------------------------------------------------------------
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
