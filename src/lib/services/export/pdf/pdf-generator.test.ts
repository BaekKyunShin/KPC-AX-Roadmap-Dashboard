/**
 * pdf-generator.ts 테스트 (산인공 공식 양식 v2)
 * generatePDF 함수의 메인 오케스트레이션 검증
 *
 * - 유효한 데이터 → Blob 반환
 * - 빈 섹션 데이터 → 에러 없이 처리
 * - 표지에 기업명/버전/확정일 포함 확인
 * - 2페이지 구성 (표지 → Ⅲ. 훈련실시 계획 제안, 명세서 2번째부터 페이지 추가)
 * - v1 섹션(Ⅲ-1 역량 모델링 · Ⅲ-2 훈련체계도 · Ⅲ-3 연간 훈련계획) 미출력
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RoadmapExportData } from './pdf-generator';

// ─── jsPDF Mock ──────────────────────────────────────────────────────────────

const mockDoc = {
  text: vi.fn(),
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  setTextColor: vi.fn(),
  setFillColor: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  setLineHeightFactor: vi.fn(),
  rect: vi.fn(),
  line: vi.fn(),
  addPage: vi.fn(),
  setPage: vi.fn(),
  getNumberOfPages: vi.fn(() => 2),
  getTextWidth: vi.fn(() => 50),
  splitTextToSize: vi.fn((text: string) => [text]),
  output: vi.fn(() => new Blob(['pdf-content'], { type: 'application/pdf' })),
  lastAutoTable: { finalY: 100 },
};

// jsPDF는 `new jsPDF(...)` 로 호출되므로 생성자 함수로 mock해야 한다
function MockJsPDF() {
  return mockDoc;
}

vi.mock('jspdf', () => ({
  default: MockJsPDF,
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

vi.mock('./pdf-font-loader', () => ({
  loadFonts: vi.fn().mockResolvedValue(false),
}));

// ─── 테스트 데이터 헬퍼 ──────────────────────────────────────────────────────

function createTestExportData(overrides: Partial<RoadmapExportData> = {}): RoadmapExportData {
  return {
    companyName: '테스트 기업',
    projectId: 'proj-1',
    versionNumber: 1,
    status: 'DRAFT',
    diagnosisSummary: '진단 요약 텍스트입니다.',
    courseSpecs: [
      {
        training_period: '2026년 상반기',
        training_level: 'BEGINNER',
        course_name: '데이터 분석 기초',
        training_method: '집체',
        recommended_program: 'S-OJT',
        goal: '엑셀로 기초 분석 수행',
        main_content: '엑셀 함수, 피벗 테이블, 데이터 정제',
        target_audience: '신입 사원',
        subjects: [
          { name: '엑셀 함수', details: 'VLOOKUP, SUMIFS 등', hours: 4 },
          { name: '피벗 테이블', details: '요약/분석 실습', hours: 4 },
        ],
      },
    ],
    createdAt: '2026-02-01T00:00:00Z',
    finalizedAt: null,
    ...overrides,
  };
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('generatePDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.output.mockReturnValue(new Blob(['pdf-content'], { type: 'application/pdf' }));
    mockDoc.lastAutoTable = { finalY: 100 };
    mockDoc.getNumberOfPages.mockReturnValue(2);
  });

  it('유효한 데이터로 Blob을 반환한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData();

    const result = await generatePDF(data);

    expect(result).toBeInstanceOf(Blob);
  });

  it('빈 courseSpecs이어도 에러 없이 Blob을 반환한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData({ courseSpecs: [] });

    const result = await generatePDF(data);

    expect(result).toBeInstanceOf(Blob);
  });

  it('표지에 기업명과 버전 정보를 포함한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData({
      companyName: '삼성전자',
      versionNumber: 3,
      status: 'FINAL',
    });

    await generatePDF(data);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    expect(textCalls.some((t: unknown) => typeof t === 'string' && t.includes('삼성전자'))).toBe(
      true
    );
    expect(textCalls.some((t: unknown) => typeof t === 'string' && t.includes('v3'))).toBe(true);
  });

  it('표지 + 명세서 2페이지 구성이다 (명세서 1건 → addPage 1회)', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData();

    await generatePDF(data);

    // 표지(페이지1) → 명세서(페이지2) = addPage 정확히 1회
    expect(mockDoc.addPage).toHaveBeenCalledTimes(1);
  });

  it('명세서가 여러 건이면 과정당 1페이지씩 추가한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const base = createTestExportData();
    const data = createTestExportData({
      courseSpecs: [
        base.courseSpecs[0],
        { ...base.courseSpecs[0], course_name: '중급 과정' },
        { ...base.courseSpecs[0], course_name: '고급 과정' },
      ],
    });

    await generatePDF(data);

    // 표지 → 명세서1 (addPage 1회) → 명세서2·3 (각 1회) = 3회
    expect(mockDoc.addPage).toHaveBeenCalledTimes(3);
  });

  it('확정일이 있으면 표지에 확정일을 표시한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData({ finalizedAt: '2026-03-01T00:00:00Z' });

    await generatePDF(data);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    expect(textCalls.some((t: unknown) => typeof t === 'string' && t === '확정일')).toBe(true);
  });

  it('푸터에 페이지 번호를 렌더링한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    mockDoc.getNumberOfPages.mockReturnValue(2);
    const data = createTestExportData();

    await generatePDF(data);

    expect(mockDoc.setPage).toHaveBeenCalledWith(1);
    expect(mockDoc.setPage).toHaveBeenCalledWith(2);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    expect(textCalls.some((t: unknown) => typeof t === 'string' && t === '1 / 2')).toBe(true);
  });

  it('훈련실시 계획 제안(명세서) 섹션 제목을 출력한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData();

    await generatePDF(data);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    expect(
      textCalls.some((t: unknown) => typeof t === 'string' && t.includes('Ⅲ. 훈련실시 계획 제안'))
    ).toBe(true);
  });

  it('v2 명세서의 훈련시기·훈련수준을 출력한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData();

    await generatePDF(data);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    const hasText = (s: string) => textCalls.some((t: unknown) => typeof t === 'string' && t === s);

    expect(hasText('훈련시기:')).toBe(true);
    expect(hasText('2026년 상반기')).toBe(true);
    expect(hasText('훈련수준:')).toBe(true);
    expect(hasText('초급')).toBe(true);
  });

  it('v1 삭제 섹션(Ⅲ-1 역량 모델링·Ⅲ-2 훈련체계도·Ⅲ-3 연간 훈련계획)을 출력하지 않는다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData();

    await generatePDF(data);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    const hasSection = (s: string) =>
      textCalls.some((t: unknown) => typeof t === 'string' && t.includes(s));

    expect(hasSection('Ⅲ-1')).toBe(false);
    expect(hasSection('Ⅲ-2')).toBe(false);
    expect(hasSection('Ⅲ-3')).toBe(false);
    expect(hasSection('역량 모델링')).toBe(false);
    expect(hasSection('훈련체계도')).toBe(false);
    expect(hasSection('연간 훈련계획')).toBe(false);
  });
});
