import { describe, expect, it } from 'vitest';

import { formatReportDate } from './hwpx-date';

describe('formatReportDate', () => {
  it('ISO 문자열 → "YYYY. MM. DD." (UTC 기준, 로케일 무관)', () => {
    expect(formatReportDate('2026-04-30T00:00:00Z')).toBe('2026. 04. 30.');
  });

  it('월·일 한 자리 → 0 패딩', () => {
    expect(formatReportDate('2026-01-05T09:00:00Z')).toBe('2026. 01. 05.');
  });

  it('Date 객체 입력도 동일 포맷', () => {
    expect(formatReportDate(new Date('2026-12-09T23:59:59Z'))).toBe('2026. 12. 09.');
  });

  it('타임존과 무관하게 UTC 성분으로 포맷 (자정 경계 결정론)', () => {
    // 로컬 타임존이 UTC 뒤/앞이어도 항상 UTC 날짜를 사용한다.
    expect(formatReportDate('2026-04-20T00:00:00Z')).toBe('2026. 04. 20.');
  });

  it('null/undefined/빈 문자열 → 빈 문자열', () => {
    expect(formatReportDate(null)).toBe('');
    expect(formatReportDate(undefined)).toBe('');
    expect(formatReportDate('')).toBe('');
  });

  it('유효하지 않은 날짜 → 빈 문자열', () => {
    expect(formatReportDate('not-a-date')).toBe('');
  });
});
