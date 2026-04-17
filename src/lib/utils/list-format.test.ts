import { describe, expect, it } from 'vitest';

import { bulletize, splitByUnit } from './list-format';

describe('bulletize', () => {
  it('항목이 없으면 빈 문자열', () => {
    expect(bulletize([])).toBe('');
    expect(bulletize(null)).toBe('');
    expect(bulletize(undefined)).toBe('');
  });

  it('항목마다 `• ` 머리기호 + 줄바꿈으로 결합', () => {
    expect(bulletize(['AI 기초', 'ML 이해', '도구 활용'])).toBe(
      '• AI 기초\n• ML 이해\n• 도구 활용',
    );
  });

  it('공백·빈 문자열 항목 제거', () => {
    expect(bulletize(['AI', '', '  ', 'ML'])).toBe('• AI\n• ML');
  });

  it('커스텀 머리기호 지원', () => {
    expect(bulletize(['a', 'b'], '· ')).toBe('· a\n· b');
  });
});

describe('splitByUnit', () => {
  it('빈 값은 빈 문자열', () => {
    expect(splitByUnit('')).toBe('');
    expect(splitByUnit(null)).toBe('');
    expect(splitByUnit(undefined)).toBe('');
  });

  it('단일 단원 문자열은 그대로 trim', () => {
    expect(splitByUnit('1단원: AI 개요')).toBe('1단원: AI 개요');
  });

  it('쉼표 구분 여러 단원은 단원 앞에 줄바꿈 삽입', () => {
    expect(splitByUnit('1단원: AI 개요, 2단원: 프롬프트 작성, 3단원: 실습')).toBe(
      '1단원: AI 개요\n2단원: 프롬프트 작성\n3단원: 실습',
    );
  });

  it('공백 구분도 처리', () => {
    expect(splitByUnit('1단원: A 2단원: B')).toBe('1단원: A\n2단원: B');
  });

  it('이미 줄바꿈 있으면 원본 유지', () => {
    expect(splitByUnit('1단원: A\n2단원: B')).toBe('1단원: A\n2단원: B');
  });

  it('큰 숫자 단원도 매칭 (예: 10단원)', () => {
    expect(splitByUnit('9단원: X, 10단원: Y')).toBe('9단원: X\n10단원: Y');
  });
});
