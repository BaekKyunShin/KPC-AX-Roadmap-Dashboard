/**
 * pdf-pbl-performance-renderer.ts 테스트
 * PBL Ⅴ장 성과분석 및 확산 전략 렌더러 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawPBLPerformanceSection } from './pdf-pbl-performance-renderer';
import type { DocContext } from './pdf-helpers';
import type { PBLPerformanceAnalysis } from '../../pbl/pbl-types';

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

/** 기본 완전 채워진 분석 데이터 */
function baseAnalysis(): PBLPerformanceAnalysis {
  return {
    training_goal_categories: ['기술문제 해결', '공정 최적화'],
    quantitative_metrics: ['불량률 10% 감소', '생산성 20% 향상'],
    qualitative_metrics: ['팀원 AI 활용 역량 향상'],
    internalization_plan: ['사내 교육 운영', '매뉴얼 정비'],
    dissemination_plan: ['전사 워크숍 개최'],
  };
}

describe('drawPBLPerformanceSection', () => {
  let mockDoc: ReturnType<typeof createMockDoc>;
  let ctx: DocContext;

  beforeEach(() => {
    mockDoc = createMockDoc();
    ctx = { doc: mockDoc as never, y: 30, hasFonts: false };
  });

  // ── 섹션/서브섹션 타이틀 ────────────────────────────────────────────────
  it('"Ⅴ. 성과분석 및 확산 전략" 섹션 타이틀을 출력한다', () => {
    drawPBLPerformanceSection(ctx, baseAnalysis());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('Ⅴ. 성과분석 및 확산 전략')),
    ).toBe(true);
  });

  it('"Ⅴ-1. 성과분석 측정 지표" 서브섹션 타이틀을 출력한다', () => {
    drawPBLPerformanceSection(ctx, baseAnalysis());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('Ⅴ-1. 성과분석 측정 지표')),
    ).toBe(true);
  });

  it('"Ⅴ-2. 성과 확산 전략" 서브섹션 타이틀을 출력한다', () => {
    drawPBLPerformanceSection(ctx, baseAnalysis());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('Ⅴ-2. 성과 확산 전략')),
    ).toBe(true);
  });

  // ── 훈련 목표 분류 ────────────────────────────────────────────────────
  it('training_goal_categories 를 join 하여 출력한다', () => {
    drawPBLPerformanceSection(ctx, baseAnalysis());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('기술문제 해결, 공정 최적화')),
    ).toBe(true);
  });

  it('training_goal_categories 가 비어있으면 "-" 를 출력한다', () => {
    drawPBLPerformanceSection(ctx, { ...baseAnalysis(), training_goal_categories: [] });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => t === '-')).toBe(true);
  });

  // ── 정량 지표 ──────────────────────────────────────────────────────────
  it('quantitative_metrics 각 항목을 bullet 으로 출력한다', () => {
    drawPBLPerformanceSection(ctx, baseAnalysis());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('불량률 10% 감소')),
    ).toBe(true);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('생산성 20% 향상')),
    ).toBe(true);
  });

  it('quantitative_metrics 가 비어있으면 "-" bullet 을 출력한다', () => {
    drawPBLPerformanceSection(ctx, { ...baseAnalysis(), quantitative_metrics: [] });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => t === '-')).toBe(true);
  });

  // ── 정성 지표 ──────────────────────────────────────────────────────────
  it('qualitative_metrics 항목을 출력한다', () => {
    drawPBLPerformanceSection(ctx, baseAnalysis());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('팀원 AI 활용 역량 향상')),
    ).toBe(true);
  });

  it('qualitative_metrics 가 비어있으면 "-" bullet 을 출력한다', () => {
    drawPBLPerformanceSection(ctx, { ...baseAnalysis(), qualitative_metrics: [] });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => t === '-')).toBe(true);
  });

  // ── 내재화 방안 ────────────────────────────────────────────────────────
  it('internalization_plan 항목을 출력한다', () => {
    drawPBLPerformanceSection(ctx, baseAnalysis());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('사내 교육 운영'))).toBe(true);
  });

  it('internalization_plan 이 비어있으면 "-" bullet 을 출력한다', () => {
    drawPBLPerformanceSection(ctx, { ...baseAnalysis(), internalization_plan: [] });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => t === '-')).toBe(true);
  });

  // ── 전사 확산 방안 ──────────────────────────────────────────────────────
  it('dissemination_plan 항목을 출력한다', () => {
    drawPBLPerformanceSection(ctx, baseAnalysis());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('전사 워크숍 개최')),
    ).toBe(true);
  });

  it('dissemination_plan 이 비어있으면 "-" bullet 을 출력한다', () => {
    drawPBLPerformanceSection(ctx, { ...baseAnalysis(), dissemination_plan: [] });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => t === '-')).toBe(true);
  });

  // ── y 진행 검증 ─────────────────────────────────────────────────────────
  it('렌더 완료 후 ctx.y 가 시작값보다 크다', () => {
    const startY = ctx.y;
    drawPBLPerformanceSection(ctx, baseAnalysis());
    expect(ctx.y).toBeGreaterThan(startY);
  });

  // ── 모든 배열이 비어있는 엣지 케이스 ──────────────────────────────────
  it('모든 배열이 빈 경우에도 오류 없이 완료된다', () => {
    const empty: PBLPerformanceAnalysis = {
      training_goal_categories: [],
      quantitative_metrics: [],
      qualitative_metrics: [],
      internalization_plan: [],
      dissemination_plan: [],
    };
    expect(() => drawPBLPerformanceSection(ctx, empty)).not.toThrow();
  });

  // ── 레이블 출력 검증 ────────────────────────────────────────────────────
  it('"정량 지표", "정성 지표", "내재화 방안", "전사 확산 방안" 레이블을 출력한다', () => {
    drawPBLPerformanceSection(ctx, baseAnalysis());
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('정량 지표'))).toBe(true);
    expect(allText.some((t) => typeof t === 'string' && t.includes('정성 지표'))).toBe(true);
    expect(allText.some((t) => typeof t === 'string' && t.includes('내재화 방안'))).toBe(true);
    expect(allText.some((t) => typeof t === 'string' && t.includes('전사 확산 방안'))).toBe(true);
  });
});
