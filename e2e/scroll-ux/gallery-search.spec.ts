// e2e/scroll-ux/gallery-search.spec.ts
// PR1 P0 회귀 — GalleryContent 검색어(디바운스) 변경 시 스크롤 위치 보존
import { test } from '../fixtures/auth.fixture';
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import { SEED_TAG, registerGallerySeed } from '../helpers/bulk-seed.helper';

// 갤러리 카드는 시드가 1장뿐이라 스크롤이 생기지 않아 아래 감시가 통째로 skip 됐다.
// 공유된 FINAL 로드맵을 이 파일 전용으로 만들고 끝나면 지운다.
registerGallerySeed();

test.describe('스크롤 위치 유지 — 갤러리 검색', () => {
  test('검색어 디바운스 적용 후 URL 동기화 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '갤러리 시드 카드가 스크롤 발생할 만큼 충분하지 않음');
    const searchInput = page.getByPlaceholder('검색 (기업명, 업종, 키워드...)');
    await scrollToRevealing(page, searchInput, 400);

    await expectScrollPreserved(
      page,
      async () => {
        // 결과가 0건이 되는 키워드로 검색하면 문서가 짧아져 기대값이 0 으로 보정되고,
        // 스크롤이 최상단으로 점프해도 통과해 버린다. 시드 회사명으로 검색해 목록을
        // 남겨야 "위치가 유지됐는가"를 실제로 검증할 수 있다.
        await searchInput.fill(SEED_TAG);
      },
      async () => {
        // 디바운스 300ms + URL 반영
        await page.waitForURL(/search=/, { timeout: 5_000 });
      }
    );
  });
});
