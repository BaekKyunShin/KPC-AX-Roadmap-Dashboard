/**
 * 로드맵 HWPX payload 변환기 단위 테스트 — 산인공 양식 v2 (2026-07-13 개정)
 *
 * v2 변경점:
 *   - Ⅲ장 산출물은 훈련과정 명세서 6개뿐. 역량 모델링·NCS 박스·훈련체계도·
 *     연간 훈련계획 표가 양식에서 삭제되어 해당 payload 키도 함께 제거됨.
 *   - 명세서에 훈련시기(training_period)·훈련수준(training_level) 신규 추가.
 *     training_level 은 payload 에서 한글 라벨('초급'/'중급'/'고급')로 변환된다.
 *   - 표지 제목 "AI훈련로드맵 보고서 (기업명 – 대상 과업)" 의 대상 과업 →
 *     cover_target_task 신규 키 (인터뷰 selected_tasks_summary 재사용).
 */
import { describe, expect, it } from 'vitest';

import { ROADMAP_COURSE_SPEC_COUNT } from '@/lib/services/roadmap/roadmap-types';

import { buildRoadmapHwpxPayload, type RoadmapHwpxPayloadInputs } from './hwpx-payload-roadmap';

/**
 * buildRoadmapHwpxPayload 가 출력하는 data 키 전체 (v2 계약).
 * Python `_placeholders_roadmap` 이 소비하는 단일 진실 공급원.
 */
const V2_PAYLOAD_KEYS = [
  // 표지
  'company_name',
  'cover_target_task',
  'report_date',
  'pm_affiliation',
  'pm_name',
  'internal_expert_affiliation',
  'internal_expert_name',
  // Ⅰ-1 수립 필요성
  'establishment_necessity',
  // Ⅰ-2 주요 활동
  'performance_activities',
  // Ⅰ-3 수립 주요 결과
  'ai_competency_level',
  'selected_tasks_text',
  'roadmap_summary',
  // Ⅱ-1 HRD이음 보고서
  'hrd_report_attachment',
  // Ⅱ-2 기업 요구분석 (+ 비고 4행)
  'company_status',
  'main_problems',
  'push_willingness',
  'expected_outcomes',
  'company_status_remarks',
  'main_problems_remarks',
  'push_willingness_remarks',
  'expected_outcomes_remarks',
  // Ⅱ-3 과업·워크플로우
  'task_workflow_items',
  'analysis_notes_text',
  // Ⅱ-4 AI 적용 대상 과업
  'training_target',
  // Ⅲ 훈련실시 계획 제안
  'course_specs',
];

/** v1 양식에서 삭제되어 payload 에 더 이상 존재하면 안 되는 키 */
const REMOVED_V1_PAYLOAD_KEYS = [
  'competencies',
  'ncs_used',
  'ncs_methodology',
  'ncs_derivation_method',
  'training_structure_rows',
  'training_structure_method',
  'annual_plan_items',
  'annual_plan_usage',
  'employment_insurance_no',
  'journal_attachments',
];

// ─── 픽스처 ───────────────────────────────────────────────────────────────

/** v2 훈련과정 명세서 (DB legacy `courses` 컬럼에 저장되는 형태) */
function makeCourseSpec(overrides: Record<string, unknown> = {}) {
  return {
    training_period: '2026년 상반기',
    training_level: 'INTERMEDIATE',
    course_name: 'AI 리터러시',
    training_method: '사내 집체',
    recommended_program: '사업주훈련',
    goal: '이해도 향상',
    main_content: '기본 개념',
    target_audience: '전 임직원',
    subjects: [{ name: 'AI 개론', details: '1단원: AI 개요', hours: 4 }],
    ...overrides,
  };
}

/** 명세서 N개 (기본 = 양식이 요구하는 6개) */
function makeCourseSpecs(count: number = ROADMAP_COURSE_SPEC_COUNT) {
  return Array.from({ length: count }, (_, i) => makeCourseSpec({ course_name: `과정${i + 1}` }));
}

// 테스트용 최소 RoadmapVersion (legacy 컬럼 구조) 헬퍼.
// v2 에서 legacy 컬럼명의 실제 저장 의미:
//   roadmap_matrix → 미사용(항상 []) · pbl_course → Ⅰ장 필드 · courses → course_specs
function makeRoadmapVersion(overrides: Partial<RoadmapHwpxPayloadInputs['roadmap']> = {}) {
  return {
    id: 'roadmap-1',
    project_id: 'project-1',
    version_number: 1,
    status: 'FINAL' as const,
    consultant_profile_snapshot: {
      affiliation: '한국생산성본부',
    } as RoadmapHwpxPayloadInputs['roadmap']['consultant_profile_snapshot'],
    diagnosis_summary: '진단 요약',
    roadmap_matrix: [] as unknown as RoadmapHwpxPayloadInputs['roadmap']['roadmap_matrix'],
    pbl_course: {
      setup_necessity: 'AI 도입 필요성',
      outcome_summary: {
        ai_competency_level: 'INTERMEDIATE' as const,
        selected_tasks: '품질검사',
        main_content: '요약 본문',
      },
      hrd_report_attachment_url: 'https://hrd.example.com/report.pdf',
    } as unknown as RoadmapHwpxPayloadInputs['roadmap']['pbl_course'],
    courses: makeCourseSpecs() as unknown as RoadmapHwpxPayloadInputs['roadmap']['courses'],
    created_by: 'user-1',
    created_at: '2026-04-17T00:00:00Z',
    updated_at: '2026-04-17T00:00:00Z',
    free_tool_validated: true,
    time_limit_validated: true,
    ...overrides,
  } as RoadmapHwpxPayloadInputs['roadmap'];
}

function makeProject(overrides: Partial<RoadmapHwpxPayloadInputs['project']> = {}) {
  return {
    id: 'project-1',
    company_name: '테스트컴퍼니(주)',
    ...overrides,
  } as RoadmapHwpxPayloadInputs['project'];
}

function makeInterview(
  overrides: Partial<NonNullable<RoadmapHwpxPayloadInputs['interview']>> = {}
) {
  return {
    id: 'interview-1',
    project_id: 'project-1',
    company_details: {
      roadmap_overview: {
        establishment_necessity: '인터뷰 수집 필요성',
        ai_competency_level: 'INTERMEDIATE',
        selected_tasks_summary: '품질검사',
        roadmap_summary: '요약 본문',
      },
      roadmap_company_requirements: {
        company_status: '제조업 현황',
        main_problems: '수동 비효율',
        push_willingness: '경영진 의지',
        expected_outcomes: '불량률 30% 감소',
      },
      roadmap_analysis_notes: {
        text: '분석 노트',
        attachment_urls: [],
      },
    },
    job_tasks: [
      {
        id: '1',
        roadmap_job: '생산',
        task_name: '품질검사',
        task_description: '수동',
        roadmap_improvement: '오탐 → AI 이미지 분류 (센서 데이터 보유)',
      },
    ],
    improvement_goals: [
      {
        id: '1',
        task_name: '품질검사',
        selection_reason: '불량률 높음',
        as_is: '수동 검사',
        to_be: 'AI 자동 검사',
      },
    ],
    interview_date: '2026-04-01',
    interview_round: 1,
    interview_time: '10:00~12:00',
    interview_method: 'ONSITE',
    participants: [
      { id: '1', name: '홍길동', position: '컨설팅책임자(PM)' },
      { id: '2', name: '김영희', position: '기업 내부전문가' },
    ],
    ...overrides,
  } as unknown as NonNullable<RoadmapHwpxPayloadInputs['interview']>;
}

/** 기본 픽스처 3종으로 payload 생성 */
function buildDefault() {
  return buildRoadmapHwpxPayload({
    roadmap: makeRoadmapVersion(),
    project: makeProject(),
    interview: makeInterview(),
  });
}

describe('buildRoadmapHwpxPayload — 공통·표지', () => {
  it('track=ROADMAP 설정 + 파일명에 기업명·버전 포함', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject({ company_name: '테스트(주)' }),
      interview: makeInterview(),
    });
    expect(p.track).toBe('ROADMAP');
    expect(p.fileName).toContain('테스트(주)');
    expect(p.fileName).toContain('v1');
    expect(p.fileName.endsWith('.hwpx')).toBe(true);
  });

  it('표지 필드: company_name, pm_name/affiliation, internal_expert_*', () => {
    const p = buildDefault();
    expect(p.data.company_name).toBe('테스트컴퍼니(주)');
    expect(p.data.pm_name).toBe('홍길동');
    expect(p.data.pm_affiliation).toBe('한국생산성본부');
    expect(p.data.internal_expert_name).toBe('김영희');
    expect(p.data.internal_expert_affiliation).toBe('테스트컴퍼니(주)');
  });

  // v2 신규 — 표지 제목 "AI훈련로드맵 보고서 (기업명 – 대상 과업)"
  it('cover_target_task 는 인터뷰 selected_tasks_summary 를 재사용한다 (v2 신규)', () => {
    const p = buildDefault();
    expect(p.data.cover_target_task).toBe('품질검사');
  });

  it('cover_target_task — 인터뷰 overview 가 없으면 LLM outcome_summary.selected_tasks 로 fallback (v2 신규)', () => {
    const iv = makeInterview({
      company_details: {},
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    // pbl_course.outcome_summary.selected_tasks = '품질검사'
    expect(p.data.cover_target_task).toBe('품질검사');
  });
});

describe('buildRoadmapHwpxPayload — Ⅰ·Ⅱ장 (인터뷰 입력)', () => {
  it('Ⅰ-1 수립 필요성은 인터뷰 입력값을 그대로 사용 (LLM setup_necessity 가 있어도 무시)', () => {
    const roadmap = makeRoadmapVersion({
      pbl_course: {
        setup_necessity: 'LLM 이 창작한 필요성',
        outcome_summary: {
          ai_competency_level: 'INTERMEDIATE' as const,
          selected_tasks: '품질검사',
          main_content: '요약 본문',
        },
      } as unknown as RoadmapHwpxPayloadInputs['roadmap']['pbl_course'],
    });
    const p = buildRoadmapHwpxPayload({
      roadmap,
      project: makeProject(),
      interview: makeInterview(),
    });
    // 인터뷰 Step 1 StepOverview 에서 수집한 원본 값만 사용
    expect(p.data.establishment_necessity).toBe('인터뷰 수집 필요성');
  });

  it('Ⅰ-3 인터뷰 입력 매핑: ai_competency_level·selected_tasks_text', () => {
    const p = buildDefault();
    // 인터뷰 Step 1 에서 수집한 원본 값 그대로 사용 (enum 원문 유지)
    expect(p.data.ai_competency_level).toBe('INTERMEDIATE');
    expect(p.data.selected_tasks_text).toBe('품질검사');
    // roadmap_summary 는 LLM 자동 생성 영역 (인터뷰 필드 아님)
    expect(p.data.roadmap_summary).toBe('요약 본문');
  });

  it('Ⅱ-2 기업 요구분석 4필드 매핑', () => {
    const p = buildDefault();
    expect(p.data.company_status).toBe('제조업 현황');
    expect(p.data.main_problems).toBe('수동 비효율');
    expect(p.data.push_willingness).toBe('경영진 의지');
    expect(p.data.expected_outcomes).toBe('불량률 30% 감소');
  });

  it('Ⅱ-2 비고 4행 매핑 (remarks)', () => {
    const iv = makeInterview({
      company_details: {
        roadmap_company_requirements: {
          company_status: '현황',
          main_problems: '문제',
          push_willingness: '의지',
          expected_outcomes: '성과',
          remarks: {
            status: '현황 비고',
            problem: '문제 비고',
            will: '의지 비고',
            outcomes: '성과 비고',
          },
        },
      },
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    expect(p.data.company_status_remarks).toBe('현황 비고');
    expect(p.data.main_problems_remarks).toBe('문제 비고');
    expect(p.data.push_willingness_remarks).toBe('의지 비고');
    expect(p.data.expected_outcomes_remarks).toBe('성과 비고');
  });

  it('비고 미입력 시 4행 모두 빈 문자열', () => {
    const p = buildDefault();
    expect(p.data.company_status_remarks).toBe('');
    expect(p.data.main_problems_remarks).toBe('');
    expect(p.data.push_willingness_remarks).toBe('');
    expect(p.data.expected_outcomes_remarks).toBe('');
  });

  it('Ⅱ-3 task_workflow_items 변환 — v2 4열 (직무·과업·현행·개선점)', () => {
    const p = buildDefault();
    expect(p.data.task_workflow_items).toHaveLength(1);
    const item = (p.data.task_workflow_items as unknown[])[0] as Record<string, unknown>;
    expect(item.job).toBe('생산');
    expect(item.task).toBe('품질검사');
    expect(item.as_is).toBe('수동');
    expect(item.improvement).toBe('오탐 → AI 이미지 분류 (센서 데이터 보유)');
  });

  it('Ⅱ-3 analysis_notes_text', () => {
    const p = buildDefault();
    expect(p.data.analysis_notes_text).toBe('분석 노트');
  });

  it('Ⅱ-4 training_target은 첫 항목만', () => {
    const p = buildDefault();
    expect((p.data.training_target as Record<string, string>).task_name).toBe('품질검사');
    expect((p.data.training_target as Record<string, string>).selection_reason).toBe('불량률 높음');
  });

  it('HRD이음 보고서 URL → hrd_report_attachment', () => {
    const p = buildDefault();
    expect(p.data.hrd_report_attachment).toBe('https://hrd.example.com/report.pdf');
  });

  it('HRD 보고서: 인터뷰 첨부(file_name) 가 있으면 legacy URL 보다 우선', () => {
    const iv = makeInterview({
      company_details: {
        roadmap_overview: {
          establishment_necessity: '필요성',
          ai_competency_level: 'INTERMEDIATE',
          hrd_report_attachment: { storage_path: 'reports/x', file_name: 'interview-hrd.pdf' },
        },
      },
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    expect(p.data.hrd_report_attachment).toBe('interview-hrd.pdf');
  });
});

describe('buildRoadmapHwpxPayload — Ⅲ 훈련과정 명세서 (v2)', () => {
  it(`course_specs 6개가 모두 변환된다 (v2: ROADMAP_COURSE_SPEC_COUNT=${ROADMAP_COURSE_SPEC_COUNT})`, () => {
    const p = buildDefault();
    expect(p.data.course_specs).toHaveLength(ROADMAP_COURSE_SPEC_COUNT);
  });

  it('명세서 키 구조 — training_period·training_level 신규 + goal→training_goal, target_audience→training_target', () => {
    const p = buildDefault();
    const spec = (p.data.course_specs as unknown[])[0] as Record<string, unknown>;

    expect(spec.training_period).toBe('2026년 상반기'); // v2 신규: 그대로 실림
    expect(spec.training_level).toBe('중급'); // v2 신규: 한글 라벨로 변환
    expect(spec.course_name).toBe('과정1');
    expect(spec.training_method).toBe('사내 집체'); // v1 `format` 의 후신
    expect(spec.recommended_program).toBe('사업주훈련');
    expect(spec.training_goal).toBe('이해도 향상'); // goal → training_goal
    expect(spec.main_content).toBe('기본 개념');
    expect(spec.training_target).toBe('전 임직원'); // target_audience → training_target
  });

  it.each([
    ['BEGINNER', '초급'],
    ['INTERMEDIATE', '중급'],
    ['ADVANCED', '고급'],
  ])('training_level=%s → 한글 라벨 "%s" 로 변환 (v2 신규)', (level, label) => {
    const roadmap = makeRoadmapVersion({
      courses: makeCourseSpecs().map((s) => ({
        ...s,
        training_level: level,
      })) as unknown as RoadmapHwpxPayloadInputs['roadmap']['courses'],
    });
    const p = buildRoadmapHwpxPayload({
      roadmap,
      project: makeProject(),
      interview: makeInterview(),
    });
    const specs = p.data.course_specs as Array<Record<string, unknown>>;
    expect(specs.every((s) => s.training_level === label)).toBe(true);
  });

  it('Ⅰ-3 ai_competency_level 은 enum 원문, 명세서 training_level 만 한글 라벨 (혼동 방지)', () => {
    const p = buildDefault();
    const spec = (p.data.course_specs as unknown[])[0] as Record<string, unknown>;
    expect(p.data.ai_competency_level).toBe('INTERMEDIATE');
    expect(spec.training_level).toBe('중급');
  });

  it('subjects 변환 — name→subject_name, details 는 단원 경계 줄바꿈, hours 는 문자열', () => {
    const roadmap = makeRoadmapVersion({
      courses: makeCourseSpecs().map((s) => ({
        ...s,
        subjects: [{ name: 'AI 개론', details: '1단원: AI 개요, 2단원: 프롬프트 작성', hours: 8 }],
      })) as unknown as RoadmapHwpxPayloadInputs['roadmap']['courses'],
    });
    const p = buildRoadmapHwpxPayload({
      roadmap,
      project: makeProject(),
      interview: makeInterview(),
    });
    const spec = (p.data.course_specs as unknown[])[0] as Record<string, unknown>;
    const subject = (spec.subjects as unknown[])[0] as Record<string, unknown>;
    expect(subject.subject_name).toBe('AI 개론');
    expect(subject.details).toBe('1단원: AI 개요\n2단원: 프롬프트 작성');
    expect(subject.hours).toBe('8');
  });

  it('v1 legacy 명세서(format 만 존재)도 storage mapper 승격을 거쳐 안전 변환된다 (운영 DB v1 FINAL 확정본 호환)', () => {
    const roadmap = makeRoadmapVersion({
      courses: [
        {
          // v1 구조 — training_period·training_level·training_method 없음
          course_name: 'v1 과정',
          format: '집체',
          recommended_program: '사업주훈련',
          goal: '목표',
          main_content: '내용',
          target_audience: '대상',
          subjects: [{ name: '과목', details: '세부', hours: 2 }],
        },
      ] as unknown as RoadmapHwpxPayloadInputs['roadmap']['courses'],
    });
    const p = buildRoadmapHwpxPayload({
      roadmap,
      project: makeProject(),
      interview: makeInterview(),
    });
    const spec = (p.data.course_specs as unknown[])[0] as Record<string, unknown>;
    expect(spec.course_name).toBe('v1 과정');
    expect(spec.training_method).toBe('집체'); // v1 format → v2 training_method 승격
    expect(spec.training_period).toBe(''); // 신규 필드는 빈 문자열 backfill
    expect(spec.training_level).toBe('초급'); // 기본값 BEGINNER → 한글 라벨
  });

  it('courses 가 비어 있으면 course_specs 는 빈 배열', () => {
    const roadmap = makeRoadmapVersion({
      courses: [] as unknown as RoadmapHwpxPayloadInputs['roadmap']['courses'],
    });
    const p = buildRoadmapHwpxPayload({
      roadmap,
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.course_specs).toEqual([]);
  });
});

describe('buildRoadmapHwpxPayload — performance_activities', () => {
  it('interview 1차 이상 자동집계', () => {
    const p = buildDefault();
    const acts = p.data.performance_activities as unknown[];
    expect(acts.length).toBeGreaterThanOrEqual(1);
    const first = acts[0] as Record<string, unknown>;
    expect(first.round).toBe(1);
    expect((first.participants as unknown[]).length).toBe(2);
  });

  // ISSUE-10 Step C-2: 시간 포맷 정식화
  it('date 는 company_details.roadmap_interview_time JSONB 의 시작~종료 포맷을 따른다 (Step C-2)', () => {
    const iv = makeInterview({
      interview_date: '2026-04-22',
      interview_time: undefined, // 단일 legacy 컬럼이 없어도
      company_details: {
        roadmap_overview: {
          establishment_necessity: '인터뷰 수집 필요성',
          ai_competency_level: 'INTERMEDIATE',
        },
        roadmap_company_requirements: {
          company_status: '제조업 현황',
          main_problems: '수동 비효율',
          push_willingness: '경영진 의지',
          expected_outcomes: '불량률 30% 감소',
        },
        roadmap_analysis_notes: { text: '분석 노트', attachment_urls: [] },
        roadmap_interview_time: { start: '14:00', end: '16:00' },
      },
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const first = (p.data.performance_activities as unknown[])[0] as Record<string, unknown>;
    expect(first.date).toBe('26.04.22\n14:00~16:00');
  });

  it('date 는 JSONB 가 없으면 legacy interview_time 으로 fallback (Step C-2)', () => {
    const p = buildDefault(); // interview_time: '10:00~12:00'
    const first = (p.data.performance_activities as unknown[])[0] as Record<string, unknown>;
    expect(first.date).toBe('26.04.01\n10:00~12:00');
  });

  it('interview_method enum "VIDEO" 이면 method = "비대면(화상회의)"', () => {
    const iv = makeInterview({
      interview_method: 'VIDEO',
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const first = (p.data.performance_activities as unknown[])[0] as Record<string, unknown>;
    expect(first.method).toBe('비대면\n(화상회의)');
  });

  it('interview_method 가 enum 외 문자열이면 그대로 사용 (legacy fallback)', () => {
    const iv = makeInterview({
      interview_method: '하이브리드',
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const first = (p.data.performance_activities as unknown[])[0] as Record<string, unknown>;
    expect(first.method).toBe('하이브리드');
  });

  it('interview_round / interview_date 가 nullish → fallback', () => {
    const iv = makeInterview({
      interview_round: undefined,
      interview_date: undefined,
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const acts = p.data.performance_activities as Array<{ round: number; date: string }>;
    expect(acts[0].round).toBe(1); // fallback
  });

  it('V2 company_details.roadmap_overview.performance_activities[] 에서 차수별 자동 집계 (#22)', () => {
    const iv = makeInterview({
      // V1 단일 컬럼은 모두 비움 — V2 데이터는 JSONB 배열로만 저장
      interview_date: undefined,
      interview_time: undefined,
      interview_method: undefined,
      participants: undefined,
      company_details: {
        roadmap_overview: {
          establishment_necessity: '필요성',
          ai_competency_level: 'INTERMEDIATE',
          performance_activities: [
            {
              round: 1,
              date: '2026-04-29',
              time_range: '10:00~12:00',
              content: 'V2 인터뷰 1차',
              method: 'ONSITE',
              pm_name: 'V2 PM',
              expert_name: 'V2 내부전문가',
            },
            {
              round: 2,
              date: '2026-05-06',
              time_range: '14:00~16:00',
              content: 'V2 워크숍',
              method: 'WORKSHOP',
              pm_name: 'V2 PM',
              expert_name: 'V2 내부전문가',
            },
          ],
        },
      },
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const acts = p.data.performance_activities as Array<Record<string, unknown>>;
    expect(acts.length).toBe(2);
    expect(acts[0].round).toBe(1);
    expect(acts[0].date).toContain('26.04.29');
    expect(acts[0].content).toBe('V2 인터뷰 1차');
    expect(acts[0].method).toBe('대면');
    expect(acts[1].round).toBe(2);
    expect(acts[1].method).toBe('워크숍');
  });

  it('V2 perfActs 가 빈 배열이면 V1 단일 컬럼 fallback 으로 1차 행 자동 집계 (#22 분기 커버)', () => {
    const iv = makeInterview({
      // V2 perfActs 키는 있지만 빈 배열 — V1 fallback 분기 트리거
      company_details: {
        roadmap_overview: {
          establishment_necessity: '필요성',
          ai_competency_level: 'INTERMEDIATE',
          performance_activities: [],
        },
        roadmap_company_requirements: {
          company_status: '현황',
          main_problems: '문제',
          push_willingness: '의지',
          expected_outcomes: '성과',
        },
        roadmap_analysis_notes: { text: '분석', attachment_urls: [] },
      },
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const acts = p.data.performance_activities as Array<Record<string, unknown>>;
    // V1 fallback — 단일 컬럼 기반 1차 행 1건
    expect(acts.length).toBe(1);
    expect(acts[0].round).toBe(1);
  });
});

describe('buildRoadmapHwpxPayload — V2 인터뷰 DB 키 매핑', () => {
  // R3 #20·#21·#22 — mapRoadmapInterviewToDb 가 V2 인터뷰 → DB 행으로 저장하는
  // v2 신규 키 roadmap_improvement 우선.
  it('Ⅱ-3 task_workflow_items 가 v2 roadmap_improvement 에서 채워진다', () => {
    const iv = makeInterview({
      job_tasks: [
        {
          id: '1',
          roadmap_job: 'V2 직무',
          task_name: 'V2 과업',
          task_description: 'V2 As-Is',
          roadmap_improvement: 'V2 개선점',
        },
      ],
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const item = (p.data.task_workflow_items as unknown[])[0] as Record<string, unknown>;
    expect(item.job).toBe('V2 직무');
    expect(item.task).toBe('V2 과업');
    expect(item.as_is).toBe('V2 As-Is');
    expect(item.improvement).toBe('V2 개선점');
  });

  // 운영 DB v1 데이터: 3필드(problems·data_availability·ai_necessity) → improvement 승격.
  it('Ⅱ-3 task_workflow_items 가 v1 legacy 3필드를 improvement 로 승격한다', () => {
    const iv = makeInterview({
      job_tasks: [
        {
          id: '1',
          roadmap_job: 'V1 직무',
          task_name: 'V1 과업',
          task_description: 'V1 As-Is',
          roadmap_problems: 'V1 문제',
          roadmap_data_availability: 'V1 데이터',
          roadmap_ai_necessity: 4,
        },
      ],
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const item = (p.data.task_workflow_items as unknown[])[0] as Record<string, unknown>;
    expect(item.improvement).toBe(
      '문제점: V1 문제\n데이터 발생 시점/보유현황: V1 데이터\nAI 도입·활용 필요도: 4'
    );
  });

  it('Ⅱ-4 training_target 이 V2 DB 키 (kpi·goal_description·roadmap_as_is·roadmap_to_be) 에서 채워진다 (#21·#22)', () => {
    const iv = makeInterview({
      improvement_goals: [
        {
          id: '1',
          kpi: 'V2 훈련대상',
          goal_description: 'V2 선정사유',
          roadmap_as_is: 'V2 As-Is',
          roadmap_to_be: 'V2 To-Be',
        },
      ],
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const tt = p.data.training_target as Record<string, string>;
    expect(tt.task_name).toBe('V2 훈련대상');
    expect(tt.selection_reason).toBe('V2 선정사유');
    expect(tt.as_is).toBe('V2 As-Is');
    expect(tt.to_be).toBe('V2 To-Be');
  });

  it('Ⅱ-4 V1 키 (task_name·selection_reason·as_is·to_be) 만 있는 legacy 데이터도 정상 매핑 (#21 V1 fallback)', () => {
    const iv = makeInterview({
      improvement_goals: [
        {
          id: '1',
          // V1 only — V2 키 없음
          task_name: 'V1 훈련대상',
          selection_reason: 'V1 사유',
          as_is: 'V1 As-Is',
          to_be: 'V1 To-Be',
        },
      ],
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const tt = p.data.training_target as Record<string, string>;
    expect(tt.task_name).toBe('V1 훈련대상');
    expect(tt.selection_reason).toBe('V1 사유');
  });
});

describe('buildRoadmapHwpxPayload — 누락·fallback 분기', () => {
  it('interview가 null이면 모든 인터뷰 기반 필드는 빈 문자열/빈 배열', () => {
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: null,
    });
    expect(p.data.company_status).toBe('');
    expect(p.data.main_problems).toBe('');
    expect(p.data.task_workflow_items).toEqual([]);
    expect(p.data.performance_activities).toEqual([]);
  });

  it('interview 가 null 이면 ai_competency_level 은 LLM outcome_summary 값 사용', () => {
    const roadmap = makeRoadmapVersion({
      pbl_course: {
        setup_necessity: '필요성',
        outcome_summary: {
          ai_competency_level: 'ADVANCED' as const,
          selected_tasks: '',
          main_content: '',
        },
      } as unknown as RoadmapHwpxPayloadInputs['roadmap']['pbl_course'],
    });
    const p = buildRoadmapHwpxPayload({
      roadmap,
      project: makeProject(),
      interview: null,
    });
    expect(p.data.ai_competency_level).toBe('ADVANCED');
  });

  it('overview.ai_competency_level 빈 문자열 → result.outcome_summary 사용', () => {
    const iv = makeInterview();
    (
      iv as unknown as { company_details: { roadmap_overview: Record<string, string> } }
    ).company_details.roadmap_overview.ai_competency_level = '';
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    expect(p.data.ai_competency_level).toBe('INTERMEDIATE');
  });

  it('interview.overview 가 undefined 면 selected_tasks/roadmap_summary/establishment_necessity 빈 문자열', () => {
    const iv = makeInterview({
      company_details: {},
    } as unknown as Parameters<typeof makeInterview>[0]);
    const roadmap = makeRoadmapVersion({
      pbl_course: {
        setup_necessity: '',
        outcome_summary: {
          ai_competency_level: 'BEGINNER' as const,
          // selected_tasks, main_content 누락 + overview 도 비어있음
        },
      } as unknown as RoadmapHwpxPayloadInputs['roadmap']['pbl_course'],
    });
    const p = buildRoadmapHwpxPayload({
      roadmap,
      project: makeProject(),
      interview: iv,
    });
    expect(p.data.selected_tasks_text).toBe('');
    expect(p.data.roadmap_summary).toBe('');
    expect(p.data.establishment_necessity).toBe('');
  });

  it('outcome_summary.main_content 빈 문자열 → overview.roadmap_summary fallback (`||`)', () => {
    const iv = makeInterview();
    (
      iv as unknown as { company_details: { roadmap_overview: Record<string, string> } }
    ).company_details.roadmap_overview.roadmap_summary = '인터뷰 측 요약';
    const roadmap = makeRoadmapVersion({
      pbl_course: {
        setup_necessity: '',
        outcome_summary: {
          ai_competency_level: 'BEGINNER' as const,
          selected_tasks: '',
          main_content: '', // 빈 문자열 → || fallback
        },
        hrd_report_attachment_url: '',
      } as unknown as RoadmapHwpxPayloadInputs['roadmap']['pbl_course'],
    });
    const p = buildRoadmapHwpxPayload({
      roadmap,
      project: makeProject(),
      interview: iv,
    });
    expect(p.data.roadmap_summary).toBe('인터뷰 측 요약');
  });

  it('HRD 보고서 URL이 pbl_course.hrd_report_attachment_url 에만 있으면 legacy fallback 사용', () => {
    const iv = makeInterview({
      company_details: {
        roadmap_overview: {
          establishment_necessity: '필요성',
          ai_competency_level: 'BEGINNER',
        },
      },
    } as unknown as Parameters<typeof makeInterview>[0]);
    const roadmap = makeRoadmapVersion({
      pbl_course: {
        setup_necessity: '',
        outcome_summary: {
          ai_competency_level: 'BEGINNER' as const,
          selected_tasks: '',
          main_content: '',
        },
        hrd_report_attachment_url: 'https://legacy.example.com/hrd.pdf',
      } as unknown as RoadmapHwpxPayloadInputs['roadmap']['pbl_course'],
    });
    const p = buildRoadmapHwpxPayload({
      roadmap,
      project: makeProject(),
      interview: iv,
    });
    expect(p.data.hrd_report_attachment).toBe('https://legacy.example.com/hrd.pdf');
  });

  it('training_target 미존재 시 빈 객체', () => {
    const iv = makeInterview({ improvement_goals: [] } as unknown as Parameters<
      typeof makeInterview
    >[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const tt = p.data.training_target as Record<string, string>;
    expect(tt.task_name || '').toBe('');
  });

  it('jobTask 모든 필드 undefined → 모두 빈 문자열 fallback', () => {
    const iv = makeInterview({
      job_tasks: [{ id: '1' }],
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const items = p.data.task_workflow_items as Array<Record<string, string | number>>;
    expect(items[0].job).toBe('');
    expect(items[0].task).toBe('');
    expect(items[0].as_is).toBe('');
    expect(items[0].improvement).toBe('');
  });

  it('improvement_goals 첫 항목의 모든 필드 undefined → 빈 문자열 fallback', () => {
    const iv = makeInterview({
      improvement_goals: [{ id: '1' }],
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    const tt = p.data.training_target as Record<string, string>;
    expect(tt.task_name).toBe('');
    expect(tt.selection_reason).toBe('');
    expect(tt.as_is).toBe('');
    expect(tt.to_be).toBe('');
  });

  it('participants 에 PM/내부전문가 직위가 없으면 pm_name/internal_expert_name 은 빈 문자열', () => {
    const iv = makeInterview({
      participants: [{ id: '3', name: '이사람', position: '일반직원' }],
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    expect(p.data.pm_name).toBe('');
    expect(p.data.internal_expert_name).toBe('');
  });

  it('participants 의 name/position 빈 문자열 → || fallback', () => {
    const iv = makeInterview({
      participants: [{ id: '1', name: '', position: 'PM' }],
    } as unknown as Parameters<typeof makeInterview>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap: makeRoadmapVersion(),
      project: makeProject(),
      interview: iv,
    });
    expect(p.data.pm_name).toBe('');
  });

  it('consultant_profile_snapshot 누락 → pm_affiliation 빈 문자열', () => {
    const roadmap = makeRoadmapVersion({
      consultant_profile_snapshot: null,
    } as unknown as Parameters<typeof makeRoadmapVersion>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap,
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.pm_affiliation).toBe('');
  });

  it('finalized_at 가 있으면 report_date 는 finalized_at 기준', () => {
    const roadmap = makeRoadmapVersion({
      finalized_at: '2026-04-20T00:00:00Z',
    } as unknown as Parameters<typeof makeRoadmapVersion>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap,
      project: makeProject(),
      interview: makeInterview(),
    });
    // 로케일·타임존 비의존 결정론 포맷 `YYYY. MM. DD.` (UTC 기준)
    expect(p.data.report_date).toBe('2026. 04. 20.');
  });

  it('finalized_at + updated_at 둘 다 falsy → report_date 빈 문자열', () => {
    const roadmap = makeRoadmapVersion({
      finalized_at: undefined,
      updated_at: '',
    } as unknown as Parameters<typeof makeRoadmapVersion>[0]);
    const p = buildRoadmapHwpxPayload({
      roadmap,
      project: makeProject(),
      interview: makeInterview(),
    });
    expect(p.data.report_date).toBe('');
  });
});

// ---------------------------------------------------------------------------
// payload 키 계약 (v2)
// ---------------------------------------------------------------------------
// v1 양식의 Ⅲ-1 역량 모델링·NCS 박스·Ⅲ-2 훈련체계도·Ⅲ-3 연간 훈련계획 표가
// 삭제되면서 관련 payload 키도 함께 제거됐다. TS payload 가 실수로 옛 키를
// 되살리거나 v2 키를 누락하지 않도록 출력 키 집합 자체를 고정한다.
// ---------------------------------------------------------------------------
describe('buildRoadmapHwpxPayload — payload 키 계약 (v2)', () => {
  it('v2 키가 하나도 누락되지 않는다', () => {
    const p = buildDefault();
    const dataKeys = new Set(Object.keys(p.data));
    const missing = V2_PAYLOAD_KEYS.filter((k) => !dataKeys.has(k));
    expect(missing).toEqual([]);
  });

  it.each(REMOVED_V1_PAYLOAD_KEYS)('삭제된 v1 키 "%s" 는 payload 에 존재하지 않는다', (key) => {
    const p = buildDefault();
    expect(p.data).not.toHaveProperty(key);
  });

  it('출력 키 집합이 v2 계약과 정확히 일치한다 (누락·잔존 동시 검증)', () => {
    const p = buildDefault();
    expect(Object.keys(p.data).sort()).toEqual([...V2_PAYLOAD_KEYS].sort());
  });
});
