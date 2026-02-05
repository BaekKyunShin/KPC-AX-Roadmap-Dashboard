// 사용자 역할
export type UserRole =
  | 'PUBLIC'
  | 'USER_PENDING'
  | 'OPS_ADMIN_PENDING'
  | 'CONSULTANT_APPROVED'
  | 'OPS_ADMIN'
  | 'SYSTEM_ADMIN';

// 사용자 상태
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

// 프로젝트 상태
export type ProjectStatus =
  | 'NEW'
  | 'DIAGNOSED'
  | 'MATCH_RECOMMENDED'
  | 'ASSIGNED'
  | 'INTERVIEWED'
  | 'ROADMAP_DRAFTED'
  | 'FINALIZED';

// 로드맵 버전 상태
export type RoadmapVersionStatus = 'DRAFT' | 'FINAL' | 'ARCHIVED';

// 교육 레벨
export type EducationLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'LEADER';

// 코칭 방식
export type CoachingMethod = 'PBL' | 'WORKSHOP' | 'MENTORING' | 'LECTURE' | 'HYBRID';

// 사용자 테이블
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  created_at: string;
  updated_at: string;
}

// 컨설턴트 프로필
export interface ConsultantProfile {
  id: string;
  user_id: string;
  // 정형 데이터
  expertise_domains: string[]; // 전문분야
  available_industries: string[]; // 가능 업종
  sub_industries?: string[]; // 선호 세부 업종
  teaching_levels: EducationLevel[]; // 강의 가능 레벨
  coaching_methods: CoachingMethod[]; // 코칭 방식
  skill_tags: string[]; // 역량 태그
  years_of_experience: number; // 경력 연수
  affiliation: string; // 소속
  // 서술 데이터
  representative_experience: string; // 대표 수행경험
  portfolio: string; // 포트폴리오
  strengths_constraints: string; // 강점/제약
  // 메타
  created_at: string;
  updated_at: string;
}

// 기업 프로젝트
export interface Project {
  id: string;
  // 기업 기본 정보
  company_name: string;
  industry: string;
  sub_industries?: string[]; // 세부 업종
  company_size: string; // 기업 규모 (예: '1-9', '10-49', '50-299', '300-999', '1000+')
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  company_address?: string;
  // 상태 관리
  status: ProjectStatus;
  assigned_consultant_id?: string;
  // OPS 입력 추가 정보
  customer_comment?: string; // 고객 코멘트/요청사항
  // 테스트 모드 (컨설턴트 연습용)
  is_test_mode: boolean;
  test_created_by?: string; // 테스트 프로젝트 생성자 (컨설턴트 user_id)
  // 메타
  created_by: string; // OPS_ADMIN user_id (실제 프로젝트) 또는 컨설턴트 (테스트 프로젝트)
  created_at: string;
  updated_at: string;
}

// 자가진단 템플릿
export interface SelfAssessmentTemplate {
  id: string;
  version: number;
  name: string;
  description?: string;
  questions: SelfAssessmentQuestion[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 자가진단 문항
export interface SelfAssessmentQuestion {
  id: string;
  order: number;
  dimension: string; // 차원 (예: '데이터 활용', '업무 프로세스', '조직 역량')
  question_text: string;
  question_type: 'SCALE_5' | 'SCALE_10' | 'MULTIPLE_CHOICE' | 'TEXT';
  options?: string[]; // MULTIPLE_CHOICE인 경우
  weight: number; // 점수 가중치
}

// 자가진단 응답
export interface SelfAssessment {
  id: string;
  project_id: string;
  template_id: string;
  template_version: number;
  answers: SelfAssessmentAnswer[];
  scores: SelfAssessmentScore;
  summary_text?: string;
  created_by: string; // OPS_ADMIN user_id
  created_at: string;
  updated_at: string;
}

// 자가진단 개별 응답
export interface SelfAssessmentAnswer {
  question_id: string;
  answer_value: string | number;
}

// 자가진단 점수
export interface SelfAssessmentScore {
  total_score: number;
  max_possible_score: number;
  dimension_scores: {
    dimension: string;
    score: number;
    max_score: number;
  }[];
}

// 매칭 추천
export interface MatchingRecommendation {
  id: string;
  project_id: string;
  candidate_user_id: string;
  total_score: number;
  score_breakdown: MatchingScoreBreakdown[];
  rationale: string; // 매칭 근거
  rank: number; // 순위 (1, 2, 3...)
  created_at: string;
}

// 매칭 점수 상세
export interface MatchingScoreBreakdown {
  criteria: string; // 평가 기준 (예: '업종 적합성', '전문분야 일치도')
  score: number;
  max_score: number;
  explanation: string;
}

// 프로젝트 배정 이력
export interface ProjectAssignment {
  id: string;
  project_id: string;
  consultant_id: string;
  assigned_by: string; // OPS_ADMIN user_id
  assignment_reason: string; // 배정 사유
  is_current: boolean; // 현재 배정 여부
  assigned_at: string;
  unassigned_at?: string;
  unassignment_reason?: string; // 변경 사유
}

// 현장 인터뷰
export interface Interview {
  id: string;
  project_id: string;
  interviewer_id: string; // 컨설턴트 user_id
  // 정형 데이터
  interview_date: string;
  company_details: CompanyDetails;
  job_tasks: JobTask[]; // 세부직무/세부업무
  pain_points: PainPoint[]; // 병목/페인포인트
  constraints: Constraint[]; // 데이터/시스템 제약
  improvement_goals: ImprovementGoal[]; // 개선 목표
  // 자유 서술
  notes: string;
  customer_requirements: string; // 기업 요구사항
  // 메타
  created_at: string;
  updated_at: string;
}

// 기업 세부 정보
export interface CompanyDetails {
  department_structure?: string;
  main_products_services?: string;
  current_it_systems?: string;
  data_availability?: string;
  security_requirements?: string;
}

// 세부직무/업무
export interface JobTask {
  id: string;
  job_category: string; // 직무 분류 (예: '품질', '생산', '영업')
  task_name: string; // 세부업무명 (예: '수입검사', '불량원인분석')
  current_output: string; // 현재 산출물
  current_workflow: string; // 현재 업무 흐름
  priority: number; // 우선순위 (1이 가장 높음)
}

// 페인포인트
export interface PainPoint {
  id: string;
  job_task_id: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  priority: number; // 1, 2, 3
}

// 제약사항
export interface Constraint {
  id: string;
  type: 'DATA' | 'SYSTEM' | 'SECURITY' | 'PERMISSION' | 'OTHER';
  description: string;
  impact: string; // 영향도 설명
}

// 개선 목표
export interface ImprovementGoal {
  id: string;
  job_task_id: string;
  kpi_name: string; // KPI 이름 (예: '처리시간', '오류율')
  measurement_method: string; // 측정 방법
  current_value?: number; // Before 수치
  current_unit?: string; // 단위 (예: '분', '%', '일')
  target_value?: number; // 목표 수치
}

// 로드맵 버전
export interface RoadmapVersion {
  id: string;
  project_id: string;
  version_number: number;
  status: RoadmapVersionStatus;
  // 컨설턴트 프로필 스냅샷 (버전 재현성)
  consultant_profile_snapshot: ConsultantProfile;
  // 로드맵 데이터
  diagnosis_summary: string; // 기업 진단 결과 요약
  roadmap_matrix: RoadmapCell[][]; // NxM 로드맵
  pbl_course: PBLCourse; // 40시간 PBL 최적 과정
  courses: CourseDetail[]; // 모든 과정 상세
  // 수정 요청 이력
  revision_prompt?: string; // 수정 요청 내용
  // 검증 상태
  free_tool_validated: boolean; // 무료 툴 정책 검증 완료
  time_limit_validated: boolean; // 40시간 상한 검증 완료
  // 메타
  created_by: string;
  finalized_by?: string;
  finalized_at?: string;
  created_at: string;
  updated_at: string;
}

// NxM 로드맵 셀
export interface RoadmapCell {
  row_index: number;
  col_index: number;
  job_task_name: string; // 행: 세부직무/업무
  level: EducationLevel; // 열: 초급/중급/고급
  course_id: string; // 과정 상세 참조
  course_title: string;
  recommended_hours: number;
}

// 과정 상세
export interface CourseDetail {
  id: string;
  title: string;
  level: EducationLevel;
  target_job_task: string; // 대상 세부직무/업무
  target_audience: string; // 교육대상 (직급/직무)
  recommended_hours: number; // ≤ 40
  curriculum: CurriculumModule[]; // 커리큘럼
  exercises: Exercise[]; // 실습/과제
  tools: Tool[]; // 사용 툴 (무료 전제)
  expected_outcomes: string; // 기대효과
  measurement_method: string; // 측정방법
  prerequisites: string; // 준비물/데이터/권한
}

// 커리큘럼 모듈
export interface CurriculumModule {
  order: number;
  title: string;
  duration_hours: number;
  description: string;
  learning_objectives: string[];
}

// 실습/과제
export interface Exercise {
  order: number;
  title: string;
  description: string;
  expected_output: string; // 산출물
  evaluation_criteria: string; // 평가 기준
}

// 사용 툴
export interface Tool {
  name: string;
  category: string; // 예: 'AI 도구', '데이터 분석', '자동화'
  free_tier_description: string; // 무료 범위 표기 (필수)
  alternative?: string; // 오픈소스/무료 대안
  usage_in_course: string; // 과정 내 활용 방법
}

// PBL 최적 과정
export interface PBLCourse {
  course_id: string;
  selection_rationale: SelectionRationale; // 선정 이유
  weekly_plan: WeeklyPlan[]; // 주차별 계획
  assignment_criteria: AssignmentCriteria; // 과제/산출물 제출 기준
  evaluation_criteria: EvaluationCriteria; // 평가 기준
  application_checklist: string[]; // 현장 적용 체크리스트
  total_hours: number; // ≤ 40
}

// 선정 이유
export interface SelectionRationale {
  impact_score: number; // 임팩트 점수
  feasibility_score: number; // 적용 가능성 점수
  difficulty_fit_score: number; // 난이도-시간 적합성 점수
  scalability_score: number; // 확산성 점수
  customer_priority_score: number; // 고객 우선순위 점수
  total_score: number;
  explanation: string; // 종합 설명
}

// 주차별 계획
export interface WeeklyPlan {
  week_number: number;
  session_count: number;
  hours_per_session: number;
  total_hours: number;
  topics: string[];
  activities: string[];
  deliverables: string[];
}

// 과제 제출 기준
export interface AssignmentCriteria {
  assignments: {
    title: string;
    description: string;
    submission_format: string;
    deadline_week: number;
  }[];
}

// 평가 기준
export interface EvaluationCriteria {
  quantitative: {
    criteria: string;
    weight: number;
    measurement: string;
  }[];
  qualitative: {
    criteria: string;
    weight: number;
    rubric: string;
  }[];
}

// 감사 로그
export interface AuditLog {
  id: string;
  actor_user_id: string;
  action: AuditAction;
  target_type: string; // 예: 'project', 'user', 'roadmap_version'
  target_id: string;
  meta: Record<string, unknown>; // 추가 정보
  success: boolean;
  error_message?: string;
  created_at: string;
}

// 감사 로그 액션 타입
export type AuditAction =
  | 'USER_APPROVE'
  | 'USER_SUSPEND'
  | 'USER_REACTIVATE'
  | 'PROJECT_CREATE'
  | 'PROJECT_UPDATE'
  | 'SELF_ASSESSMENT_CREATE'
  | 'SELF_ASSESSMENT_UPDATE'
  | 'MATCHING_EXECUTE'
  | 'PROJECT_ASSIGN'
  | 'PROJECT_REASSIGN'
  | 'INTERVIEW_CREATE'
  | 'INTERVIEW_UPDATE'
  | 'ROADMAP_CREATE'
  | 'ROADMAP_UPDATE'
  | 'ROADMAP_FINALIZE'
  | 'ROADMAP_ARCHIVE'
  | 'DOWNLOAD_PDF'
  | 'DOWNLOAD_XLSX'
  | 'TEMPLATE_CREATE'
  | 'TEMPLATE_UPDATE'
  | 'TEMPLATE_ACTIVATE'
  | 'TEST_PROJECT_CREATE'
  | 'TEST_ROADMAP_CREATE'
  | 'TEST_ROADMAP_REVISE'
  | 'TEST_PROJECT_DELETE';

// 사용량 메트릭
export interface UsageMetric {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  llm_calls: number;
  tokens_in: number;
  tokens_out: number;
  created_at: string;
  updated_at: string;
}

// 사용자 쿼터
export interface UserQuota {
  id: string;
  user_id: string;
  daily_limit: number;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}
