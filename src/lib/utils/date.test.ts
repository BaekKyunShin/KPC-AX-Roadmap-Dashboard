/**
 * SSR/CSR hydration mismatch (React #418) 방지를 위한 timezone-explicit
 * 날짜 포맷터 테스트.
 *
 * 핵심 요구사항: server timezone(UTC) ≠ browser timezone(KST/...) 차이로
 * 발생하던 hydration mismatch를 막기 위해, 모든 포맷터는 'Asia/Seoul'
 * 타임존을 명시적으로 사용해 결정적(deterministic)인 결과를 보장한다.
 */

import { describe, expect, it } from 'vitest';
import {
  formatDateKR,
  formatDateTimeKR,
  formatTimeKR,
  formatDateMonthDayKR,
  formatNumberKR,
} from './date';

describe('formatDateKR', () => {
  it('UTC ISO 문자열을 KST 기준 yyyy. m. d. 형식으로 반환한다', () => {
    // 2026-04-19T15:00:00Z → KST 2026-04-20 00:00:00 → "2026. 4. 20."
    expect(formatDateKR('2026-04-19T15:00:00Z')).toBe('2026. 4. 20.');
  });

  it('UTC 자정 시각도 KST(+9) 보정 결과를 반환한다', () => {
    // 2026-04-19T00:00:00Z → KST 2026-04-19 09:00:00 → "2026. 4. 19."
    expect(formatDateKR('2026-04-19T00:00:00Z')).toBe('2026. 4. 19.');
  });

  it('Date 객체도 처리한다', () => {
    expect(formatDateKR(new Date('2026-01-05T12:00:00Z'))).toBe('2026. 1. 5.');
  });

  it('null/undefined/빈 문자열에 대해 빈 문자열을 반환한다', () => {
    expect(formatDateKR(null)).toBe('');
    expect(formatDateKR(undefined)).toBe('');
    expect(formatDateKR('')).toBe('');
  });

  it('잘못된 날짜 입력에 대해 빈 문자열을 반환한다', () => {
    expect(formatDateKR('not a date')).toBe('');
  });
});

describe('formatDateTimeKR', () => {
  it('UTC ISO 문자열을 KST 기준 날짜+시각 형식으로 반환한다', () => {
    // 2026-04-19T01:23:45Z → KST 10:23
    expect(formatDateTimeKR('2026-04-19T01:23:45Z')).toBe(
      '2026. 4. 19. 10:23',
    );
  });

  it('null/빈 입력은 빈 문자열', () => {
    expect(formatDateTimeKR(null)).toBe('');
  });
});

describe('formatTimeKR', () => {
  it('UTC ISO를 KST 24시간제 hh:mm 으로 반환한다', () => {
    expect(formatTimeKR('2026-04-19T01:23:45Z')).toBe('10:23');
  });

  it('Date 객체도 처리', () => {
    // 2026-04-19T15:00:00Z → KST 24:00 → 다음날 00:00
    expect(formatTimeKR(new Date('2026-04-19T15:00:00Z'))).toBe('00:00');
  });
});

describe('formatDateMonthDayKR', () => {
  it('"M월 D일" 형식을 반환한다', () => {
    expect(formatDateMonthDayKR('2026-04-19T15:00:00Z')).toBe('4월 20일');
  });
});

describe('formatNumberKR', () => {
  it('천 단위 콤마 포맷', () => {
    expect(formatNumberKR(1234)).toBe('1,234');
    expect(formatNumberKR(1234567)).toBe('1,234,567');
  });

  it('0과 음수도 처리', () => {
    expect(formatNumberKR(0)).toBe('0');
    expect(formatNumberKR(-100)).toBe('-100');
  });

  it('null/undefined는 "0"', () => {
    expect(formatNumberKR(null)).toBe('0');
    expect(formatNumberKR(undefined)).toBe('0');
  });
});
