/**
 * xlsx-formatter.ts 테스트 (산인공 4섹션 전환)
 */

import { describe, expect, it } from 'vitest';
import type { RoadmapCourseSpec } from '../../roadmap';
import {
  getStatusLabel,
  formatDate,
  getLevelLabel,
  formatHours,
  formatBulletLines,
  formatNcsUsed,
  sumSubjectHours,
  calcRowHeight,
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
    const dateStr = '2026-03-19T00:00:00Z';
    const d = new Date(dateStr);
    const expected = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    expect(formatDate(dateStr)).toBe(expected);
  });

  it('월/일이 한 자리일 때 0을 붙이지 않는다', () => {
    const dateStr = '2026-01-05T00:00:00Z';
    const result = formatDate(dateStr);
    const d = new Date(dateStr);
    expect(result).toContain(`${d.getMonth() + 1}월`);
    expect(result).toContain(`${d.getDate()}일`);
  });
});

// =============================================================================
// getLevelLabel
// =============================================================================

describe('getLevelLabel', () => {
  it.each([
    ['BEGINNER', '초급'],
    ['INTERMEDIATE', '중급'],
    ['ADVANCED', '고급'],
  ] as const)('%s → %s', (level, expected) => {
    expect(getLevelLabel(level)).toBe(expected);
  });

  it('unknown 레벨은 원본 문자열을 반환한다', () => {
    expect(getLevelLabel('XYZ')).toBe('XYZ');
  });
});

// =============================================================================
// formatHours
// =============================================================================

describe('formatHours', () => {
  it('양수는 "N시간" 형식을 반환한다', () => {
    expect(formatHours(8)).toBe('8시간');
  });

  it('0/음수는 "-"을 반환한다', () => {
    expect(formatHours(0)).toBe('-');
    expect(formatHours(-3)).toBe('-');
  });
});

// =============================================================================
// formatBulletLines
// =============================================================================

describe('formatBulletLines', () => {
  it('undefined이면 "-"을 반환한다', () => {
    expect(formatBulletLines(undefined)).toBe('-');
  });

  it('빈 배열이면 "-"을 반환한다', () => {
    expect(formatBulletLines([])).toBe('-');
  });

  it('각 아이템을 불릿으로 접두하고 줄바꿈으로 구분한다', () => {
    expect(formatBulletLines(['a', 'b'])).toBe('• a\n• b');
  });
});

// =============================================================================
// formatNcsUsed
// =============================================================================

describe('formatNcsUsed', () => {
  it('true → "O", false → "X"', () => {
    expect(formatNcsUsed(true)).toBe('O');
    expect(formatNcsUsed(false)).toBe('X');
  });
});

// =============================================================================
// sumSubjectHours
// =============================================================================

describe('sumSubjectHours', () => {
  it('subjects의 시간 합계를 반환한다', () => {
    const spec: RoadmapCourseSpec = {
      course_name: 'C',
      format: '-',
      recommended_program: '-',
      goal: '-',
      main_content: '-',
      target_audience: '-',
      subjects: [
        { name: '과목1', details: '-', hours: 4 },
        { name: '과목2', details: '-', hours: 6 },
      ],
    };
    expect(sumSubjectHours(spec)).toBe(10);
  });

  it('undefined이면 0을 반환한다', () => {
    expect(sumSubjectHours(undefined)).toBe(0);
  });

  it('빈 subjects는 0을 반환한다', () => {
    const spec: RoadmapCourseSpec = {
      course_name: '-',
      format: '-',
      recommended_program: '-',
      goal: '-',
      main_content: '-',
      target_audience: '-',
      subjects: [],
    };
    expect(sumSubjectHours(spec)).toBe(0);
  });
});

// =============================================================================
// calcRowHeight
// =============================================================================

describe('calcRowHeight', () => {
  const DEFAULT_BASE = 22;

  it('빈 문자열이면 baseHeight를 반환한다', () => {
    expect(calcRowHeight('', 20)).toBe(DEFAULT_BASE);
  });

  it('falsy 텍스트이면 baseHeight를 반환한다', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(calcRowHeight(undefined as any, 20)).toBe(DEFAULT_BASE);
  });

  it('한글 텍스트는 1.8배 폭 가중치가 적용된다', () => {
    const text = '가나다라마바사아자차';
    expect(calcRowHeight(text, 20)).toBe(29);
  });

  it('개행 문자로 줄이 나뉘면 각 줄을 개별 계산한다', () => {
    expect(calcRowHeight('abc\ndef', 20)).toBe(29);
  });

  it('커스텀 baseHeight/lineHeight를 사용할 수 있다', () => {
    expect(calcRowHeight('abc', 20, 30, 20)).toBe(30);
  });
});
