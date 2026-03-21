import { describe, test, expect } from 'vitest';
import { getScoreColor } from './score-color';

describe('getScoreColor', () => {
  test.each<[number, string]>([
    [100, '#22c55e'],
    [61, '#22c55e'],
    [60, '#f59e0b'],
    [45, '#f59e0b'],
    [30, '#f59e0b'],
    [29, '#ef4444'],
    [0, '#ef4444'],
    [-10, '#ef4444'],
  ])('pct=%d → hex=%s', (pct, expectedHex) => {
    expect(getScoreColor(pct).hex).toBe(expectedHex);
  });

  test('60 초과는 녹색 Tailwind 클래스를 반환한다', () => {
    const result = getScoreColor(80);
    expect(result).toEqual({
      hex: '#22c55e',
      bg: 'bg-green-500',
      text: 'text-green-600',
      light: 'bg-green-50',
    });
  });

  test('30~60은 황색 Tailwind 클래스를 반환한다', () => {
    const result = getScoreColor(45);
    expect(result).toEqual({
      hex: '#f59e0b',
      bg: 'bg-amber-500',
      text: 'text-amber-600',
      light: 'bg-amber-50',
    });
  });

  test('30 미만은 적색 Tailwind 클래스를 반환한다', () => {
    const result = getScoreColor(10);
    expect(result).toEqual({
      hex: '#ef4444',
      bg: 'bg-red-500',
      text: 'text-red-600',
      light: 'bg-red-50',
    });
  });

  test('반환값은 hex, bg, text, light 4개 속성을 포함한다', () => {
    const result = getScoreColor(50);
    expect(Object.keys(result).sort()).toEqual(['bg', 'hex', 'light', 'text']);
  });
});
