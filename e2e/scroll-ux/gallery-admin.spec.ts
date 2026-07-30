// e2e/scroll-ux/gallery-admin.spec.ts
// PR1 P0 회귀 — AdminFilters(상태/공유/컨설턴트) 변경·초기화 시 스크롤 위치 보존
import { test, expect } from '../fixtures/auth.fixture';
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import { registerGallerySeed } from '../helpers/bulk-seed.helper';

// 갤러리 카드는 시드가 1장뿐이라 스크롤이 생기지 않아 아래 감시가 통째로 skip 됐다.
// 공유된 FINAL 로드맵을 이 파일 전용으로 만들고 끝나면 지운다.
registerGallerySeed();

test.describe('스크롤 위치 유지 — 갤러리 AdminFilters', () => {
  test('상태 필터 변경 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '갤러리 시드 카드 부족');

    const statusCombobox = page.getByRole('combobox', { name: '로드맵 상태 필터' });
    await scrollToRevealing(page, statusCombobox, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await statusCombobox.click();
        // exact 없이는 '이전 확정본'(ARCHIVED)까지 걸려 strict mode 위반이 난다
        await page.getByRole('option', { name: '확정', exact: true }).click();
      },
      async () => {
        await page.waitForURL(/status=FINAL/);
      }
    );
  });

  test('관리자 필터 초기화 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/gallery?status=FINAL');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '갤러리 시드 카드 부족');

    const adminResetButton = page
      .locator('section,div')
      .filter({ hasText: '관리자 필터' })
      .first()
      .getByRole('button', { name: '필터 초기화' });
    const hasReset = await adminResetButton.isVisible().catch(() => false);
    test.skip(!hasReset, '관리자 필터 초기화 버튼 미노출');

    await scrollToRevealing(page, adminResetButton, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await adminResetButton.click();
      },
      async () => {
        await expect(page).toHaveURL('/gallery');
      }
    );
  });
});
