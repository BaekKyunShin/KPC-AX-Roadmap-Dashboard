/**
 * pdf-course-renderer.ts 테스트
 * PBL 데이터 추출 헬퍼 및 과정 상세 렌더링 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PBLCourse, RoadmapCell } from '../../roadmap';
import {
  extractPBLExtendedFields,
  extractModuleDeliverables,
  drawCourseDetail,
} from './pdf-course-renderer';
import { getAutoTableStyles } from './pdf-helpers';
import { LAYOUT } from './pdf-constants';

// ─── Mock 헬퍼 ───────────────────────────────────────────────────────────────

function createMockDoc() {
  return {
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    getTextWidth: vi.fn(() => 40),
    internal: { pageSize: { height: 297, width: 210 } },
    lastAutoTable: { finalY: 100 } as { finalY: number } | undefined,
  };
}

function createPBLCourse(overrides: Partial<PBLCourse> = {}): PBLCourse {
  return {
    selected_course_name: 'AI 기초',
    selected_course_level: 'BEGINNER',
    selected_course_task: '데이터 분석',
    selection_rationale: {
      consultant_expertise_fit: '전문가 적합',
      pain_point_alignment: '페인포인트 일치',
      feasibility_assessment: '실현 가능',
      summary: '종합 선정 이유',
    },
    course_name: 'PBL: AI 기초 실습',
    total_hours: 16,
    target_tasks: ['데이터 분석'],
    target_audience: '신입 사원',
    curriculum: [
      {
        module_name: '데이터 수집',
        hours: 8,
        details: ['크롤링 기초'],
        practice: '공공데이터 수집',
        deliverables: ['수집 스크립트'],
        tools: [{ name: 'Python', free_tier_info: '무료' }],
      },
    ],
    final_deliverables: ['최종 보고서'],
    expected_outcomes: ['역량 강화'],
    business_impact: '업무 효율 향상',
    measurement_methods: ['실습 평가'],
    prerequisites: ['노트북'],
    ...overrides,
  };
}

function createRoadmapCell(overrides: Partial<RoadmapCell> = {}): RoadmapCell {
  return {
    course_name: 'AI 기초',
    level: 'BEGINNER',
    target_task: '데이터 분석',
    target_audience: '신입 사원',
    recommended_hours: 8,
    curriculum: [
      {
        module_name: '소개',
        hours: 4,
        details: ['AI 개요'],
        practice: '실습: Hello AI',
      },
    ],
    tools: [{ name: 'ChatGPT', free_tier_info: '무료 플랜' }],
    expected_outcome: 'AI 기초 이해',
    measurement_method: '퀴즈',
    prerequisites: ['없음'],
    ...overrides,
  };
}

// ─── extractPBLExtendedFields ────────────────────────────────────────────────

describe('extractPBLExtendedFields', () => {
  it('PBL 확장 필드를 올바르게 추출한다', () => {
    const pbl = createPBLCourse();
    const fields = extractPBLExtendedFields(pbl);

    expect(fields.selected_course_name).toBe('AI 기초');
    expect(fields.selected_course_level).toBe('BEGINNER');
    expect(fields.selected_course_task).toBe('데이터 분석');
    expect(fields.selection_rationale?.summary).toBe('종합 선정 이유');
    expect(fields.final_deliverables).toEqual(['최종 보고서']);
    expect(fields.business_impact).toBe('업무 효율 향상');
    expect(fields.prerequisites).toEqual(['노트북']);
  });

  it('selection_rationale의 모든 필드를 추출한다', () => {
    const pbl = createPBLCourse();
    const fields = extractPBLExtendedFields(pbl);

    expect(fields.selection_rationale).toEqual({
      consultant_expertise_fit: '전문가 적합',
      pain_point_alignment: '페인포인트 일치',
      feasibility_assessment: '실현 가능',
      summary: '종합 선정 이유',
    });
  });

  it('확장 필드가 없는 PBLCourse에서도 undefined를 반환한다', () => {
    // PBLCourse에는 이 필드가 기본적으로 있지만,
    // 타입 캐스팅을 통해 접근하므로 필드 없는 경우도 처리됨
    const minimalPbl = {
      course_name: 'PBL',
      total_hours: 8,
      target_tasks: [],
      target_audience: '-',
      curriculum: [],
      expected_outcomes: [],
      measurement_methods: [],
    } as unknown as PBLCourse;

    const fields = extractPBLExtendedFields(minimalPbl);

    // 기본 PBLCourse에 없는 필드는 undefined
    expect(fields.selected_course_name).toBeUndefined();
    expect(fields.business_impact).toBeUndefined();
  });

  it('빈 배열 필드도 올바르게 추출한다', () => {
    const pbl = createPBLCourse({
      final_deliverables: [],
      prerequisites: [],
    });
    const fields = extractPBLExtendedFields(pbl);

    expect(fields.final_deliverables).toEqual([]);
    expect(fields.prerequisites).toEqual([]);
  });
});

// ─── extractModuleDeliverables ───────────────────────────────────────────────

describe('extractModuleDeliverables', () => {
  it('모듈에 deliverables가 있으면 추출한다', () => {
    const testModule = {
      module_name: '데이터 수집',
      hours: 8,
      details: ['크롤링'],
      practice: '실습',
      deliverables: ['스크립트', '보고서'],
      tools: [{ name: 'Python', free_tier_info: '무료' }],
    };

    const result = extractModuleDeliverables(testModule);
    expect(result).toEqual(['스크립트', '보고서']);
  });

  it('모듈에 deliverables가 없으면 undefined를 반환한다', () => {
    const testModule = {
      module_name: '소개',
      hours: 4,
      details: ['AI 개요'],
      practice: '실습',
    } as Record<string, unknown>;

    const result = extractModuleDeliverables(testModule as never);
    expect(result).toBeUndefined();
  });

  it('빈 deliverables 배열도 올바르게 반환한다', () => {
    const testModule = {
      module_name: '모듈',
      hours: 2,
      details: [],
      practice: '-',
      deliverables: [],
      tools: [],
    };

    const result = extractModuleDeliverables(testModule);
    expect(result).toEqual([]);
  });
});

// ─── drawCourseDetail ────────────────────────────────────────────────────────

describe('drawCourseDetail', () => {
  let mockDoc: ReturnType<typeof createMockDoc>;
  let autoTable: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDoc = createMockDoc();
    mockDoc.lastAutoTable = { finalY: 100 };
    autoTable = vi.fn();
  });

  it('과정 제목을 인덱스와 함께 출력한다', () => {
    const ctx = { doc: mockDoc as never, y: 50, hasFonts: true };
    const course = createRoadmapCell();
    const tableBase = getAutoTableStyles(true);

    drawCourseDetail(ctx, course, 0, autoTable, tableBase);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    const hasTitle = textCalls.some(
      (t: unknown) => typeof t === 'string' && t.includes('1. AI 기초 (초급)'),
    );
    expect(hasTitle).toBe(true);
  });

  it('인덱스에 1을 더한 번호를 사용한다', () => {
    const ctx = { doc: mockDoc as never, y: 50, hasFonts: true };
    const course = createRoadmapCell({ course_name: '과정B' });
    const tableBase = getAutoTableStyles(true);

    drawCourseDetail(ctx, course, 2, autoTable, tableBase);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    const hasTitle = textCalls.some(
      (t: unknown) => typeof t === 'string' && t.includes('3. 과정B'),
    );
    expect(hasTitle).toBe(true);
  });

  it('autoTable을 최소 3회 호출한다 (프로파일, 커리큘럼, 기대효과)', () => {
    const ctx = { doc: mockDoc as never, y: 50, hasFonts: true };
    const course = createRoadmapCell();
    const tableBase = getAutoTableStyles(true);

    drawCourseDetail(ctx, course, 0, autoTable, tableBase);

    expect(autoTable).toHaveBeenCalledTimes(3);
  });

  it('커리큘럼이 비어있으면 커리큘럼 테이블을 생략한다', () => {
    const ctx = { doc: mockDoc as never, y: 50, hasFonts: true };
    const course = createRoadmapCell({ curriculum: [] });
    const tableBase = getAutoTableStyles(true);

    drawCourseDetail(ctx, course, 0, autoTable, tableBase);

    // 프로파일 + 기대효과 = 2회
    expect(autoTable).toHaveBeenCalledTimes(2);
  });

  it('프로파일 테이블에 올바른 데이터를 전달한다', () => {
    const ctx = { doc: mockDoc as never, y: 50, hasFonts: true };
    const course = createRoadmapCell({
      expected_outcome: 'AI 이해',
      target_audience: '개발자',
      target_task: '자동화',
      recommended_hours: 16,
      tools: [{ name: 'GPT', free_tier_info: '무료' }],
      prerequisites: ['Python 기초'],
    });
    const tableBase = getAutoTableStyles(true);

    drawCourseDetail(ctx, course, 0, autoTable, tableBase);

    const firstCall = autoTable.mock.calls[0];
    const body = firstCall[1].body;

    // 과정 목표, 교육 대상, 대상 업무, 난이도, 교육 시간, 사용 도구, 선수 조건
    expect(body).toHaveLength(7);
    expect(body[0]).toEqual(['과정 목표', 'AI 이해']);
    expect(body[1]).toEqual(['교육 대상', '개발자']);
    expect(body[4]).toEqual(['교육 시간', '16시간']);
    expect(body[5]).toEqual(['사용 도구', 'GPT (무료)']);
    expect(body[6]).toEqual(['선수 조건', 'Python 기초']);
  });

  it('tools가 비어있으면 "-"를 표시한다', () => {
    const ctx = { doc: mockDoc as never, y: 50, hasFonts: true };
    const course = createRoadmapCell({ tools: [] });
    const tableBase = getAutoTableStyles(true);

    drawCourseDetail(ctx, course, 0, autoTable, tableBase);

    const firstCall = autoTable.mock.calls[0];
    const toolsRow = firstCall[1].body[5];
    expect(toolsRow[1]).toBe('-');
  });

  it('prerequisites가 비어있으면 "없음"을 표시한다', () => {
    const ctx = { doc: mockDoc as never, y: 50, hasFonts: true };
    const course = createRoadmapCell({ prerequisites: [] });
    const tableBase = getAutoTableStyles(true);

    drawCourseDetail(ctx, course, 0, autoTable, tableBase);

    const firstCall = autoTable.mock.calls[0];
    const prereqRow = firstCall[1].body[6];
    expect(prereqRow[1]).toBe('없음');
  });

  it('기대효과 테이블에 올바른 데이터를 전달한다', () => {
    const ctx = { doc: mockDoc as never, y: 50, hasFonts: true };
    const course = createRoadmapCell({
      expected_outcome: '생산성 향상',
      measurement_method: '성과 평가',
    });
    const tableBase = getAutoTableStyles(true);

    drawCourseDetail(ctx, course, 0, autoTable, tableBase);

    // 마지막 autoTable 호출이 기대효과 테이블
    const lastCall = autoTable.mock.calls[autoTable.mock.calls.length - 1];
    expect(lastCall[1].head).toEqual([['기대효과', '측정 방법']]);
    expect(lastCall[1].body).toEqual([['생산성 향상', '성과 평가']]);
  });

  it('각 테이블의 tableWidth는 CONTENT_WIDTH이다', () => {
    const ctx = { doc: mockDoc as never, y: 50, hasFonts: true };
    const course = createRoadmapCell();
    const tableBase = getAutoTableStyles(true);

    drawCourseDetail(ctx, course, 0, autoTable, tableBase);

    autoTable.mock.calls.forEach((call: unknown[]) => {
      expect((call[1] as Record<string, unknown>).tableWidth).toBe(LAYOUT.CONTENT_WIDTH);
    });
  });

  it('각 테이블 후 y를 finalY + 10으로 업데이트한다', () => {
    mockDoc.lastAutoTable = { finalY: 200 };
    const ctx = { doc: mockDoc as never, y: 50, hasFonts: true };
    const course = createRoadmapCell({ curriculum: [] });
    const tableBase = getAutoTableStyles(true);

    drawCourseDetail(ctx, course, 0, autoTable, tableBase);

    // 마지막 테이블 후의 y = 200 + 10 = 210
    expect(ctx.y).toBe(210);
  });

  it('tool의 free_tier_info가 없으면 이름만 표시한다', () => {
    const ctx = { doc: mockDoc as never, y: 50, hasFonts: true };
    const course = createRoadmapCell({
      tools: [{ name: 'Cursor', free_tier_info: '' }],
    });
    const tableBase = getAutoTableStyles(true);

    drawCourseDetail(ctx, course, 0, autoTable, tableBase);

    const firstCall = autoTable.mock.calls[0];
    const toolsRow = firstCall[1].body[5];
    expect(toolsRow[1]).toBe('Cursor');
  });

  it('expected_outcome이 없으면 "-"를 표시한다', () => {
    const ctx = { doc: mockDoc as never, y: 50, hasFonts: true };
    const course = createRoadmapCell({
      expected_outcome: '',
    });
    const tableBase = getAutoTableStyles(true);

    drawCourseDetail(ctx, course, 0, autoTable, tableBase);

    const firstCall = autoTable.mock.calls[0];
    const goalRow = firstCall[1].body[0];
    expect(goalRow[1]).toBe('-');
  });
});
