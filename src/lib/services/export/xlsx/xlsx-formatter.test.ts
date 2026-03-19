import { describe, expect, it } from 'vitest';
import type { RoadmapCell, RoadmapMatrixCell } from '../../roadmap';
import {
  getStatusLabel,
  formatDate,
  buildCourseNumberMap,
  formatMatrixCell,
  sumMatrixHours,
  calcRowHeight,
  formatTools,
  formatHours,
} from './xlsx-formatter';

// =============================================================================
// getStatusLabel
// =============================================================================

describe('getStatusLabel', () => {
  it.each([
    ['DRAFT', '초안'],
    ['FINAL', '확정본'],
    ['ARCHIVED', '보관본'],
  ])('상태 "%s" → "%s"로 변환한다', (status, expected) => {
    expect(getStatusLabel(status)).toBe(expected);
  });

  it('알 수 없는 상태는 원본 문자열을 그대로 반환한다', () => {
    expect(getStatusLabel('UNKNOWN')).toBe('UNKNOWN');
  });

  it('빈 문자열은 빈 문자열을 반환한다', () => {
    expect(getStatusLabel('')).toBe('');
  });
});

// =============================================================================
// formatDate
// =============================================================================

describe('formatDate', () => {
  it('ISO 날짜 문자열을 한국어 포맷으로 변환한다', () => {
    // UTC 기준 날짜 사용 — 로컬 시간대에 따라 일자가 다를 수 있으므로 Date 객체로 검증
    const dateStr = '2026-03-19T00:00:00Z';
    const d = new Date(dateStr);
    const expected = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    expect(formatDate(dateStr)).toBe(expected);
  });

  it('시간이 포함된 ISO 문자열도 올바르게 처리한다', () => {
    const dateStr = '2025-12-25T15:30:00+09:00';
    const d = new Date(dateStr);
    const expected = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    expect(formatDate(dateStr)).toBe(expected);
  });

  it('월/일이 한 자리일 때 0을 붙이지 않는다', () => {
    const dateStr = '2026-01-05T00:00:00Z';
    const result = formatDate(dateStr);
    const d = new Date(dateStr);
    // getMonth()+1이 1, getDate()가 5 (또는 시간대에 따라 4)
    expect(result).toContain(`${d.getMonth() + 1}월`);
    expect(result).toContain(`${d.getDate()}일`);
  });
});

// =============================================================================
// buildCourseNumberMap
// =============================================================================

describe('buildCourseNumberMap', () => {
  it('과정 목록으로 과정명→순번 매핑을 생성한다', () => {
    const courses = [
      { course_name: 'AI 기초' },
      { course_name: '데이터 분석' },
      { course_name: '딥러닝' },
    ] as RoadmapCell[];

    const map = buildCourseNumberMap(courses);
    expect(map.get('AI 기초')).toBe(1);
    expect(map.get('데이터 분석')).toBe(2);
    expect(map.get('딥러닝')).toBe(3);
    expect(map.size).toBe(3);
  });

  it('빈 과정 목록이면 빈 Map을 반환한다', () => {
    const map = buildCourseNumberMap([]);
    expect(map.size).toBe(0);
  });
});

// =============================================================================
// formatMatrixCell
// =============================================================================

describe('formatMatrixCell', () => {
  const numberMap = new Map<string, number>([
    ['AI 기초', 1],
    ['데이터 분석', 2],
  ]);

  it('undefined이면 "-"을 반환한다', () => {
    expect(formatMatrixCell(undefined, numberMap)).toBe('-');
  });

  it('빈 배열이면 "-"을 반환한다', () => {
    expect(formatMatrixCell([], numberMap)).toBe('-');
  });

  it('단일 과정을 번호와 함께 포맷한다', () => {
    const cells: RoadmapMatrixCell[] = [{ course_name: 'AI 기초', recommended_hours: 8 }];
    const result = formatMatrixCell(cells, numberMap);
    expect(result).toBe('No.1 AI 기초\n(8시간)');
  });

  it('다중 과정을 빈 줄로 구분한다', () => {
    const cells: RoadmapMatrixCell[] = [
      { course_name: 'AI 기초', recommended_hours: 8 },
      { course_name: '데이터 분석', recommended_hours: 16 },
    ];
    const result = formatMatrixCell(cells, numberMap);
    expect(result).toBe('No.1 AI 기초\n(8시간)\n\nNo.2 데이터 분석\n(16시간)');
  });

  it('numberMap에 없는 과정명은 번호 접두사 없이 포맷한다', () => {
    const cells: RoadmapMatrixCell[] = [{ course_name: '미등록 과정', recommended_hours: 4 }];
    const result = formatMatrixCell(cells, numberMap);
    expect(result).toBe('미등록 과정\n(4시간)');
  });
});

// =============================================================================
// sumMatrixHours
// =============================================================================

describe('sumMatrixHours', () => {
  it('undefined이면 0을 반환한다', () => {
    expect(sumMatrixHours(undefined)).toBe(0);
  });

  it('빈 배열이면 0을 반환한다', () => {
    expect(sumMatrixHours([])).toBe(0);
  });

  it('단일 셀의 시간을 반환한다', () => {
    const cells: RoadmapMatrixCell[] = [{ course_name: 'A', recommended_hours: 10 }];
    expect(sumMatrixHours(cells)).toBe(10);
  });

  it('다중 셀의 시간 합계를 반환한다', () => {
    const cells: RoadmapMatrixCell[] = [
      { course_name: 'A', recommended_hours: 8 },
      { course_name: 'B', recommended_hours: 16 },
      { course_name: 'C', recommended_hours: 4 },
    ];
    expect(sumMatrixHours(cells)).toBe(28);
  });
});

// =============================================================================
// calcRowHeight
// =============================================================================

describe('calcRowHeight', () => {
  const DEFAULT_BASE = 22;
  const _DEFAULT_LINE_HEIGHT = 14.5;

  it('빈 문자열이면 baseHeight를 반환한다', () => {
    expect(calcRowHeight('', 20)).toBe(DEFAULT_BASE);
  });

  it('falsy 텍스트이면 baseHeight를 반환한다', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(calcRowHeight(undefined as any, 20)).toBe(DEFAULT_BASE);
  });

  it('짧은 영문 텍스트는 baseHeight를 반환한다', () => {
    // "abc" = 3글자, colWidth=20 → charsPerLine = 20/1.8 ≈ 11.1
    // weightedLen = 3 (영문), lines = ceil(3/11.1) = 1
    // height = ceil(1 * 14.5) = 15 → max(22, 15) = 22
    expect(calcRowHeight('abc', 20)).toBe(DEFAULT_BASE);
  });

  it('한글 텍스트는 1.8배 폭 가중치가 적용된다', () => {
    // 한글 10자 → weightedLen = 10 * 1.8 = 18
    // colWidth=20 → charsPerLine = 20/1.8 ≈ 11.1
    // lines = ceil(18/11.1) = 2
    // height = ceil(2 * 14.5) = 29 → max(22, 29) = 29
    const text = '가나다라마바사아자차';
    expect(calcRowHeight(text, 20)).toBe(29);
  });

  it('개행 문자로 줄이 나뉘면 각 줄을 개별 계산한다', () => {
    // "abc\ndef" → 2줄, 각각 3글자
    // weightedLen = 3 (영문), charsPerLine = 20/1.8 ≈ 11.1
    // line1 = ceil(3/11.1) = 1, line2 = ceil(3/11.1) = 1
    // totalLines = 2, height = ceil(2 * 14.5) = 29 → max(22, 29) = 29
    expect(calcRowHeight('abc\ndef', 20)).toBe(29);
  });

  it('빈 줄은 0.6 라인으로 계산한다', () => {
    // "abc\n\ndef" → 3개 라인: "abc" → 1줄, "" → 0.6줄, "def" → 1줄
    // totalLines = 2.6, height = ceil(2.6 * 14.5) = ceil(37.7) = 38
    expect(calcRowHeight('abc\n\ndef', 20)).toBe(38);
  });

  it('영문/한글 혼합 텍스트 폭 계산이 정확하다', () => {
    // "A가B나" → 영문2(1*2) + 한글2(1.8*2) = 5.6
    // colWidth=10 → charsPerLine = 10/1.8 ≈ 5.56
    // lines = ceil(5.6/5.56) = ceil(1.007) = 2
    // height = ceil(2 * 14.5) = 29 → max(22, 29) = 29
    expect(calcRowHeight('A가B나', 10)).toBe(29);
  });

  it('커스텀 baseHeight와 lineHeight를 사용할 수 있다', () => {
    // "abc" → weightedLen = 3, colWidth=20 → charsPerLine ≈ 11.1
    // lines = 1, height = ceil(1 * 20) = 20 → max(30, 20) = 30
    expect(calcRowHeight('abc', 20, 30, 20)).toBe(30);
  });

  it('colWidthWch가 매우 작아도 최소 4글자로 처리한다', () => {
    // colWidth=1 → charsPerLine = max(1/1.8, 4) = 4
    // "가나다라마" = 5글자, weightedLen = 5 * 1.8 = 9
    // lines = ceil(9/4) = 3
    // height = ceil(3 * 14.5) = 44 → max(22, 44) = 44
    expect(calcRowHeight('가나다라마', 1)).toBe(44);
  });
});

// =============================================================================
// formatTools
// =============================================================================

describe('formatTools', () => {
  it('undefined이면 "-"을 반환한다', () => {
    expect(formatTools(undefined)).toBe('-');
  });

  it('빈 배열이면 "-"을 반환한다', () => {
    expect(formatTools([])).toBe('-');
  });

  it('단일 도구를 포맷한다', () => {
    const tools = [{ name: 'ChatGPT', free_tier_info: '무료' }];
    expect(formatTools(tools)).toBe('ChatGPT (무료)');
  });

  it('다중 도구를 쉼표로 구분한다', () => {
    const tools = [
      { name: 'ChatGPT', free_tier_info: '무료' },
      { name: 'Copilot', free_tier_info: '월 10회' },
    ];
    expect(formatTools(tools)).toBe('ChatGPT (무료), Copilot (월 10회)');
  });
});

// =============================================================================
// formatHours
// =============================================================================

describe('formatHours', () => {
  it('양수 시간을 "N시간" 형식으로 반환한다', () => {
    expect(formatHours(8)).toBe('8시간');
  });

  it('0시간은 "-"을 반환한다', () => {
    expect(formatHours(0)).toBe('-');
  });

  it('음수 시간은 "-"을 반환한다', () => {
    expect(formatHours(-1)).toBe('-');
  });
});
