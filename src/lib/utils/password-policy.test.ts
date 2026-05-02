import { describe, it, expect } from 'vitest';

import {
  checkPasswordPolicy,
  PASSWORD_MIN_LENGTH,
  PASSWORD_LETTER_REGEX,
  PASSWORD_NUMBER_REGEX,
} from './password-policy';

describe('checkPasswordPolicy', () => {
  it('빈 문자열 입력 시 모든 정책 미충족', () => {
    expect(checkPasswordPolicy('')).toEqual({
      minLength: false,
      hasLetter: false,
      hasNumber: false,
    });
  });

  it('모든 정책 충족: 8자 이상 + 영문 + 숫자', () => {
    expect(checkPasswordPolicy('kpc12345')).toEqual({
      minLength: true,
      hasLetter: true,
      hasNumber: true,
    });
  });

  it('숫자 누락', () => {
    expect(checkPasswordPolicy('kpckpckpc')).toEqual({
      minLength: true,
      hasLetter: true,
      hasNumber: false,
    });
  });

  it('영문 누락', () => {
    expect(checkPasswordPolicy('12345678')).toEqual({
      minLength: true,
      hasLetter: false,
      hasNumber: true,
    });
  });

  it('길이 미달 (영문만)', () => {
    expect(checkPasswordPolicy('abc')).toEqual({
      minLength: false,
      hasLetter: true,
      hasNumber: false,
    });
  });

  it('정확히 8자 경계값', () => {
    expect(checkPasswordPolicy('a1234567')).toEqual({
      minLength: true,
      hasLetter: true,
      hasNumber: true,
    });
  });
});

describe('정규식 export', () => {
  it('PASSWORD_MIN_LENGTH 는 8 이다', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });

  it('PASSWORD_LETTER_REGEX 는 영문자(a-z, A-Z) 매칭', () => {
    expect(PASSWORD_LETTER_REGEX.test('a')).toBe(true);
    expect(PASSWORD_LETTER_REGEX.test('Z')).toBe(true);
    expect(PASSWORD_LETTER_REGEX.test('1')).toBe(false);
    expect(PASSWORD_LETTER_REGEX.test('!')).toBe(false);
  });

  it('PASSWORD_NUMBER_REGEX 는 숫자 매칭', () => {
    expect(PASSWORD_NUMBER_REGEX.test('5')).toBe(true);
    expect(PASSWORD_NUMBER_REGEX.test('a')).toBe(false);
  });
});
