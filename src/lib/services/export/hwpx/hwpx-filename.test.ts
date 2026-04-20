import { describe, it, expect } from 'vitest';
import { sanitizeFileNamePart } from './hwpx-filename';

describe('sanitizeFileNamePart', () => {
  it('한글·영문·숫자·공백은 그대로 유지', () => {
    expect(sanitizeFileNamePart('삼성전자 DS부문')).toBe('삼성전자 DS부문');
    expect(sanitizeFileNamePart('Acme Corp 2026')).toBe('Acme Corp 2026');
  });

  it('윈도우/macOS 금지 문자는 _ 로 치환', () => {
    expect(sanitizeFileNamePart('KT/SKT')).toBe('KT_SKT');
    expect(sanitizeFileNamePart('A*B:C?D"E<F>G|H\\I')).toBe('A_B_C_D_E_F_G_H_I');
  });

  it('연속 언더스코어는 하나로 압축', () => {
    expect(sanitizeFileNamePart('A//B')).toBe('A_B');
    expect(sanitizeFileNamePart('X<>|:*Y')).toBe('X_Y');
  });

  it('선행·후행 공백·언더스코어·점 정리', () => {
    expect(sanitizeFileNamePart('  .기업명.  ')).toBe('기업명');
    expect(sanitizeFileNamePart('__이름__')).toBe('이름');
  });

  it('제어 문자 제거', () => {
    expect(sanitizeFileNamePart('Line1\nLine2\tTab')).toBe('Line1_Line2_Tab');
    expect(sanitizeFileNamePart('\x00Null')).toBe('Null');
  });

  it('빈 문자열·공백만 → fallback', () => {
    expect(sanitizeFileNamePart('')).toBe('document');
    expect(sanitizeFileNamePart('   ')).toBe('document');
    expect(sanitizeFileNamePart('', 'PBL')).toBe('PBL');
  });

  it('null/undefined 방어', () => {
    expect(sanitizeFileNamePart(undefined as unknown as string)).toBe('document');
    expect(sanitizeFileNamePart(null as unknown as string)).toBe('document');
  });

  it('모두 금지 문자인 경우 fallback', () => {
    expect(sanitizeFileNamePart('///', 'PBL')).toBe('PBL');
    expect(sanitizeFileNamePart('***', '로드맵')).toBe('로드맵');
  });
});
