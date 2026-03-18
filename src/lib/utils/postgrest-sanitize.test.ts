/**
 * PostgREST .or() 필터 인젝션 방어 유틸리티 테스트
 *
 * PostgREST 필터 구문에서 특수 의미를 가지는 문자를 이스케이프하여
 * .or() 필터 인젝션 공격을 방지합니다.
 */

import { describe, it, expect } from 'vitest';
import { sanitizePostgrestFilter, ilikePattern } from './postgrest-sanitize';

describe('sanitizePostgrestFilter', () => {
  it('일반 한글 텍스트는 그대로 반환한다', () => {
    expect(sanitizePostgrestFilter('테스트')).toBe('테스트');
  });

  it('일반 영문 텍스트는 그대로 반환한다', () => {
    expect(sanitizePostgrestFilter('hello')).toBe('hello');
  });

  it('쉼표(,)를 이스케이프한다', () => {
    expect(sanitizePostgrestFilter('a,b')).toBe('a\\,b');
  });

  it('마침표(.)를 이스케이프한다', () => {
    expect(sanitizePostgrestFilter('a.b')).toBe('a\\.b');
  });

  it('여는 괄호와 닫는 괄호를 이스케이프한다', () => {
    expect(sanitizePostgrestFilter('a(b)c')).toBe('a\\(b\\)c');
  });

  it('백슬래시(\\)를 이스케이프한다', () => {
    expect(sanitizePostgrestFilter('a\\b')).toBe('a\\\\b');
  });

  it('퍼센트(%)를 이스케이프한다', () => {
    expect(sanitizePostgrestFilter('100%')).toBe('100\\%');
  });

  it('따옴표(")를 이스케이프한다', () => {
    expect(sanitizePostgrestFilter('a"b')).toBe('a\\"b');
  });

  it('인젝션 공격 벡터를 이스케이프한다', () => {
    const input = 'test,id.eq.true';
    const result = sanitizePostgrestFilter(input);

    // 모든 특수문자가 이스케이프됨
    expect(result).toBe('test\\,id\\.eq\\.true');
    // 원본에 ',id.eq.'가 포함되지 않음을 검증
    expect(result).not.toContain(',id.eq.');
  });

  it('복합 특수문자를 모두 이스케이프한다', () => {
    const input = 'a,b.c(d)e\\f%g"h';
    const result = sanitizePostgrestFilter(input);

    expect(result).toBe('a\\,b\\.c\\(d\\)e\\\\f\\%g\\"h');
  });

  it('빈 문자열은 그대로 반환한다', () => {
    expect(sanitizePostgrestFilter('')).toBe('');
  });
});

describe('ilikePattern', () => {
  it('이스케이프 후 양쪽에 %를 추가한다', () => {
    expect(ilikePattern('test')).toBe('%test%');
  });

  it('특수문자를 이스케이프한 후 %로 감싼다', () => {
    expect(ilikePattern('a,b')).toBe('%a\\,b%');
  });

  it('인젝션 공격 벡터를 안전하게 처리한다', () => {
    const result = ilikePattern('test,id.eq.true');

    expect(result).toBe('%test\\,id\\.eq\\.true%');
    // 이스케이프되지 않은 ,id.eq.가 포함되지 않음
    expect(result).not.toContain(',id.eq.');
  });

  it('빈 문자열은 %%를 반환한다', () => {
    expect(ilikePattern('')).toBe('%%');
  });

  it('한글 검색어를 올바르게 처리한다', () => {
    expect(ilikePattern('제조업')).toBe('%제조업%');
  });
});
