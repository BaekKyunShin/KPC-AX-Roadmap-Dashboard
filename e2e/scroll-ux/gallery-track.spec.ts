// e2e/scroll-ux/gallery-track.spec.ts
// PR1 P0 회귀 — TrackFilter(전체/로드맵/PBL) 토글 시 스크롤 위치 보존
import { test } from '../fixtures/auth.fixture';
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import { registerGallerySeed } from '../helpers/bulk-seed.helper';

// 갤러리 카드는 시드가 1장뿐이라 스크롤이 생기지 않아 아래 감시가 통째로 skip 됐다.
// 공유된 FINAL 로드맵을 이 파일 전용으로 만들고 끝나면 지운다.
registerGallerySeed();

test.describe('스크롤 위치 유지 — 갤러리 TrackFilter', () => {
  test('전체 → 로드맵 토글 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '갤러리 시드 카드 부족');
    const roadmapTab = page.locator('[data-testid="track-filter-ROADMAP"]');
    await scrollToRevealing(page, roadmapTab, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await roadmapTab.click();
      },
      async () => {
        await page.waitForURL(/track=ROADMAP/);
      }
    );
  });
});
