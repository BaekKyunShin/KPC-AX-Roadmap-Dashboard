import { describe, expect, it } from 'vitest';

import { formatActivityDate, formatReportDate } from './hwpx-date';

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

describe('formatActivityDate', () => {
  it('ISO 날짜 → YY.MM.DD (양식 26.00.00 폭)', () => {
    expect(formatActivityDate('2026-04-10')).toBe('26.04.10');
  });

  it('공백 포함 4자리(YYYY. MM. DD) → YY.MM.DD', () => {
    expect(formatActivityDate('2026. 04. 10')).toBe('26.04.10');
  });

  it('한 자리 월·일 → 0 패딩', () => {
    expect(formatActivityDate('2026.4.1')).toBe('26.04.01');
  });

  it('이미 짧은 형식/파싱 불가 → 원본 유지', () => {
    expect(formatActivityDate('26.04.10')).toBe('26.04.10');
    expect(formatActivityDate('상시')).toBe('상시');
  });

  it('null/undefined/빈 문자열 → 빈 문자열', () => {
    expect(formatActivityDate(null)).toBe('');
    expect(formatActivityDate(undefined)).toBe('');
    expect(formatActivityDate('')).toBe('');
  });
});
