/**
 * pdf-annual-renderer.ts 테스트
 * Ⅲ-3. 연간 훈련계획 섹션 렌더 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawAnnualPlanSection } from './pdf-annual-renderer';
import { getAutoTableStyles } from './pdf-helpers';
import type { DocContext } from './pdf-helpers';

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
    getTextWidth: vi.fn(() => 40),
    lastAutoTable: { finalY: 100 },
  };
}

describe('drawAnnualPlanSection', () => {
  let mockDoc: ReturnType<typeof createMockDoc>;
  let ctx: DocContext;
  let autoTable: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDoc = createMockDoc();
    ctx = { doc: mockDoc as never, y: 30, hasFonts: false };
    autoTable = vi.fn();
  });

  it('섹션 타이틀("Ⅲ-3")을 출력한다', () => {
    drawAnnualPlanSection(ctx, undefined, autoTable, getAutoTableStyles(false));

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('Ⅲ-3'))).toBe(true);
  });

  it('items 테이블을 렌더한다 (5열)', () => {
    drawAnnualPlanSection(
      ctx,
      {
        items: [
          {
            competency_name: '역량A',
            course_name: '과정A',
            format: '집체',
            hours: 16,
            notes: '1분기',
          },
        ],
        usage_plan: '활용방안 텍스트',
      },
      autoTable,
      getAutoTableStyles(false),
    );

    const head = autoTable.mock.calls[0][1].head;
    expect(head[0]).toEqual(['역량명', '훈련과정명', '훈련형태', '훈련시간', '비고']);

    const body = autoTable.mock.calls[0][1].body;
    expect(body[0][0]).toBe('역량A');
    expect(body[0][3]).toBe('16시간');
  });

  it('활용방안 섹션을 출력한다', () => {
    drawAnnualPlanSection(
      ctx,
      { items: [], usage_plan: '올해 계획' },
      autoTable,
      getAutoTableStyles(false),
    );

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('활용방안'))).toBe(true);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('올해 계획'))).toBe(true);
  });

  it('plan이 undefined이면 placeholder row를 넣는다', () => {
    drawAnnualPlanSection(ctx, undefined, autoTable, getAutoTableStyles(false));

    const body = autoTable.mock.calls[0][1].body;
    expect(body).toHaveLength(1);
    expect(body[0][0]).toBe('-');
  });
});
