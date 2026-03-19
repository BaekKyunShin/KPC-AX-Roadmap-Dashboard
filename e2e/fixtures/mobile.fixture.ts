/**
 * 모바일 뷰포트 테스트 fixture
 *
 * Pixel 5 (393x851) 뷰포트를 사용합니다.
 */
import { test as base, type Page } from '@playwright/test';

type MobileFixtures = {
  /** Pixel 5 뷰포트가 설정된 페이지 */
  mobilePage: Page;
};

export const test = base.extend<MobileFixtures>({
  mobilePage: async ({ browser }, use) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });
    const page = await context.newPage();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';

// ─── 모바일 헬퍼 ──────────────────────────────────────────────────────────────

/** 햄버거 메뉴 버튼을 찾아 클릭합니다 */
export async function openMobileMenu(page: Page) {
  const menuButton = page.getByRole('button', { name: /메뉴|menu/i }).or(
    page.locator('[data-testid="mobile-menu-button"]'),
  );
  await menuButton.click();
}

/** 모바일에서 가로 스크롤 가능 여부를 확인합니다 */
export async function checkNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  return !hasOverflow;
}
