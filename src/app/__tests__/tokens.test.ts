import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Tailwind 4 의 `@theme inline` 블록에 4개 화면 (로드맵/PBL × 인터뷰/결과)
 * 공통 UI 레이어가 참조할 디자인 토큰이 정의되어 있는지 검증한다.
 *
 * JSDOM 의 `getComputedStyle` 은 CSS 변수 계산에 한계가 있어,
 * `globals.css` 파일 내용을 문자열로 읽어 선언 존재를 검증하는 방식을 사용한다.
 */
describe('Tailwind 디자인 토큰 (globals.css @theme inline)', () => {
  const css = readFileSync(
    resolve(__dirname, '../globals.css'),
    'utf8',
  );

  it.each([
    ['--page-max-w', '64rem'],
    ['--section-gap', '2rem'],
    ['--card-pad', '1.5rem'],
    ['--sticky-top', '4rem'],
    ['--container-pad-x', '1rem'],
  ])('declares %s = %s in @theme inline', (name, expected) => {
    const pattern = new RegExp(
      `${name}\\s*:\\s*${expected.replace('.', '\\.')}\\s*;`,
    );
    expect(css).toMatch(pattern);
  });
});
