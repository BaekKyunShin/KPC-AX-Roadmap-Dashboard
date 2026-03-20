import { describe, test, expect } from 'vitest';
import { fuzzyMatch } from './fuzzy-match';

describe('fuzzyMatch', () => {
  // ─── 포함 검색 (1점) ───────────────────────────────────────────────────────

  test('완전 포함이면 1을 반환한다', () => {
    expect(fuzzyMatch('프로젝트', '프로젝트 관리')).toBe(1);
  });

  test('대소문자를 무시하고 포함 검색한다', () => {
    expect(fuzzyMatch('project', 'Project Management')).toBe(1);
  });

  test('한국어 부분 문자열 매칭', () => {
    expect(fuzzyMatch('갤러리', '로드맵 갤러리')).toBe(1);
  });

  // ─── 순차 문자 매칭 (0.5점) ────────────────────────────────────────────────

  test('순차 문자가 매칭되면 0.5를 반환한다', () => {
    // "pjt" → "P...r...o...j...e...c...t" 순차 매칭
    expect(fuzzyMatch('pjt', 'Project')).toBe(0.5);
  });

  test('한국어 순차 문자 매칭', () => {
    // "프관" → "프로젝트 관리"에서 '프', '관' 순차 매칭
    expect(fuzzyMatch('프관', '프로젝트 관리')).toBe(0.5);
  });

  // ─── 미매칭 (0점) ─────────────────────────────────────────────────────────

  test('전혀 매칭되지 않으면 0을 반환한다', () => {
    expect(fuzzyMatch('xyz', '프로젝트 관리')).toBe(0);
  });

  test('순차 문자도 매칭되지 않으면 0을 반환한다', () => {
    expect(fuzzyMatch('zyx', 'abc')).toBe(0);
  });

  // ─── 엣지 케이스 ──────────────────────────────────────────────────────────

  test('빈 쿼리는 0을 반환한다', () => {
    expect(fuzzyMatch('', '프로젝트 관리')).toBe(0);
  });

  test('빈 대상은 0을 반환한다', () => {
    expect(fuzzyMatch('프로젝트', '')).toBe(0);
  });

  test('단일 문자 매칭', () => {
    expect(fuzzyMatch('프', '프로젝트')).toBe(1);
  });

  test('포함 검색이 순차 매칭보다 우선한다', () => {
    // "대시보드"가 포함되면 1, 순차 매칭이면 0.5
    expect(fuzzyMatch('대시보드', '대시보드')).toBe(1);
  });

  // ─── 특수문자 입력 ────────────────────────────────────────────────────────

  test('쿼리에 특수문자(점)가 포함되어도 포함 검색이 동작한다', () => {
    expect(fuzzyMatch('a.b', 'a.b.c')).toBe(1);
  });

  test('쿼리에 괄호가 포함되어도 포함 검색이 동작한다', () => {
    expect(fuzzyMatch('(주)', '테스트(주)회사')).toBe(1);
  });

  test('쿼리에 특수문자가 포함되고 대상에 없으면 0을 반환한다', () => {
    expect(fuzzyMatch('test@example', '테스트 기업')).toBe(0);
  });

  test('쿼리에 숫자가 포함되면 포함 검색이 동작한다', () => {
    expect(fuzzyMatch('123', 'abc123def')).toBe(1);
  });

  test('쿼리에 공백이 포함되어도 포함 검색이 동작한다', () => {
    expect(fuzzyMatch('ai 기초', 'ai 기초 교육')).toBe(1);
  });

  test('쿼리와 대상이 모두 특수문자로만 구성되어도 동작한다', () => {
    // "!!!"가 "!!!"에 포함되므로 1 반환
    expect(fuzzyMatch('!!!', '!!!')).toBe(1);
  });
});
