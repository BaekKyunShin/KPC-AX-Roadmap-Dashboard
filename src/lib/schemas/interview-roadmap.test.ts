import { describe, it, expect } from 'vitest';
import {
  AI_COMPETENCY_LEVEL,
  companyRequirementsSchema,
  createEmptyOverview,
  overviewSchema,
  taskWorkflowItemSchema,
  trainingTargetSchema,
  analysisNotesSchema,
  roadmapInterviewSchema,
  roadmapInterviewAutoSaveSchema,
  createEmptyTaskWorkflowItem,
  createEmptyTrainingTarget,
  competencyModelSchema,
  ncsUsageSchema,
  createEmptyCompetencyModel,
  createEmptyNcsUsage,
  mapInterviewRowToRoadmapInterview,
} from './interview-roadmap';

const baseOverview = {
  establishment_necessity: 'AI 훈련 로드맵 수립 필요성',
  ai_competency_level: 'INTERMEDIATE' as const,
  selected_tasks_summary: '품질검사 자동화',
};

const baseCompetencyModel = {
  id: 'cm1',
  competency_name: '데이터 해석 역량',
  competency_definition: '수집된 데이터를 바탕으로 품질 이슈를 식별하고 의사결정한다.',
  knowledge: '기초 통계, 엑셀 함수, QMS 지표 체계',
  skill: '피벗 테이블 구축, 시각화 도구 활용, 지표 분석',
  attitude: '데이터 기반 의사결정을 선호하고 지속 학습한다.',
};

const baseNcsUsage = {
  uses_ncs: false as const,
  competency_derivation_method: '현장 인터뷰 + 업계 벤치마킹으로 역량을 도출함.',
};

describe('companyRequirementsSchema', () => {
  it('4개 필드가 모두 필수 (산인공 Ⅱ-2)', () => {
    const valid = {
      company_status: '제조업, AI 미도입',
      main_problems: '생산성 저하',
      push_willingness: '경영진 적극 지원',
      expected_outcomes: '15% 효율 개선',
    };
    expect(companyRequirementsSchema.safeParse(valid).success).toBe(true);

    for (const key of ['company_status', 'main_problems', 'push_willingness', 'expected_outcomes'] as const) {
      const invalid = { ...valid, [key]: '' };
      const result = companyRequirementsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    }
  });
});

describe('taskWorkflowItemSchema', () => {
  const base = {
    id: 'a',
    job: '생산',
    task_name: '품질검사',
    as_is: '육안 검사',
    problems: '개인 역량 의존',
    data_availability: '검사 이미지 2년치 보유',
    ai_necessity: 5,
  };

  it('유효한 항목은 통과', () => {
    expect(taskWorkflowItemSchema.safeParse(base).success).toBe(true);
  });

  it('AI 필요도는 1~5 정수만 허용', () => {
    expect(taskWorkflowItemSchema.safeParse({ ...base, ai_necessity: 0 }).success).toBe(false);
    expect(taskWorkflowItemSchema.safeParse({ ...base, ai_necessity: 6 }).success).toBe(false);
    expect(taskWorkflowItemSchema.safeParse({ ...base, ai_necessity: 3.5 }).success).toBe(false);
    expect(taskWorkflowItemSchema.safeParse({ ...base, ai_necessity: 1 }).success).toBe(true);
    expect(taskWorkflowItemSchema.safeParse({ ...base, ai_necessity: 5 }).success).toBe(true);
  });

  it('모든 텍스트 필드는 필수', () => {
    for (const key of ['job', 'task_name', 'as_is', 'problems', 'data_availability'] as const) {
      expect(taskWorkflowItemSchema.safeParse({ ...base, [key]: '' }).success).toBe(false);
    }
  });
});

describe('trainingTargetSchema', () => {
  const base = {
    id: 'b',
    task_name: '품질검사 자동화',
    selection_reason: 'AI 필요도 5점',
    as_is: '육안 검사',
    to_be: '비전 AI 1차 스크리닝',
  };

  it('유효한 항목은 통과', () => {
    expect(trainingTargetSchema.safeParse(base).success).toBe(true);
  });

  it('모든 텍스트 필드는 필수', () => {
    for (const key of ['task_name', 'selection_reason', 'as_is', 'to_be'] as const) {
      expect(trainingTargetSchema.safeParse({ ...base, [key]: '' }).success).toBe(false);
    }
  });
});

describe('analysisNotesSchema', () => {
  it('기본값 허용', () => {
    const result = analysisNotesSchema.parse({});
    expect(result).toEqual({ text: '', attachment_urls: [] });
  });

  it('attachment_urls는 URL만 허용', () => {
    expect(analysisNotesSchema.safeParse({ text: '', attachment_urls: ['not-a-url'] }).success).toBe(false);
    expect(analysisNotesSchema.safeParse({ text: '', attachment_urls: ['https://example.com/a.pdf'] }).success).toBe(true);
  });
});

describe('AI_COMPETENCY_LEVEL', () => {
  it('BEGINNER | INTERMEDIATE | ADVANCED enum 허용', () => {
    expect(AI_COMPETENCY_LEVEL.safeParse('BEGINNER').success).toBe(true);
    expect(AI_COMPETENCY_LEVEL.safeParse('INTERMEDIATE').success).toBe(true);
    expect(AI_COMPETENCY_LEVEL.safeParse('ADVANCED').success).toBe(true);
    expect(AI_COMPETENCY_LEVEL.safeParse('EXPERT').success).toBe(false);
    expect(AI_COMPETENCY_LEVEL.safeParse('').success).toBe(false);
  });
});

describe('overviewSchema', () => {
  it('establishment_necessity·selected_tasks_summary 는 필수 (산인공 Ⅰ-1·Ⅰ-3)', () => {
    expect(overviewSchema.safeParse(baseOverview).success).toBe(true);

    for (const key of ['establishment_necessity', 'selected_tasks_summary'] as const) {
      expect(overviewSchema.safeParse({ ...baseOverview, [key]: '' }).success).toBe(false);
    }
  });

  it('roadmap_summary 는 LLM 자동생성으로 전환되어 optional (ISSUE-04)', () => {
    // 없어도 통과
    expect(overviewSchema.safeParse(baseOverview).success).toBe(true);
    // 빈 문자열도 통과 (자동저장 중간 상태)
    expect(
      overviewSchema.safeParse({ ...baseOverview, roadmap_summary: '' }).success,
    ).toBe(true);
    // 있어도 통과 (로드맵 생성 후 자동 채워진 값)
    expect(
      overviewSchema.safeParse({ ...baseOverview, roadmap_summary: '자동 생성 요약' }).success,
    ).toBe(true);
  });

  it('ai_competency_level enum 외 값 거부', () => {
    expect(
      overviewSchema.safeParse({ ...baseOverview, ai_competency_level: 'LEVEL_1' }).success
    ).toBe(false);
  });

  it('hrd_report_attachment은 선택이며 첨부 메타 객체만 허용', () => {
    expect(
      overviewSchema.safeParse({
        ...baseOverview,
        hrd_report_attachment: {
          storage_path: 'project-1/abc.pdf',
          file_name: '진단보고서.pdf',
          mime_type: 'application/pdf',
          size: 1024,
        },
      }).success
    ).toBe(true);

    expect(
      overviewSchema.safeParse({
        ...baseOverview,
        hrd_report_attachment: { storage_path: '', file_name: 'a.pdf' },
      }).success
    ).toBe(false);

    expect(overviewSchema.safeParse(baseOverview).success).toBe(true);
  });
});

describe('createEmptyOverview', () => {
  it('기본값은 BEGINNER + 빈 텍스트 (roadmap_summary 는 LLM 자동생성이므로 포함하지 않음)', () => {
    const empty = createEmptyOverview();
    expect(empty.ai_competency_level).toBe('BEGINNER');
    expect(empty.establishment_necessity).toBe('');
    expect(empty.selected_tasks_summary).toBe('');
    expect(empty.roadmap_summary).toBeUndefined();
    expect(empty.hrd_report_attachment).toBeUndefined();
  });
});

describe('competencyModelSchema (ISSUE-04 Ⅲ-1)', () => {
  it('유효한 역량 모델은 통과', () => {
    expect(competencyModelSchema.safeParse(baseCompetencyModel).success).toBe(true);
  });

  it('역량명·정의·지식·기술·태도 5필드 모두 필수', () => {
    for (const key of [
      'competency_name',
      'competency_definition',
      'knowledge',
      'skill',
      'attitude',
    ] as const) {
      expect(
        competencyModelSchema.safeParse({ ...baseCompetencyModel, [key]: '' }).success,
      ).toBe(false);
    }
  });
});

describe('ncsUsageSchema (ISSUE-04 Ⅲ-1)', () => {
  it('uses_ncs=true 이면 ncs_usage_method 필수', () => {
    expect(ncsUsageSchema.safeParse({ uses_ncs: true }).success).toBe(false);
    expect(
      ncsUsageSchema.safeParse({ uses_ncs: true, ncs_usage_method: '' }).success,
    ).toBe(false);
    expect(
      ncsUsageSchema.safeParse({
        uses_ncs: true,
        ncs_usage_method: 'NCS 20.02.01 빅데이터분석 세분류 능력단위 차용',
      }).success,
    ).toBe(true);
  });

  it('uses_ncs=false 이면 competency_derivation_method 필수', () => {
    expect(ncsUsageSchema.safeParse({ uses_ncs: false }).success).toBe(false);
    expect(
      ncsUsageSchema.safeParse({ uses_ncs: false, competency_derivation_method: '' }).success,
    ).toBe(false);
    expect(ncsUsageSchema.safeParse(baseNcsUsage).success).toBe(true);
  });
});

describe('createEmptyCompetencyModel', () => {
  it('UUID id + 빈 5필드', () => {
    const empty = createEmptyCompetencyModel();
    expect(empty.id).toBeTruthy();
    expect(empty.competency_name).toBe('');
    expect(empty.competency_definition).toBe('');
    expect(empty.knowledge).toBe('');
    expect(empty.skill).toBe('');
    expect(empty.attitude).toBe('');
  });
});

describe('createEmptyNcsUsage', () => {
  it('uses_ncs=false + 빈 competency_derivation_method', () => {
    const empty = createEmptyNcsUsage();
    expect(empty.uses_ncs).toBe(false);
    expect(empty.competency_derivation_method).toBe('');
    expect(empty.ncs_usage_method).toBeUndefined();
  });
});

describe('roadmapInterviewSchema', () => {
  const baseValid = {
    overview: baseOverview,
    interview_date: '2026-04-16',
    interview_round: 1,
    interview_time: '오전 10:00',
    interview_method: 'ONSITE' as const,
    participants: [{ id: 'p1', name: '홍길동', position: '팀장' }],
    company_requirements: {
      company_status: '제조업',
      main_problems: '품질 저하',
      push_willingness: '지원',
      expected_outcomes: '효율 개선',
    },
    task_workflow_items: [
      {
        id: 't1',
        job: '생산',
        task_name: '검사',
        as_is: '육안',
        problems: '편차 큼',
        data_availability: '2년치',
        ai_necessity: 4,
      },
    ],
    analysis_notes: { text: '', attachment_urls: [] },
    training_targets: [
      {
        id: 'tg1',
        task_name: '검사 자동화',
        selection_reason: '고효율',
        as_is: '육안',
        to_be: 'AI',
      },
    ],
    competency_models: [baseCompetencyModel],
    ncs_usage: baseNcsUsage,
    notes: '',
  };

  it('유효한 전체 구조는 통과', () => {
    expect(roadmapInterviewSchema.safeParse(baseValid).success).toBe(true);
  });

  it('참석자 최소 1명 필요', () => {
    const invalid = { ...baseValid, participants: [] };
    expect(roadmapInterviewSchema.safeParse(invalid).success).toBe(false);
  });

  it('과업 분석표 최소 1개 필요', () => {
    const invalid = { ...baseValid, task_workflow_items: [] };
    expect(roadmapInterviewSchema.safeParse(invalid).success).toBe(false);
  });

  it('훈련대상 최소 1개 필요', () => {
    const invalid = { ...baseValid, training_targets: [] };
    expect(roadmapInterviewSchema.safeParse(invalid).success).toBe(false);
  });

  it('overview 섹션 필수 (없으면 거부)', () => {
    const { overview: _overview, ...withoutOverview } = baseValid;
    expect(roadmapInterviewSchema.safeParse(withoutOverview).success).toBe(false);
  });

  it('역량 모델 최소 1개 필요 (ISSUE-04 Ⅲ-1)', () => {
    const invalid = { ...baseValid, competency_models: [] };
    expect(roadmapInterviewSchema.safeParse(invalid).success).toBe(false);
  });

  it('ncs_usage 섹션 필수 (ISSUE-04 Ⅲ-1)', () => {
    const { ncs_usage: _ncs, ...withoutNcs } = baseValid;
    expect(roadmapInterviewSchema.safeParse(withoutNcs).success).toBe(false);
  });

  it('overview.roadmap_summary 는 없어도 통과 (LLM 자동생성 예정)', () => {
    const { overview, ...rest } = baseValid;
    const { roadmap_summary: _s, ...overviewWithoutSummary } = overview as typeof overview & {
      roadmap_summary?: string;
    };
    const input = { ...rest, overview: overviewWithoutSummary };
    expect(roadmapInterviewSchema.safeParse(input).success).toBe(true);
  });
});

describe('roadmapInterviewAutoSaveSchema', () => {
  it('부분 구조도 허용 (자동 저장용)', () => {
    expect(roadmapInterviewAutoSaveSchema.safeParse({}).success).toBe(true);
    expect(
      roadmapInterviewAutoSaveSchema.safeParse({
        interview_date: '2026-04-16',
        task_workflow_items: [],
      }).success
    ).toBe(true);
  });

  it('competency_models·ncs_usage 는 optional 이며 부분 입력 허용 (ISSUE-04)', () => {
    // 역량 모델 입력 중 일부 필드 비어 있어도 통과
    expect(
      roadmapInterviewAutoSaveSchema.safeParse({
        competency_models: [{ id: 'cm1', competency_name: '데이터 해석' }],
      }).success,
    ).toBe(true);
    // NCS 활용 토글만 저장된 상태도 허용
    expect(
      roadmapInterviewAutoSaveSchema.safeParse({
        ncs_usage: { uses_ncs: true },
      }).success,
    ).toBe(true);
  });
});

describe('createEmptyTaskWorkflowItem', () => {
  it('UUID id 및 기본값 포함', () => {
    const item = createEmptyTaskWorkflowItem();
    expect(item.id).toBeTruthy();
    expect(item.job).toBe('');
    expect(item.ai_necessity).toBe(3);
  });
});

describe('createEmptyTrainingTarget', () => {
  it('UUID id 및 빈 필드', () => {
    const item = createEmptyTrainingTarget();
    expect(item.id).toBeTruthy();
    expect(item.task_name).toBe('');
    expect(item.to_be).toBe('');
  });
});

describe('mapInterviewRowToRoadmapInterview', () => {
  it('null 입력 시 빈 Partial 반환', () => {
    const result = mapInterviewRowToRoadmapInterview(null);
    expect(result).toEqual({});
  });

  it('레거시 company_details.ai_experience를 company_requirements에 매핑', () => {
    const row = {
      interview_date: '2026-04-16',
      interview_round: 1,
      interview_time: '오전',
      participants: [{ id: 'p1', name: '김' }],
      company_details: { ai_experience: '경험 없음', systems_and_tools: ['Excel'] },
      job_tasks: [],
      pain_points: [],
      constraints: [],
      improvement_goals: [],
      notes: '',
      customer_requirements: '',
      stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.interview_date).toBe('2026-04-16');
    expect(result.participants).toEqual([{ id: 'p1', name: '김' }]);
    expect(result.company_requirements?.company_status).toContain('경험 없음');
  });

  it('레거시 job_tasks를 task_workflow_items 기본 구조로 변환', () => {
    const row = {
      interview_date: '2026-04-16',
      interview_round: 1,
      interview_time: '',
      participants: [],
      company_details: { ai_experience: '' },
      job_tasks: [{ id: 'j1', task_name: '검사', task_description: '육안' }],
      pain_points: [],
      constraints: [],
      improvement_goals: [],
      notes: '',
      customer_requirements: '',
      stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.task_workflow_items).toHaveLength(1);
    expect(result.task_workflow_items?.[0].task_name).toBe('검사');
    expect(result.task_workflow_items?.[0].as_is).toBe('육안');
  });

  it('roadmap_company_requirements(JSONB 원본) 우선 복원', () => {
    const row = {
      interview_date: '2026-04-16',
      interview_round: 1,
      interview_time: '10:00',
      participants: [],
      company_details: {
        ai_experience: 'X',
        roadmap_company_requirements: {
          company_status: '원본 현황',
          main_problems: '원본 문제',
          push_willingness: '원본 의지',
          expected_outcomes: '원본 성과',
        },
      },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
      notes: '',
      customer_requirements: '다른 값',
      stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.company_requirements).toEqual({
      company_status: '원본 현황',
      main_problems: '원본 문제',
      push_willingness: '원본 의지',
      expected_outcomes: '원본 성과',
    });
  });

  it('job_tasks의 roadmap_* 필드 복원 (직무/문제점/데이터/AI필요도)', () => {
    const row = {
      interview_date: '', interview_round: 1, interview_time: '',
      participants: [], company_details: { ai_experience: '' },
      job_tasks: [{
        id: 'j1',
        task_name: '검사',
        task_description: '육안',
        roadmap_job: '생산',
        roadmap_problems: '편차',
        roadmap_data_availability: '2년치',
        roadmap_ai_necessity: 5,
      }],
      pain_points: [], improvement_goals: [],
      notes: '', customer_requirements: '', stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.task_workflow_items?.[0]).toMatchObject({
      job: '생산',
      task_name: '검사',
      as_is: '육안',
      problems: '편차',
      data_availability: '2년치',
      ai_necessity: 5,
    });
  });

  it('roadmap_ai_necessity가 문자열이면 숫자로 clamp', () => {
    const row = {
      interview_date: '', interview_round: 1, interview_time: '',
      participants: [], company_details: null,
      job_tasks: [{ id: 'j1', task_name: '', task_description: '', roadmap_ai_necessity: '4' }],
      pain_points: [], improvement_goals: [],
      notes: '', customer_requirements: '', stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.task_workflow_items?.[0].ai_necessity).toBe(4);
  });

  it('improvement_goals의 roadmap_as_is/to_be 복원', () => {
    const row = {
      interview_date: '', interview_round: 1, interview_time: '',
      participants: [], company_details: null,
      job_tasks: [],
      pain_points: [],
      improvement_goals: [{
        id: 'g1',
        goal_description: '선정 사유',
        kpi: '과업명',
        roadmap_as_is: '육안',
        roadmap_to_be: 'AI',
      }],
      notes: '', customer_requirements: '', stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.training_targets?.[0]).toMatchObject({
      task_name: '과업명',
      selection_reason: '선정 사유',
      as_is: '육안',
      to_be: 'AI',
    });
  });

  it('roadmap_interview_method 복원 (enum 유효성 체크)', () => {
    const row = {
      interview_date: '', interview_round: 1, interview_time: '',
      participants: [],
      company_details: { ai_experience: '', roadmap_interview_method: 'VIDEO' },
      job_tasks: [], pain_points: [], improvement_goals: [],
      notes: '', customer_requirements: '', stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    expect(mapInterviewRowToRoadmapInterview(row).interview_method).toBe('VIDEO');
  });

  it('유효하지 않은 method 값은 ONSITE로 fallback', () => {
    const row = {
      participants: [],
      company_details: { ai_experience: '', roadmap_interview_method: 'INVALID' },
      job_tasks: [], pain_points: [], improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    expect(mapInterviewRowToRoadmapInterview(row).interview_method).toBe('ONSITE');
  });

  it('roadmap_analysis_notes 복원 (text + attachment_urls)', () => {
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_analysis_notes: {
          text: '그룹 인터뷰로 도출',
          attachment_urls: ['https://example.com/a.pdf'],
        },
      },
      job_tasks: [], pain_points: [], improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const r = mapInterviewRowToRoadmapInterview(row);
    expect(r.analysis_notes).toEqual({
      text: '그룹 인터뷰로 도출',
      attachment_urls: ['https://example.com/a.pdf'],
    });
  });

  it('레거시 improvement_goals를 training_targets로 변환', () => {
    const row = {
      interview_date: '2026-04-16',
      interview_round: 1,
      interview_time: '',
      participants: [],
      company_details: { ai_experience: '' },
      job_tasks: [],
      pain_points: [],
      constraints: [],
      improvement_goals: [{ id: 'g1', goal_description: '생산성 20% 향상', kpi: '생산량' }],
      notes: '',
      customer_requirements: '',
      stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.training_targets).toHaveLength(1);
    expect(result.training_targets?.[0].selection_reason).toContain('생산성 20% 향상');
  });

  it('roadmap_ai_necessity가 범위 밖 값(0)이면 3으로 clamp된다', () => {
    // clampAiNecessity: int < 1 → 3 반환 분기 커버
    const row = {
      participants: [],
      company_details: null,
      job_tasks: [{ id: 'j1', task_name: '', task_description: '', roadmap_ai_necessity: 0 }],
      pain_points: [], improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.task_workflow_items?.[0].ai_necessity).toBe(3);
  });

  it('roadmap_ai_necessity가 범위 밖 값(6)이면 3으로 clamp된다', () => {
    // clampAiNecessity: int > 5 → 3 반환 분기 커버
    const row = {
      participants: [],
      company_details: null,
      job_tasks: [{ id: 'j1', task_name: '', task_description: '', roadmap_ai_necessity: 6 }],
      pain_points: [], improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.task_workflow_items?.[0].ai_necessity).toBe(3);
  });

  it('roadmap_ai_necessity가 NaN/undefined이면 3으로 clamp된다', () => {
    // clampAiNecessity: !Number.isFinite → 3 반환 분기 (id: 12 우측 피연산자 커버)
    const row = {
      participants: [],
      company_details: null,
      job_tasks: [{ id: 'j1', task_name: '', task_description: '', roadmap_ai_necessity: undefined }],
      pain_points: [], improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.task_workflow_items?.[0].ai_necessity).toBe(3);
  });

  it('roadmap_overview가 있으면 overview를 복원한다 (Ⅰ장)', () => {
    // Line 363: savedOv truthy → overview 복원 분기 커버
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_overview: {
          establishment_necessity: 'AI 필요성',
          ai_competency_level: 'INTERMEDIATE',
          selected_tasks_summary: '품질 자동화',
          roadmap_summary: '3단계 로드맵',
        },
      },
      job_tasks: [], pain_points: [], improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.overview).toMatchObject({
      establishment_necessity: 'AI 필요성',
      ai_competency_level: 'INTERMEDIATE',
      selected_tasks_summary: '품질 자동화',
      roadmap_summary: '3단계 로드맵',
    });
  });

  it('roadmap_overview.ai_competency_level이 유효하지 않으면 BEGINNER로 fallback된다', () => {
    // Line 366: validLevels.includes(lvl) false → 'BEGINNER' 분기 커버
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_overview: {
          establishment_necessity: '',
          ai_competency_level: 'INVALID_LEVEL',
          selected_tasks_summary: '',
          roadmap_summary: '',
        },
      },
      job_tasks: [], pain_points: [], improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.overview?.ai_competency_level).toBe('BEGINNER');
  });

  it('roadmap_overview.hrd_report_attachment가 있으면 overview에 첨부 파일 정보를 복원한다', () => {
    // Line 375-384: att && typeof att.storage_path === 'string' → true 분기 커버
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_overview: {
          establishment_necessity: '',
          ai_competency_level: 'BEGINNER',
          selected_tasks_summary: '',
          roadmap_summary: '',
          hrd_report_attachment: {
            storage_path: 'attachments/report.pdf',
            file_name: 'report.pdf',
            mime_type: 'application/pdf',
            size: 102400,
            uploaded_at: '2026-01-01T00:00:00Z',
          },
        },
      },
      job_tasks: [], pain_points: [], improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.overview?.hrd_report_attachment).toMatchObject({
      storage_path: 'attachments/report.pdf',
      file_name: 'report.pdf',
    });
  });

  it('roadmap_overview.hrd_report_attachment가 storage_path/file_name이 없으면 undefined 처리', () => {
    // Line 375: att && typeof att.storage_path !== 'string' → undefined 분기 커버
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_overview: {
          establishment_necessity: '',
          ai_competency_level: 'BEGINNER',
          selected_tasks_summary: '',
          roadmap_summary: '',
          hrd_report_attachment: { mime_type: 'application/pdf' }, // storage_path 없음
        },
      },
      job_tasks: [], pain_points: [], improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.overview?.hrd_report_attachment).toBeUndefined();
  });

  it('company_details와 customer_requirements 없이 row만 있으면 company_requirements 미설정', () => {
    // Line 397: else if (row.company_details || row.customer_requirements) false → 미분기 커버
    const row = {
      participants: [],
      company_details: null,
      job_tasks: [], pain_points: [], improvement_goals: [],
      customer_requirements: '',
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.company_requirements).toBeUndefined();
  });

  it('company_details가 없고 customer_requirements만 있으면 legacy 경로로 expected_outcomes에 매핑', () => {
    // Line 397: else if customer_requirements truthy → company_requirements.expected_outcomes 매핑 커버
    const row = {
      participants: [],
      company_details: null,
      job_tasks: [], pain_points: [], improvement_goals: [],
      customer_requirements: '고객 요구사항',
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.company_requirements?.expected_outcomes).toBe('고객 요구사항');
  });

  it('stt_insights가 객체이면 partial.stt_insights에 할당된다', () => {
    // Line 432: row.stt_insights && typeof === 'object' → 할당 분기 커버
    const sttData = { topics: ['AI', '데이터'], summary: '핵심 내용' };
    const row = {
      participants: [],
      company_details: null,
      job_tasks: [], pain_points: [], improvement_goals: [],
      stt_insights: sttData,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.stt_insights).toEqual(sttData);
  });

  it('stt_insights가 null이면 partial.stt_insights가 설정되지 않는다', () => {
    // Line 432: row.stt_insights falsy → 비할당 분기 커버
    const row = {
      participants: [],
      company_details: null,
      job_tasks: [], pain_points: [], improvement_goals: [],
      stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.stt_insights).toBeUndefined();
  });

  it('analysis_notes.attachment_urls가 배열이 아닌 경우 빈 배열로 초기화', () => {
    // Line 357: !Array.isArray(savedAn.attachment_urls) → [] 분기 커버
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_analysis_notes: {
          text: '분석 노트',
          attachment_urls: null, // 배열이 아님
        },
      },
      job_tasks: [], pain_points: [], improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.analysis_notes?.attachment_urls).toEqual([]);
  });

  it('job_tasks에 id가 없으면 UUID가 자동 생성된다', () => {
    // Line 410: t.id ?? crypto.randomUUID() → 우측 피연산자(null) 분기 커버
    const row = {
      participants: [],
      company_details: null,
      job_tasks: [{ task_name: '검사', task_description: '육안' }], // id 없음
      pain_points: [], improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.task_workflow_items?.[0].id).toBeTruthy();
  });

  it('improvement_goals에 id가 없으면 UUID가 자동 생성된다', () => {
    // Line 421: g.id ?? crypto.randomUUID() → 우측 피연산자 분기 커버
    const row = {
      participants: [],
      company_details: null,
      job_tasks: [],
      pain_points: [],
      improvement_goals: [{ goal_description: '목표', kpi: '지표' }], // id 없음
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.training_targets?.[0].id).toBeTruthy();
  });

  it('roadmap_competency_models 복원 (ISSUE-04 Ⅲ-1)', () => {
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_competency_models: [
          {
            id: 'cm1',
            competency_name: '데이터 해석',
            competency_definition: '정의',
            knowledge: '지식',
            skill: '기술',
            attitude: '태도',
          },
        ],
      },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.competency_models).toHaveLength(1);
    expect(result.competency_models?.[0]).toMatchObject({
      competency_name: '데이터 해석',
      knowledge: '지식',
      skill: '기술',
      attitude: '태도',
    });
  });

  it('roadmap_competency_models 원소에 id 없으면 UUID 자동 생성', () => {
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_competency_models: [
          {
            competency_name: '역량',
            competency_definition: '정의',
            knowledge: 'K',
            skill: 'S',
            attitude: 'A',
          },
        ],
      },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.competency_models?.[0].id).toBeTruthy();
  });

  it('roadmap_ncs_usage 복원 (uses_ncs=true + ncs_usage_method)', () => {
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_ncs_usage: {
          uses_ncs: true,
          ncs_usage_method: 'NCS 20.02.01 능력단위 차용',
        },
      },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.ncs_usage).toEqual({
      uses_ncs: true,
      ncs_usage_method: 'NCS 20.02.01 능력단위 차용',
    });
  });

  it('roadmap_ncs_usage 복원 (uses_ncs=false + competency_derivation_method)', () => {
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_ncs_usage: {
          uses_ncs: false,
          competency_derivation_method: '인터뷰 + 벤치마킹으로 도출',
        },
      },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.ncs_usage).toEqual({
      uses_ncs: false,
      competency_derivation_method: '인터뷰 + 벤치마킹으로 도출',
    });
  });

  it('roadmap_competency_models 과 roadmap_ncs_usage 가 없으면 해당 필드 미설정 (legacy 호환)', () => {
    const row = {
      participants: [],
      company_details: { ai_experience: '' },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.competency_models).toBeUndefined();
    expect(result.ncs_usage).toBeUndefined();
  });
});
