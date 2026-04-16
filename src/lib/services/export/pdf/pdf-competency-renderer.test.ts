/**
 * pdf-competency-renderer.ts 테스트
 * Ⅲ-1. 역량 모델링 섹션 렌더 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawCompetencySection } from './pdf-competency-renderer';
import { getAutoTableStyles } from './pdf-helpers';
import type { DocContext } from './pdf-helpers';
import type { RoadmapCompetency } from '../../roadmap';

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

describe('drawCompetencySection', () => {
  let mockDoc: ReturnType<typeof createMockDoc>;
  let ctx: DocContext;
  let autoTable: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDoc = createMockDoc();
    ctx = { doc: mockDoc as never, y: 30, hasFonts: false };
    autoTable = vi.fn();
  });

  it('섹션 타이틀을 출력한다', () => {
    drawCompetencySection(ctx, [], autoTable, getAutoTableStyles(false));

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('Ⅲ-1'))).toBe(true);
  });

  it('autoTable을 1회 호출한다', () => {
    const comps: RoadmapCompetency[] = [
      {
        name: '역량A',
        definition: '정의A',
        knowledge: ['K1'],
        skills: ['S1'],
        attitudes: ['A1'],
        ncs_used: true,
        ncs_methodology: 'L4',
      },
    ];
    drawCompetencySection(ctx, comps, autoTable, getAutoTableStyles(false));

    expect(autoTable).toHaveBeenCalledTimes(1);
  });

  it('ncs_used=true이면 NCS 활용 컬럼에 O를 넣는다', () => {
    const comps: RoadmapCompetency[] = [
      {
        name: '역량A',
        definition: '정의A',
        knowledge: [],
        skills: [],
        attitudes: [],
        ncs_used: true,
        ncs_methodology: 'NCS 방법',
      },
    ];
    drawCompetencySection(ctx, comps, autoTable, getAutoTableStyles(false));

    const body = autoTable.mock.calls[0][1].body;
    expect(body[0][5]).toBe('O');
    expect(body[0][6]).toBe('NCS 방법');
  });

  it('ncs_used=false이면 NCS 활용 컬럼에 X를 넣고 derivation_method를 사용한다', () => {
    const comps: RoadmapCompetency[] = [
      {
        name: '역량B',
        definition: '정의B',
        knowledge: [],
        skills: [],
        attitudes: [],
        ncs_used: false,
        ncs_derivation_method: '자체 도출',
      },
    ];
    drawCompetencySection(ctx, comps, autoTable, getAutoTableStyles(false));

    const body = autoTable.mock.calls[0][1].body;
    expect(body[0][5]).toBe('X');
    expect(body[0][6]).toBe('자체 도출');
  });

  it('knowledge/skills/attitudes를 불릿 리스트 문자열로 포맷한다', () => {
    const comps: RoadmapCompetency[] = [
      {
        name: '역량A',
        definition: '정의A',
        knowledge: ['k1', 'k2'],
        skills: ['s1'],
        attitudes: ['a1'],
        ncs_used: false,
        ncs_derivation_method: '-',
      },
    ];
    drawCompetencySection(ctx, comps, autoTable, getAutoTableStyles(false));

    const body = autoTable.mock.calls[0][1].body;
    expect(body[0][2]).toContain('k1');
    expect(body[0][2]).toContain('k2');
    expect(body[0][3]).toContain('s1');
    expect(body[0][4]).toContain('a1');
  });

  it('competencies가 비어있으면 placeholder row를 넣는다', () => {
    drawCompetencySection(ctx, [], autoTable, getAutoTableStyles(false));

    const body = autoTable.mock.calls[0][1].body;
    expect(body).toHaveLength(1);
    expect(body[0][0]).toBe('-');
  });

  it('y를 autoTable finalY + 10으로 업데이트한다', () => {
    mockDoc.lastAutoTable = { finalY: 150 };
    drawCompetencySection(ctx, [], autoTable, getAutoTableStyles(false));

    expect(ctx.y).toBe(160);
  });
});
