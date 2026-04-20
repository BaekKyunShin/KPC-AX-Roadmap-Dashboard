/**
 * pdf-cover-renderer.ts 테스트
 * 표지(타이틀/메타/진단 요약) 렌더 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawCoverPage } from './pdf-cover-renderer';
import type { DocContext } from './pdf-helpers';

function createMockDoc() {
  return {
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    getTextWidth: vi.fn(() => 40),
    lastAutoTable: undefined as undefined | { finalY: number },
  };
}

describe('drawCoverPage', () => {
  let mockDoc: ReturnType<typeof createMockDoc>;
  let ctx: DocContext;

  beforeEach(() => {
    mockDoc = createMockDoc();
    ctx = { doc: mockDoc as never, y: 20, hasFonts: false };
  });

  it('타이틀("AI 교육 훈련 로드맵")을 출력한다', () => {
    drawCoverPage(ctx, {
      companyName: '삼성전자',
      versionNumber: 1,
      status: 'DRAFT',
      createdAt: '2026-02-01T00:00:00Z',
      diagnosisSummary: '요약',
    });

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('AI 교육 훈련 로드맵'))).toBe(true);
  });

  it('기업명과 버전을 출력한다', () => {
    drawCoverPage(ctx, {
      companyName: 'LG전자',
      versionNumber: 5,
      status: 'FINAL',
      createdAt: '2026-02-01T00:00:00Z',
      diagnosisSummary: '-',
    });

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('LG전자'))).toBe(true);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('v5'))).toBe(true);
    expect(textCalls.some(t => typeof t === 'string' && t.includes('FINAL'))).toBe(true);
  });

  it('확정일이 있으면 출력한다', () => {
    drawCoverPage(ctx, {
      companyName: '테스트',
      versionNumber: 1,
      status: 'FINAL',
      createdAt: '2026-02-01T00:00:00Z',
      finalizedAt: '2026-03-01T00:00:00Z',
      diagnosisSummary: '-',
    });

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(t => typeof t === 'string' && t === '확정일')).toBe(true);
  });

  it('확정일이 없으면 "확정일" 라벨을 출력하지 않는다', () => {
    drawCoverPage(ctx, {
      companyName: '테스트',
      versionNumber: 1,
      status: 'DRAFT',
      createdAt: '2026-02-01T00:00:00Z',
      finalizedAt: null,
      diagnosisSummary: '-',
    });

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(t => typeof t === 'string' && t === '확정일')).toBe(false);
  });

  it('진단 요약 섹션 타이틀을 출력한다', () => {
    drawCoverPage(ctx, {
      companyName: '테스트',
      versionNumber: 1,
      status: 'DRAFT',
      createdAt: '2026-02-01T00:00:00Z',
      diagnosisSummary: '요약 본문',
    });

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls.some(t => typeof t === 'string' && t === '진단 요약')).toBe(true);
  });
});
