/**
 * pdf-generator.ts 테스트 (산인공 4섹션 구조)
 * generatePDF 함수의 메인 오케스트레이션 검증
 *
 * - 유효한 데이터 → Blob 반환
 * - 빈 섹션 데이터 → 에러 없이 처리
 * - 표지에 기업명/버전/확정일 포함 확인
 * - 4섹션별 addPage 호출 (표지→Ⅲ-1→Ⅲ-2→Ⅲ-3→Ⅲ-4, 과정별 추가)
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
  getNumberOfPages: vi.fn(() => 5),
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
    competencies: [
      {
        name: '데이터 분석 역량',
        definition: '데이터를 활용하여 의사결정을 지원하는 능력',
        knowledge: ['통계 이론', 'SQL'],
        skills: ['엑셀', '파이썬'],
        attitudes: ['객관적 사고'],
      },
      {
        name: 'AI 활용 역량',
        definition: 'AI 도구를 업무에 적용하는 능력',
        knowledge: ['프롬프트 엔지니어링'],
        skills: ['ChatGPT 활용'],
        attitudes: ['적극성'],
      },
    ],
    trainingStructure: [
      {
        competency_name: '데이터 분석 역량',
        level: 'BEGINNER',
        content: '엑셀 기초 + 데이터 정제',
        target_audience: '신입 사원',
        method: '집체 교육',
        goal: '엑셀로 기초 분석 수행',
      },
      {
        competency_name: 'AI 활용 역량',
        level: 'INTERMEDIATE',
        content: 'ChatGPT 업무 적용',
        target_audience: '대리급',
        method: '혼합 교육',
        goal: '업무 자동화 시나리오 3건',
      },
    ],
    annualPlan: {
      items: [
        {
          competency_name: '데이터 분석 역량',
          course_name: '데이터 분석 기초',
          format: '집체',
          hours: 16,
          notes: '1분기',
        },
      ],
      usage_plan: '연간 계획 활용방안 텍스트',
    },
    courseSpecs: [
      {
        course_name: '데이터 분석 기초',
        format: '집체',
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
    mockDoc.getNumberOfPages.mockReturnValue(5);
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

  it('빈 competencies/trainingStructure/annualPlan에도 안전하게 처리한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData({
      competencies: [],
      trainingStructure: [],
      annualPlan: { items: [], usage_plan: '' },
      courseSpecs: [],
    });

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
    expect(textCalls.some((t: unknown) => typeof t === 'string' && t.includes('삼성전자'))).toBe(true);
    expect(textCalls.some((t: unknown) => typeof t === 'string' && t.includes('v3'))).toBe(true);
  });

  it('각 섹션을 위해 addPage를 여러 번 호출한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData();

    await generatePDF(data);

    // 표지(페이지1) → Ⅲ-1 → Ⅲ-2 → Ⅲ-3 → Ⅲ-4 = 최소 4회 addPage
    expect(mockDoc.addPage.mock.calls.length).toBeGreaterThanOrEqual(4);
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
    mockDoc.getNumberOfPages.mockReturnValue(5);
    const data = createTestExportData();

    await generatePDF(data);

    expect(mockDoc.setPage).toHaveBeenCalledWith(1);
    expect(mockDoc.setPage).toHaveBeenCalledWith(5);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    expect(textCalls.some((t: unknown) => typeof t === 'string' && t === '1 / 5')).toBe(true);
  });

  it('역량 모델링 섹션 제목을 출력한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData();

    await generatePDF(data);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    expect(
      textCalls.some((t: unknown) => typeof t === 'string' && t.includes('Ⅲ-1')),
    ).toBe(true);
  });

  it('훈련체계도/연간훈련계획/훈련과정 명세서 섹션 제목을 출력한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData();

    await generatePDF(data);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    const hasSection = (s: string) =>
      textCalls.some((t: unknown) => typeof t === 'string' && t.includes(s));

    expect(hasSection('Ⅲ-2')).toBe(true);
    expect(hasSection('Ⅲ-3')).toBe(true);
    expect(hasSection('Ⅲ-4')).toBe(true);
  });
});
