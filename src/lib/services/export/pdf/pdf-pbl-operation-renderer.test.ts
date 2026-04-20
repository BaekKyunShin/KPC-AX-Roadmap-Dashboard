/**
 * pdf-pbl-operation-renderer.ts 테스트
 * PBL Ⅳ장 운영계획 전체 렌더러 + 각 헬퍼 함수 분기 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawPBLOperationSection } from './pdf-pbl-operation-renderer';
import { getAutoTableStyles } from './pdf-helpers';
import type { DocContext } from './pdf-helpers';
import type {
  PBLOperationPlan,
  PBLCourseEvaluation,
  PBLResultEvaluation,
} from '../../pbl/pbl-types';

function createMockDoc() {
  return {
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    getTextWidth: vi.fn(() => 20),
    lastAutoTable: { finalY: 100 },
  };
}

/** 테스트용 완전한 PBLCourseEvaluation */
function baseCourseEvaluation(): PBLCourseEvaluation {
  return {
    course_name: 'AI 활용 과정',
    evaluation_methods: ['포트폴리오'],
    evaluation_target: '전체 훈련생',
    evaluation_date: '2024-03-15',
    evaluation_criteria: '8개 이상 Pass',
    evaluation_result: 'Pass',
    performance_checklist: [
      { unit_name: '단원1', evaluation_criteria: '기준A', performance_level: 4 },
    ],
    overall_comment: '전반적으로 우수',
    evaluation_scale: '1:최하~5:최상',
  };
}

/** 테스트용 PBLResultEvaluation */
function baseResultEvaluation(): PBLResultEvaluation {
  return {
    satisfaction_survey: [4, 5, 4, 3, 5],
    achievement_survey: [4, 4, 5],
    external_expert_survey: [5, 4, 5, 4, 5],
    practical_application_survey: [4, 4, 3, 4],
  };
}

/** 테스트용 최소 PBLOperationPlan */
function baseOperationPlan(): PBLOperationPlan {
  return {
    training_goal: 'AI 도구를 통한 업무 생산성 향상',
    ai_tool_usage_plan: [
      {
        stage: '1단계',
        main_activity: '데이터 수집',
        ai_tools: ['ChatGPT', 'Copilot'],
        utilized_data: '현업 데이터',
        purpose: '데이터 전처리 자동화',
        specific_method: 'Prompt 엔지니어링 적용',
      },
    ],
    training_plan: {
      overview: {
        course_name: 'AI 실무 과정',
        training_period: { start: '2024-02-01', end: '2024-02-28' },
      },
      learning_group: {
        instructors: [
          {
            type: '외부',
            role: '팀장',
            affiliation: '한국AI',
            position: '수석',
            name: '홍길동',
          },
        ],
        trainees: [
          { role: '팀원', affiliation: '제조팀', position: '대리', name: '김철수' },
        ],
      },
      subject_profile: {
        course_name: 'AI 실무',
        total_hours: 40,
        training_goals: ['목표1', '목표2'],
        ai_tools: ['ChatGPT'],
        utilized_data: '현업 데이터',
        analysis_method: 'LLM',
        training_contents: [
          {
            unit_name: '단원1',
            detail: '세부내용',
            training_hours: 20,
            instructor_hours: { external: 10, internal: 10 },
          },
        ],
        total_sum_hours: 20,
      },
      facilities: [
        { seq: 1, category: '시설', name: '강의실', spec: '40석', location: '2층' },
      ],
      training_instructors: [
        {
          name: '홍길동',
          internal_external: '외부',
          career_years: 10,
          work_name: 'AI 강의',
          detailed_training_content: ['Python 기초', '머신러닝 응용'],
        },
      ],
    },
    evaluation_plan: {
      course_evaluation: baseCourseEvaluation(),
      result_evaluation: baseResultEvaluation(),
    },
  };
}

describe('drawPBLOperationSection', () => {
  let mockDoc: ReturnType<typeof createMockDoc>;
  let ctx: DocContext;
  let autoTable: ReturnType<typeof vi.fn>;
  let tableBase: ReturnType<typeof getAutoTableStyles>;

  beforeEach(() => {
    mockDoc = createMockDoc();
    ctx = { doc: mockDoc as never, y: 30, hasFonts: false };
    autoTable = vi.fn();
    tableBase = getAutoTableStyles(false);
  });

  // ── 최상위 섹션 타이틀 ────────────────────────────────────────────────
  it('"Ⅳ. AI 기반 운영계획 수립" 섹션 타이틀을 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('Ⅳ. AI 기반 운영계획 수립')),
    ).toBe(true);
  });

  // ── Ⅳ-1. 훈련 목표 ──────────────────────────────────────────────────
  it('"Ⅳ-1. 훈련 목표" 서브섹션을 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('Ⅳ-1. 훈련 목표'))).toBe(true);
  });

  it('training_goal 내용을 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('AI 도구를 통한 업무 생산성 향상')),
    ).toBe(true);
  });

  it('training_goal 이 빈 문자열이면 "-" 를 출력한다', () => {
    const plan = { ...baseOperationPlan(), training_goal: '' };
    drawPBLOperationSection(ctx, plan, autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => t === '-')).toBe(true);
  });

  // ── Ⅳ-2. AI 도구 활용 계획 표 ────────────────────────────────────────
  it('"Ⅳ-2. AI 도구 활용 계획" 서브섹션을 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('Ⅳ-2. AI 도구 활용 계획')),
    ).toBe(true);
  });

  it('AI 도구 활용 계획 autoTable 을 호출한다 (6열 헤더)', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    // 첫 번째 autoTable 호출이 AI 도구 활용 계획 표
    expect(autoTable.mock.calls.length).toBeGreaterThanOrEqual(1);
    const firstHead = autoTable.mock.calls[0][1].head[0];
    expect(firstHead).toContain('단계');
    expect(firstHead).toContain('주요 활동');
    expect(firstHead).toContain('AI 도구');
  });

  it('ai_tools 배열을 join 하여 표 body 에 넣는다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const firstBody = autoTable.mock.calls[0][1].body;
    expect(firstBody[0][2]).toBe('ChatGPT, Copilot');
  });

  // ── Ⅳ-3 훈련실시계획: 과정 개요 ──────────────────────────────────────
  it('훈련과정 개요(과정명, 훈련기간)를 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('AI 실무 과정'))).toBe(true);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('2024-02-01 ~ 2024-02-28')),
    ).toBe(true);
  });

  it('훈련기간 start/end 가 모두 빈 문자열이면 "-" 를 출력한다', () => {
    const plan = {
      ...baseOperationPlan(),
      training_plan: {
        ...baseOperationPlan().training_plan,
        overview: {
          course_name: '',
          training_period: { start: '', end: '' },
        },
      },
    };
    drawPBLOperationSection(ctx, plan, autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => t === '-')).toBe(true);
  });

  it('start 만 있고 end 가 없으면 "start ~ -" 형식으로 출력한다', () => {
    const plan = {
      ...baseOperationPlan(),
      training_plan: {
        ...baseOperationPlan().training_plan,
        overview: {
          course_name: '과정',
          training_period: { start: '2024-01-01', end: '' },
        },
      },
    };
    drawPBLOperationSection(ctx, plan, autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('2024-01-01 ~ -'))).toBe(true);
  });

  // ── Ⅳ-3-나: 강사 테이블 ─────────────────────────────────────────────
  it('강사 테이블 헤더가 5열(구분·역할·소속·직위·성명)을 포함한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const instructorCall = autoTable.mock.calls.find(
      (c) => c[1].head[0].includes('구분') && c[1].head[0].includes('역할'),
    );
    expect(instructorCall).toBeDefined();
  });

  it('강사 목록이 비어있으면 placeholder ["-","-","-","-","-"] 행을 넣는다', () => {
    const plan = {
      ...baseOperationPlan(),
      training_plan: {
        ...baseOperationPlan().training_plan,
        learning_group: { instructors: [], trainees: [] },
      },
    };
    drawPBLOperationSection(ctx, plan, autoTable, tableBase);
    const instructorCall = autoTable.mock.calls.find(
      (c) => c[1].head?.[0]?.includes('구분') && c[1].head[0].includes('역할'),
    );
    expect(instructorCall?.[1].body).toEqual([['-', '-', '-', '-', '-']]);
  });

  // ── Ⅳ-3-나: 훈련생 테이블 ────────────────────────────────────────────
  it('훈련생 테이블 헤더가 4열(역할·소속·직위·성명)을 포함한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const traineeCall = autoTable.mock.calls.find(
      (c) =>
        c[1].head?.[0]?.length === 4 &&
        c[1].head[0].includes('역할') &&
        c[1].head[0].includes('소속'),
    );
    expect(traineeCall).toBeDefined();
  });

  it('훈련생 목록이 비어있으면 placeholder ["-","-","-","-"] 행을 넣는다', () => {
    const plan = {
      ...baseOperationPlan(),
      training_plan: {
        ...baseOperationPlan().training_plan,
        learning_group: {
          instructors: baseOperationPlan().training_plan.learning_group.instructors,
          trainees: [],
        },
      },
    };
    drawPBLOperationSection(ctx, plan, autoTable, tableBase);
    const traineeCall = autoTable.mock.calls.find(
      (c) =>
        c[1].head?.[0]?.length === 4 &&
        c[1].head[0].includes('역할') &&
        !c[1].head[0].includes('구분'),
    );
    expect(traineeCall?.[1].body).toEqual([['-', '-', '-', '-']]);
  });

  // ── Ⅳ-3-다: 교과목 프로파일 ─────────────────────────────────────────
  it('교과목명, 전체시간, 분석방법, 활용데이터 레이블을 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('전체 훈련시간'))).toBe(true);
    expect(allText.some((t) => typeof t === 'string' && t.includes('분석 방법'))).toBe(true);
    expect(allText.some((t) => typeof t === 'string' && t.includes('활용 데이터'))).toBe(true);
  });

  it('training_goals 배열이 있으면 bullet 으로 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('목표1'))).toBe(true);
    expect(allText.some((t) => typeof t === 'string' && t.includes('목표2'))).toBe(true);
  });

  it('training_goals 가 비어있으면 bullet 출력을 건너뛴다', () => {
    const plan = {
      ...baseOperationPlan(),
      training_plan: {
        ...baseOperationPlan().training_plan,
        subject_profile: {
          ...baseOperationPlan().training_plan.subject_profile,
          training_goals: [],
        },
      },
    };
    // 에러 없이 완료되어야 함
    expect(() =>
      drawPBLOperationSection(ctx, plan, autoTable, tableBase),
    ).not.toThrow();
  });

  it('ai_tools 배열이 있으면 join 하여 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('ChatGPT'))).toBe(true);
  });

  it('교과목 프로파일 훈련내용 테이블(5열)을 렌더한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const profileCall = autoTable.mock.calls.find(
      (c) => c[1].head?.[0]?.includes('업무(단원)명') && c[1].head[0].includes('훈련시간(H)'),
    );
    expect(profileCall).toBeDefined();
  });

  it('훈련내용 테이블 body 가 비어있으면 placeholder 행을 넣는다', () => {
    const plan = {
      ...baseOperationPlan(),
      training_plan: {
        ...baseOperationPlan().training_plan,
        subject_profile: {
          ...baseOperationPlan().training_plan.subject_profile,
          training_contents: [],
        },
      },
    };
    drawPBLOperationSection(ctx, plan, autoTable, tableBase);
    const profileCall = autoTable.mock.calls.find(
      (c) => c[1].head?.[0]?.includes('업무(단원)명') && c[1].head[0].includes('훈련시간(H)'),
    );
    expect(profileCall?.[1].body).toEqual([['-', '-', '-', '-', '-']]);
  });

  // ── Ⅳ-3-라: 시설·장비 ───────────────────────────────────────────────
  it('시설·장비 테이블(5열)을 렌더한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const facilityCall = autoTable.mock.calls.find(
      (c) =>
        c[1].head?.[0]?.includes('연번') &&
        c[1].head[0].includes('구분') &&
        c[1].head[0].includes('위치'),
    );
    expect(facilityCall).toBeDefined();
  });

  it('시설·장비 목록이 비어있으면 placeholder 행을 넣는다', () => {
    const plan = {
      ...baseOperationPlan(),
      training_plan: {
        ...baseOperationPlan().training_plan,
        facilities: [],
      },
    };
    drawPBLOperationSection(ctx, plan, autoTable, tableBase);
    const facilityCall = autoTable.mock.calls.find(
      (c) => c[1].head?.[0]?.includes('연번') && c[1].head[0].includes('위치'),
    );
    expect(facilityCall?.[1].body).toEqual([['-', '-', '-', '-', '-']]);
  });

  // ── Ⅳ-3-마: 훈련강사 ────────────────────────────────────────────────
  it('훈련강사 테이블(5열: 성명·내외부·경력·업무명·세부내용)을 렌더한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const instructorTableCall = autoTable.mock.calls.find(
      (c) => c[1].head?.[0]?.includes('성명') && c[1].head[0].includes('경력(년)'),
    );
    expect(instructorTableCall).toBeDefined();
  });

  it('훈련강사 목록이 비어있으면 placeholder 행을 넣는다', () => {
    const plan = {
      ...baseOperationPlan(),
      training_plan: {
        ...baseOperationPlan().training_plan,
        training_instructors: [],
      },
    };
    drawPBLOperationSection(ctx, plan, autoTable, tableBase);
    const instTableCall = autoTable.mock.calls.find(
      (c) => c[1].head?.[0]?.includes('성명') && c[1].head[0].includes('경력(년)'),
    );
    expect(instTableCall?.[1].body).toEqual([['-', '-', '-', '-', '-']]);
  });

  // ── Ⅳ-4: 평가 계획 ───────────────────────────────────────────────────
  it('"Ⅳ-4. 평가 계획" 서브섹션을 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('Ⅳ-4. 평가 계획'))).toBe(true);
  });

  it('과정평가 항목(과정명·평가방법·평가대상 등)을 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('평가 방법'))).toBe(true);
    expect(allText.some((t) => typeof t === 'string' && t.includes('평가 대상'))).toBe(true);
    expect(allText.some((t) => typeof t === 'string' && t.includes('평가 기준'))).toBe(true);
  });

  it('overall_comment 가 있으면 총평을 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('총평'))).toBe(true);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('전반적으로 우수')),
    ).toBe(true);
  });

  it('overall_comment 가 없으면 총평을 출력하지 않는다', () => {
    const plan = {
      ...baseOperationPlan(),
      evaluation_plan: {
        ...baseOperationPlan().evaluation_plan,
        course_evaluation: {
          ...baseCourseEvaluation(),
          overall_comment: '',
        },
      },
    };
    drawPBLOperationSection(ctx, plan, autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('총평'))).toBe(false);
  });

  it('수행수준 체크리스트 테이블(3열)을 렌더한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    // 헤더가 정확히 ['업무(단원)명', '평가 기준', '수행 수준 (1~5)'] 인 호출
    const checkCall = autoTable.mock.calls.find(
      (c) =>
        c[1].head?.[0]?.length === 3 &&
        c[1].head[0][0] === '업무(단원)명' &&
        c[1].head[0][2] === '수행 수준 (1~5)',
    );
    expect(checkCall).toBeDefined();
  });

  it('수행수준 체크리스트가 비어있으면 placeholder 행을 넣는다', () => {
    const plan = {
      ...baseOperationPlan(),
      evaluation_plan: {
        ...baseOperationPlan().evaluation_plan,
        course_evaluation: {
          ...baseCourseEvaluation(),
          performance_checklist: [],
        },
      },
    };
    drawPBLOperationSection(ctx, plan, autoTable, tableBase);
    const checkCall = autoTable.mock.calls.find(
      (c) =>
        c[1].head?.[0]?.length === 3 &&
        c[1].head[0][0] === '업무(단원)명' &&
        c[1].head[0][2] === '수행 수준 (1~5)',
    );
    expect(checkCall?.[1].body).toEqual([['-', '-', '-']]);
  });

  // ── Ⅳ-4-나: 결과평가 요약 ────────────────────────────────────────────
  it('"나. 결과평가 (설문 문항 수 요약)" 타이틀을 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some(
        (t) => typeof t === 'string' && t.includes('나. 결과평가 (설문 문항 수 요약)'),
      ),
    ).toBe(true);
  });

  it('결과평가에서 각 설문 문항 수를 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    // satisfaction_survey 5문항
    expect(allText.some((t) => typeof t === 'string' && t.includes('5문항'))).toBe(true);
    // achievement_survey 3문항
    expect(allText.some((t) => typeof t === 'string' && t.includes('3문항'))).toBe(true);
  });

  it('결과평가 하단 설명 텍스트(리커트 5점 척도)를 출력한다', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('리커트 5점 척도')),
    ).toBe(true);
  });

  // ── y 진행 및 전체 흐름 ───────────────────────────────────────────────
  it('렌더 완료 후 ctx.y 가 시작값보다 크다', () => {
    const startY = ctx.y;
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    expect(ctx.y).toBeGreaterThan(startY);
  });

  it('autoTable 이 최소 6회 이상 호출된다 (AI표·강사2·교과목·시설·훈련강사·평가체크)', () => {
    drawPBLOperationSection(ctx, baseOperationPlan(), autoTable, tableBase);
    expect(autoTable.mock.calls.length).toBeGreaterThanOrEqual(6);
  });

  // ── course_evaluation 필드 빈값 → "-" 분기 커버 ──────────────────────
  it('course_evaluation 의 course_name 이 빈 문자열이면 "-" 를 출력한다', () => {
    const plan = {
      ...baseOperationPlan(),
      evaluation_plan: {
        ...baseOperationPlan().evaluation_plan,
        course_evaluation: {
          ...baseCourseEvaluation(),
          course_name: '',
          evaluation_target: '',
          evaluation_date: '',
          evaluation_criteria: '',
          evaluation_result: '' as 'Pass',
        },
      },
    };
    drawPBLOperationSection(ctx, plan, autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.filter((t) => t === '-').length).toBeGreaterThanOrEqual(1);
  });

  it('subject_profile 의 course_name 이 빈 문자열이면 "-" 를 출력한다', () => {
    const plan = {
      ...baseOperationPlan(),
      training_plan: {
        ...baseOperationPlan().training_plan,
        subject_profile: {
          ...baseOperationPlan().training_plan.subject_profile,
          course_name: '',
          analysis_method: '',
          utilized_data: '',
        },
      },
    };
    drawPBLOperationSection(ctx, plan, autoTable, tableBase);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => t === '-')).toBe(true);
  });

  // ── 훈련강사 detailed_training_content 빈 배열 ────────────────────────
  it('detailed_training_content 가 비어있어도 오류 없이 완료된다', () => {
    const plan = {
      ...baseOperationPlan(),
      training_plan: {
        ...baseOperationPlan().training_plan,
        training_instructors: [
          {
            name: '이름',
            internal_external: '내부' as const,
            career_years: 5,
            work_name: '업무',
            detailed_training_content: [],
          },
        ],
      },
    };
    expect(() =>
      drawPBLOperationSection(ctx, plan, autoTable, tableBase),
    ).not.toThrow();
  });
});
