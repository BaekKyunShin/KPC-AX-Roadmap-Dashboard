/**
 * @axe-core/playwright 기반 접근성 검증 fixture
 */
import AxeBuilder from '@axe-core/playwright';
import { type Page, expect } from '@playwright/test';

export interface A11yOptions {
  /** 특정 CSS 선택자 내부만 검사 */
  selector?: string;
  /** 특정 규칙 비활성화 (예: ['color-contrast']) */
  disableRules?: string[];
  /** 특정 태그만 검사 (예: ['wcag2a', 'wcag2aa']) */
  tags?: string[];
}

/**
 * axe-core로 접근성 위반을 검사합니다.
 *
 * 사용 예:
 *   await checkA11y(page);
 *   await checkA11y(page, { selector: '#main-content' });
 *   await checkA11y(page, { disableRules: ['color-contrast'] });
 */
export async function checkA11y(page: Page, options: A11yOptions = {}) {
  let builder = new AxeBuilder({ page });

  if (options.selector) {
    builder = builder.include(options.selector);
  }

  if (options.disableRules?.length) {
    builder = builder.disableRules(options.disableRules);
  }

  if (options.tags?.length) {
    builder = builder.withTags(options.tags);
  }

  const results = await builder.analyze();

  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.length,
    targets: v.nodes.slice(0, 3).map((n) => n.target.join(' > ')),
  }));

  expect(violations, `접근성 위반 ${violations.length}건 발견`).toEqual([]);
}

/**
 * 키보드 탭 네비게이션으로 포커스 가능 요소 확인
 */
export async function checkKeyboardNavigation(
  page: Page,
  expectedFocusCount: number,
) {
  const focusableElements: string[] = [];

  for (let i = 0; i < expectedFocusCount + 5; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      return el.tagName + (el.id ? `#${el.id}` : '') + (el.className ? `.${String(el.className).split(' ')[0]}` : '');
    });
    if (focused) {
      focusableElements.push(focused);
    }
  }

  expect(focusableElements.length).toBeGreaterThanOrEqual(expectedFocusCount);
  return focusableElements;
}
