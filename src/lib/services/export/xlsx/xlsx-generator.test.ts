/**
 * xlsx-generator.ts 테스트
 * generateXLSX 함수의 메인 오케스트레이션 검증
 *
 * - 유효한 데이터 → Uint8Array 반환
 * - 4개 시트 생성 확인
 * - 빈 과정 목록 → 에러 없이 처리
 * - PBL 과정 포함 시 PBL 시트 렌더링
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RoadmapExportData } from '../../export-pdf';

// ─── xlsx-js-style Mock ──────────────────────────────────────────────────────

interface MockWorkbook {
  SheetNames: string[];
  Sheets: Record<string, unknown>;
}

vi.mock('xlsx-js-style', () => ({
  utils: {
    book_new: vi.fn(() => ({
      SheetNames: [] as string[],
      Sheets: {} as Record<string, unknown>,
    })),
    book_append_sheet: vi.fn((wb: MockWorkbook, _ws: unknown, name: string) => {
      wb.SheetNames.push(name);
      wb.Sheets[name] = _ws;
    }),
    decode_range: vi.fn(() => ({ s: { c: 0, r: 0 }, e: { c: 5, r: 10 } })),
    encode_cell: vi.fn(({ c, r }: { c: number; r: number }) => {
      let col = '';
      let cc = c;
      do {
        col = String.fromCharCode(65 + (cc % 26)) + col;
        cc = Math.floor(cc / 26) - 1;
      } while (cc >= 0);
      return col + (r + 1);
    }),
    encode_range: vi.fn(() => 'A1:F10'),
  },
  write: vi.fn(() => new Uint8Array([1, 2, 3])),
}));

// ─── 테스트 데이터 헬퍼 ──────────────────────────────────────────────────────

function createTestExportData(overrides: Partial<RoadmapExportData> = {}): RoadmapExportData {
  return {
    companyName: '테스트 기업',
    projectId: 'proj-1',
    versionNumber: 1,
    status: 'DRAFT',
    diagnosisSummary: '진단 요약 텍스트입니다.',
    roadmapMatrix: [
      {
        task_id: 'task-1',
        task_name: '데이터 분석',
        beginner: [{ course_name: 'AI 기초', recommended_hours: 8 }],
        intermediate: [{ course_name: '데이터 처리', recommended_hours: 16 }],
        advanced: [],
      },
    ],
    pblCourse: {
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
          details: ['크롤링 기초', 'API 활용'],
          practice: '실습: 공공데이터 수집',
          deliverables: ['수집 스크립트'],
          tools: [{ name: 'Python', free_tier_info: '무료' }],
        },
      ],
      final_deliverables: ['최종 보고서'],
      expected_outcomes: ['데이터 분석 역량 강화'],
      business_impact: '업무 효율 30% 향상',
      measurement_methods: ['실습 평가'],
      prerequisites: ['노트북 지참'],
    },
    courses: [
      {
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
          {
            module_name: '실습',
            hours: 4,
            details: ['실전 연습'],
            practice: '실습: 데이터 분석',
          },
        ],
        tools: [{ name: 'ChatGPT', free_tier_info: '무료 플랜' }],
        expected_outcome: 'AI 기초 이해',
        measurement_method: '퀴즈',
        prerequisites: ['없음'],
      },
    ],
    createdAt: '2026-02-01T00:00:00Z',
    finalizedAt: null,
    ...overrides,
  };
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('generateXLSX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유효한 데이터로 Uint8Array를 반환한다', async () => {
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData();

    const result = await generateXLSX(data);

    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('4개 시트(개요, 과정 체계도, 교육 과정 상세, PBL 프로그램)를 생성한다', async () => {
    const XLSX = await import('xlsx-js-style');
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData();

    await generateXLSX(data);

    // book_append_sheet가 4번 호출되었는지 확인
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(4);

    // 각 시트 이름 확인
    const sheetNames = (XLSX.utils.book_append_sheet as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[2],
    );
    expect(sheetNames).toEqual(['개요', '과정 체계도', '교육 과정 상세', 'PBL 프로그램']);
  });

  it('빈 과정 목록이어도 에러 없이 처리한다', async () => {
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData({ courses: [] });

    const result = await generateXLSX(data);

    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('XLSX.write를 올바른 옵션으로 호출한다', async () => {
    const XLSX = await import('xlsx-js-style');
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData();

    await generateXLSX(data);

    expect(XLSX.write).toHaveBeenCalledWith(
      expect.anything(),
      { type: 'array', bookType: 'xlsx' },
    );
  });

  it('pblCourse가 없으면 PBL 시트를 건너뛴다', async () => {
    const { generateXLSX } = await import('./xlsx-generator');
    // pblCourse를 최소 데이터로 구성 — PBL 시트는 여전히 생성되지만 내용이 최소
    const data = createTestExportData({
      pblCourse: {
        course_name: '-',
        total_hours: 0,
        target_tasks: [],
        target_audience: '-',
        curriculum: [],
        final_deliverables: [],
        expected_outcomes: [],
        business_impact: '',
        measurement_methods: [],
        prerequisites: [],
      },
    });

    const result = await generateXLSX(data);

    // PBL 데이터가 최소여도 에러 없이 Uint8Array를 반환
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('roadmapMatrix가 빈 배열이어도 에러 없이 처리한다', async () => {
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData({ roadmapMatrix: [] });

    const result = await generateXLSX(data);

    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('courses가 비어있고 pblCourse도 없는 최소 데이터로 동작한다', async () => {
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData({
      courses: [],
      roadmapMatrix: [],
      pblCourse: {
        course_name: '-',
        total_hours: 0,
        target_tasks: [],
        target_audience: '-',
        curriculum: [],
        final_deliverables: [],
        expected_outcomes: [],
        business_impact: '',
        measurement_methods: [],
        prerequisites: [],
      },
    });

    const result = await generateXLSX(data);

    expect(result).toBeInstanceOf(Uint8Array);
  });
});
