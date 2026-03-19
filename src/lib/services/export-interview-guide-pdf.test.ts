/**
 * export-interview-guide-pdf.ts 테스트
 * - generateInterviewGuidePDF: PDF 생성, 섹션 렌더링, 방어적 처리
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import type { GuideData } from '@/lib/schemas/interview-guide';

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
  addFileToVFS: vi.fn(),
  addFont: vi.fn(),
  getNumberOfPages: vi.fn(() => 1),
  splitTextToSize: vi.fn((text: string) => [text]),
  output: vi.fn(() => new Blob(['pdf-content'], { type: 'application/pdf' })),
};

function MockJsPDF() {
  return mockDoc;
}

vi.mock('jspdf', () => ({
  default: MockJsPDF,
}));

// fetch mock (폰트 로딩 실패 → hasFonts=false → helvetica 사용)
const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = vi.fn().mockRejectedValue(new Error('font not found'));
});

import { generateInterviewGuidePDF } from './export-interview-guide-pdf';

// ─── 테스트 데이터 헬퍼 ──────────────────────────────────────────────────────

function createTestGuideData(overrides: Partial<GuideData> = {}): GuideData {
  return {
    company_summary: '테스트 기업은 IT 업종으로 AI 도입 초기 단계입니다.',
    key_points: [
      { dimension: 'AI 성숙도', score_percent: 75, status: 'good', insight: 'AI 도입 경험이 있어 기반이 탄탄합니다.' },
      { dimension: '데이터 준비도', score_percent: 25, status: 'critical', insight: '데이터 관리 체계가 미흡합니다.' },
      { dimension: '인프라 준비도', score_percent: 45, status: 'warning', insight: '기본 인프라는 갖추었으나 GPU가 부족합니다.' },
    ],
    questions: [
      { id: 'q1', dimension: '데이터 준비도', question: '현재 데이터 수집 방식은?', intent: '데이터 파이프라인 파악', checked: true, is_custom: false },
      { id: 'q2', dimension: '인프라 준비도', question: '클라우드 사용 계획이 있나요?', intent: '인프라 확장 의향', checked: true, is_custom: false },
      { id: 'q3', dimension: 'AI 성숙도', question: 'AI 학습 경험이 있나요?', intent: 'AI 배경 확인', checked: false, is_custom: false },
    ],
    cautions: [
      'AI 성숙도는 높지만 데이터 준비도가 낮아 갭이 존재합니다.',
      '고객이 빠른 도입을 희망하므로 기대 관리가 필요합니다.',
    ],
    ...overrides,
  };
}

// ─── 테스트 ────────────────────────────────────────────────────────────────

describe('generateInterviewGuidePDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.output.mockReturnValue(new Blob(['pdf-content'], { type: 'application/pdf' }));
    mockDoc.getNumberOfPages.mockReturnValue(1);
    mockDoc.splitTextToSize.mockImplementation((text: string) => [text]);
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('font not found'));
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('정상 데이터로 Blob을 반환한다', async () => {
    const data = createTestGuideData();

    const result = await generateInterviewGuidePDF(data);

    expect(result).toBeInstanceOf(Blob);
  });

  it('기업 현황 요약 텍스트가 PDF에 포함된다', async () => {
    const data = createTestGuideData({
      company_summary: '삼성전자는 반도체 업종의 대기업으로 AI 전환을 추진 중입니다.',
    });

    await generateInterviewGuidePDF(data);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]);
    const hasSummary = textCalls.some(
      (t: unknown) => typeof t === 'string' && t.includes('삼성전자는 반도체 업종의 대기업'),
    );
    expect(hasSummary).toBe(true);
  });

  it('핵심 파악 포인트가 status 우선순위(critical → warning → good) 순으로 렌더링된다', async () => {
    const data = createTestGuideData();

    await generateInterviewGuidePDF(data);

    // key_points: critical(데이터 준비도 25%), warning(인프라 45%), good(AI 성숙도 75%)
    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]).filter(
      (t: unknown) => typeof t === 'string',
    ) as string[];

    const criticalIdx = textCalls.findIndex((t) => t.includes('[위험]') && t.includes('데이터 준비도'));
    const warningIdx = textCalls.findIndex((t) => t.includes('[주의]') && t.includes('인프라 준비도'));
    const goodIdx = textCalls.findIndex((t) => t.includes('[양호]') && t.includes('AI 성숙도'));

    expect(criticalIdx).toBeGreaterThan(-1);
    expect(warningIdx).toBeGreaterThan(-1);
    expect(goodIdx).toBeGreaterThan(-1);
    expect(criticalIdx).toBeLessThan(warningIdx);
    expect(warningIdx).toBeLessThan(goodIdx);
  });

  it('checked=true인 질문만 체크리스트에 포함된다', async () => {
    const data = createTestGuideData();

    await generateInterviewGuidePDF(data);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]).filter(
      (t: unknown) => typeof t === 'string',
    ) as string[];

    // checked=true: q1, q2
    const hasQ1 = textCalls.some((t) => t.includes('현재 데이터 수집 방식은?'));
    const hasQ2 = textCalls.some((t) => t.includes('클라우드 사용 계획이 있나요?'));
    // checked=false: q3
    const hasQ3 = textCalls.some((t) => t.includes('AI 학습 경험이 있나요?'));

    expect(hasQ1).toBe(true);
    expect(hasQ2).toBe(true);
    expect(hasQ3).toBe(false);
  });

  it('모든 질문이 unchecked이면 "선택된 질문이 없습니다." 메시지를 출력한다', async () => {
    const data = createTestGuideData({
      questions: [
        { id: 'q1', dimension: '데이터 준비도', question: '질문1', intent: '의도1', checked: false, is_custom: false },
      ],
    });

    await generateInterviewGuidePDF(data);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]).filter(
      (t: unknown) => typeof t === 'string',
    ) as string[];
    const hasEmptyMsg = textCalls.some((t) => t.includes('선택된 질문이 없습니다.'));
    expect(hasEmptyMsg).toBe(true);
  });

  it('주의사항이 PDF에 포함된다', async () => {
    const data = createTestGuideData({
      cautions: ['인터뷰 시 비밀 유지 동의를 먼저 받으세요.'],
    });

    await generateInterviewGuidePDF(data);

    // splitTextToSize에 caution 텍스트가 전달되는지 확인
    const splitCalls = mockDoc.splitTextToSize.mock.calls.map((c: unknown[]) => c[0]).filter(
      (t: unknown) => typeof t === 'string',
    ) as string[];
    const hasCaution = splitCalls.some((t) => t.includes('인터뷰 시 비밀 유지 동의를 먼저 받으세요.'));
    expect(hasCaution).toBe(true);
  });

  it('푸터에 "KPC AI 교육 로드맵 대시보드"와 페이지 번호가 렌더링된다', async () => {
    mockDoc.getNumberOfPages.mockReturnValue(2);
    const data = createTestGuideData();

    await generateInterviewGuidePDF(data);

    // setPage가 각 페이지에 대해 호출
    expect(mockDoc.setPage).toHaveBeenCalledWith(1);
    expect(mockDoc.setPage).toHaveBeenCalledWith(2);

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0]).filter(
      (t: unknown) => typeof t === 'string',
    ) as string[];

    const hasFooterLabel = textCalls.some((t) => t === 'KPC AI 교육 로드맵 대시보드');
    const hasPageNumber = textCalls.some((t) => t === '1 / 2');

    expect(hasFooterLabel).toBe(true);
    expect(hasPageNumber).toBe(true);
  });
});
