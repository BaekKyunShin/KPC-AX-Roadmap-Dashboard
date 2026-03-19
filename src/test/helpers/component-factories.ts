/**
 * 테스트 데이터 팩토리
 *
 * 컴포넌트/서비스 테스트에서 사용할 mock 데이터를 생성합니다.
 * 모든 팩토리는 부분 오버라이드를 지원합니다.
 */

// ─── 프로젝트 ──────────────────────────────────────────────────────────────────

export function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'project-1',
    company_name: '테스트 주식회사',
    industry: '제조업',
    sub_industries: ['자동차', '전자'],
    company_size: '50-299',
    contact_name: '김테스트',
    contact_email: 'test@company.com',
    contact_phone: '010-1234-5678',
    company_address: '서울특별시 강남구',
    status: 'NEW' as const,
    assigned_consultant_id: null,
    customer_comment: null,
    is_test_mode: false,
    test_created_by: null,
    created_by: 'ops-admin-1',
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-01-15T09:00:00Z',
    ...overrides,
  };
}

// ─── 로드맵 결과 ──────────────────────────────────────────────────────────────

export function makeRoadmapCell(overrides: Record<string, unknown> = {}) {
  return {
    row_index: 0,
    col_index: 0,
    job_task_name: '데이터 분석',
    level: 'BEGINNER' as const,
    course_id: 'course-1',
    course_title: 'AI 기초 과정',
    recommended_hours: 16,
    ...overrides,
  };
}

export function makeCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'course-1',
    title: 'AI 기초 과정',
    level: 'BEGINNER' as const,
    target_job_task: '데이터 분석',
    target_audience: '신입 직원',
    recommended_hours: 16,
    curriculum: [
      {
        module_name: 'AI 개론',
        hours: 4,
        description: 'AI 기본 개념 학습',
        activities: ['강의', '퀴즈'],
      },
      {
        module_name: '데이터 수집',
        hours: 4,
        description: '데이터 수집 방법론',
        activities: ['실습'],
      },
    ],
    exercises: [{ name: '실습 과제', description: '데이터 분석 실습', hours: 4 }],
    tools: [
      {
        name: 'Google Colab',
        free_tier_info: '무료 사용 가능',
        url: 'https://colab.research.google.com',
      },
    ],
    expected_outcomes: 'AI 기초 역량 확보',
    measurement_method: '실습 결과물 평가',
    prerequisites: 'PC, 인터넷',
    ...overrides,
  };
}

export function makePBLCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pbl-1',
    title: 'AI 업무 자동화 PBL',
    level: 'INTERMEDIATE' as const,
    target_job_task: '업무 자동화',
    total_hours: 40,
    selection_rationale: '기업 핵심 업무와 높은 연관성',
    project_goal: '업무 자동화 파이프라인 구축',
    final_deliverable: '자동화 시스템 프로토타입',
    modules: [
      {
        module_name: '문제 정의',
        hours: 8,
        description: '업무 분석 및 자동화 대상 선정',
        activities: ['워크숍', '인터뷰'],
      },
    ],
    tools: [
      {
        name: 'Python',
        free_tier_info: '오픈소스',
        url: 'https://python.org',
      },
    ],
    expected_outcomes: '업무 자동화 역량',
    measurement_method: '프로젝트 결과물 발표',
    ...overrides,
  };
}

export function makeRoadmapResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 'roadmap-v1',
    project_id: 'project-1',
    version_number: 1,
    status: 'DRAFT' as const,
    diagnosis_summary: '기업 AI 역량 진단 결과 요약',
    roadmap_matrix: [[makeRoadmapCell()]],
    pbl_course: makePBLCourse(),
    courses: [makeCourse()],
    free_tool_validated: true,
    time_limit_validated: true,
    revision_prompt: null,
    created_by: 'consultant-1',
    finalized_by: null,
    finalized_at: null,
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-01-20T10:00:00Z',
    ...overrides,
  };
}

// ─── 컨설턴트 프로필 ──────────────────────────────────────────────────────────

export function makeConsultantProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-1',
    user_id: 'consultant-1',
    expertise_domains: ['AI/ML', '데이터 분석'],
    available_industries: ['제조업', 'IT'],
    sub_industries: ['자동차'],
    teaching_levels: ['BEGINNER', 'INTERMEDIATE'] as string[],
    coaching_methods: ['PBL', 'WORKSHOP'] as string[],
    skill_tags: ['Python', 'TensorFlow'],
    years_of_experience: 10,
    affiliation: '한국AI교육원',
    representative_experience: 'AI 교육 10년 경력',
    portfolio: 'https://portfolio.example.com',
    strengths_constraints: '제조업 특화, 주말 불가',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ─── 알림 ────────────────────────────────────────────────────────────────────

export function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-1',
    user_id: 'ops-admin-1',
    type: 'assignment' as const,
    title: '컨설턴트 배정 완료',
    message: '테스트 주식회사 프로젝트에 컨설턴트가 배정되었습니다.',
    link: '/ops/projects/project-1',
    is_read: false,
    created_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

// ─── 갤러리 아이템 ────────────────────────────────────────────────────────────

export function makeGalleryItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gallery-1',
    project_id: 'project-1',
    roadmap_version_id: 'roadmap-v1',
    company_name: '테스트 주식회사',
    industry: '제조업',
    consultant_name: '홍길동',
    diagnosis_summary: '기업 AI 역량 진단 결과',
    version_number: 1,
    like_count: 5,
    is_liked: false,
    is_shared: true,
    created_at: '2026-01-20T10:00:00Z',
    ...overrides,
  };
}

// ─── 매칭 추천 ────────────────────────────────────────────────────────────────

export function makeMatchingRecommendation(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: 'match-1',
    project_id: 'project-1',
    candidate_user_id: 'consultant-1',
    total_score: 85,
    score_breakdown: [
      { criteria: '산업 분야', score: 90, weight: 0.3 },
      { criteria: '전문 도메인', score: 80, weight: 0.3 },
      { criteria: '교육 경력', score: 85, weight: 0.2 },
      { criteria: '기술 매칭', score: 82, weight: 0.2 },
    ],
    rationale: '제조업 AI 교육 경력이 풍부하고 전문 도메인 일치도가 높음',
    rank: 1,
    created_at: '2026-01-16T10:00:00Z',
    ...overrides,
  };
}

// ─── 자가진단 ─────────────────────────────────────────────────────────────────

export function makeSelfAssessment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'assessment-1',
    project_id: 'project-1',
    template_id: 'template-1',
    template_version: 1,
    answers: [
      { question_id: 'q1', dimension: 'data', score: 3, text_answer: null },
      { question_id: 'q2', dimension: 'process', score: 4, text_answer: null },
    ],
    scores: {
      data: 3,
      process: 4,
      culture: 2,
      technology: 3,
      overall: 3,
    },
    created_by: 'ops-admin-1',
    submitted_by_name: null,
    submitted_by_title: null,
    submitted_by_email: null,
    assessment_token_id: null,
    created_at: '2026-01-14T09:00:00Z',
    updated_at: '2026-01-14T09:00:00Z',
    ...overrides,
  };
}

// ─── 인터뷰 ──────────────────────────────────────────────────────────────────

export function makeInterview(overrides: Record<string, unknown> = {}) {
  return {
    id: 'interview-1',
    project_id: 'project-1',
    interviewer_id: 'consultant-1',
    interview_date: '2026-01-18',
    company_details: {
      department_structure: '개발팀 20명, 경영지원팀 10명',
      products_services: '자동차 부품 제조',
      it_systems: 'ERP, MES',
    },
    job_tasks: [
      { name: '데이터 분석', description: '생산 데이터 분석' },
      { name: '품질 관리', description: 'AI 기반 품질 검사' },
    ],
    pain_points: [
      { description: '수동 데이터 입력', severity: 'HIGH' },
    ],
    constraints: [
      { description: '보안 정책으로 클라우드 제한', type: 'security' },
    ],
    improvement_goals: [
      { goal: '데이터 입력 자동화', kpi: '입력 시간 50% 감소' },
    ],
    notes: '현장 방문 시 추가 확인 필요',
    customer_requirements: '3개월 내 성과 가시화',
    created_at: '2026-01-18T14:00:00Z',
    updated_at: '2026-01-18T14:00:00Z',
    ...overrides,
  };
}

// ─── 감사로그 ─────────────────────────────────────────────────────────────────

export function makeAuditLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'audit-1',
    actor_user_id: 'ops-admin-1',
    action: 'PROJECT_CREATE' as const,
    target_type: 'project',
    target_id: 'project-1',
    meta: { company_name: '테스트 주식회사' },
    success: true,
    error_message: null,
    created_at: '2026-01-15T09:00:00Z',
    ...overrides,
  };
}

// ─── 메시지/대화 ──────────────────────────────────────────────────────────────

export function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'ops-admin-1',
    content: '안녕하세요, 프로젝트 관련 문의드립니다.',
    created_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

export function makeConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conv-1',
    last_message_at: '2026-01-15T10:00:00Z',
    created_at: '2026-01-15T09:00:00Z',
    ...overrides,
  };
}
