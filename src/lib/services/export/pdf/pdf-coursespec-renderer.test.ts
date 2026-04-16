/**
 * pdf-coursespec-renderer.ts 테스트
 * Ⅲ-4. 훈련과정 명세서 섹션 렌더 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawCourseSpecSection } from './pdf-coursespec-renderer';
import { getAutoTableStyles } from './pdf-helpers';
import type { DocContext } from './pdf-helpers';
import type { RoadmapCourseSpec } from '../../roadmap';

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

function createSpec(overrides: Partial<RoadmapCourseSpec> = {}): RoadmapCourseSpec {
  return {
    course_name: '기초 과정',
    format: '집체',
    recommended_program: 'S-OJT',
    goal: '목표',
    main_content: '내용',
    target_audience: '신입',
    subjects: [
      { name: '과목1', details: '세부1', hours: 4 },
      { name: '과목2', details: '세부2', hours: 4 },
    ],
    ...overrides,
  };
}

describe('drawCourseSpecSection', () => {
  let mockDoc: ReturnType<typeof createMockDoc>;
  let ctx: DocContext;
  let autoTable: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockDoc = createMockDoc();
    ctx = { doc: mockDoc as never, y: 30, hasFonts: false };
    autoTable = vi.fn();
  });

  it('섹션 타이틀("Ⅲ-4")을 출력한다', () => {
    drawCourseSpecSection(ctx, [createSpec()], autoTable, getAutoTableStyles(false));

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('Ⅲ-4'))).toBe(true);
  });

  it('각 spec마다 과목 테이블 autoTable을 호출한다', () => {
    const specs = [createSpec(), createSpec({ course_name: '중급 과정' })];

    drawCourseSpecSection(ctx, specs, autoTable, getAutoTableStyles(false));

    expect(autoTable).toHaveBeenCalledTimes(2);
  });

  it('두 번째 spec부터는 새 페이지에서 시작한다', () => {
    const specs = [createSpec(), createSpec({ course_name: '중급' })];

    drawCourseSpecSection(ctx, specs, autoTable, getAutoTableStyles(false));

    // 첫 spec은 동일 페이지, 두 번째부터 addPage
    expect(mockDoc.addPage).toHaveBeenCalledTimes(1);
  });

  it('subjects를 테이블 body로 매핑한다 (3열: 과목명/세부내용/시간)', () => {
    drawCourseSpecSection(ctx, [createSpec()], autoTable, getAutoTableStyles(false));

    const head = autoTable.mock.calls[0][1].head;
    expect(head[0]).toEqual(['과목명', '세부내용', '시간']);

    const body = autoTable.mock.calls[0][1].body;
    expect(body[0]).toEqual(['과목1', '세부1', '4시간']);
  });

  it('과정명과 메타정보를 출력한다', () => {
    drawCourseSpecSection(
      ctx,
      [createSpec({ course_name: '프롬프트 엔지니어링', format: '원격', recommended_program: '국민내일배움카드' })],
      autoTable,
      getAutoTableStyles(false),
    );

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('프롬프트 엔지니어링'))).toBe(true);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('원격'))).toBe(true);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('국민내일배움카드'))).toBe(true);
  });

  it('subjects 시간의 합계를 출력한다', () => {
    drawCourseSpecSection(ctx, [createSpec()], autoTable, getAutoTableStyles(false));

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    // 4 + 4 = 8시간
    expect(
      textCalls.some(t => typeof t === 'string' && t.includes('총 교육시간') && t.includes('8시간')),
    ).toBe(true);
  });

  it('specs가 빈 배열이면 "등록된 훈련과정이 없습니다" 안내를 출력하고 autoTable은 호출되지 않는다', () => {
    drawCourseSpecSection(ctx, [], autoTable, getAutoTableStyles(false));

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('등록된 훈련과정이 없습니다'))).toBe(true);
    expect(autoTable).not.toHaveBeenCalled();
  });
});
