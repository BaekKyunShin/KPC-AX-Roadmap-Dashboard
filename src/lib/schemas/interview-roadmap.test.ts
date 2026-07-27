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
  mapInterviewRowToRoadmapInterview,
  // PR #2 Task 2.1 — 양식 1:1 정합 신규 스키마 (camelCase)
  RoadmapOverviewSchema,
  RoadmapRequirementsSchema,
  RoadmapInterviewSchema,
  RoadmapInterviewStrictSchema,
  RoadmapInterviewAutoSaveSchema,
} from './interview-roadmap';

const baseOverview = {
  establishment_necessity: 'AI 훈련 로드맵 수립 필요성',
  ai_competency_level: 'INTERMEDIATE' as const,
  selected_tasks_summary: '품질검사 자동화',
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

    for (const key of [
      'company_status',
      'main_problems',
      'push_willingness',
      'expected_outcomes',
    ] as const) {
      const invalid = { ...valid, [key]: '' };
      const result = companyRequirementsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    }
  });
});

describe('taskWorkflowItemSchema (양식 v2: 6열 → 4열)', () => {
  const base = {
    id: 'a',
    job: '생산',
    task_name: '품질검사',
    as_is: '육안 검사',
    roadmap_improvement: '검사 이미지 2년치를 학습해 Vision AI 로 1차 선별, 개인 역량 의존 해소',
  };

  it('유효한 항목은 통과', () => {
    expect(taskWorkflowItemSchema.safeParse(base).success).toBe(true);
  });

  it('v1 필드(problems·data_availability·ai_necessity)는 더 이상 존재하지 않는다', () => {
    // roadmap_improvement 하나로 통합됐다. improvement 누락 시 거부.
    const { roadmap_improvement: _omit, ...withoutImprovement } = base;
    expect(taskWorkflowItemSchema.safeParse(withoutImprovement).success).toBe(false);
  });

  it('모든 텍스트 필드는 필수', () => {
    for (const key of ['job', 'task_name', 'as_is', 'roadmap_improvement'] as const) {
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

describe('analysisNotesSchema (ISSUE-14: URL → 파일 객체)', () => {
  it('기본값 허용 — attachment_files 는 빈 배열', () => {
    const result = analysisNotesSchema.parse({});
    expect(result).toEqual({ text: '', attachment_files: [] });
  });

  it('attachment_files 는 HrdReportAttachment 객체 배열만 허용', () => {
    // 문자열(URL) 배열은 거부
    expect(
      analysisNotesSchema.safeParse({
        text: '',
        attachment_files: ['https://example.com/a.pdf'],
      }).success
    ).toBe(false);

    // 유효한 첨부 객체는 통과
    expect(
      analysisNotesSchema.safeParse({
        text: '현장 분석',
        attachment_files: [
          {
            storage_path: 'interview-attachments/p1/공정분석.pdf',
            file_name: '공정분석.pdf',
            mime_type: 'application/pdf',
            size: 10240,
          },
        ],
      }).success
    ).toBe(true);

    // storage_path 비어 있으면 거부 (hrdReportAttachmentSchema 재사용)
    expect(
      analysisNotesSchema.safeParse({
        text: '',
        attachment_files: [{ storage_path: '', file_name: 'a.pdf' }],
      }).success
    ).toBe(false);
  });

  it('attachment_urls 필드는 더 이상 허용하지 않는다 (ISSUE-14 단순 교체)', () => {
    // 새 스키마는 attachment_files 만 인식한다. attachment_urls 만 온 경우
    // 스키마는 통과시키되 결과에 기본값(빈 배열)이 적용된다.
    const result = analysisNotesSchema.safeParse({
      text: '레거시',
      attachment_urls: ['https://example.com/a.pdf'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attachment_files).toEqual([]);
    }
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
    expect(overviewSchema.safeParse({ ...baseOverview, roadmap_summary: '' }).success).toBe(true);
    // 있어도 통과 (로드맵 생성 후 자동 채워진 값)
    expect(
      overviewSchema.safeParse({ ...baseOverview, roadmap_summary: '자동 생성 요약' }).success
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

describe('roadmapInterviewSchema', () => {
  const baseValid = {
    overview: baseOverview,
    interview_date: '2026-04-16',
    interview_round: 1,
    interview_start_time: '10:00',
    interview_end_time: '12:00',
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
        roadmap_improvement: '편차 큼 → 2년치 데이터로 Vision AI 도입 (필요도 높음)',
      },
    ],
    analysis_notes: { text: '', attachment_files: [] },
    training_targets: [
      {
        id: 'tg1',
        task_name: '검사 자동화',
        selection_reason: '고효율',
        as_is: '육안',
        to_be: 'AI',
      },
    ],
    notes: '',
  };

  it('유효한 전체 구조는 통과', () => {
    expect(roadmapInterviewSchema.safeParse(baseValid).success).toBe(true);
  });

  it('interview_start_time / interview_end_time 둘 다 필수 (ISSUE-10 단일값 → 분리)', () => {
    // start_time 누락
    const { interview_start_time: _s, ...withoutStart } = baseValid;
    expect(roadmapInterviewSchema.safeParse(withoutStart).success).toBe(false);
    // end_time 누락
    const { interview_end_time: _e, ...withoutEnd } = baseValid;
    expect(roadmapInterviewSchema.safeParse(withoutEnd).success).toBe(false);
    // start_time 빈 문자열
    expect(
      roadmapInterviewSchema.safeParse({ ...baseValid, interview_start_time: '' }).success
    ).toBe(false);
    // end_time 빈 문자열
    expect(roadmapInterviewSchema.safeParse({ ...baseValid, interview_end_time: '' }).success).toBe(
      false
    );
  });

  it('레거시 단일 interview_time 필드는 더 이상 지원하지 않는다 (ISSUE-10)', () => {
    const { interview_start_time: _s, interview_end_time: _e, ...withoutTimes } = baseValid;
    const legacy = { ...withoutTimes, interview_time: '10:00' };
    expect(roadmapInterviewSchema.safeParse(legacy).success).toBe(false);
  });

  it('analysis_notes 는 attachment_files 객체 배열을 사용한다 (ISSUE-14)', () => {
    const withFiles = {
      ...baseValid,
      analysis_notes: {
        text: '분석',
        attachment_files: [
          {
            storage_path: 'interview-attachments/p1/공정.pdf',
            file_name: '공정.pdf',
            mime_type: 'application/pdf',
            size: 1024,
          },
        ],
      },
    };
    expect(roadmapInterviewSchema.safeParse(withFiles).success).toBe(true);
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

  it('task_workflow_items 부분 입력(roadmap_improvement 통합 필드) 허용', () => {
    expect(
      roadmapInterviewAutoSaveSchema.safeParse({
        task_workflow_items: [
          { id: 't1', job: '생산', task_name: '검사', as_is: '육안', roadmap_improvement: '' },
        ],
      }).success
    ).toBe(true);
  });

  it('interview_start_time / interview_end_time 단독 저장 허용 (ISSUE-10 자동저장)', () => {
    expect(
      roadmapInterviewAutoSaveSchema.safeParse({ interview_start_time: '10:00' }).success
    ).toBe(true);
    expect(roadmapInterviewAutoSaveSchema.safeParse({ interview_end_time: '12:00' }).success).toBe(
      true
    );
  });

  it('analysis_notes.attachment_files 부분 입력 허용 (ISSUE-14 자동저장)', () => {
    expect(
      roadmapInterviewAutoSaveSchema.safeParse({
        analysis_notes: {
          text: '메모',
          attachment_files: [{ storage_path: 'a.pdf', file_name: 'a.pdf' }],
        },
      }).success
    ).toBe(true);
  });
});

describe('createEmptyTaskWorkflowItem', () => {
  it('UUID id 및 기본값 포함 (v2: roadmap_improvement 통합 필드)', () => {
    const item = createEmptyTaskWorkflowItem();
    expect(item.id).toBeTruthy();
    expect(item.job).toBe('');
    expect(item.roadmap_improvement).toBe('');
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

  it('신규 roadmap_improvement 가 있으면 그대로 복원', () => {
    const row = {
      interview_date: '',
      interview_round: 1,
      interview_time: '',
      participants: [],
      company_details: { ai_experience: '' },
      job_tasks: [
        {
          id: 'j1',
          task_name: '검사',
          task_description: '육안',
          roadmap_job: '생산',
          roadmap_improvement: '2년치 데이터로 Vision AI 1차 선별',
        },
      ],
      pain_points: [],
      improvement_goals: [],
      notes: '',
      customer_requirements: '',
      stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.task_workflow_items?.[0]).toMatchObject({
      job: '생산',
      task_name: '검사',
      as_is: '육안',
      roadmap_improvement: '2년치 데이터로 Vision AI 1차 선별',
    });
  });

  it('v1 3필드(문제점·데이터·AI필요도)는 roadmap_improvement 로 합성 승격', () => {
    const row = {
      interview_date: '',
      interview_round: 1,
      interview_time: '',
      participants: [],
      company_details: { ai_experience: '' },
      job_tasks: [
        {
          id: 'j1',
          task_name: '검사',
          task_description: '육안',
          roadmap_job: '생산',
          roadmap_problems: '편차',
          roadmap_data_availability: '2년치',
          roadmap_ai_necessity: 5,
        },
      ],
      pain_points: [],
      improvement_goals: [],
      notes: '',
      customer_requirements: '',
      stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    const improvement = result.task_workflow_items?.[0].roadmap_improvement ?? '';
    expect(improvement).toContain('문제점: 편차');
    expect(improvement).toContain('데이터 발생 시점/보유현황: 2년치');
    expect(improvement).toContain('AI 도입·활용 필요도: 5');
  });

  it('improvement_goals의 roadmap_as_is/to_be 복원', () => {
    const row = {
      interview_date: '',
      interview_round: 1,
      interview_time: '',
      participants: [],
      company_details: null,
      job_tasks: [],
      pain_points: [],
      improvement_goals: [
        {
          id: 'g1',
          goal_description: '선정 사유',
          kpi: '과업명',
          roadmap_as_is: '육안',
          roadmap_to_be: 'AI',
        },
      ],
      notes: '',
      customer_requirements: '',
      stt_insights: null,
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
      interview_date: '',
      interview_round: 1,
      interview_time: '',
      participants: [],
      company_details: { ai_experience: '', roadmap_interview_method: 'VIDEO' },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
      notes: '',
      customer_requirements: '',
      stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    expect(mapInterviewRowToRoadmapInterview(row).interview_method).toBe('VIDEO');
  });

  it('유효하지 않은 method 값은 ONSITE로 fallback', () => {
    const row = {
      participants: [],
      company_details: { ai_experience: '', roadmap_interview_method: 'INVALID' },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    expect(mapInterviewRowToRoadmapInterview(row).interview_method).toBe('ONSITE');
  });

  it('roadmap_analysis_notes 복원 (text + attachment_files, ISSUE-14)', () => {
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_analysis_notes: {
          text: '그룹 인터뷰로 도출',
          attachment_files: [
            {
              storage_path: 'interview-attachments/p1/공정.pdf',
              file_name: '공정.pdf',
              mime_type: 'application/pdf',
              size: 1024,
            },
          ],
        },
      },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const r = mapInterviewRowToRoadmapInterview(row);
    // v2: 분석내용(text) 은 양식에서 삭제되어 레거시 text 를 더 이상 승격하지 않는다.
    expect(r.analysis_notes?.text).toBe('');
    expect(r.analysis_notes?.attachment_files).toHaveLength(1);
    expect(r.analysis_notes?.attachment_files?.[0]).toMatchObject({
      storage_path: 'interview-attachments/p1/공정.pdf',
      file_name: '공정.pdf',
    });
  });

  it('레거시 attachment_urls 만 있는 row 는 attachment_files 빈 배열로 변환 (ISSUE-14 안전장치)', () => {
    // production 에서는 0건이지만 안전장치 — URL 정보는 무시한다.
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_analysis_notes: {
          text: '레거시 메모',
          attachment_urls: ['https://example.com/legacy.pdf'],
        },
      },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const r = mapInterviewRowToRoadmapInterview(row);
    // v2: 레거시 text 는 승격하지 않으므로 빈 문자열, attachment_urls 는 무시.
    expect(r.analysis_notes?.text).toBe('');
    expect(r.analysis_notes?.attachment_files).toEqual([]);
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

  it('v1 3필드가 모두 비어 있으면 roadmap_improvement 는 빈 문자열', () => {
    // promoteLegacyTaskImprovement: 빈 값은 skip → parts 없음 → ''
    const row = {
      participants: [],
      company_details: null,
      job_tasks: [{ id: 'j1', task_name: '검사', task_description: '육안' }],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.task_workflow_items?.[0].roadmap_improvement).toBe('');
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
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
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
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
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
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
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
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.overview?.hrd_report_attachment).toBeUndefined();
  });

  it('company_details와 customer_requirements 없이 row만 있으면 company_requirements 미설정', () => {
    // Line 397: else if (row.company_details || row.customer_requirements) false → 미분기 커버
    const row = {
      participants: [],
      company_details: null,
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
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
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
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
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
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
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
      stt_insights: null,
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.stt_insights).toBeUndefined();
  });

  it('analysis_notes.attachment_files가 배열이 아닌 경우 빈 배열로 초기화', () => {
    // !Array.isArray(savedAn.attachment_files) → [] 분기 커버
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_analysis_notes: {
          text: '분석 노트',
          attachment_files: null, // 배열이 아님
        },
      },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.analysis_notes?.attachment_files).toEqual([]);
  });

  it('레거시 단일 interview_time row 는 interview_start_time 으로 fallback (ISSUE-10 production 3건 대응)', () => {
    // 사전 SQL 검증: legacy_interview_time_count = 3
    const row = {
      interview_time: '14:00',
      participants: [],
      company_details: null,
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.interview_start_time).toBe('14:00');
    expect(result.interview_end_time).toBe('');
  });

  it('interview_start_time / interview_end_time 신규 컬럼이 모두 있으면 그대로 매핑한다', () => {
    const row = {
      interview_start_time: '10:00',
      interview_end_time: '12:00',
      participants: [],
      company_details: null,
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.interview_start_time).toBe('10:00');
    expect(result.interview_end_time).toBe('12:00');
  });

  // Step C-2 — JSONB 우선 매핑 (정식 저장 경로)
  it('company_details.roadmap_interview_time JSONB 가 있으면 우선 사용한다 (Step C-2)', () => {
    const row = {
      interview_time: '08:00', // legacy 단일 값이 있어도 JSONB 우선
      participants: [],
      company_details: {
        roadmap_interview_time: { start: '14:00', end: '16:00' },
      },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.interview_start_time).toBe('14:00');
    expect(result.interview_end_time).toBe('16:00');
  });

  it('roadmap_interview_time.end 누락 시 빈 문자열 fallback (Step C-2)', () => {
    const row = {
      participants: [],
      company_details: {
        roadmap_interview_time: { start: '14:00' },
      },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.interview_start_time).toBe('14:00');
    expect(result.interview_end_time).toBe('');
  });

  it('roadmap_interview_time 이 없으면 legacy interview_time 으로 fallback (Step C-2)', () => {
    // Step A 임시 직렬화 코드 호환 — production 3건 시나리오
    const row = {
      interview_time: '14:00',
      participants: [],
      company_details: {
        roadmap_company_requirements: {
          company_status: 'X',
          main_problems: '',
          push_willingness: '',
          expected_outcomes: '',
        },
      },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row);
    expect(result.interview_start_time).toBe('14:00');
    expect(result.interview_end_time).toBe('');
  });

  it('job_tasks에 id가 없으면 UUID가 자동 생성된다', () => {
    // Line 410: t.id ?? crypto.randomUUID() → 우측 피연산자(null) 분기 커버
    const row = {
      participants: [],
      company_details: null,
      job_tasks: [{ task_name: '검사', task_description: '육안' }], // id 없음
      pain_points: [],
      improvement_goals: [],
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

  it('양식 v2: 레거시 competency_models·ncs_usage 는 더 이상 복원하지 않는다', () => {
    // Ⅲ-1 역량 모델링·NCS 표가 양식에서 삭제됨. row 에 값이 남아 있어도 반환 안 함.
    const row = {
      participants: [],
      company_details: {
        ai_experience: '',
        roadmap_competency_models: [
          { id: 'cm1', competency_name: '데이터 해석', knowledge: '지식' },
        ],
        roadmap_ncs_usage: { uses_ncs: true, ncs_usage_method: 'NCS 능력단위' },
      },
      job_tasks: [],
      pain_points: [],
      improvement_goals: [],
    } as unknown as Parameters<typeof mapInterviewRowToRoadmapInterview>[0];
    const result = mapInterviewRowToRoadmapInterview(row) as Record<string, unknown>;
    expect(result.competency_models).toBeUndefined();
    expect(result.ncs_usage).toBeUndefined();
  });
});

// ============================================================================
// PR #2 Task 2.1 — 양식 1:1 정합 신규 스키마 (camelCase)
// ----------------------------------------------------------------------------
// 기준 문서: docs/references/2026-04-23-current-fields-inventory.md (양식 1, Ⅰ·Ⅱ·Ⅲ-1)
// - RoadmapOverviewSchema            — Ⅰ 개요 ([인터뷰] + [인터뷰→결과])
// - RoadmapRequirementsSchema        — Ⅱ 요구분석 ([인터뷰] + [PDF 첨부])
// - RoadmapTrainingInterviewSchema   — Ⅲ-1 역량 모델링 [인터뷰→결과]
// - RoadmapInterviewSchema           — 위 3개 merge (strict), `.partial()` 호출로 loose 생성
// ============================================================================

describe('RoadmapOverviewSchema (Ⅰ 개요)', () => {
  const validOverview = {
    establishmentNecessity: 'AI 훈련 로드맵 수립 필요성 (5줄 내외).',
    performanceActivities: [
      {
        round: 1,
        date: '2026-04-16',
        timeRange: '10:00~12:00',
        content: '훈련대상 과업 도출',
        method: 'ONSITE',
        pmName: '홍길동',
        expertName: '김내부',
      },
    ],
    aiLevel: 'INTERMEDIATE',
    selectedTask: '품질검사 자동화',
  };

  it('유효한 Ⅰ 개요 구조는 통과', () => {
    expect(RoadmapOverviewSchema.safeParse(validOverview).success).toBe(true);
  });

  it('aiLevel enum 은 BEGINNER/INTERMEDIATE/ADVANCED 만 허용', () => {
    expect(RoadmapOverviewSchema.safeParse({ ...validOverview, aiLevel: 'BEGINNER' }).success).toBe(
      true
    );
    expect(RoadmapOverviewSchema.safeParse({ ...validOverview, aiLevel: 'ADVANCED' }).success).toBe(
      true
    );
    expect(RoadmapOverviewSchema.safeParse({ ...validOverview, aiLevel: 'EXPERT' }).success).toBe(
      false
    );
    expect(RoadmapOverviewSchema.safeParse({ ...validOverview, aiLevel: '' }).success).toBe(false);
  });

  it('establishmentNecessity 와 selectedTask 는 필수 (빈 문자열 거부)', () => {
    expect(
      RoadmapOverviewSchema.safeParse({ ...validOverview, establishmentNecessity: '' }).success
    ).toBe(false);
    expect(RoadmapOverviewSchema.safeParse({ ...validOverview, selectedTask: '' }).success).toBe(
      false
    );
  });

  it('performanceActivities 는 최대 15차까지 허용 (Ⅰ-2 양식 3행 prefill, 15차 한계)', () => {
    const fifteenRounds = Array.from({ length: 15 }, (_, i) => ({
      round: i + 1,
      date: '2026-04-16',
      timeRange: '10:00~12:00',
      content: `${i + 1}차 수행`,
      method: 'ONSITE',
      pmName: 'PM',
      expertName: '전문가',
    }));
    expect(
      RoadmapOverviewSchema.safeParse({
        ...validOverview,
        performanceActivities: fifteenRounds,
      }).success
    ).toBe(true);

    const sixteenRounds = [...fifteenRounds, { ...fifteenRounds[0], round: 16 }];
    expect(
      RoadmapOverviewSchema.safeParse({
        ...validOverview,
        performanceActivities: sixteenRounds,
      }).success
    ).toBe(false);
  });

  it('performanceActivities 는 빈 배열도 허용 (자동저장 중간 상태는 loose 쪽에서 처리)', () => {
    // strict 본체에서는 빈 배열 허용 (다른 스텝만 먼저 작성하는 경우)
    expect(
      RoadmapOverviewSchema.safeParse({ ...validOverview, performanceActivities: [] }).success
    ).toBe(true);
  });
});

describe('RoadmapRequirementsSchema (Ⅱ AI 도입·활용 요구분석)', () => {
  const validRequirements = {
    hrdReportPdf: {
      fileName: 'HRD이음_진단보고서.pdf',
      url: 'interview-attachments/project-1/hrd.pdf',
      size: 204800,
    },
    companyRequirements: {
      status: '제조업, AI 미도입',
      problem: '생산성 저하 및 품질 편차',
      will: '경영진 적극 지원',
      outcomes: '생산성 15% 개선',
    },
    taskAnalysis: [
      {
        domain: '생산',
        task: '품질검사',
        asIs: '육안 검사',
        improvement: '검사 이미지 2년치를 학습해 Vision AI 로 1차 선별, 개인 역량 의존 해소',
      },
    ],
    targetTask: {
      name: '품질검사 자동화',
      reason: 'AI 필요도 5점, 데이터 충분',
      expectedAsIs: '육안 1인 × 200건/일',
      expectedToBe: 'AI 1차 스크리닝 → 인력 재배치',
    },
  };

  it('유효한 Ⅱ 요구분석 구조는 통과', () => {
    expect(RoadmapRequirementsSchema.safeParse(validRequirements).success).toBe(true);
  });

  it('companyRequirements.remarks 는 옵셔널이며 parse 후 보존된다 (#6)', () => {
    // remarks 누락 OK
    expect(RoadmapRequirementsSchema.safeParse(validRequirements).success).toBe(true);
    // remarks 4 키 채우면 parse 결과에 그대로 보존
    const result = RoadmapRequirementsSchema.safeParse({
      ...validRequirements,
      companyRequirements: {
        ...validRequirements.companyRequirements,
        remarks: {
          status: '특이사항-A',
          problem: '특이사항-B',
          will: '특이사항-C',
          outcomes: '특이사항-D',
        },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyRequirements.remarks).toEqual({
        status: '특이사항-A',
        problem: '특이사항-B',
        will: '특이사항-C',
        outcomes: '특이사항-D',
      });
    }
  });

  it('hrdReportPdf 는 null 허용 (미첨부 상태, Ⅱ-1)', () => {
    expect(
      RoadmapRequirementsSchema.safeParse({ ...validRequirements, hrdReportPdf: null }).success
    ).toBe(true);
  });

  it('hrdReportPdf 는 키 누락(undefined) 도 허용 — production 폼이 미첨부 시 키를 omit 함', () => {
    // PBL 측 동일 패턴. nullable() 만으로는 키 누락 케이스가 Required 로 거절되어
    // 보고서 생성이 거짓 토스트로 막힌다. nullish() 로 양쪽 모두 통과.
    const { hrdReportPdf: _omit, ...withoutKey } = validRequirements;
    expect(RoadmapRequirementsSchema.safeParse(withoutKey).success).toBe(true);
  });

  it('taskAnalysis[].improvement 는 필수 (v2: problem·dataTiming·aiScore 통합 필드)', () => {
    const withoutImprovement = {
      ...validRequirements,
      taskAnalysis: [{ domain: '생산', task: '품질검사', asIs: '육안 검사', improvement: '' }],
    };
    const res = RoadmapRequirementsSchema.safeParse(withoutImprovement);
    expect(res.success).toBe(false);
    if (!res.success) {
      const messages = res.error.issues.map((i) => i.message).join(' | ');
      expect(messages).toContain('개선점');
    }
  });

  it('companyRequirements 4필드(status/problem/will/outcomes)는 모두 필수', () => {
    for (const key of ['status', 'problem', 'will', 'outcomes'] as const) {
      const invalid = {
        ...validRequirements,
        companyRequirements: { ...validRequirements.companyRequirements, [key]: '' },
      };
      expect(RoadmapRequirementsSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('targetTask 4필드(name/reason/expectedAsIs/expectedToBe)는 모두 필수', () => {
    for (const key of ['name', 'reason', 'expectedAsIs', 'expectedToBe'] as const) {
      const invalid = {
        ...validRequirements,
        targetTask: { ...validRequirements.targetTask, [key]: '' },
      };
      expect(RoadmapRequirementsSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('taskAnalysisAttachment 는 optional (Ⅱ-3 추가 첨부)', () => {
    // 없어도 통과
    expect(RoadmapRequirementsSchema.safeParse(validRequirements).success).toBe(true);
    // null 도 허용
    expect(
      RoadmapRequirementsSchema.safeParse({ ...validRequirements, taskAnalysisAttachment: null })
        .success
    ).toBe(true);
    // 유효 객체도 허용
    expect(
      RoadmapRequirementsSchema.safeParse({
        ...validRequirements,
        taskAnalysisAttachment: {
          fileName: '공정도.pdf',
          url: 'interview-attachments/project-1/process.pdf',
        },
      }).success
    ).toBe(true);
  });
});

describe('RoadmapInterviewSchema (strict / loose 이중 검증)', () => {
  const fullValid = {
    // Ⅰ 개요
    establishmentNecessity: '수립 필요성 서술 (5줄 내외).',
    performanceActivities: [
      {
        round: 1,
        date: '2026-04-16',
        timeRange: '10:00~12:00',
        content: '훈련대상 과업 도출',
        method: 'ONSITE',
        pmName: 'PM',
        expertName: '내부전문가',
      },
    ],
    aiLevel: 'INTERMEDIATE',
    selectedTask: '품질검사 자동화',
    // Ⅱ 요구분석
    hrdReportPdf: {
      fileName: 'HRD.pdf',
      url: 'interview-attachments/p1/hrd.pdf',
      size: 1024,
    },
    companyRequirements: {
      status: '제조업',
      problem: '품질 편차',
      will: '적극 지원',
      outcomes: '15% 개선',
    },
    taskAnalysis: [
      {
        domain: '생산',
        task: '품질검사',
        asIs: '육안',
        improvement: '편차 → 2년치 데이터로 Vision AI (필요도 높음)',
      },
    ],
    targetTask: {
      name: '품질검사 자동화',
      reason: 'AI 필요도 5점',
      expectedAsIs: '육안',
      expectedToBe: 'AI 1차 스크리닝',
    },
  };

  it('strict: 전체 유효 구조는 통과', () => {
    expect(RoadmapInterviewSchema.safeParse(fullValid).success).toBe(true);
  });

  it('strict: 빈 객체 {} 는 실패 (최종 제출 시 필수 필드 검증)', () => {
    expect(RoadmapInterviewSchema.safeParse({}).success).toBe(false);
  });

  it('loose (`.partial()`): 빈 객체 {} 는 통과 (자동 저장용)', () => {
    const loose = RoadmapInterviewSchema.partial();
    expect(loose.safeParse({}).success).toBe(true);
  });

  it('loose: 일부 필드만 있어도 통과', () => {
    const loose = RoadmapInterviewSchema.partial();
    expect(
      loose.safeParse({
        establishmentNecessity: '일부만',
        aiLevel: 'BEGINNER',
      }).success
    ).toBe(true);
  });

  it('strict: 필수 필드 누락 시 에러 경로(path) 반환', () => {
    const { establishmentNecessity: _, ...withoutNecessity } = fullValid;
    const result = RoadmapInterviewSchema.safeParse(withoutNecessity);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('establishmentNecessity');
    }
  });

  it('RoadmapInterviewStrictSchema: v2 에서 NCS XOR 이 삭제되어 통합본과 동일하게 동작', () => {
    // 양식 v2 — Ⅲ-1 역량 모델링·NCS 삭제로 XOR refine 이 제거됐다.
    // StrictSchema 는 통합본과 동일하게 필수 필드만 검증한다.
    expect(RoadmapInterviewStrictSchema.safeParse(fullValid).success).toBe(true);
    expect(RoadmapInterviewStrictSchema.safeParse({}).success).toBe(false);
  });
});

// V2 camelCase autoSave 전용 (#011 root cause fix). RoadmapInterviewSchema.partial()
// 은 shallow 라 nested 객체/배열의 inner schema 가 그대로 strict — UI 의 prefilled
// 빈 행/슬롯 (companyRequirements 의 빈 4필드, taskAnalysis: [], competencies: [],
// targetTask 의 빈 4필드, 빈 배열 etc.) 이 검증에서 fail 하면서 자동저장이 매번 silent
// 로 success:false 반환. 새 AutoSaveSchema 는 모든 nested 도 partial + array 의
// .min(1) 제거 + 빈 배열 허용.
describe('RoadmapInterviewAutoSaveSchema (#011 fix)', () => {
  it('빈 객체 {} 통과', () => {
    expect(RoadmapInterviewAutoSaveSchema.safeParse({}).success).toBe(true);
  });

  it('일부 스칼라만 입력해도 통과', () => {
    expect(
      RoadmapInterviewAutoSaveSchema.safeParse({
        establishmentNecessity: '일부 입력',
        aiLevel: 'BEGINNER',
      }).success
    ).toBe(true);
  });

  it('UI prefilled 빈 행/슬롯 포함 state 도 통과 (silent fail 차단)', () => {
    // 사용자가 Step 1 만 입력했지만 클라이언트 state 에는 모든 키가 prefilled.
    // 빈 행/슬롯·빈 배열이 들어와도 자동저장은 통과해야 한다.
    const prefilledState = {
      establishmentNecessity: '#011 진단 — Step 1 입력만',
      performanceActivities: [],
      // aiLevel, selectedTask 미입력
      hrdReportPdf: null,
      companyRequirements: { status: '', problem: '', will: '', outcomes: '' },
      taskAnalysis: [],
      taskAnalysisAttachment: null,
      targetTask: { name: '', reason: '', expectedAsIs: '', expectedToBe: '' },
    };
    expect(RoadmapInterviewAutoSaveSchema.safeParse(prefilledState).success).toBe(true);
  });

  it('부분 입력된 nested 객체도 통과 (companyRequirements 의 일부 필드만 채움)', () => {
    expect(
      RoadmapInterviewAutoSaveSchema.safeParse({
        companyRequirements: { status: '제조업' }, // problem/will/outcomes 미입력
      }).success
    ).toBe(true);
  });

  it('빈 배열의 element 도 element schema 의 partial 적용 (taskAnalysis 의 빈 행)', () => {
    // 사용자가 빈 행을 추가했지만 아직 입력 안 한 상태도 통과해야 한다.
    expect(
      RoadmapInterviewAutoSaveSchema.safeParse({
        taskAnalysis: [{ domain: '', task: '', asIs: '', improvement: '' }],
      }).success
    ).toBe(true);
  });

  it('잘못된 type (예: aiLevel 에 잘못된 enum) 은 여전히 fail', () => {
    // type-safety 는 유지: 잘못된 enum 등은 통과시키지 않는다.
    expect(
      RoadmapInterviewAutoSaveSchema.safeParse({
        aiLevel: 'WRONG_LEVEL',
      }).success
    ).toBe(false);
  });

  it('RoadmapInterviewSchema 의 모든 top-level 키를 알고 있다', () => {
    // SSOT 보장: 통합 schema 에 새 키가 추가되면 AutoSaveSchema 도 같이 갱신.
    const fullKeys = Object.keys(RoadmapInterviewSchema.shape).sort();
    const autoSaveKeys = Object.keys(RoadmapInterviewAutoSaveSchema.shape).sort();
    expect(autoSaveKeys).toEqual(fullKeys);
  });
});
