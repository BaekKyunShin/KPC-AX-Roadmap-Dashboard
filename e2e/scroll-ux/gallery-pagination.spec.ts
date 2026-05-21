// e2e/scroll-ux/gallery-pagination.spec.ts
// PR1 P0 회귀 — Gallery 페이지네이션 시 스크롤 위치 보존
import { test } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 갤러리 페이지네이션', () => {
  test('2페이지 클릭 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    const page2Button = page.getByRole('button', { name: '2', exact: true });
    const hasMultiplePages = await page2Button.isVisible().catch(() => false);
    test.skip(!hasMultiplePages, '갤러리 카드가 페이지네이션 발생 미만');

    test.skip(!(await isScrollable(page)), '갤러리 페이지 콘텐츠 부족');
    await scrollToY(page, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page2Button.click();
      },
      async () => {
        await page.waitForURL(/page=2/);
      },
    );
  });
});
