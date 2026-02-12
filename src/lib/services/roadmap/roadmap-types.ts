// ============================================================================
// 로드맵 타입 정의
// ============================================================================

// 커리큘럼 모듈 타입 (courses용)
export interface CurriculumModule {
  module_name: string; // 모듈명
  hours: number; // 모듈 시간 (각 모듈마다 다를 수 있음)
  details: string[]; // 세부 커리큘럼 (개조식, 2~5개)
  practice: string; // 실습/과제 내용
}

// 과정 상세 타입 (courses 배열용)
export interface RoadmapCell {
  course_name: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  target_task: string; // 대상 업무
  target_audience: string; // 교육 대상
  recommended_hours: number; // 권장 시간 (= curriculum 모듈 시간 합계)
  curriculum: CurriculumModule[]; // 커리큘럼 모듈 배열
  tools: {
    name: string;
    free_tier_info: string; // 무료 범위 표기 (필수)
  }[];
  expected_outcome: string; // 기대 효과
  measurement_method: string; // 측정 방법
  prerequisites: string[]; // 준비물/데이터/권한
}

// 로드맵 매트릭스 셀 타입 (간소화된 버전 - UI 표시용)
export interface RoadmapMatrixCell {
  course_name: string;
  recommended_hours: number;
}

// 로드맵 행 (업무별) - 한 셀에 여러 과정 가능
export interface RoadmapRow {
  task_id: string;
  task_name: string;
  beginner: RoadmapMatrixCell[]; // 한 셀에 여러 과정 가능
  intermediate: RoadmapMatrixCell[];
  advanced: RoadmapMatrixCell[];
}

// PBL 커리큘럼 모듈 타입 (courses의 CurriculumModule 확장)
export interface PBLCurriculumModule extends CurriculumModule {
  // CurriculumModule 기본 필드: module_name, hours, details, practice
  // PBL 확장 필드:
  deliverables: string[]; // 각 모듈에서 산출되는 결과물
  tools: {
    name: string;
    free_tier_info: string;
  }[];
}

// PBL 최적 과정 (과정 상세에서 선정된 과정)
export interface PBLCourse {
  // 선정된 과정 정보 (courses 배열에서 선택)
  selected_course_name: string; // courses 배열에 있는 과정명과 일치해야 함
  selected_course_level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'; // 선택된 과정의 레벨
  selected_course_task: string; // 선택된 과정의 대상 업무

  // 선정 이유 (컨설턴트 전문성, 페인포인트, 현실 가능성 종합 고려)
  selection_rationale: {
    consultant_expertise_fit: string; // 컨설턴트 전문성 적합도 설명
    pain_point_alignment: string; // 고객사 페인포인트와의 연관성
    feasibility_assessment: string; // 현실 가능성 평가
    summary: string; // 종합 선정 이유 요약
  };

  // PBL 상세 설계 (선정된 과정과 기본 구조 동일)
  course_name: string; // PBL 과정명 (선정된 과정 기반)
  total_hours: number; // = curriculum 모듈 시간 합계 (선정된 과정의 recommended_hours와 동일)
  target_tasks: string[]; // 대상 업무들
  target_audience: string;

  // PBL 커리큘럼 (선정된 과정의 curriculum 기반 + PBL 상세화)
  // - module_name, hours, details: 선정된 과정과 동일
  // - practice: 더 구체적인 실습 내용으로 확장
  // - deliverables, tools: PBL 전용 상세 정보
  curriculum: PBLCurriculumModule[];

  // 최종 결과물 및 효과
  final_deliverables: string[]; // PBL 완료 시 최종 산출물
  expected_outcomes: string[]; // 기대 효과
  business_impact: string; // 비즈니스 임팩트/ROI 설명
  measurement_methods: string[]; // 측정 방법
  prerequisites: string[]; // 준비물/데이터/권한
}

// LLM 출력용 로드맵 결과 (roadmap_matrix 없음)
export interface LLMRoadmapResult {
  diagnosis_summary: string;
  pbl_course: PBLCourse;
  courses: RoadmapCell[]; // 모든 과정 상세 리스트
}

// 전체 로드맵 결과 (UI/DB용 - roadmap_matrix 포함)
export interface RoadmapResult {
  diagnosis_summary: string;
  roadmap_matrix: RoadmapRow[]; // courses에서 자동 생성
  pbl_course: PBLCourse;
  courses: RoadmapCell[]; // 모든 과정 상세 리스트
}

// 검증 결과
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
