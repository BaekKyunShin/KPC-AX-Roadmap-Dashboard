import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { getAppBaseUrl } from './app-url';

describe('getAppBaseUrl', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = ORIGINAL;
    }
  });

  it('정상 URL 을 그대로 반환', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    expect(getAppBaseUrl()).toBe('https://app.example.com');
  });

  it('트레일링 슬래시 1개 → 제거', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/';
    expect(getAppBaseUrl()).toBe('https://app.example.com');
  });

  it('트레일링 슬래시 여러 개 → 모두 제거', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com///';
    expect(getAppBaseUrl()).toBe('https://app.example.com');
  });

  it('pathname 끝 슬래시는 제거 (예: https://x.com/app/)', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://x.com/app/';
    expect(getAppBaseUrl()).toBe('https://x.com/app');
  });

  it('환경변수 미설정 → 명시적 에러 throw', () => {
    expect(() => getAppBaseUrl()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it('환경변수 빈 문자열 → 명시적 에러 throw', () => {
    process.env.NEXT_PUBLIC_APP_URL = '';
    expect(() => getAppBaseUrl()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it('환경변수 공백만 → 명시적 에러 throw', () => {
    process.env.NEXT_PUBLIC_APP_URL = '   ';
    expect(() => getAppBaseUrl()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it('잘못된 URL 형식 → 명시적 에러 throw', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'not-a-url';
    expect(() => getAppBaseUrl()).toThrow(/유효한 URL/);
  });
});
