// e2e/scroll-ux/gallery-filters.spec.ts
// PR1 P0 회귀 — GalleryContent 업종·정렬 셀렉트 변경 시 스크롤 위치 보존
import { test } from '../fixtures/auth.fixture';
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import { registerGallerySeed } from '../helpers/bulk-seed.helper';

// 갤러리 카드는 시드가 1장뿐이라 스크롤이 생기지 않아 아래 감시가 통째로 skip 됐다.
// 공유된 FINAL 로드맵을 이 파일 전용으로 만들고 끝나면 지운다.
registerGallerySeed();

test.describe('스크롤 위치 유지 — 갤러리 필터(업종·정렬)', () => {
  test('정렬을 좋아요순으로 변경 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '갤러리 시드 카드가 부족');
    const sortCombobox = page.getByRole('combobox', { name: '정렬 기준' });
    await scrollToRevealing(page, sortCombobox, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await sortCombobox.click();
        await page.getByRole('option', { name: '좋아요순' }).click();
      },
      async () => {
        await page.waitForURL(/sort=popular/);
      }
    );
  });
});
