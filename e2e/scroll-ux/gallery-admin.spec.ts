// e2e/scroll-ux/gallery-admin.spec.ts
// PR1 P0 회귀 — AdminFilters(상태/공유/컨설턴트) 변경·초기화 시 스크롤 위치 보존
import { test, expect } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 갤러리 AdminFilters', () => {
  test('상태 필터 변경 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '갤러리 시드 카드 부족');
    await scrollToY(page, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page.getByRole('combobox', { name: '로드맵 상태 필터' }).click();
        await page.getByRole('option', { name: '확정' }).click();
      },
      async () => {
        await page.waitForURL(/status=FINAL/);
      },
    );
  });

  test('관리자 필터 초기화 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/gallery?status=FINAL');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '갤러리 시드 카드 부족');
    await scrollToY(page, 400);

    const adminResetButton = page
      .locator('section,div')
      .filter({ hasText: '관리자 필터' })
      .first()
      .getByRole('button', { name: '필터 초기화' });
    const hasReset = await adminResetButton.isVisible().catch(() => false);
    test.skip(!hasReset, '관리자 필터 초기화 버튼 미노출');

    await expectScrollPreserved(
      page,
      async () => {
        await adminResetButton.click();
      },
      async () => {
        await expect(page).toHaveURL('/gallery');
      },
    );
  });
});
