// e2e/scroll-ux/gallery-search.spec.ts
// PR1 P0 회귀 — GalleryContent 검색어(디바운스) 변경 시 스크롤 위치 보존
import { test } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 갤러리 검색', () => {
  test('검색어 디바운스 적용 후 URL 동기화 시 스크롤 위치 유지', async ({
    opsPage: page,
  }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    test.skip(
      !(await isScrollable(page)),
      '갤러리 시드 카드가 스크롤 발생할 만큼 충분하지 않음',
    );
    await scrollToY(page, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page
          .getByPlaceholder('검색 (기업명, 업종, 키워드...)')
          .fill('테스트키워드');
      },
      async () => {
        // 디바운스 300ms + URL 반영
        await page.waitForURL(/search=/, { timeout: 5_000 });
      },
    );
  });
});
