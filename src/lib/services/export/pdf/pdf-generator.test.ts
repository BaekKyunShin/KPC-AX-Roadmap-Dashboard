/**
 * pdf-generator.ts 테스트
 * generatePDF 함수의 메인 오케스트레이션 검증
 *
 * - 유효한 데이터 → Blob 반환
 * - 빈 과정 목록 → 에러 없이 처리
 * - PBL 과정 포함 시 PBL 섹션 렌더링
 * - 표지에 기업명/버전 포함 확인
 * - addPage 호출 확인 (다중 과정 시)
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
  getNumberOfPages: vi.fn(() => 3),
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
        {
          module_name: '데이터 분석',
          hours: 8,
          details: ['판다스 기초'],
          practice: '실습: EDA',
          deliverables: ['분석 리포트'],
          tools: [{ name: 'Jupyter', free_tier_info: '무료' }],
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

describe('generatePDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // output을 매번 새 Blob으로 리셋
    mockDoc.output.mockReturnValue(new Blob(['pdf-content'], { type: 'application/pdf' }));
    mockDoc.lastAutoTable = { finalY: 100 };
    mockDoc.getNumberOfPages.mockReturnValue(3);
  });

  it('유효한 데이터로 Blob을 반환한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData();

    const result = await generatePDF(data);

    expect(result).toBeInstanceOf(Blob);
  });

  it('빈 과정 목록이어도 에러 없이 Blob을 반환한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData({ courses: [] });

    const result = await generatePDF(data);

    expect(result).toBeInstanceOf(Blob);
  });

  it('PBL 과정 데이터가 있으면 PBL 섹션을 렌더링한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData();

    await generatePDF(data);

    // PBL 과정명이 텍스트에 출력되는지 확인 (drawSubsectionTitle → doc.text)
    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    const hasPBLCourseName = textCalls.some(
      (t: unknown) => typeof t === 'string' && t.includes('PBL: AI 기초 실습'),
    );
    expect(hasPBLCourseName).toBe(true);
  });

  it('표지에 기업명과 버전 정보를 포함한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData({
      companyName: '삼성전자',
      versionNumber: 3,
      status: 'FINAL',
    });

    await generatePDF(data);

    // 기업명 확인
    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    const hasCompanyName = textCalls.some(
      (t: unknown) => typeof t === 'string' && t.includes('삼성전자'),
    );
    expect(hasCompanyName).toBe(true);

    // 버전 정보 확인
    const hasVersion = textCalls.some(
      (t: unknown) => typeof t === 'string' && t.includes('v3'),
    );
    expect(hasVersion).toBe(true);
  });

  it('과정 상세 및 PBL 섹션을 위해 addPage를 호출한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData();

    await generatePDF(data);

    // 과정 상세(새 페이지) + PBL(새 페이지) = 최소 2회 addPage
    expect(mockDoc.addPage).toHaveBeenCalledTimes(2);
  });

  it('확정일이 있으면 표지에 확정일을 표시한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    const data = createTestExportData({
      finalizedAt: '2026-03-01T00:00:00Z',
    });

    await generatePDF(data);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    const hasFinalizedLabel = textCalls.some(
      (t: unknown) => typeof t === 'string' && t === '확정일',
    );
    expect(hasFinalizedLabel).toBe(true);
  });

  it('푸터에 페이지 번호를 렌더링한다', async () => {
    const { generatePDF } = await import('./pdf-generator');
    mockDoc.getNumberOfPages.mockReturnValue(3);
    const data = createTestExportData();

    await generatePDF(data);

    // setPage가 1, 2, 3 모두 호출됨
    expect(mockDoc.setPage).toHaveBeenCalledWith(1);
    expect(mockDoc.setPage).toHaveBeenCalledWith(2);
    expect(mockDoc.setPage).toHaveBeenCalledWith(3);

    // 페이지 번호 텍스트 확인 ("1 / 3", "2 / 3", "3 / 3")
    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    const hasPageNumber = textCalls.some(
      (t: unknown) => typeof t === 'string' && t === '1 / 3',
    );
    expect(hasPageNumber).toBe(true);
  });
});
