import { describe, it, expect } from 'vitest';
import { formatCompanySizeShort, COMPANY_SIZE_VALUES } from './company-size';

describe('formatCompanySizeShort', () => {
  it('1-9 (10명 미만 (소상공인)) → "소상공인" 만 반환한다 (잘못된 "미만 소상공인" 반환 X)', () => {
    expect(formatCompanySizeShort('1-9')).toBe('소상공인');
  });

  it('10-49 → "소기업" 만 반환한다', () => {
    expect(formatCompanySizeShort('10-49')).toBe('소기업');
  });

  it('50-299 → "중소기업"', () => {
    expect(formatCompanySizeShort('50-299')).toBe('중소기업');
  });

  it('300-999 → "중견기업"', () => {
    expect(formatCompanySizeShort('300-999')).toBe('중견기업');
  });

  it('1000+ (1,000명 이상 (대기업)) → "대기업" 만 반환한다 (잘못된 "이상 대기업" 반환 X)', () => {
    expect(formatCompanySizeShort('1000+')).toBe('대기업');
  });

  it('알 수 없는 값은 그대로 반환한다', () => {
    expect(formatCompanySizeShort('unknown')).toBe('unknown');
  });

  it('모든 COMPANY_SIZE_VALUES 가 "미만"/"이상" 글자를 포함하지 않는 짧은 라벨을 반환한다', () => {
    for (const v of COMPANY_SIZE_VALUES) {
      const short = formatCompanySizeShort(v);
      expect(short).not.toContain('미만');
      expect(short).not.toContain('이상');
      expect(short).not.toContain('명');
      expect(short).not.toMatch(/\d/);
    }
  });
});
