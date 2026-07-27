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
  // PR #2 Task 2.2 — 양식 1:1 정합 신규 스키마 (camelCase)
  PBLOverviewSchema,
  PBLAnalysisSchema,
  PBLTasksSchema,
  PBLPerformanceActivitySchema,
  PBLTargetDetailSchema,
  PBLInterviewSchema,
  PBLInterviewStrictSchema,
  PBLTrainingEnvSchema,
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
    expect(() => courseOverviewSchema.parse({ ...valid, ai_level: 'AI전문가' })).toThrow();
  });

  it('training_goals는 최소 1개 필요', () => {
    expect(() => courseOverviewSchema.parse({ ...valid, training_goals: [] })).toThrow();
  });

  it('training_hours·trainee_count는 자연수', () => {
    expect(() => courseOverviewSchema.parse({ ...valid, training_hours: 0 })).toThrow();
    expect(() => courseOverviewSchema.parse({ ...valid, trainee_count: -1 })).toThrow();
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
        organization: [{ id: 'o1', department_name: '생산팀', tasks: ['품질관리', '생산계획'] }],
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
    training_place: {
      types: ['사내' as const],
      location: '본사 3층 교육장',
      special_notes: '본사 교육장 사용',
    },
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

  it('training_place.types 원소는 사내/사외만', () => {
    expect(() =>
      trainingEnvironmentSchema.parse({
        ...valid,
        training_place: { types: ['온라인'], location: '', special_notes: '' },
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
          {
            id: 't1',
            seq: 1,
            program: '디지털전환',
            course_name: 'AI기초',
            method: '대면',
            duration_days: 3,
          },
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

  // ISSUE-14 (PBL 확장): Ⅱ-3-가 HRD이음 보고서 PDF 단일 첨부 — optional
  it('hrd_report_attachment 는 optional (미첨부 허용)', () => {
    expect(() =>
      hrdNecessitySchema.parse({
        training_history: [],
        support_history: [],
        recommendations: [],
        course_development_necessity: '첨부 없음 케이스',
      })
    ).not.toThrow();
  });

  it('hrd_report_attachment 에 유효한 첨부 메타 허용', () => {
    expect(() =>
      hrdNecessitySchema.parse({
        training_history: [],
        support_history: [],
        recommendations: [],
        course_development_necessity: '첨부 있음 케이스',
        hrd_report_attachment: {
          storage_path: 'interview-attachments/project-1/report.pdf',
          file_name: 'HRD이음컨설팅 결과.pdf',
          mime_type: 'application/pdf',
          size: 1024 * 500,
          uploaded_at: '2026-04-23T00:00:00.000Z',
          extracted_text: 'HRD이음컨설팅에서 제시된 진단 결과 요약',
        },
      })
    ).not.toThrow();
  });

  it('hrd_report_attachment 에 storage_path 누락 시 실패', () => {
    expect(() =>
      hrdNecessitySchema.parse({
        training_history: [],
        support_history: [],
        recommendations: [],
        course_development_necessity: '잘못된 첨부',
        hrd_report_attachment: {
          file_name: 'noop.pdf',
        },
      })
    ).toThrow();
  });

  it('shape 에 hrd_report_attachment 키가 노출된다', () => {
    expect(hrdNecessitySchema.shape).toHaveProperty('hrd_report_attachment');
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
    expect(() => performanceActivitiesSchema.parse({ performance_activities: [] })).toThrow();
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

// ============================================================================
// PR #2 Task 2.2 — 양식 1:1 정합 신규 스키마 (camelCase)
// ----------------------------------------------------------------------------
// 기준 문서: docs/references/2026-04-23-current-fields-inventory.md (양식 2, Ⅰ·Ⅱ·Ⅲ)
// - PBLOverviewSchema    — Ⅰ 훈련과정 개요 ([인터뷰])
// - PBLAnalysisSchema    — Ⅱ 훈련 요구 분석 ([인터뷰] + [PDF 첨부])
// - PBLTasksSchema       — Ⅲ AI기반 훈련과제 도출 ([인터뷰])
// - PBLInterviewSchema   — 위 3개 merge (strict), `.partial()` 호출로 loose 생성
// - PBLInterviewStrictSchema — superRefine 조건부 검증 포함
// ============================================================================

describe('PBLOverviewSchema (Ⅰ 훈련과정 개요)', () => {
  const validOverview = {
    companyName: '㈜테스트',
    courseName: 'AI 기반 품질관리 과정',
    ncsCode: '200107 인공지능',
    trainingHours: 40,
    trainingTarget: '품질관리 담당 5명',
    trainingForm: '체계적 현장훈련(S-OJT)',
    trainingPeriod: '2026.05.01 ~ 2026.06.30',
    businessIssues: 'AI 기반 품질 자동화가 필요한 이슈 요약.',
  };

  it('유효한 Ⅰ 훈련과정 개요 구조는 통과', () => {
    expect(PBLOverviewSchema.safeParse(validOverview).success).toBe(true);
  });

  it('ncsCode 는 선택 — 생략해도 통과', () => {
    const { ncsCode: _, ...withoutNcs } = validOverview;
    expect(PBLOverviewSchema.safeParse(withoutNcs).success).toBe(true);
  });

  it('trainingHours 는 양의 정수만 허용 (0·음수·소수 거부)', () => {
    expect(PBLOverviewSchema.safeParse({ ...validOverview, trainingHours: 0 }).success).toBe(false);
    expect(PBLOverviewSchema.safeParse({ ...validOverview, trainingHours: -1 }).success).toBe(
      false
    );
    expect(PBLOverviewSchema.safeParse({ ...validOverview, trainingHours: 1 }).success).toBe(true);
  });

  it('trainingHours 는 제약별 특화 에러 메시지 반환', () => {
    // 소수 → "정수여야" 메시지
    const decimalRes = PBLOverviewSchema.safeParse({ ...validOverview, trainingHours: 3.5 });
    expect(decimalRes.success).toBe(false);
    if (!decimalRes.success) {
      const messages = decimalRes.error.issues.map((i) => i.message).join(' | ');
      expect(messages).toContain('정수');
    }
    // 0 → "1 이상" (positive) 메시지
    const zeroRes = PBLOverviewSchema.safeParse({ ...validOverview, trainingHours: 0 });
    expect(zeroRes.success).toBe(false);
    if (!zeroRes.success) {
      const messages = zeroRes.error.issues.map((i) => i.message).join(' | ');
      expect(messages).toContain('1 이상');
    }
    // 문자열 → "숫자여야" 메시지
    const strRes = PBLOverviewSchema.safeParse({
      ...validOverview,
      trainingHours: 'forty' as unknown as number,
    });
    expect(strRes.success).toBe(false);
    if (!strRes.success) {
      const messages = strRes.error.issues.map((i) => i.message).join(' | ');
      expect(messages).toContain('숫자');
    }
  });

  it('companyName·courseName·trainingTarget·trainingForm·trainingPeriod·businessIssues 는 필수', () => {
    for (const key of [
      'companyName',
      'courseName',
      'trainingTarget',
      'trainingForm',
      'trainingPeriod',
      'businessIssues',
    ] as const) {
      const invalid = { ...validOverview, [key]: '' };
      expect(PBLOverviewSchema.safeParse(invalid).success).toBe(false);
    }
  });
});

describe('PBLAnalysisSchema (Ⅱ 훈련 요구 분석)', () => {
  const validAnalysis = {
    companyIssues: '- 불량률 증가\n- 납기 지연',
    organization: {
      orgTree: [
        {
          id: 'n1',
          name: '생산본부',
          children: [
            { id: 'n2', name: '생산팀', children: [] },
            { id: 'n3', name: '품질팀', children: [] },
          ],
        },
      ],
      mainWork: [
        { dept: '생산팀', role: '공정관리', description: '라인 공정 운영' },
        { dept: '품질팀', role: '검사', description: '완제품 품질 검사' },
      ],
    },
    trainingEnv: {
      properTrainingHours: '24시간',
      internalPlace: '사내 교육장',
      externalPlace: '',
      internalInstructors: [],
      externalInstructors: [],
      aiInfrastructure: '대상 15명 경력 5년 이상',
    },
    hrdReportPdf: {
      fileName: 'HRD이음_진단보고서.pdf',
      url: 'interview-attachments/project-1/hrd.pdf',
      size: 204800,
    },
    courseNecessity: 'AI 기반 자동 판정으로 품질 편차 개선 필요.',
  };

  it('유효한 Ⅱ 요구분석 구조는 통과', () => {
    expect(PBLAnalysisSchema.safeParse(validAnalysis).success).toBe(true);
  });

  it('hrdReportPdf 는 null 허용 (미첨부, Ⅱ-3-가)', () => {
    expect(PBLAnalysisSchema.safeParse({ ...validAnalysis, hrdReportPdf: null }).success).toBe(
      true
    );
  });

  it('hrdReportPdf 는 키 누락(undefined) 도 허용 — production 인터뷰 폼이 미첨부 시 키를 omit 함', () => {
    // 사용자 보고 버그 회귀: 'ㅇㅇ' 으로 채운 production data 에 hrdReportPdf 키가
    // 없어 보고서 생성이 거짓 토스트로 막혔다. nullable() 만으로는 undefined 를
    // 거절하므로 nullish() 로 양쪽 모두 통과시킨다 (superRefine 의 `== null` 분기와 정합).
    const { hrdReportPdf: _omit, ...withoutKey } = validAnalysis;
    expect(PBLAnalysisSchema.safeParse(withoutKey).success).toBe(true);
  });

  it('organization.orgTree 중첩(재귀) 구조 파싱', () => {
    const deepTree = {
      ...validAnalysis,
      organization: {
        orgTree: [
          {
            id: 'root',
            name: '회사',
            children: [
              {
                id: 'l1',
                name: '본부',
                children: [
                  {
                    id: 'l2',
                    name: '팀',
                    children: [{ id: 'l3', name: '파트', children: [] }],
                  },
                ],
              },
            ],
          },
        ],
        mainWork: validAnalysis.organization.mainWork,
      },
    };
    expect(PBLAnalysisSchema.safeParse(deepTree).success).toBe(true);
  });

  it('organization.orgTree 노드 name 은 필수', () => {
    const invalid = {
      ...validAnalysis,
      organization: {
        orgTree: [{ id: 'n1', name: '', children: [] }],
        mainWork: validAnalysis.organization.mainWork,
      },
    };
    expect(PBLAnalysisSchema.safeParse(invalid).success).toBe(false);
  });

  it('mainWork 는 빈 배열도 허용 (아직 미작성 단계)', () => {
    const withEmptyWork = {
      ...validAnalysis,
      organization: { ...validAnalysis.organization, mainWork: [] },
    };
    expect(PBLAnalysisSchema.safeParse(withEmptyWork).success).toBe(true);
  });

  it('companyIssues·courseNecessity 는 필수 (빈 문자열 거부)', () => {
    for (const key of ['companyIssues', 'courseNecessity'] as const) {
      const invalid = { ...validAnalysis, [key]: '' };
      expect(PBLAnalysisSchema.safeParse(invalid).success).toBe(false);
    }
  });

  // R8 PBL-자체-02 — trainingEnv 가 정형 객체로 변경됨. 빈 객체도 통과 (default 채움).
  it('trainingEnv 객체 자체가 누락되면 실패 (필수 필드)', () => {
    const { trainingEnv: _omit, ...rest } = validAnalysis;
    void _omit;
    expect(PBLAnalysisSchema.safeParse(rest).success).toBe(false);
  });
});

describe('PBLTrainingEnvSchema — 양식 Ⅱ-2 누락 3개 (대상 인원·사내강사 활용·기타 장비)', () => {
  const baseEnv = {
    properTrainingHours: '24시간',
    internalPlace: '사내 교육장',
    externalPlace: '',
    internalInstructors: [],
    externalInstructors: [],
    aiInfrastructure: '대상 15명 경력 5년 이상',
  };

  it('신규 4 필드 누락 시에도 default 로 채워 통과 — 기존 인터뷰 데이터 호환', () => {
    const parsed = PBLTrainingEnvSchema.safeParse(baseEnv);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.targetTraineeCount).toBe(0);
      expect(parsed.data.internalInstructorUsage).toBe('NO');
      expect(parsed.data.internalInstructorPrimary).toEqual({ name: '', position: '' });
      expect(parsed.data.otherEquipment).toBe('');
    }
  });

  it('targetTraineeCount 는 자연수(0 포함) 허용 — 양식 "대상 인원" 행', () => {
    expect(PBLTrainingEnvSchema.safeParse({ ...baseEnv, targetTraineeCount: 5 }).success).toBe(
      true
    );
    expect(PBLTrainingEnvSchema.safeParse({ ...baseEnv, targetTraineeCount: 0 }).success).toBe(
      true
    );
  });

  it('targetTraineeCount 음수·소수 거부', () => {
    expect(PBLTrainingEnvSchema.safeParse({ ...baseEnv, targetTraineeCount: -1 }).success).toBe(
      false
    );
    expect(PBLTrainingEnvSchema.safeParse({ ...baseEnv, targetTraineeCount: 1.5 }).success).toBe(
      false
    );
  });

  it('internalInstructorUsage 는 YES|NO 만 허용', () => {
    expect(
      PBLTrainingEnvSchema.safeParse({
        ...baseEnv,
        internalInstructorUsage: 'YES',
        internalInstructorPrimary: { name: '홍길동', position: '생산팀장' },
      }).success
    ).toBe(true);
    expect(
      PBLTrainingEnvSchema.safeParse({ ...baseEnv, internalInstructorUsage: 'NO' }).success
    ).toBe(true);
    expect(
      PBLTrainingEnvSchema.safeParse({ ...baseEnv, internalInstructorUsage: 'MAYBE' }).success
    ).toBe(false);
  });

  it('internalInstructorUsage="NO" 일 때 primary 비어 있어도 통과', () => {
    expect(
      PBLTrainingEnvSchema.safeParse({
        ...baseEnv,
        internalInstructorUsage: 'NO',
        internalInstructorPrimary: { name: '', position: '' },
      }).success
    ).toBe(true);
  });

  it('otherEquipment 는 자유서술 (빈 문자열·임의 텍스트 통과) — 양식 "AI인프라 기타 장비 보유" 행', () => {
    expect(PBLTrainingEnvSchema.safeParse({ ...baseEnv, otherEquipment: '' }).success).toBe(true);
    expect(
      PBLTrainingEnvSchema.safeParse({
        ...baseEnv,
        otherEquipment: '프로젝터 2대, 디지털 화이트보드 1대',
      }).success
    ).toBe(true);
  });
});

describe('PBLTasksSchema (Ⅲ AI기반 훈련과제 도출 — V2 로드맵 연동)', () => {
  // V2: Ⅲ-1 수행활동·Ⅲ-2-나 우선순위·Ⅲ-4 AI역량 은 PBL 자체입력에서 제거.
  //   - Ⅲ-1 수행활동 = 로드맵 연동 (PBL 미입력)
  //   - Ⅲ-4 AI역량 = 로드맵 연동으로만 표출 (PBL 미입력)
  // PBLTasksSchema 는 Ⅲ-2-가 문제 정의서 + Ⅲ-3 훈련대상 업무 두 슬라이스만 보유.
  const validTasks = {
    // Ⅲ-2-가 문제 정의서 (4 정형 항목 단일 세트)
    problemDefinitionSheet: {
      background: '제조 공정 자동화 압박과 품질 데이터 분산.',
      core: '불량률 증가 — 라인별 편차 및 육안 검사 의존',
      scope: '생산팀 완제품 검사',
      constraints: '예산·일정 한계, 부서 간 데이터 공유 규칙 미정',
    },
    // Ⅲ-3 훈련대상 업무 (가: 로드맵 과업별 선정 · 나: 선정 사유 · 다: 세부내용)
    target: {
      // Ⅲ-3-가 로드맵 과업별 PBL 선정 입력 (로드맵 과업 순서 1:1)
      taskSelections: [
        { ai_necessity: '높음 — 검사 자동화 효과 큼', training_selected: true },
        { ai_necessity: '보통', training_selected: false },
      ],
      // Ⅲ-3-나 AI기반 문제해결 필요성(선정 사유)
      necessity: 'AI 자동 판정으로 대체 가능',
      // Ⅲ-3-다 훈련대상 업무 세부내용 (5 컬럼)
      details: [
        {
          title: '품질검사 자동화',
          as_is: '수작업 육안 검사',
          to_be: 'AI 비전 1차 스크리닝',
          required_knowledge: '품질 검사 기준 + 결함 유형 카탈로그',
          required_skill: 'CNN 모델 운영 + 결과 라벨링 도구 활용',
        },
      ],
    },
  };

  it('유효한 Ⅲ 구조는 통과', () => {
    expect(PBLTasksSchema.safeParse(validTasks).success).toBe(true);
  });

  it('shape 은 problemDefinitionSheet·target 만 노출 (제거 필드 부재)', () => {
    const shape = PBLTasksSchema.shape;
    expect(shape).toHaveProperty('problemDefinitionSheet');
    expect(shape).toHaveProperty('target');
    // V2 에서 제거된 자체입력 슬라이스
    expect(shape).not.toHaveProperty('activities');
    expect(shape).not.toHaveProperty('priority');
    expect(shape).not.toHaveProperty('currentAiLevel');
    expect(shape).not.toHaveProperty('expectedAiLevel');
  });

  it('제거된 자체입력 필드(activities/priority/currentAiLevel/expectedAiLevel)는 무시(strip)된다', () => {
    const withStale = {
      ...validTasks,
      activities: [{ round: 1, role: 'PM', personName: 'x', date: '', content: '', method: '' }],
      priority: { items: [{ problem: 'x', score: 3, rank: 1 }], method: 'AHP' },
      currentAiLevel: { level: 'BASIC', note: '' },
      expectedAiLevel: { level: 'USER', note: '' },
    };
    const result = PBLTasksSchema.safeParse(withStale);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('activities');
      expect(result.data).not.toHaveProperty('priority');
      expect(result.data).not.toHaveProperty('currentAiLevel');
      expect(result.data).not.toHaveProperty('expectedAiLevel');
    }
  });

  // ── Ⅲ-3-가 taskSelections (로드맵 과업별 PBL 선정 입력) ──────────────
  it('target.taskSelections 는 생략 시 빈 배열 default 로 채워진다', () => {
    const { taskSelections: _omit, ...targetNoSelections } = validTasks.target;
    void _omit;
    const result = PBLTasksSchema.safeParse({ ...validTasks, target: targetNoSelections });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.target.taskSelections).toEqual([]);
    }
  });

  it('target.taskSelections[] 는 ai_necessity(문자열)·training_selected(불리언) 로 파싱', () => {
    const result = PBLTasksSchema.safeParse(validTasks);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.target.taskSelections).toEqual([
        { ai_necessity: '높음 — 검사 자동화 효과 큼', training_selected: true },
        { ai_necessity: '보통', training_selected: false },
      ]);
    }
  });

  it('target.taskSelections[] 항목의 ai_necessity·training_selected 는 default 로 채워진다', () => {
    const result = PBLTasksSchema.safeParse({
      ...validTasks,
      target: { ...validTasks.target, taskSelections: [{}] },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.target.taskSelections[0]).toEqual({
        ai_necessity: '',
        training_selected: false,
      });
    }
  });

  it('target.taskSelections[].training_selected 는 boolean 만 허용 (문자열 거부)', () => {
    expect(
      PBLTasksSchema.safeParse({
        ...validTasks,
        target: {
          ...validTasks.target,
          taskSelections: [{ ai_necessity: '높음', training_selected: 'yes' }],
        },
      }).success
    ).toBe(false);
  });

  // ── Ⅲ-3-나 necessity (선정 사유) ────────────────────────────────────
  it('target.necessity 는 필수 (빈 문자열 거부)', () => {
    const invalid = { ...validTasks, target: { ...validTasks.target, necessity: '' } };
    expect(PBLTasksSchema.safeParse(invalid).success).toBe(false);
  });

  // ── Ⅲ-3-다 details (세부내용 5 컬럼 — PBLTargetDetailSchema) ─────────
  it('target.details[] 세부내용 5 컬럼 검증 — as_is 누락 시 실패', () => {
    const invalid = {
      ...validTasks,
      target: {
        ...validTasks.target,
        details: [
          {
            title: '품질검사 자동화',
            to_be: 'AI 비전',
            required_knowledge: '기준',
            required_skill: '도구',
          },
        ],
      },
    };
    expect(PBLTasksSchema.safeParse(invalid).success).toBe(false);
  });

  it('target 은 old 필드(name/code/scope/necessity_score) 없이도 통과 (제거됨)', () => {
    // 신 shape 는 name/code/scope/necessity_score 를 요구하지 않는다.
    const result = PBLTasksSchema.safeParse(validTasks);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.target).not.toHaveProperty('name');
      expect(result.data.target).not.toHaveProperty('code');
      expect(result.data.target).not.toHaveProperty('scope');
      expect(result.data.target).not.toHaveProperty('necessity_score');
    }
  });

  // ── Ⅲ-2-가 문제 정의서 (4 정형 항목 단일 세트) ──────────────────────
  it('problemDefinitionSheet 4 필드는 모두 string default("") 허용 — 빈 세트도 통과', () => {
    const result = PBLTasksSchema.safeParse({
      ...validTasks,
      problemDefinitionSheet: { background: '', core: '', scope: '', constraints: '' },
    });
    expect(result.success).toBe(true);
  });

  it('problemDefinitionSheet 4 필드 모두 채워진 세트는 통과', () => {
    const result = PBLTasksSchema.safeParse({
      ...validTasks,
      problemDefinitionSheet: {
        background: '문제 발생 배경',
        core: '핵심 문제',
        scope: '범위',
        constraints: '제약 조건',
      },
    });
    expect(result.success).toBe(true);
  });

  it('problemDefinitionSheet 객체 자체가 누락되면 실패 (필수 필드)', () => {
    const { problemDefinitionSheet: _omit, ...rest } = validTasks;
    void _omit;
    expect(PBLTasksSchema.safeParse(rest).success).toBe(false);
  });
});

// ── Ⅲ-1 수행활동 — PBL 자체 입력 (로드맵 연계 폐기) ─────────────────────────
// 정본 T19 는 참석자 4역할·수행 일자(날짜만) 로, 로드맵 Ⅰ-2(2역할·일시) 와 다른 표다.
// PBL 인터뷰는 로드맵 인터뷰와 별도 일정이므로 로드맵 활동을 재사용하면 날짜가 틀리고
// 참석자 2행이 공란으로 출력된다 → PBL 이 직접 입력한다.
describe('PBLPerformanceActivitySchema (Ⅲ-1 수행활동 — PBL 자체 입력)', () => {
  const validActivity = {
    round: 1,
    date: '25/04/10',
    content: '핵심문제 파악 워크숍 — 경영진·실무자 5명 참여',
    method: 'WORKSHOP',
    participants: {
      pm: '김책임',
      external_expert: '이직무',
      internal_expert: '박내부',
      jurisdiction_manager: '최주치의',
    },
  };

  it('정본 참석자 4역할을 모두 받는다', () => {
    const result = PBLPerformanceActivitySchema.safeParse(validActivity);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.participants).toEqual({
        pm: '김책임',
        external_expert: '이직무',
        internal_expert: '박내부',
        jurisdiction_manager: '최주치의',
      });
    }
  });

  it('참석자 4역할은 생략 시 빈 문자열 default (부분 입력 허용)', () => {
    const result = PBLPerformanceActivitySchema.safeParse({ ...validActivity, participants: {} });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.participants).toEqual({
        pm: '',
        external_expert: '',
        internal_expert: '',
        jurisdiction_manager: '',
      });
    }
  });

  it('수행 일자만 받는다 — 정본 Ⅲ-1 에 시간 칸이 없어 timeRange 를 두지 않는다', () => {
    const result = PBLPerformanceActivitySchema.safeParse(validActivity);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('timeRange');
    }
    // 로드맵 활동 형태(timeRange 포함)를 넣어도 timeRange 는 strip 된다.
    const withTimeRange = PBLPerformanceActivitySchema.safeParse({
      ...validActivity,
      timeRange: '14:00~17:00',
    });
    expect(withTimeRange.success).toBe(true);
    if (withTimeRange.success) {
      expect(withTimeRange.data).not.toHaveProperty('timeRange');
    }
  });

  it('차수는 1 이상 정수', () => {
    expect(PBLPerformanceActivitySchema.safeParse({ ...validActivity, round: 0 }).success).toBe(
      false
    );
    expect(PBLPerformanceActivitySchema.safeParse({ ...validActivity, round: 1.5 }).success).toBe(
      false
    );
  });
});

describe('PBLTasksSchema.performanceActivities (Ⅲ-1 — 로드맵 연계에서 PBL 자체 입력으로 전환)', () => {
  const validTasks = {
    problemDefinitionSheet: {
      background: '배경',
      core: '핵심',
      scope: '범위',
      constraints: '제약',
    },
    target: {
      taskSelections: [],
      necessity: 'AI 자동 판정으로 대체 가능',
      details: [
        {
          title: '품질검사 자동화',
          as_is: '수작업 육안 검사',
          to_be: 'AI 비전 1차 스크리닝',
          required_knowledge: '품질 검사 기준',
          required_skill: 'CNN 모델 운영',
        },
      ],
    },
  };

  function act(round: number) {
    return {
      round,
      date: `25/04/${String(round).padStart(2, '0')}`,
      content: `${round}차 활동`,
      method: 'ONSITE',
      participants: {
        pm: 'PM',
        external_expert: '외부',
        internal_expert: '내부',
        jurisdiction_manager: '주치의',
      },
    };
  }

  it('PBLTasksSchema 가 performanceActivities 를 노출한다', () => {
    expect(PBLTasksSchema.shape).toHaveProperty('performanceActivities');
  });

  it('생략 시 빈 배열 default — 기존 PBL 인터뷰(Ⅲ-1 미입력) 도 통과해야 한다', () => {
    const result = PBLTasksSchema.safeParse(validTasks);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.performanceActivities).toEqual([]);
    }
  });

  it('최대 15차까지 허용 (로드맵 Ⅰ-2·PBL Ⅱ-1-나 와 동일 상한)', () => {
    const rounds = Array.from({ length: 15 }, (_, i) => act(i + 1));
    expect(PBLTasksSchema.safeParse({ ...validTasks, performanceActivities: rounds }).success).toBe(
      true
    );
  });

  it('16차는 거부', () => {
    const rounds = Array.from({ length: 16 }, (_, i) => act(i + 1));
    expect(PBLTasksSchema.safeParse({ ...validTasks, performanceActivities: rounds }).success).toBe(
      false
    );
  });
});

describe('PBLInterviewSchema (strict / loose 이중 검증)', () => {
  const fullValid = {
    // Ⅰ 훈련과정 개요
    companyName: '㈜테스트',
    courseName: 'AI 기반 품질관리 과정',
    ncsCode: '200107 인공지능',
    trainingHours: 40,
    trainingTarget: '품질관리 담당 5명',
    trainingForm: '체계적 현장훈련(S-OJT)',
    trainingPeriod: '2026.05.01 ~ 2026.06.30',
    businessIssues: '품질 편차 및 납기 지연.',
    // Ⅱ 요구분석
    companyIssues: '경영 이슈 bullet',
    organization: {
      orgTree: [{ id: 'r', name: '회사', children: [] }],
      mainWork: [{ dept: '생산팀', role: '공정관리', description: '라인' }],
    },
    trainingEnv: {
      properTrainingHours: '40시간',
      internalPlace: '본사 교육장',
      externalPlace: '',
      internalInstructors: [],
      externalInstructors: [],
      aiInfrastructure: 'PC 10대',
    },
    hrdReportPdf: {
      fileName: 'HRD.pdf',
      url: 'interview-attachments/p1/hrd.pdf',
      size: 1024,
    },
    courseNecessity: 'AI 과정개발 필요성 bullet',
    // Ⅲ 훈련과제 (V2 — 문제 정의서 + 훈련대상; 수행활동·우선순위·AI역량은 로드맵 연동)
    problemDefinitionSheet: {
      background: '문제 배경',
      core: '핵심 문제',
      scope: '범위',
      constraints: '제약',
    },
    target: {
      taskSelections: [{ ai_necessity: '높음', training_selected: true }],
      necessity: 'AI 자동 판정',
      details: [
        {
          title: '품질검사 자동화',
          as_is: '수작업',
          to_be: 'AI 자동 판정',
          required_knowledge: '품질 검사 기준',
          required_skill: 'CNN 모델 운영',
        },
      ],
    },
  };

  it('strict: 전체 유효 구조는 통과', () => {
    expect(PBLInterviewSchema.safeParse(fullValid).success).toBe(true);
  });

  it('strict: 빈 객체 {} 는 실패 (최종 제출 시 필수 필드 검증)', () => {
    expect(PBLInterviewSchema.safeParse({}).success).toBe(false);
  });

  it('loose (`.partial()`): 빈 객체 {} 는 통과 (자동 저장용)', () => {
    const loose = PBLInterviewSchema.partial();
    expect(loose.safeParse({}).success).toBe(true);
  });

  it('loose: 일부 필드만 있어도 통과', () => {
    const loose = PBLInterviewSchema.partial();
    expect(
      loose.safeParse({
        companyName: '㈜테스트',
        courseName: '일부만',
      }).success
    ).toBe(true);
  });

  it('strict: 필수 필드 누락 시 에러 경로(path) 반환', () => {
    const { companyName: _, ...withoutCompany } = fullValid;
    const result = PBLInterviewSchema.safeParse(withoutCompany);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('companyName');
    }
  });

  it('PBLInterviewStrictSchema: hrdReportPdf null 이면 courseNecessity 필수 검증 (Ⅱ-3 XOR)', () => {
    // Ⅱ-3-가 PDF 가 없으면 Ⅱ-3-나 courseNecessity 가 반드시 채워져야 함.
    // courseNecessity 는 이미 min(1) 이므로 strict 본체가 막지만,
    // superRefine 으로 "PDF 가 null 인데 courseNecessity 가 공백" 케이스에도 대비한 메시지를 제공.
    const invalidNoPdfNoNecessity = {
      ...fullValid,
      hrdReportPdf: null,
      courseNecessity: '   ', // 공백만
    };
    expect(PBLInterviewStrictSchema.safeParse(invalidNoPdfNoNecessity).success).toBe(false);

    // PDF 있으면 courseNecessity 가 공백이어도 strict 는 기존 min(1) 에 의해 실패 → 경로 확인만
    // 정상 케이스는 통과
    expect(PBLInterviewStrictSchema.safeParse(fullValid).success).toBe(true);
  });

  it('PBLInterviewStrictSchema: hrdReportPdf 키 누락(undefined) 도 null 과 동일하게 미첨부 처리', () => {
    // hrdReportPdf 키가 아예 없는 데이터로 strict parse → Required 가 아니라
    // null 과 동일한 동작 (courseNecessity 가 채워져 있으면 통과).
    const withoutHrdKey = { ...fullValid };
    delete (withoutHrdKey as Partial<typeof fullValid>).hrdReportPdf;
    expect(PBLInterviewStrictSchema.safeParse(withoutHrdKey).success).toBe(true);

    // hrdReportPdf 키 누락 + courseNecessity 공백 → superRefine 차단 (path=courseNecessity)
    const withoutBoth = { ...fullValid, courseNecessity: '' };
    delete (withoutBoth as Partial<typeof fullValid>).hrdReportPdf;
    const result = PBLInterviewStrictSchema.safeParse(withoutBoth);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      // 'hrdReportPdf' 단독 path 는 발생하면 안 됨 — courseNecessity 로 떨어져야 함
      expect(paths).not.toContain('hrdReportPdf');
      expect(paths).toContain('courseNecessity');
    }
  });
});

describe('PBLTargetDetailSchema (PR #7 — Ⅲ-3-다 양식 4×5 의 5 컬럼 1:1 정합)', () => {
  // 양식 PDF Ⅲ-3-다 표 5 컬럼: 업무명 | AS-IS | TO-BE | 요구지식 | 기술
  // PR #5 의 단일 description 통합으로 col 2~4 가 빈 셀이 되던 회귀 보강.

  it('5 필드 모두 입력 시 strict parse 통과', () => {
    const valid = {
      title: '데이터 수집·전처리',
      as_is: '센서 데이터 수동 측정 + 엑셀 집계',
      to_be: 'PLC 자동 수집 + AutoLabel 자동 라벨링',
      required_knowledge: '센서 데이터 구조·라벨링 가이드라인',
      required_skill: 'Python pandas + AutoLabel CLI 운영',
    };
    expect(PBLTargetDetailSchema.safeParse(valid).success).toBe(true);
  });

  it('as_is 누락 시 strict parse 실패', () => {
    const invalid = {
      title: '데이터 수집',
      to_be: 'PLC 자동 수집',
      required_knowledge: '센서 데이터 구조',
      required_skill: 'Python pandas',
    };
    const result = PBLTargetDetailSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('as_is');
    }
  });

  it('required_knowledge / required_skill 빈 문자열은 strict parse 실패', () => {
    const invalid = {
      title: '데이터 수집',
      as_is: '수동',
      to_be: '자동',
      required_knowledge: '',
      required_skill: '',
    };
    expect(PBLTargetDetailSchema.safeParse(invalid).success).toBe(false);
  });

  it('V1 호환: description 만 있는 기존 row 는 as_is 로 자동 마이그레이션', () => {
    const legacy = {
      title: '데이터 수집',
      description: '센서 데이터 + 영상 라벨링 (PLC 자동 수집)',
    };
    // preprocess 가 description → as_is 로 이전. 누락 3 필드는 빈 문자열로
    // 채워져 strict parse 는 실패 (컨설턴트 재입력 필요) — 마이그레이션 동작만 검증.
    // loose parse 검증을 위해 별도 z.preprocess 로 결과를 확인.
    // 여기서는 strict parse 결과의 path 가 to_be/required_knowledge/required_skill
    // 에 한정되고 description 의 값이 손실되지 않았음을 검증.
    const result = PBLTargetDetailSchema.safeParse(legacy);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('to_be');
      expect(paths).toContain('required_knowledge');
      expect(paths).toContain('required_skill');
      // as_is 는 description 으로부터 채워졌으므로 path 에 포함되면 안 됨
      expect(paths).not.toContain('as_is');
    }
  });

  it('V1 호환: 전체 5 필드 + description 동시 존재 시 as_is 우선 (description 무시)', () => {
    const both = {
      title: '데이터 수집',
      description: '구버전 description',
      as_is: '신버전 AS-IS',
      to_be: 'TO-BE',
      required_knowledge: '지식',
      required_skill: '기술',
    };
    const result = PBLTargetDetailSchema.safeParse(both);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.as_is).toBe('신버전 AS-IS');
    }
  });
});
