/**
 * pdf-pbl-generator.ts 테스트
 * PBL PDF 생성 오케스트레이터 — dynamic import mock 사용
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PBLExportData } from './pdf-pbl-generator';
import { createEmptyOutcomeAnalysis } from '@/lib/services/pbl/__fixtures__/empty-outcome-analysis';

// ── jspdf / jspdf-autotable dynamic import mock ───────────────────────────
// generatePBLPDF 내부에서 `await import('jspdf')` / `await import('jspdf-autotable')` 를
// 사용하므로 vi.mock 으로 모듈 전체를 대체한다.

function createMockDoc() {
  return {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    setLineHeightFactor: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((t: string) => [t]),
    getTextWidth: vi.fn(() => 20),
    setPage: vi.fn(),
    getNumberOfPages: vi.fn(() => 2),
    output: vi.fn(() => new Blob(['pdf'], { type: 'application/pdf' })),
    lastAutoTable: { finalY: 100 },
  };
}

// mock doc 인스턴스를 테스트 밖에서 캡처
let mockDocInstance: ReturnType<typeof createMockDoc>;
// jsPDF 생성자 옵션을 캡처
let capturedJsPDFOpts: unknown;

vi.mock('jspdf', () => {
  // vi.fn() 화살표 함수는 new 생성자로 사용 불가 → function 키워드로 정의
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function MockJsPDF(opts: unknown) {
    capturedJsPDFOpts = opts;
    mockDocInstance = createMockDoc();
    return mockDocInstance;
  }
  MockJsPDF.prototype = {};
  return { default: MockJsPDF };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

// pdf-font-loader 는 파일 시스템 접근이 필요하므로 mock
vi.mock('./pdf-font-loader', () => ({
  loadFonts: vi.fn(() => Promise.resolve(false)),
}));

// 각 렌더러는 jsPDF mock 기반으로 동작하므로 실제 함수 유지
// (mock doc 을 통해 호출 추적)

// ── 테스트 데이터 ─────────────────────────────────────────────────────────
function baseExportData(): PBLExportData {
  return {
    companyName: '테스트기업',
    projectId: 'proj-001',
    versionNumber: 1,
    status: 'DRAFT',
    diagnosisSummary: 'AI 도입 초기 단계 기업',
    createdAt: '2024-01-15T00:00:00Z',
    pblContent: {
      operation_plan: {
        training_goal: '업무 생산성 향상',
        ai_tool_usage_plan: [
          {
            stage: '1단계',
            main_activity: '데이터 수집',
            ai_tools: ['ChatGPT'],
            utilized_data: '현업 데이터',
            purpose: '자동화',
            specific_method: 'Prompt 엔지니어링',
          },
        ],
        training_plan: {
          overview: {
            course_name: 'AI 과정',
            training_period: { start: '2024-02-01', end: '2024-02-28' },
          },
          learning_group: { instructors: [], trainees: [] },
          subject_profile: {
            course_name: 'AI 실무',
            total_hours: 40,
            training_goals: [],
            ai_tools: [],
            utilized_data: '데이터',
            analysis_method: 'LLM',
            training_contents: [],
            total_sum_hours: 0,
          },
          facilities: [],
          training_instructors: [],
        },
        evaluation_plan: {
          course_evaluation: {
            course_name: '과정',
            evaluation_methods: ['포트폴리오'],
            evaluation_target: '전체',
            evaluation_date: '2024-03-15',
            evaluation_criteria: '기준',
            evaluation_result: 'Pass',
            performance_checklist: [],
            overall_comment: '',
            evaluation_scale: '1~5',
          },
          result_evaluation: {
            satisfaction_survey: [4, 5, 4, 3, 5],
            achievement_survey: [4, 4, 5],
            external_expert_survey: [5, 4, 5, 4, 5],
            practical_application_survey: [4, 4, 3, 4],
          },
        },
      },
      outcome_analysis: createEmptyOutcomeAnalysis(),
    },
  };
}

describe('generatePBLPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 정상 실행 ──────────────────────────────────────────────────────────
  it('Blob 을 반환한다', async () => {
    const { generatePBLPDF } = await import('./pdf-pbl-generator');
    const result = await generatePBLPDF(baseExportData());
    expect(result).toBeInstanceOf(Blob);
  });

  it('jsPDF 생성자를 portrait/mm/a4 옵션으로 호출한다', async () => {
    const { generatePBLPDF } = await import('./pdf-pbl-generator');
    await generatePBLPDF(baseExportData());
    // capturedJsPDFOpts 는 MockJsPDF 생성자 호출 시 캡처된 옵션
    expect(capturedJsPDFOpts).toEqual({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  });

  it('setLineHeightFactor(1.5) 를 호출한다', async () => {
    const { generatePBLPDF } = await import('./pdf-pbl-generator');
    await generatePBLPDF(baseExportData());
    expect(mockDocInstance.setLineHeightFactor).toHaveBeenCalledWith(1.5);
  });

  it('요구사항 섹션 없으면 addPage 를 최소 1회 호출한다 (Ⅳ장만)', async () => {
    const { generatePBLPDF } = await import('./pdf-pbl-generator');
    const data = baseExportData();
    delete (data as Partial<PBLExportData>).requirements;
    await generatePBLPDF(data);
    // Ⅳ장 → 최소 1회 addPage
    expect(mockDocInstance.addPage.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('requirements 가 있으면 addPage 를 최소 2회 호출한다 (Ⅱ·Ⅲ장 포함)', async () => {
    const { generatePBLPDF } = await import('./pdf-pbl-generator');
    const data: PBLExportData = {
      ...baseExportData(),
      requirements: {
        trainingNeedsAnalysis: '분석 내용',
        selectionReason: '선정 사유',
        targetTaskDetails: [],
      },
    };
    await generatePBLPDF(data);
    expect(mockDocInstance.addPage.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('getNumberOfPages() 반환값만큼 setPage() 를 호출한다 (푸터 루프)', async () => {
    const { generatePBLPDF } = await import('./pdf-pbl-generator');
    await generatePBLPDF(baseExportData());
    // getNumberOfPages = 2 (mock), setPage 호출 횟수 = 2
    expect(mockDocInstance.setPage.mock.calls.length).toBe(2);
  });

  it('푸터에 "KPC AI PBL 보고서" 텍스트를 출력한다', async () => {
    const { generatePBLPDF } = await import('./pdf-pbl-generator');
    await generatePBLPDF(baseExportData());
    const allText = mockDocInstance.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('KPC AI PBL 보고서')),
    ).toBe(true);
  });

  it('푸터에 페이지 번호 "1 / 2" 를 출력한다 (getNumberOfPages=2)', async () => {
    const { generatePBLPDF } = await import('./pdf-pbl-generator');
    await generatePBLPDF(baseExportData());
    const allText = mockDocInstance.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('1 / 2'))).toBe(true);
  });

  it('doc.output("blob") 을 호출한다', async () => {
    const { generatePBLPDF } = await import('./pdf-pbl-generator');
    await generatePBLPDF(baseExportData());
    expect(mockDocInstance.output).toHaveBeenCalledWith('blob');
  });

  // ── 요구사항 섹션 조건부 분기 ────────────────────────────────────────
  it('requirements 가 undefined 이면 요구사항 addPage 를 호출하지 않는다', async () => {
    const { generatePBLPDF } = await import('./pdf-pbl-generator');
    const data = baseExportData();
    // requirements 없음
    await generatePBLPDF(data);
    const callCount = mockDocInstance.addPage.mock.calls.length;

    vi.clearAllMocks();

    // requirements 있음
    const dataWithReq: PBLExportData = {
      ...baseExportData(),
      requirements: { trainingNeedsAnalysis: '내용' },
    };
    await generatePBLPDF(dataWithReq);
    const callCountWithReq = mockDocInstance.addPage.mock.calls.length;

    // requirements 있을 때 addPage 가 1회 더 호출되어야 함
    expect(callCountWithReq).toBeGreaterThan(callCount);
  });

  // ── interviewOverview 전달 ────────────────────────────────────────────
  it('interviewOverview 가 있으면 overview 렌더러에 전달된다', async () => {
    const { generatePBLPDF } = await import('./pdf-pbl-generator');
    const data: PBLExportData = {
      ...baseExportData(),
      interviewOverview: {
        courseName: 'AI 활용 과정',
        trainingHours: 40,
        traineeCount: 10,
        trainingJob: '데이터 분석',
        aiLevel: '초급',
        trainingGoals: ['목표1'],
      },
    };
    await generatePBLPDF(data);
    const allText = mockDocInstance.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('Ⅰ. 훈련과정 개요'))).toBe(
      true,
    );
  });

  // ── finalizedAt 전달 ─────────────────────────────────────────────────
  it('finalizedAt 이 있으면 확정일 텍스트를 출력한다', async () => {
    const { generatePBLPDF } = await import('./pdf-pbl-generator');
    const data: PBLExportData = { ...baseExportData(), finalizedAt: '2024-03-20T00:00:00Z' };
    await generatePBLPDF(data);
    const allText = mockDocInstance.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('확정일'))).toBe(true);
  });
});
