/**
 * pdf-pbl-overview-renderer.ts 테스트
 * PBL 표지 + Ⅰ장 요약 렌더러 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawPBLOverviewPage } from './pdf-pbl-overview-renderer';
import type { DocContext } from './pdf-helpers';
import type { PBLOverviewData } from './pdf-pbl-overview-renderer';

// jsPDF는 DOM이 필요하므로 mock 처리
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

/** 기본 유효 데이터 (interviewOverview 없음) */
function baseData(): PBLOverviewData {
  return {
    companyName: '테스트기업',
    versionNumber: 1,
    status: 'DRAFT',
    createdAt: '2024-01-15T00:00:00Z',
    diagnosisSummary: 'AI 도입 초기 단계 기업으로 기초 역량 강화 필요',
  };
}

describe('drawPBLOverviewPage', () => {
  let mockDoc: ReturnType<typeof createMockDoc>;
  let ctx: DocContext;

  beforeEach(() => {
    mockDoc = createMockDoc();
    // y=50에서 시작해도 함수 내부에서 ctx.y = 30으로 초기화
    ctx = { doc: mockDoc as never, y: 50, hasFonts: false };
  });

  // ── 타이틀 출력 ──────────────────────────────────────────────────────────
  it('함수 실행 후 ctx.y 를 30으로 초기화한다', () => {
    drawPBLOverviewPage(ctx, baseData());
    // 함수 내부에서 ctx.y = 30 설정 후 진행하므로 최종 y는 30보다 커야 함
    expect(ctx.y).toBeGreaterThan(30);
  });

  it('"AI PBL 과정개발 보고서" 제목 텍스트를 출력한다', () => {
    drawPBLOverviewPage(ctx, baseData());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('AI PBL 과정개발 보고서'))).toBe(
      true,
    );
  });

  it('기업명을 출력한다', () => {
    drawPBLOverviewPage(ctx, baseData());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('테스트기업'))).toBe(true);
  });

  it('버전 정보를 "v1 (DRAFT)" 형식으로 출력한다', () => {
    drawPBLOverviewPage(ctx, baseData());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('v1 (DRAFT)'))).toBe(true);
  });

  it('생성일 레이블과 날짜 텍스트를 출력한다', () => {
    drawPBLOverviewPage(ctx, baseData());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('생성일'))).toBe(true);
  });

  // ── finalizedAt 조건부 ─────────────────────────────────────────────────
  it('finalizedAt 이 있으면 확정일을 출력한다', () => {
    drawPBLOverviewPage(ctx, { ...baseData(), finalizedAt: '2024-03-01T00:00:00Z' });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('확정일'))).toBe(true);
  });

  it('finalizedAt 이 null이면 확정일을 출력하지 않는다', () => {
    drawPBLOverviewPage(ctx, { ...baseData(), finalizedAt: null });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('확정일'))).toBe(false);
  });

  it('finalizedAt 이 undefined면 확정일을 출력하지 않는다', () => {
    drawPBLOverviewPage(ctx, baseData()); // finalizedAt 없음
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('확정일'))).toBe(false);
  });

  // ── 진단 요약 ─────────────────────────────────────────────────────────
  it('진단 요약 섹션 타이틀을 출력한다', () => {
    drawPBLOverviewPage(ctx, baseData());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('진단 요약'))).toBe(true);
  });

  it('diagnosisSummary 내용을 출력한다', () => {
    drawPBLOverviewPage(ctx, baseData());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('AI 도입 초기 단계')),
    ).toBe(true);
  });

  it('diagnosisSummary 가 빈 문자열이면 "-" 를 출력한다', () => {
    drawPBLOverviewPage(ctx, { ...baseData(), diagnosisSummary: '' });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t === '-')).toBe(true);
  });

  // ── interviewOverview 조건부 ──────────────────────────────────────────
  it('interviewOverview 가 없으면 "Ⅰ. 훈련과정 개요" 섹션을 출력하지 않는다', () => {
    drawPBLOverviewPage(ctx, baseData());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('Ⅰ. 훈련과정 개요')),
    ).toBe(false);
  });

  it('interviewOverview 가 있으면 "Ⅰ. 훈련과정 개요" 섹션을 출력한다', () => {
    drawPBLOverviewPage(ctx, {
      ...baseData(),
      interviewOverview: {
        courseName: 'AI 활용 과정',
        trainingHours: 40,
        traineeCount: 10,
        trainingJob: '데이터 분석',
        aiLevel: '초급',
        trainingGoals: ['목표1', '목표2'],
      },
    });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('Ⅰ. 훈련과정 개요')),
    ).toBe(true);
  });

  it('interviewOverview 의 과정명·훈련시간·훈련생수를 출력한다', () => {
    drawPBLOverviewPage(ctx, {
      ...baseData(),
      interviewOverview: {
        courseName: 'AI 활용 과정',
        trainingHours: 40,
        traineeCount: 10,
        trainingJob: '데이터 분석',
        aiLevel: '초급',
        trainingGoals: [],
      },
    });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('AI 활용 과정'))).toBe(true);
    expect(allText.some((t) => typeof t === 'string' && t.includes('40시간'))).toBe(true);
    expect(allText.some((t) => typeof t === 'string' && t.includes('10명'))).toBe(true);
  });

  it('trainingGoals 배열이 있으면 join 하여 출력한다', () => {
    drawPBLOverviewPage(ctx, {
      ...baseData(),
      interviewOverview: {
        courseName: '과정',
        trainingHours: 20,
        traineeCount: 5,
        trainingJob: '직무',
        aiLevel: '중급',
        trainingGoals: ['목표A', '목표B'],
      },
    });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('목표A, 목표B'))).toBe(true);
  });

  it('trainingGoals 배열이 비어있으면 "-" 를 출력한다', () => {
    drawPBLOverviewPage(ctx, {
      ...baseData(),
      interviewOverview: {
        courseName: '과정',
        trainingHours: 20,
        traineeCount: 5,
        trainingJob: '직무',
        aiLevel: '중급',
        trainingGoals: [],
      },
    });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t === '-')).toBe(true);
  });

  // ── hasFonts 분기 ─────────────────────────────────────────────────────
  it('hasFonts=true 이면 setFont 가 커스텀 폰트로 호출된다', () => {
    ctx.hasFonts = true;
    drawPBLOverviewPage(ctx, baseData());
    const fontCalls = mockDoc.setFont.mock.calls;
    // hasFonts=true 이면 helvetica가 아닌 커스텀 폰트명으로 호출
    expect(fontCalls.some((c) => c[0] !== 'helvetica')).toBe(true);
  });

  it('line() 이 여러 번 호출된다 (구분선 렌더링)', () => {
    drawPBLOverviewPage(ctx, baseData());
    expect(mockDoc.line.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  // ── interviewOverview 필드별 빈 값 → "-" 분기 커버 ────────────────────
  it('courseName 이 빈 문자열이면 "-" 를 출력한다', () => {
    drawPBLOverviewPage(ctx, {
      ...baseData(),
      interviewOverview: {
        courseName: '',
        trainingHours: 20,
        traineeCount: 5,
        trainingJob: '직무',
        aiLevel: '초급',
        trainingGoals: [],
      },
    });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => t === '-')).toBe(true);
  });

  it('trainingJob 이 빈 문자열이면 "-" 를 출력한다', () => {
    drawPBLOverviewPage(ctx, {
      ...baseData(),
      interviewOverview: {
        courseName: '과정',
        trainingHours: 20,
        traineeCount: 5,
        trainingJob: '',
        aiLevel: '',
        trainingGoals: [],
      },
    });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => t === '-')).toBe(true);
  });
});
