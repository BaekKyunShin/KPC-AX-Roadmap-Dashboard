/**
 * pdf-competency-renderer.ts 테스트
 * Ⅲ-1. 역량 모델링 섹션 렌더 검증 (표 + NCS 박스)
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

  it('ncs 정보 없이 호출하면 역량 표만 1회 출력', () => {
    const comps: RoadmapCompetency[] = [
      {
        name: '역량A',
        definition: '정의A',
        knowledge: ['K1'],
        skills: ['S1'],
        attitudes: ['A1'],
      },
    ];
    drawCompetencySection(ctx, comps, autoTable, getAutoTableStyles(false));

    expect(autoTable).toHaveBeenCalledTimes(1);
  });

  it('ncs_used=true + methodology 제공 시 NCS 활용 방법 박스를 추가 렌더(autoTable 2회)', () => {
    const comps: RoadmapCompetency[] = [
      {
        name: '역량A',
        definition: '정의A',
        knowledge: [],
        skills: [],
        attitudes: [],
      },
    ];
    drawCompetencySection(ctx, comps, autoTable, getAutoTableStyles(false), {
      ncs_used: true,
      ncs_methodology: 'NCS 빅데이터 세분류 활용',
      ncs_derivation_method: '',
    });

    expect(autoTable).toHaveBeenCalledTimes(2);
    const ncsCall = autoTable.mock.calls[1][1];
    expect(ncsCall.head[0][0]).toBe('NCS 활용 방법');
    expect(ncsCall.body[0][0]).toBe('NCS 빅데이터 세분류 활용');
  });

  it('ncs_used=false + derivation_method 제공 시 역량별 도출 방법 박스 렌더', () => {
    const comps: RoadmapCompetency[] = [
      {
        name: '역량B',
        definition: '정의B',
        knowledge: [],
        skills: [],
        attitudes: [],
      },
    ];
    drawCompetencySection(ctx, comps, autoTable, getAutoTableStyles(false), {
      ncs_used: false,
      ncs_methodology: '',
      ncs_derivation_method: '자체 도출',
    });

    const ncsCall = autoTable.mock.calls[1][1];
    expect(ncsCall.head[0][0]).toBe('역량별 도출 방법');
    expect(ncsCall.body[0][0]).toBe('자체 도출');
  });

  it('knowledge/skills/attitudes를 불릿 리스트 문자열로 포맷한다', () => {
    const comps: RoadmapCompetency[] = [
      {
        name: '역량A',
        definition: '정의A',
        knowledge: ['k1', 'k2'],
        skills: ['s1'],
        attitudes: ['a1'],
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

  it('ncs 박스 없을 때 y는 autoTable finalY + 일부 offset으로 업데이트', () => {
    mockDoc.lastAutoTable = { finalY: 150 };
    drawCompetencySection(ctx, [], autoTable, getAutoTableStyles(false));

    expect(ctx.y).toBeGreaterThan(150);
  });

  it('역량 필드 전부 비어있으면 "-" 로 placeholder 채움', () => {
    const comps: RoadmapCompetency[] = [
      {
        name: '',
        definition: '',
        knowledge: [],
        skills: [],
        attitudes: [],
      },
    ];
    drawCompetencySection(ctx, comps, autoTable, getAutoTableStyles(false));

    const body = autoTable.mock.calls[0][1].body;
    expect(body[0]).toEqual(['-', '-', '-', '-', '-']);
  });

  it('ncs_used=true 인데 methodology 가 빈 문자열(trim 후)이면 "-" 표시', () => {
    drawCompetencySection(ctx, [], autoTable, getAutoTableStyles(false), {
      ncs_used: true,
      ncs_methodology: '   ',
      ncs_derivation_method: '',
    });
    const ncsCall = autoTable.mock.calls[1][1];
    expect(ncsCall.body[0][0]).toBe('-');
  });

  it('ncs_used=false 인데 derivation_method 가 빈 문자열(trim 후)이면 "-" 표시', () => {
    drawCompetencySection(ctx, [], autoTable, getAutoTableStyles(false), {
      ncs_used: false,
      ncs_methodology: '',
      ncs_derivation_method: '',
    });
    const ncsCall = autoTable.mock.calls[1][1];
    expect(ncsCall.body[0][0]).toBe('-');
  });
});
