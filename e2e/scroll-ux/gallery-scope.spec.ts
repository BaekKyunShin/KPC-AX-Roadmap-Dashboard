// e2e/scroll-ux/gallery-scope.spec.ts
// PR1 P0 회귀 — ScopeFilter(전체/내 산출물) 토글 시 스크롤 위치 보존
// ScopeFilter 는 컨설턴트 전용이므로 consultantPage 사용
import { test } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 갤러리 ScopeFilter', () => {
  test('전체 → 내 산출물 토글 시 스크롤 위치 유지', async ({
    consultantPage: page,
  }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '갤러리 시드 카드 부족');
    await scrollToY(page, 400);

    const mineButton = page.locator('[data-testid="scope-filter-mine"]');
    const hasFilter = await mineButton.isVisible().catch(() => false);
    test.skip(!hasFilter, 'ScopeFilter 미노출 (컨설턴트 권한 아님)');

    await expectScrollPreserved(
      page,
      async () => {
        await mineButton.click();
      },
      async () => {
        await page.waitForURL(/scope=mine/);
      },
    );
  });
});
