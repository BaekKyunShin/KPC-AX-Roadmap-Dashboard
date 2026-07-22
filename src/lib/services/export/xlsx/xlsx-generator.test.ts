/**
 * xlsx-generator.ts 테스트 (산인공 양식 v2)
 * generateXLSX 함수의 메인 오케스트레이션 검증
 *
 * - 유효한 데이터 → Uint8Array 반환
 * - 2개 시트 생성 확인 (개요/명세서) — v1의 역량모델링·훈련체계도·연간계획 3시트 삭제
 * - 명세서에 훈련시기·훈련수준 행 렌더 (v2 신규)
 * - 빈 데이터 → 에러 없이 처리
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as XLSX from 'xlsx-js-style';
import type { RoadmapCourseSpec } from '../../roadmap/roadmap-types';
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

function createTestCourseSpec(overrides: Partial<RoadmapCourseSpec> = {}): RoadmapCourseSpec {
  return {
    training_period: '2026년 1분기',
    training_level: 'BEGINNER',
    course_name: '과정명',
    training_method: '집체',
    recommended_program: 'S-OJT',
    goal: '목표',
    main_content: '내용',
    target_audience: '대상',
    subjects: [{ name: '과목1', details: '세부', hours: 4 }],
    ...overrides,
  };
}

function createTestExportData(overrides: Partial<RoadmapExportData> = {}): RoadmapExportData {
  return {
    companyName: '테스트 기업',
    projectId: 'proj-1',
    versionNumber: 1,
    status: 'DRAFT',
    diagnosisSummary: '진단 요약 텍스트입니다.',
    courseSpecs: [createTestCourseSpec()],
    createdAt: '2026-02-01T00:00:00Z',
    finalizedAt: null,
    ...overrides,
  };
}

/** 명세서 시트에서 A열 라벨과 일치하는 행의 B열(값) 을 찾는다 */
function findLabelValue(ws: XLSX.WorkSheet, label: string): unknown {
  for (let r = 1; r <= 300; r++) {
    if (ws[`A${r}`]?.v === label) return ws[`B${r}`]?.v;
  }
  return undefined;
}

/** 시트 전체에서 특정 값이 어느 셀에든 존재하는지 검색 */
function hasCellValue(ws: XLSX.WorkSheet, target: string): boolean {
  return Object.entries(ws).some(
    ([key, cell]) =>
      !key.startsWith('!') &&
      typeof cell === 'object' &&
      cell !== null &&
      (cell as { v?: unknown }).v === target
  );
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

  it('2개 시트를 생성한다 (개요/명세서)', async () => {
    const XLSX = await import('xlsx-js-style');
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData();

    await generateXLSX(data);

    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(2);

    const sheetNames = (XLSX.utils.book_append_sheet as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[2]
    );
    expect(sheetNames).toEqual(['개요', '명세서']);
  });

  it('빈 courseSpecs에도 에러 없이 처리한다', async () => {
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData({ courseSpecs: [] });

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
        createTestCourseSpec({ course_name: '과정1', training_method: '집체' }),
        createTestCourseSpec({ course_name: '과정2', training_method: '원격' }),
      ],
    });

    const result = await generateXLSX(data);

    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('subjects 가 빈 배열인 course_spec 도 "-" placeholder 로 처리한다', async () => {
    const { generateXLSX } = await import('./xlsx-generator');
    const data = createTestExportData({
      courseSpecs: [
        createTestCourseSpec({
          course_name: '빈 과정',
          goal: '',
          main_content: '',
          target_audience: '',
          subjects: [],
        }),
      ],
    });

    const result = await generateXLSX(data);
    expect(result).toBeInstanceOf(Uint8Array);
  });
});

describe('buildCourseSpecSheet (v2 명세서)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('훈련시기 행을 렌더한다', async () => {
    const { buildCourseSpecSheet } = await import('./xlsx-generator');

    const ws = buildCourseSpecSheet([createTestCourseSpec({ training_period: '2026년 상반기' })]);

    expect(findLabelValue(ws, '훈련시기')).toBe('2026년 상반기');
  });

  it('훈련시기가 비어 있으면 "-" 로 대체한다', async () => {
    const { buildCourseSpecSheet } = await import('./xlsx-generator');

    const ws = buildCourseSpecSheet([createTestCourseSpec({ training_period: '' })]);

    expect(findLabelValue(ws, '훈련시기')).toBe('-');
  });

  it('훈련수준을 한글 라벨로 렌더한다', async () => {
    const { buildCourseSpecSheet } = await import('./xlsx-generator');

    const ws = buildCourseSpecSheet([createTestCourseSpec({ training_level: 'INTERMEDIATE' })]);

    expect(findLabelValue(ws, '훈련수준')).toBe('중급');
  });

  it('훈련방법 행을 렌더한다 (v1 "훈련형태" 라벨은 제거)', async () => {
    const { buildCourseSpecSheet } = await import('./xlsx-generator');

    const ws = buildCourseSpecSheet([createTestCourseSpec({ training_method: '집체+원격' })]);

    expect(findLabelValue(ws, '훈련방법')).toBe('집체+원격');
    expect(findLabelValue(ws, '훈련형태')).toBeUndefined();
  });

  it('주요 훈련 내용 행 라벨을 화면(CourseSpecCard "주요 훈련 내용")과 동일하게 렌더한다', async () => {
    const { buildCourseSpecSheet } = await import('./xlsx-generator');

    const ws = buildCourseSpecSheet([createTestCourseSpec({ main_content: '핵심 실습' })]);

    // 화면 행 라벨은 "주요 훈련 내용"(공백 포함) — 옛 "주요 훈련내용" 은 없어야 한다
    expect(findLabelValue(ws, '주요 훈련 내용')).toBe('핵심 실습');
    expect(findLabelValue(ws, '주요 훈련내용')).toBeUndefined();
  });

  it('교과목 표 헤더를 화면 CourseSpecCard(교과목명/세부 내용/훈련시간)와 동일하게 렌더한다', async () => {
    const { buildCourseSpecSheet } = await import('./xlsx-generator');

    const ws = buildCourseSpecSheet([createTestCourseSpec()]);

    expect(hasCellValue(ws, '교과목명')).toBe(true);
    expect(hasCellValue(ws, '세부 내용 (단원, 과제명)')).toBe(true);
    expect(hasCellValue(ws, '훈련시간')).toBe(true);
    // 옛 헤더 문자열은 남아있지 않아야 한다
    expect(hasCellValue(ws, '과목명')).toBe(false);
    expect(hasCellValue(ws, '세부내용')).toBe(false);
  });

  it('빈 specs 는 안내 문구만 렌더한다', async () => {
    const { buildCourseSpecSheet } = await import('./xlsx-generator');

    const ws = buildCourseSpecSheet([]);

    expect(findLabelValue(ws, '훈련시기')).toBeUndefined();
    expect(ws['A3']?.v).toBe('등록된 훈련과정이 없습니다.');
  });
});

describe('downloadXLSX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateXLSX 결과를 Blob 으로 감싸 <a> 엘리먼트 다운로드를 트리거한다', async () => {
    const { downloadXLSX } = await import('./xlsx-generator');
    const data = createTestExportData();

    // URL.createObjectURL / revokeObjectURL 모킹
    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });

    // a 태그 click 감시
    const click = vi.fn();
    const originalCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: click, writable: true });
      }
      return el;
    });

    await downloadXLSX(data, 'roadmap.xlsx');

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });
});
