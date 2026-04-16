// ============================================================================
// 로드맵 타입 정의 — 산인공 공식 로드맵 보고서 양식(Ⅲ장) 기반
//   Ⅲ-1. 역량 모델링        → RoadmapCompetency[]
//   Ⅲ-2. 훈련체계도         → RoadmapTrainingStructureItem[]
//   Ⅲ-3. 연간 훈련계획      → RoadmapAnnualPlan
//   Ⅲ-4. 훈련과정 명세서    → RoadmapCourseSpec[] (최소 3개)
// ============================================================================

// 훈련 수준
export type TrainingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

// ----------------------------------------------------------------------------
// Ⅲ-1. 역량 모델링
// ----------------------------------------------------------------------------
export interface RoadmapCompetency {
  name: string;               // 역량명
  definition: string;         // 역량 정의
  knowledge: string[];        // 지식(K)
  skills: string[];           // 기술(S)
  attitudes: string[];        // 태도(A)
  ncs_used: boolean;          // NCS 활용 여부
  ncs_methodology?: string;   // (ncs_used=true) NCS 활용 방법
  ncs_derivation_method?: string; // (ncs_used=false) NCS 외 도출 방법
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
  details: string;           // 세부내용
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
  competencies: RoadmapCompetency[];
  training_structure: RoadmapTrainingStructureItem[];
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
