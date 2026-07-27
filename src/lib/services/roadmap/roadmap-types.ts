// ============================================================================
// 로드맵 타입 정의 — 산인공 공식 양식 v2 (2026-07-13 개정) 기반
// ----------------------------------------------------------------------------
//   Ⅰ-1. 수립 배경          → setup_necessity      (인터뷰 입력 그대로)
//   Ⅰ-3. 수립 주요 결과      → outcome_summary      (역량수준·선정과업=인터뷰,
//                                                    main_content=LLM 생성)
//   Ⅲ.   훈련실시 계획 제안   → course_specs[6]      (LLM 생성)
//
// v1 대비 삭제 (신규 양식에서 해당 표가 전부 제거됨):
//   - Ⅲ-1 역량 모델링 (RoadmapCompetency[]) + NCS 활용/도출 박스
//   - Ⅲ-2 훈련체계도 (RoadmapTrainingStructureItem[]) + 수립 방법
//   - Ⅲ-3 연간 훈련계획 (RoadmapAnnualPlan)
// ============================================================================

// 훈련 수준 (Ⅰ-3 기업 AI 역량 수준 · Ⅲ 명세서 훈련수준 공용)
//   BEGINNER=초급(AI기초형) / INTERMEDIATE=중급(AI탐구형) / ADVANCED=고급(AI활용형·선도형)
export type TrainingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export const TRAINING_LEVEL_LABEL: Record<TrainingLevel, string> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
};

// ----------------------------------------------------------------------------
// Ⅰ-3. 수립 주요 결과 (3×4 표)
// ----------------------------------------------------------------------------
export interface RoadmapOutcomeSummary {
  ai_competency_level: TrainingLevel; // 인터뷰 입력
  selected_tasks: string; // 인터뷰 입력 (표지 "대상 과업"에도 사용)
  main_content: string; // LLM 생성 — "AI훈련로드맵 수립 주요내용(요약)"
}

// ----------------------------------------------------------------------------
// Ⅲ. 훈련실시 계획 제안 — 훈련과정 명세서 (11×6 표 × 6개)
// ----------------------------------------------------------------------------
export interface RoadmapCourseSubject {
  name: string; // 교과목명
  details: string; // 세부 내용 (단원, 과제명)
  hours: number; // 훈련시간
}

export interface RoadmapCourseSpec {
  training_period: string; // 훈련시기 (v2 신규)
  training_level: TrainingLevel; // 훈련수준 (v2 신규 — 삭제된 Ⅲ-2 훈련체계도에서 이관)
  course_name: string; // 과정명
  training_method: string; // 훈련방법 (v1 `format`)
  recommended_program: string; // 추천 훈련사업
  goal: string; // 훈련목표
  main_content: string; // 주요 훈련 내용
  target_audience: string; // 훈련대상
  subjects: RoadmapCourseSubject[]; // 훈련 내용 (교과목 3행)
}

// 양식 Ⅲ장의 명세서 표 개수 (v1: 3개 → v2: 6개)
export const ROADMAP_COURSE_SPEC_COUNT = 6;

// ----------------------------------------------------------------------------
// 최상위 결과 구조
// ----------------------------------------------------------------------------
export interface LLMRoadmapResult {
  diagnosis_summary: string;

  // Ⅰ-1 · Ⅰ-3 — 인터뷰 입력값을 그대로 복사 (LLM 재창작 금지)
  setup_necessity: string;
  outcome_summary: RoadmapOutcomeSummary;

  // Ⅲ 훈련실시 계획 제안
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
