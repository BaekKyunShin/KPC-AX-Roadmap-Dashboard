// e2e/scroll-ux/gallery-track.spec.ts
// PR1 P0 회귀 — TrackFilter(전체/로드맵/PBL) 토글 시 스크롤 위치 보존
import { test } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 갤러리 TrackFilter', () => {
  test('전체 → 로드맵 토글 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '갤러리 시드 카드 부족');
    await scrollToY(page, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page.locator('[data-testid="track-filter-ROADMAP"]').click();
      },
      async () => {
        await page.waitForURL(/track=ROADMAP/);
      },
    );
  });
});
