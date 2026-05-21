// e2e/scroll-ux/notices-search.spec.ts
// PR1 P0 회귀 — NoticeSearchBar 검색·리셋 시 스크롤 위치 보존
import { test, expect } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 공지사항 검색', () => {
  test('검색어 입력 → 검색 버튼 클릭 시 스크롤 위치 유지', async ({
    opsPage: page,
  }) => {
    await page.goto('/notices');
    await page.waitForLoadState('networkidle');

    test.skip(
      !(await isScrollable(page)),
      '공지사항 시드 데이터가 스크롤 발생할 만큼 충분하지 않음',
    );
    await scrollToY(page, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page
          .locator('[data-testid="notice-search-bar"] input[name="q"]')
          .fill('테스트');
        await page
          .locator('[data-testid="notice-search-bar"] button[type="submit"]')
          .click();
      },
      async () => {
        await page.waitForURL(/q=/);
      },
    );
  });

  test('검색어가 있을 때 초기화 버튼 클릭 시 스크롤 위치 유지', async ({
    opsPage: page,
  }) => {
    await page.goto('/notices?q=테스트');
    await page.waitForLoadState('networkidle');

    test.skip(
      !(await isScrollable(page)),
      '공지사항 시드 데이터가 부족',
    );
    await scrollToY(page, 400);

    const resetButton = page.getByRole('button', { name: '필터 초기화' });
    const hasReset = await resetButton.isVisible().catch(() => false);
    test.skip(!hasReset, '초기화 버튼 미노출 (검색어 미적용 상태)');

    await expectScrollPreserved(
      page,
      async () => {
        await resetButton.click();
      },
      async () => {
        await expect(page).toHaveURL('/notices');
      },
    );
  });
});
