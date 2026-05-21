// e2e/scroll-ux/gallery-reset.spec.ts
// PR1 P0 회귀 — GalleryContent 필터 초기화 시 스크롤 위치 보존
import { test, expect } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 갤러리 필터 초기화', () => {
  test('필터가 적용된 상태에서 초기화 버튼 클릭 시 스크롤 위치 유지', async ({
    opsPage: page,
  }) => {
    await page.goto('/gallery?sort=popular');
    await page.waitForLoadState('networkidle');

    test.skip(
      !(await isScrollable(page)),
      '갤러리 시드 카드가 부족',
    );
    await scrollToY(page, 400);

    const resetButton = page.getByRole('button', { name: '필터 초기화' }).first();
    const hasReset = await resetButton.isVisible().catch(() => false);
    test.skip(!hasReset, '초기화 버튼 미노출');

    await expectScrollPreserved(
      page,
      async () => {
        await resetButton.click();
      },
      async () => {
        await expect(page).toHaveURL('/gallery');
      },
    );
  });
});
