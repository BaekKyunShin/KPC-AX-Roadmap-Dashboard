// e2e/scroll-ux/gallery-reset.spec.ts
// PR1 P0 회귀 — GalleryContent 필터 초기화 시 스크롤 위치 보존
import { test, expect } from '../fixtures/auth.fixture';
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import { registerGallerySeed } from '../helpers/bulk-seed.helper';

// 갤러리 카드는 시드가 1장뿐이라 스크롤이 생기지 않아 아래 감시가 통째로 skip 됐다.
// 공유된 FINAL 로드맵을 이 파일 전용으로 만들고 끝나면 지운다.
registerGallerySeed();

test.describe('스크롤 위치 유지 — 갤러리 필터 초기화', () => {
  test('필터가 적용된 상태에서 초기화 버튼 클릭 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/gallery?sort=popular');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '갤러리 시드 카드가 부족');
    const resetButton = page.getByRole('button', { name: '필터 초기화' }).first();
    const hasReset = await resetButton.isVisible().catch(() => false);
    test.skip(!hasReset, '초기화 버튼 미노출');

    await scrollToRevealing(page, resetButton, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await resetButton.click();
      },
      async () => {
        await expect(page).toHaveURL('/gallery');
      }
    );
  });
});
