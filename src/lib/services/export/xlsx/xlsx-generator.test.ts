/**
 * xlsx-generator.ts 테스트 (산인공 4섹션 전환)
 * generateXLSX 함수의 메인 오케스트레이션 검증
 *
 * - 유효한 데이터 → Uint8Array 반환
 * - 5개 시트 생성 확인 (개요/역량모델링/훈련체계도/연간계획/명세서)
 * - 빈 데이터 → 에러 없이 처리
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
    competencies: [
      {
        name: '데이터 분석 역량',
        definition: '정의',
        knowledge: ['K1'],
        skills: ['S1'],
        attitudes: ['A1'],
      },
    ],
    trainingStructure: [
      {
        competency_name: '데이터 분석 역량',
        level: 'BEGINNER',
        content: '내용',
        target_audience: '대상',
        method: '방법',
        goal: '목표',
      },
    ],
    annualPlan: {
      items: [
        {
          competency_name: '데이터 분석 역량',
          course_name: '과정',
          format: '집체',
          hours: 16,
          notes: '-',
        },
      ],
      usage_plan: '활용방안',
    },
    courseSpecs: [
      {
        course_name: '과정명',
        format: '집체',
        recommended_program: 'S-OJT',
        goal: '목표',
        main_content: '내용',
        target_audience: '대상',
        subjects: [{ name: '과목1', details: '세부', hours: 4 }],
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

  it('5개 시트를 생성한다 (개요/역량모델링/훈련체계도/연간계획/명세서)', async () => {
    const XLSX = await import('xlsx-js-style');
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData();

    await generateXLSX(data);

    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(5);

    const sheetNames = (XLSX.utils.book_append_sheet as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[2],
    );
    expect(sheetNames).toEqual(['개요', '역량모델링', '훈련체계도', '연간계획', '명세서']);
  });

  it('빈 competencies/structure/plan/specs에도 에러 없이 처리한다', async () => {
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData({
      competencies: [],
      trainingStructure: [],
      annualPlan: { items: [], usage_plan: '' },
      courseSpecs: [],
    });

    const result = await generateXLSX(data);

    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('XLSX.write를 올바른 옵션으로 호출한다', async () => {
    const XLSX = await import('xlsx-js-style');
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData();

    await generateXLSX(data);

    expect(XLSX.write).toHaveBeenCalledWith(expect.anything(), { type: 'array', bookType: 'xlsx' });
  });

  it('다중 courseSpecs도 에러 없이 처리한다', async () => {
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData({
      courseSpecs: [
        {
          course_name: '과정1',
          format: '집체',
          recommended_program: 'S-OJT',
          goal: '-',
          main_content: '-',
          target_audience: '-',
          subjects: [{ name: '과목A', details: '-', hours: 4 }],
        },
        {
          course_name: '과정2',
          format: '원격',
          recommended_program: '국민내일',
          goal: '-',
          main_content: '-',
          target_audience: '-',
          subjects: [{ name: '과목B', details: '-', hours: 8 }],
        },
      ],
    });

    const result = await generateXLSX(data);

    expect(result).toBeInstanceOf(Uint8Array);
  });
});
