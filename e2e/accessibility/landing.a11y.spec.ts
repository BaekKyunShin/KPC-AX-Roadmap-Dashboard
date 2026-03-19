// e2e/accessibility/landing.a11y.spec.ts
// 랜딩 페이지 접근성 검증
import { test, expect } from '@playwright/test';
import { checkA11y, checkKeyboardNavigation } from '../fixtures/accessibility.fixture';

test.describe('랜딩 페이지 (/) 접근성', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('axe-core 위반 없음 (color-contrast 제외)', async ({ page }) => {
    await checkA11y(page, {
      disableRules: ['color-contrast'],
    });
  });

  test('주요 랜드마크 구조 확인 (banner, navigation, main, contentinfo)', async ({ page }) => {
    // header (banner)
    await expect(page.getByRole('banner')).toBeAttached();

    // navigation
    await expect(page.getByRole('navigation')).toBeAttached();

    // main
    await expect(page.getByRole('main')).toBeAttached();

    // footer (contentinfo)
    await expect(page.getByRole('contentinfo')).toBeAttached();
  });

  test('페이지 제목(title)이 설정되어 있음', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('모든 이미지에 alt 속성 존재', async ({ page }) => {
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // alt가 null이 아니어야 함 (빈 문자열은 장식 이미지로 허용)
      expect(alt, `이미지 ${i + 1}번째에 alt 속성이 없습니다`).not.toBeNull();
    }
  });

  test('키보드 탭 네비게이션으로 포커스 가능 요소 최소 5개', async ({ page }) => {
    // 랜딩 페이지에는 네비게이션 링크, CTA 버튼 등 최소 5개 이상의 포커스 가능 요소가 있어야 함
    const focusedElements = await checkKeyboardNavigation(page, 5);
    expect(focusedElements.length).toBeGreaterThanOrEqual(5);
  });

  test('Skip to content 또는 첫 포커스가 네비게이션으로 이동', async ({ page }) => {
    // 첫 Tab 키 입력 시 포커스가 의미 있는 요소로 이동하는지 확인
    await page.keyboard.press('Tab');

    const focusedTag = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName.toLowerCase() : null;
    });

    // 첫 포커스는 링크(a) 또는 버튼(button)이어야 함
    expect(['a', 'button']).toContain(focusedTag);
  });

  test('각 섹션의 헤딩 계층 구조 확인', async ({ page }) => {
    // h1이 정확히 1개 존재해야 함
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // h2 이상의 헤딩이 존재해야 함 (섹션별 제목)
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThanOrEqual(1);
  });

  test('링크에 접근 가능한 이름이 있음', async ({ page }) => {
    const links = page.locator('a');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const isVisible = await link.isVisible().catch(() => false);
      if (!isVisible) continue;

      const accessibleName = await link.evaluate((el) => {
        return el.textContent?.trim() || el.getAttribute('aria-label') || '';
      });
      expect(
        accessibleName.length,
        `링크 ${i + 1}번째에 접근 가능한 이름이 없습니다`,
      ).toBeGreaterThan(0);
    }
  });
});
