// e2e/scroll-ux/gallery-scope.spec.ts
// PR1 P0 회귀 — ScopeFilter(전체/내 산출물) 토글 시 스크롤 위치 보존
// ScopeFilter 는 컨설턴트 전용이므로 consultantPage 사용
import { test } from '../fixtures/auth.fixture';
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import { registerGallerySeed } from '../helpers/bulk-seed.helper';

// 갤러리 카드는 시드가 1장뿐이라 스크롤이 생기지 않아 아래 감시가 통째로 skip 됐다.
// 공유된 FINAL 로드맵을 이 파일 전용으로 만들고 끝나면 지운다.
registerGallerySeed();

test.describe('스크롤 위치 유지 — 갤러리 ScopeFilter', () => {
  test('전체 → 내 산출물 토글 시 스크롤 위치 유지', async ({ consultantPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '갤러리 시드 카드 부족');
    const mineButton = page.locator('[data-testid="scope-filter-mine"]');
    const hasFilter = await mineButton.isVisible().catch(() => false);
    test.skip(!hasFilter, 'ScopeFilter 미노출 (컨설턴트 권한 아님)');

    await scrollToRevealing(page, mineButton, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await mineButton.click();
      },
      async () => {
        await page.waitForURL(/scope=mine/);
      }
    );
  });
});
