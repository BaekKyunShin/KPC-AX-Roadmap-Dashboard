// e2e/scroll-ux/notices-tab.spec.ts
// PR1 P0 회귀 — NoticeSearchBar 검색 필터 탭(제목/작성자) 전환 시 스크롤 위치 보존
import { test } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 공지사항 검색 필터 탭', () => {
  test('제목 → 작성자 탭 전환 시 스크롤 위치 유지', async ({
    opsPage: page,
  }) => {
    await page.goto('/notices');
    await page.waitForLoadState('networkidle');

    test.skip(
      !(await isScrollable(page)),
      '공지사항 시드 데이터가 부족',
    );
    await scrollToY(page, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page
          .locator('[data-testid="notice-search-bar"] [role="tab"]', {
            hasText: '작성자',
          })
          .click();
      },
      async () => {
        await page.waitForURL(/filter_by=author/);
      },
    );
  });
});
