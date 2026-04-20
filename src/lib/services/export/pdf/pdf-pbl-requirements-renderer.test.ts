/**
 * pdf-pbl-requirements-renderer.ts 테스트
 * PBL Ⅱ·Ⅲ장 요구분석·훈련대상 업무 렌더러 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawPBLRequirementsSection } from './pdf-pbl-requirements-renderer';
import type { PBLRequirementsData } from './pdf-pbl-requirements-renderer';
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
    getTextWidth: vi.fn(() => 20),
    lastAutoTable: { finalY: 100 },
  };
}

describe('drawPBLRequirementsSection', () => {
  let mockDoc: ReturnType<typeof createMockDoc>;
  let ctx: DocContext;

  beforeEach(() => {
    mockDoc = createMockDoc();
    ctx = { doc: mockDoc as never, y: 30, hasFonts: false };
  });

  // ── 빈 콘텐츠 → 조기 반환 ─────────────────────────────────────────────
  it('모든 필드가 비어있으면 text() 를 호출하지 않는다', () => {
    drawPBLRequirementsSection(ctx, {});
    expect(mockDoc.text.mock.calls).toHaveLength(0);
  });

  it('trainingNeedsAnalysis 가 공백 문자열이면 렌더링하지 않는다', () => {
    drawPBLRequirementsSection(ctx, { trainingNeedsAnalysis: '   ' });
    expect(mockDoc.text.mock.calls).toHaveLength(0);
  });

  it('selectionReason 이 공백 문자열이면 렌더링하지 않는다', () => {
    drawPBLRequirementsSection(ctx, { selectionReason: '   ' });
    expect(mockDoc.text.mock.calls).toHaveLength(0);
  });

  it('targetTaskDetails 가 빈 배열이고 나머지도 없으면 렌더링하지 않는다', () => {
    drawPBLRequirementsSection(ctx, { targetTaskDetails: [] });
    expect(mockDoc.text.mock.calls).toHaveLength(0);
  });

  // ── 섹션 타이틀 ───────────────────────────────────────────────────────
  it('유효한 데이터가 있으면 섹션 타이틀을 출력한다', () => {
    drawPBLRequirementsSection(ctx, { trainingNeedsAnalysis: '훈련 요구 분석 내용' });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some(
        (t) => typeof t === 'string' && t.includes('Ⅱ·Ⅲ. 요구분석·훈련대상 업무 요약'),
      ),
    ).toBe(true);
  });

  // ── trainingNeedsAnalysis ──────────────────────────────────────────────
  it('trainingNeedsAnalysis 서브섹션 타이틀과 본문을 출력한다', () => {
    drawPBLRequirementsSection(ctx, { trainingNeedsAnalysis: 'AI 도입 요구사항 분석 결과' });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('AI 훈련 요구분석 결과')),
    ).toBe(true);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('AI 도입 요구사항 분석 결과')),
    ).toBe(true);
  });

  it('trainingNeedsAnalysis 렌더 후 ctx.y 가 증가한다', () => {
    const beforeY = ctx.y;
    drawPBLRequirementsSection(ctx, { trainingNeedsAnalysis: '분석 내용' });
    expect(ctx.y).toBeGreaterThan(beforeY);
  });

  // ── selectionReason ────────────────────────────────────────────────────
  it('selectionReason 서브섹션 타이틀과 본문을 출력한다', () => {
    drawPBLRequirementsSection(ctx, { selectionReason: '핵심 업무 집중 필요' });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('훈련대상 업무 선정 사유')),
    ).toBe(true);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('핵심 업무 집중 필요')),
    ).toBe(true);
  });

  // ── targetTaskDetails ──────────────────────────────────────────────────
  it('targetTaskDetails 가 있으면 서브섹션 타이틀을 출력한다', () => {
    const data: PBLRequirementsData = {
      targetTaskDetails: [
        {
          task_name: '데이터 분석 업무',
          as_is: '수작업',
          to_be: 'AI 자동화',
          required_knowledge: 'Python',
          required_skill: '데이터 전처리',
        },
      ],
    };
    drawPBLRequirementsSection(ctx, data);
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('훈련대상 업무 세부내용')),
    ).toBe(true);
  });

  it('targetTaskDetails 의 업무명을 "● task_name" 형식으로 출력한다', () => {
    drawPBLRequirementsSection(ctx, {
      targetTaskDetails: [
        {
          task_name: '품질 검사',
          as_is: '현황',
          to_be: '목표',
          required_knowledge: '지식',
          required_skill: '기술',
        },
      ],
    });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('● 품질 검사'))).toBe(true);
  });

  it('targetTaskDetails 의 As-Is / To-Be 필드를 출력한다', () => {
    drawPBLRequirementsSection(ctx, {
      targetTaskDetails: [
        {
          task_name: '업무',
          as_is: '현재 상태',
          to_be: '목표 상태',
          required_knowledge: '지식A',
          required_skill: '기술B',
        },
      ],
    });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('현재 상태'))).toBe(true);
    expect(allText.some((t) => typeof t === 'string' && t.includes('목표 상태'))).toBe(true);
  });

  it('targetTaskDetails 의 as_is 가 빈 문자열이면 "-" 를 출력한다', () => {
    drawPBLRequirementsSection(ctx, {
      targetTaskDetails: [
        {
          task_name: '업무',
          as_is: '',
          to_be: '',
          required_knowledge: '',
          required_skill: '',
        },
      ],
    });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.filter((t) => t === '-').length).toBeGreaterThanOrEqual(4);
  });

  it('targetTaskDetails 가 여러 항목이면 모두 순회하여 출력한다', () => {
    drawPBLRequirementsSection(ctx, {
      targetTaskDetails: [
        {
          task_name: '업무1',
          as_is: 'a',
          to_be: 'b',
          required_knowledge: 'c',
          required_skill: 'd',
        },
        {
          task_name: '업무2',
          as_is: 'e',
          to_be: 'f',
          required_knowledge: 'g',
          required_skill: 'h',
        },
      ],
    });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(allText.some((t) => typeof t === 'string' && t.includes('● 업무1'))).toBe(true);
    expect(allText.some((t) => typeof t === 'string' && t.includes('● 업무2'))).toBe(true);
  });

  // ── 복합 케이스 ────────────────────────────────────────────────────────
  it('모든 필드가 있으면 세 섹션을 모두 출력한다', () => {
    drawPBLRequirementsSection(ctx, {
      trainingNeedsAnalysis: '요구분석 내용',
      selectionReason: '선정 사유',
      targetTaskDetails: [
        {
          task_name: '업무',
          as_is: 'a',
          to_be: 'b',
          required_knowledge: 'c',
          required_skill: 'd',
        },
      ],
    });
    const allText = mockDoc.text.mock.calls.map((c) => c[0]);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('AI 훈련 요구분석 결과')),
    ).toBe(true);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('훈련대상 업무 선정 사유')),
    ).toBe(true);
    expect(
      allText.some((t) => typeof t === 'string' && t.includes('훈련대상 업무 세부내용')),
    ).toBe(true);
  });

  it('ctx.y 가 함수 종료 후 최소 4 이상 증가한다 (후미 마진 포함)', () => {
    const startY = ctx.y;
    drawPBLRequirementsSection(ctx, { trainingNeedsAnalysis: '내용' });
    expect(ctx.y - startY).toBeGreaterThanOrEqual(4);
  });
});
