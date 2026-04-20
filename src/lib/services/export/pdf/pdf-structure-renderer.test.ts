/**
 * pdf-structure-renderer.ts 테스트
 * Ⅲ-2. 훈련체계도 섹션 렌더 검증 (양식 1번 6열 단순 표 + 수립 방법 박스)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawStructureSection } from './pdf-structure-renderer';
import { getAutoTableStyles } from './pdf-helpers';
import type { DocContext } from './pdf-helpers';
import type {
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
} from '../../roadmap';

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

describe('drawStructureSection (양식 1번 Ⅲ-2 6열 단순 표)', () => {
  let mockDoc: ReturnType<typeof createMockDoc>;
  let ctx: DocContext;
  let autoTable: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDoc = createMockDoc();
    ctx = { doc: mockDoc as never, y: 30, hasFonts: false };
    autoTable = vi.fn();
  });

  it('섹션 타이틀을 출력한다', () => {
    drawStructureSection(ctx, [], [], autoTable, getAutoTableStyles(false));

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('Ⅲ-2'))).toBe(true);
  });

  it('6열 단순 표 헤더 (구분(역량명)·훈련수준·훈련내용·훈련대상·훈련방법·훈련목표)', () => {
    const comps: RoadmapCompetency[] = [
      { name: '역량A', definition: '-', knowledge: [], skills: [], attitudes: [] },
    ];
    const struct: RoadmapTrainingStructureItem[] = [
      {
        competency_name: '역량A',
        level: 'BEGINNER',
        content: '내용B',
        target_audience: '대상B',
        method: '방법B',
        goal: '목표B',
      },
    ];

    drawStructureSection(ctx, comps, struct, autoTable, getAutoTableStyles(false));

    const head = autoTable.mock.calls[0][1].head;
    expect(head[0]).toEqual([
      '구분(역량명)',
      '훈련수준',
      '훈련내용',
      '훈련대상',
      '훈련방법',
      '훈련목표',
    ]);
  });

  it('한 역량의 여러 수준은 여러 행으로 전개되며 각 행은 6칸을 채운다', () => {
    const comps: RoadmapCompetency[] = [
      { name: '역량A', definition: '-', knowledge: [], skills: [], attitudes: [] },
    ];
    const struct: RoadmapTrainingStructureItem[] = [
      {
        competency_name: '역량A',
        level: 'BEGINNER',
        content: '내용B',
        target_audience: '대상B',
        method: '방법B',
        goal: '목표B',
      },
      {
        competency_name: '역량A',
        level: 'ADVANCED',
        content: '내용A',
        target_audience: '대상A',
        method: '방법A',
        goal: '목표A',
      },
    ];

    drawStructureSection(ctx, comps, struct, autoTable, getAutoTableStyles(false));

    const body = autoTable.mock.calls[0][1].body;
    expect(body).toHaveLength(2);
    // 초급/고급 정렬
    expect(body[0]).toEqual(['역량A', '초급', '내용B', '대상B', '방법B', '목표B']);
    expect(body[1]).toEqual(['역량A', '고급', '내용A', '대상A', '방법A', '목표A']);
  });

  it('비어 있으면 placeholder 6칸을 넣는다', () => {
    drawStructureSection(ctx, [], [], autoTable, getAutoTableStyles(false));

    const body = autoTable.mock.calls[0][1].body;
    expect(body).toHaveLength(1);
    expect(body[0]).toEqual(['-', '-', '-', '-', '-', '-']);
  });

  it('trainingStructureMethod 제공 시 별도 박스 렌더 (autoTable 2회)', () => {
    drawStructureSection(
      ctx,
      [],
      [],
      autoTable,
      getAutoTableStyles(false),
      '역량 기준 3수준 체계 수립',
    );

    expect(autoTable).toHaveBeenCalledTimes(2);
    const methodCall = autoTable.mock.calls[1][1];
    expect(methodCall.head[0][0]).toBe('훈련체계 수립 방법');
    expect(methodCall.body[0][0]).toBe('역량 기준 3수준 체계 수립');
  });

  it('trainingStructureMethod 빈 문자열 → 박스 렌더 안 함 (autoTable 1회)', () => {
    drawStructureSection(ctx, [], [], autoTable, getAutoTableStyles(false), '   ');

    expect(autoTable).toHaveBeenCalledTimes(1);
  });
});
