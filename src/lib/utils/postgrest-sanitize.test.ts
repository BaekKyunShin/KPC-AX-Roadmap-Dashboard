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

  // ─── SQL/PostgREST 인젝션 패턴 ──────────────────────────────────────────

  it("'; DROP TABLE users;-- 패턴에서 PostgREST 특수문자가 없으면 그대로 반환한다", () => {
    // 싱글 쿼트(')와 세미콜론(;), 대시(-)는 이스케이프 대상이 아님
    // sanitizePostgrestFilter는 PostgREST 필터 구문 특수문자만 이스케이프함
    const input = "'; DROP TABLE users;--";
    const result = sanitizePostgrestFilter(input);

    // 이 입력에 포함된 PostgREST 특수문자: 없음(따옴표가 없고 싱글쿼트는 대상이 아님)
    // 결과는 원본과 동일
    expect(result).toBe("'; DROP TABLE users;--");
  });

  it('UNION SELECT 패턴이 포함된 입력을 이스케이프한다', () => {
    const input = 'test UNION SELECT * FROM users';
    const result = sanitizePostgrestFilter(input);

    // 공백과 영문자는 이스케이프 대상이 아님 — 문자 그대로 반환
    expect(result).toBe('test UNION SELECT * FROM users');
  });

  it('OR 인젝션 패턴 (or,id.eq.true)에서 쉼표와 마침표를 이스케이프한다', () => {
    const input = 'or,id.eq.true';
    const result = sanitizePostgrestFilter(input);

    // 쉼표와 마침표가 이스케이프됨
    expect(result).toBe('or\\,id\\.eq\\.true');
    // 이스케이프 후 결과에는 백슬래시+쉼표(\,)가 있어 raw 쉼표(,)와 구별됨
    // 이스케이프 문자 없이 단독으로 나타나는 쉼표가 없어야 함
    expect(result).not.toMatch(/(?<!\\),/);
  });

  it('중첩 괄호를 사용한 인젝션 시도를 이스케이프한다', () => {
    const input = 'test(id.eq.1)';
    const result = sanitizePostgrestFilter(input);

    expect(result).toBe('test\\(id\\.eq\\.1\\)');
    // 이스케이프되지 않은 괄호가 없어야 함
    expect(result).not.toMatch(/(?<!\\)[\(\)]/);
  });

  it('퍼센트 기반 LIKE 와일드카드 인젝션을 이스케이프한다', () => {
    const input = '%admin%';
    const result = sanitizePostgrestFilter(input);

    expect(result).toBe('\\%admin\\%');
  });

  it('복합 PostgREST 인젝션 패턴을 이스케이프한다', () => {
    // not.eq, gte 등의 PostgREST 연산자를 활용한 인젝션 시도
    const input = 'test.not.eq.false';
    const result = sanitizePostgrestFilter(input);

    expect(result).toBe('test\\.not\\.eq\\.false');
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
