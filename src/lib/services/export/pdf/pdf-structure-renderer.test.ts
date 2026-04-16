/**
 * pdf-structure-renderer.ts 테스트
 * Ⅲ-2. 훈련체계도 섹션 렌더 검증
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

describe('drawStructureSection', () => {
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

  it('역량×수준 매트릭스 테이블을 렌더한다 (4열)', () => {
    const comps: RoadmapCompetency[] = [
      {
        name: '역량A',
        definition: '-',
        knowledge: [],
        skills: [],
        attitudes: [],
        ncs_used: false,
        ncs_derivation_method: '-',
      },
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

    expect(autoTable).toHaveBeenCalledTimes(1);
    const body = autoTable.mock.calls[0][1].body;
    const head = autoTable.mock.calls[0][1].head;
    expect(head[0]).toEqual(['역량명', '초급', '중급', '고급']);
    expect(body[0][0]).toBe('역량A');
    expect(body[0][1]).toContain('내용B'); // 초급
    expect(body[0][2]).toBe('-'); // 중급 없음
    expect(body[0][3]).toContain('내용A'); // 고급
  });

  it('비어 있으면 placeholder row를 넣는다', () => {
    drawStructureSection(ctx, [], [], autoTable, getAutoTableStyles(false));

    const body = autoTable.mock.calls[0][1].body;
    expect(body).toHaveLength(1);
    expect(body[0][0]).toBe('-');
  });

  it('셀 내 content/target/method/goal 라벨을 포함한다', () => {
    const comps: RoadmapCompetency[] = [
      {
        name: '역량A',
        definition: '-',
        knowledge: [],
        skills: [],
        attitudes: [],
        ncs_used: false,
        ncs_derivation_method: '-',
      },
    ];
    const struct: RoadmapTrainingStructureItem[] = [
      {
        competency_name: '역량A',
        level: 'INTERMEDIATE',
        content: 'CX',
        target_audience: 'TX',
        method: 'MX',
        goal: 'GX',
      },
    ];

    drawStructureSection(ctx, comps, struct, autoTable, getAutoTableStyles(false));

    const cell = autoTable.mock.calls[0][1].body[0][2]; // 중급 셀
    expect(cell).toContain('[내용]');
    expect(cell).toContain('CX');
    expect(cell).toContain('[대상]');
    expect(cell).toContain('[방법]');
    expect(cell).toContain('[목표]');
  });
});
