import { describe, it, expect } from 'vitest';
import {
  AI_LEVEL,
  TRAINING_PLACE,
  AI_TOOL_CAPACITY,
  NETWORK_LEVEL,
  TRAINING_GOAL_OPTIONS,
  courseOverviewSchema,
  companyStatusSchema,
  trainingEnvironmentSchema,
  hrdNecessitySchema,
  performanceActivitiesSchema,
  problemDefinitionSchema,
  targetTasksSchema,
  aiLevelDiagnosisSchema,
  pblInterviewSchema,
  pblInterviewAutoSaveSchema,
  createEmptyOrgUnit,
  createEmptyPerformanceActivity,
  createEmptyProblemPriority,
  createEmptyTargetTask,
  createEmptyTargetTaskDetail,
  createEmptyInstructor,
  createEmptyTrainingHistoryItem,
  createEmptySupportHistoryItem,
  createEmptyRecommendation,
} from './interview-pbl';

describe('interview-pbl enum constants (양식 한글 그대로)', () => {
  it('AI역량수준은 양식 4등급 한글 값', () => {
    expect(AI_LEVEL.options).toEqual(['AI기초형', 'AI탐구형', 'AI활용형', 'AI선도형']);
  });

  it('훈련장소는 사내/사외 양식 그대로', () => {
    expect(TRAINING_PLACE.options).toEqual(['사내', '사외']);
  });

  it('AI도구 사용 환경은 가능/제한적/불가능', () => {
    expect(AI_TOOL_CAPACITY.options).toEqual(['가능', '제한적', '불가능']);
  });

  it('네트워크 수준은 양호/보통/개선필요', () => {
    expect(NETWORK_LEVEL.options).toEqual(['양호', '보통', '개선필요']);
  });

  it('훈련목표는 양식 5개 옵션', () => {
    expect(TRAINING_GOAL_OPTIONS).toEqual([
      '기술문제 해결',
      '공정 최적화',
      '불량률 감소',
      '기술 매뉴얼 개발',
      '기타',
    ]);
  });
});

describe('courseOverviewSchema (Ⅰ장)', () => {
  const valid = {
    company_name: '주식회사 테스트',
    business_registration_no: '123-45-67890',
    industry_code: 'C26',
    industry_main: '전자부품 제조업',
    address: '서울특별시 강남구',
    training_address: '서울특별시 서초구',
    jurisdiction_office: '서울지역본부',
    contact: {
      position: '팀장',
      name: '홍길동',
      phone: '010-1234-5678',
      email: 'test@example.com',
    },
    course_name: 'AI 기반 품질관리 과정',
    ncs_code: '200107 인공지능',
    training_hours: 40,
    trainee_count: 10,
    training_job: '품질관리',
    ai_level: 'AI탐구형' as const,
    training_goals: ['불량률 감소', '공정 최적화'],
  };

  it('정상 입력을 통과시킨다', () => {
    expect(() => courseOverviewSchema.parse(valid)).not.toThrow();
  });

  it('ai_level이 4등급 밖이면 실패', () => {
    expect(() =>
      courseOverviewSchema.parse({ ...valid, ai_level: 'AI전문가' })
    ).toThrow();
  });

  it('training_goals는 최소 1개 필요', () => {
    expect(() =>
      courseOverviewSchema.parse({ ...valid, training_goals: [] })
    ).toThrow();
  });

  it('training_hours·trainee_count는 자연수', () => {
    expect(() =>
      courseOverviewSchema.parse({ ...valid, training_hours: 0 })
    ).toThrow();
    expect(() =>
      courseOverviewSchema.parse({ ...valid, trainee_count: -1 })
    ).toThrow();
  });

  it('이메일 형식 검증', () => {
    expect(() =>
      courseOverviewSchema.parse({
        ...valid,
        contact: { ...valid.contact, email: 'not-email' },
      })
    ).toThrow();
  });
});

describe('companyStatusSchema (Ⅱ-1)', () => {
  it('경영 이슈·조직도를 모두 받는다', () => {
    expect(() =>
      companyStatusSchema.parse({
        business_issues: '- 불량률 증가\n- 납기 지연',
        organization: [
          { id: 'o1', department_name: '생산팀', tasks: ['품질관리', '생산계획'] },
        ],
      })
    ).not.toThrow();
  });

  it('조직도는 최소 1개 필요', () => {
    expect(() =>
      companyStatusSchema.parse({
        business_issues: 'x',
        organization: [],
      })
    ).toThrow();
  });
});

describe('trainingEnvironmentSchema (Ⅱ-2)', () => {
  const valid = {
    proper_training_hours: 24,
    training_place: { type: '사내' as const, special_notes: '본사 교육장 사용' },
    internal_instructor: { used: true, name: '김강사', position: '과장' },
    target_count: 15,
    target_characteristics: { career: '5년 이상', level: '중급' },
    ai_infrastructure: {
      ai_tools: '가능' as const,
      network: '양호' as const,
      pc_count: 20,
      etc_equipment: 'GPU 서버 2대',
    },
    training_needs_analysis: '- AI 도구 활용 능력 부족',
    expectation: {
      as_is: '수작업 검사 중심',
      to_be: 'AI 기반 자동 품질 판정',
    },
  };

  it('정상 입력을 통과시킨다', () => {
    expect(() => trainingEnvironmentSchema.parse(valid)).not.toThrow();
  });

  it('training_place.type은 사내/사외만', () => {
    expect(() =>
      trainingEnvironmentSchema.parse({
        ...valid,
        training_place: { type: '온라인', special_notes: '' },
      })
    ).toThrow();
  });

  it('internal_instructor.used=false면 이름·직책 비어도 통과', () => {
    expect(() =>
      trainingEnvironmentSchema.parse({
        ...valid,
        internal_instructor: { used: false, name: '', position: '' },
      })
    ).not.toThrow();
  });
});

describe('hrdNecessitySchema (Ⅱ-3)', () => {
  it('훈련이력·지원이력·추천·필요성을 받는다', () => {
    expect(() =>
      hrdNecessitySchema.parse({
        training_history: [
          { id: 't1', seq: 1, program: '디지털전환', course_name: 'AI기초', method: '대면', duration_days: 3 },
        ],
        support_history: [
          { id: 's1', year: '2025', annual_limit: 1000000, supported: 500000, ratio: '50%' },
        ],
        recommendations: [
          { id: 'r1', rank: 1, program: '체계적 현장훈련', proposal: '직무 중심 AI 실습' },
        ],
        course_development_necessity: '- AI 기반 불량 예측 필요',
      })
    ).not.toThrow();
  });

  it('모두 빈 배열 허용 (신규 기업)', () => {
    expect(() =>
      hrdNecessitySchema.parse({
        training_history: [],
        support_history: [],
        recommendations: [],
        course_development_necessity: '신규 도입 예정',
      })
    ).not.toThrow();
  });
});

describe('performanceActivitiesSchema (Ⅲ-1)', () => {
  const valid = {
    performance_activities: [
      {
        id: 'pa1',
        round: 1,
        date: '2026-03-15',
        content: '현장 인터뷰 및 문제 도출',
        method: '대면',
        operation_mode: '대면' as const,
        participants: {
          pm: '홍길동',
          external_expert: '이전문',
          internal_expert: '박내부',
          jurisdiction_manager: '김주치의',
        },
      },
    ],
  };

  it('정상 입력을 통과시킨다', () => {
    expect(() => performanceActivitiesSchema.parse(valid)).not.toThrow();
  });

  it('최소 1행 필요', () => {
    expect(() =>
      performanceActivitiesSchema.parse({ performance_activities: [] })
    ).toThrow();
  });

  it('참석자 4역할 모두 필드 존재', () => {
    const keys = Object.keys(valid.performance_activities[0].participants);
    expect(keys).toEqual(
      expect.arrayContaining(['pm', 'external_expert', 'internal_expert', 'jurisdiction_manager'])
    );
  });
});

describe('problemDefinitionSchema (Ⅲ-2)', () => {
  it('문제정의서 4필드 + 우선순위', () => {
    expect(() =>
      problemDefinitionSchema.parse({
        problem_definition: {
          background: '배경',
          core_problem: '핵심',
          scope: '범위',
          constraints: '제약',
        },
        problem_priorities: [
          { id: 'p1', problem_name: '불량률 증가', priority: 5, selected: true },
        ],
      })
    ).not.toThrow();
  });

  it('priority는 1~5 범위', () => {
    expect(() =>
      problemDefinitionSchema.parse({
        problem_definition: { background: 'a', core_problem: 'b', scope: 'c', constraints: 'd' },
        problem_priorities: [{ id: 'p1', problem_name: 'x', priority: 6, selected: true }],
      })
    ).toThrow();
  });
});

describe('targetTasksSchema (Ⅲ-3)', () => {
  it('업무 선정·사유·세부내용', () => {
    expect(() =>
      targetTasksSchema.parse({
        target_tasks: [{ id: 't1', task_name: '품질검사', necessity: 5, selected: true }],
        selection_reason: 'AI 자동 판정으로 대체 가능',
        target_task_details: [
          {
            id: 'd1',
            task_name: '품질검사',
            as_is: '수작업 육안 검사',
            to_be: 'AI 비전 자동 판정',
            required_knowledge: '이미지 분류 개념',
            required_skill: 'Roboflow·YOLO 도구 활용',
          },
        ],
      })
    ).not.toThrow();
  });
});

describe('aiLevelDiagnosisSchema (Ⅲ-4)', () => {
  it('현재·향후 4등급 + 향상사유', () => {
    expect(() =>
      aiLevelDiagnosisSchema.parse({
        current_ai_level: 'AI기초형',
        expected_ai_level: 'AI활용형',
        improvement_reason: '실무 적용 역량 강화 기대',
      })
    ).not.toThrow();
  });

  it('enum 밖 값 실패', () => {
    expect(() =>
      aiLevelDiagnosisSchema.parse({
        current_ai_level: '초급',
        expected_ai_level: '고급',
        improvement_reason: 'x',
      })
    ).toThrow();
  });
});

describe('pblInterviewSchema (통합)', () => {
  it('모든 서브 스키마를 포함한다', () => {
    const shape = pblInterviewSchema.shape;
    expect(shape).toHaveProperty('courseOverview');
    expect(shape).toHaveProperty('companyStatus');
    expect(shape).toHaveProperty('trainingEnvironment');
    expect(shape).toHaveProperty('hrdNecessity');
    expect(shape).toHaveProperty('performanceActivities');
    expect(shape).toHaveProperty('problemDefinition');
    expect(shape).toHaveProperty('targetTasks');
    expect(shape).toHaveProperty('aiLevelDiagnosis');
  });
});

describe('pblInterviewAutoSaveSchema (자동저장 완화)', () => {
  it('전체 필드가 optional', () => {
    expect(() => pblInterviewAutoSaveSchema.parse({})).not.toThrow();
  });

  it('일부만 있어도 통과', () => {
    expect(() =>
      pblInterviewAutoSaveSchema.parse({
        courseOverview: { ai_level: 'AI기초형' },
      })
    ).not.toThrow();
  });
});

describe('빈 항목 생성 헬퍼', () => {
  it('createEmptyOrgUnit', () => {
    const u = createEmptyOrgUnit();
    expect(u.department_name).toBe('');
    expect(u.tasks).toEqual([]);
    expect(u.id).toMatch(/.+/);
  });

  it('createEmptyPerformanceActivity', () => {
    const a = createEmptyPerformanceActivity();
    expect(a.participants.pm).toBe('');
    expect(a.participants.external_expert).toBe('');
    expect(a.participants.internal_expert).toBe('');
    expect(a.participants.jurisdiction_manager).toBe('');
  });

  it('createEmptyProblemPriority는 priority=3 기본', () => {
    expect(createEmptyProblemPriority().priority).toBe(3);
  });

  it('createEmptyTargetTask는 necessity=3 기본', () => {
    expect(createEmptyTargetTask().necessity).toBe(3);
  });

  it('createEmptyTargetTaskDetail', () => {
    const d = createEmptyTargetTaskDetail();
    expect(d.task_name).toBe('');
    expect(d.as_is).toBe('');
    expect(d.to_be).toBe('');
  });

  it('createEmptyInstructor·TrainingHistory·SupportHistory·Recommendation', () => {
    expect(createEmptyInstructor().used).toBe(false);
    expect(createEmptyTrainingHistoryItem().duration_days).toBe(0);
    expect(createEmptySupportHistoryItem().annual_limit).toBe(0);
    expect(createEmptyRecommendation().rank).toBeGreaterThan(0);
  });
});
