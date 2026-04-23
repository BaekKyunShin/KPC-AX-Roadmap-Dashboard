import { describe, it, expect } from 'vitest';
import { formatTimeRange } from './time';

describe('formatTimeRange (ISSUE-10 Step C-2)', () => {
  it('시작과 종료가 모두 있으면 "start~end" 포맷', () => {
    expect(formatTimeRange('14:00', '16:00')).toBe('14:00~16:00');
  });

  it('시작만 있으면 시작 시간만 반환', () => {
    expect(formatTimeRange('14:00', '')).toBe('14:00');
    expect(formatTimeRange('14:00', undefined)).toBe('14:00');
    expect(formatTimeRange('14:00', null)).toBe('14:00');
  });

  it('종료만 있으면 종료 시간만 반환', () => {
    expect(formatTimeRange('', '16:00')).toBe('16:00');
    expect(formatTimeRange(undefined, '16:00')).toBe('16:00');
    expect(formatTimeRange(null, '16:00')).toBe('16:00');
  });

  it('둘 다 없거나 빈 문자열이면 빈 문자열', () => {
    expect(formatTimeRange('', '')).toBe('');
    expect(formatTimeRange(undefined, undefined)).toBe('');
    expect(formatTimeRange(null, null)).toBe('');
    expect(formatTimeRange()).toBe('');
  });

  it('공백만 있는 값도 빈 문자열로 취급한다', () => {
    expect(formatTimeRange('  ', '  ')).toBe('');
    expect(formatTimeRange('14:00', '   ')).toBe('14:00');
  });
});
