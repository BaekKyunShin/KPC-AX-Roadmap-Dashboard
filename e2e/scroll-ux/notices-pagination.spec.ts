// e2e/scroll-ux/notices-pagination.spec.ts
// PR1 P0 회귀 — NoticePagination 페이지 변경 시 스크롤 위치 보존
import { test } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 공지사항 페이지네이션', () => {
  test('2페이지 버튼 클릭 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/notices');
    await page.waitForLoadState('networkidle');

    const page2Button = page.getByRole('button', { name: '2', exact: true });
    const hasMultiplePages = await page2Button.isVisible().catch(() => false);
    test.skip(
      !hasMultiplePages,
      '공지사항이 페이지네이션 발생할 만큼 충분하지 않음 (2페이지 없음)',
    );

    test.skip(
      !(await isScrollable(page)),
      '공지사항 페이지 콘텐츠가 스크롤 가능 분량 미만',
    );
    await scrollToY(page, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page2Button.click();
      },
      async () => {
        await page.waitForURL(/page=2/);
      },
    );
  });
});
