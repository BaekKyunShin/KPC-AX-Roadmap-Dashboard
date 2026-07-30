// e2e/scroll-ux/gallery-pagination.spec.ts
// PR1 P0 회귀 — Gallery 페이지네이션 시 스크롤 위치 보존
import { test } from '../fixtures/auth.fixture';
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import { registerGallerySeed } from '../helpers/bulk-seed.helper';

// 갤러리 카드는 시드가 1장뿐이라 스크롤이 생기지 않아 아래 감시가 통째로 skip 됐다.
// 공유된 FINAL 로드맵을 이 파일 전용으로 만들고 끝나면 지운다.
registerGallerySeed();

test.describe('스크롤 위치 유지 — 갤러리 페이지네이션', () => {
  test('2페이지 클릭 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    const page2Button = page.getByRole('button', { name: '2', exact: true });
    const hasMultiplePages = await page2Button.isVisible().catch(() => false);
    test.skip(!hasMultiplePages, '갤러리 카드가 페이지네이션 발생 미만');

    test.skip(!(await isScrollable(page)), '갤러리 페이지 콘텐츠 부족');
    // 페이지 버튼은 목록 하단에 있다 — 400 에 머물면 클릭 시 Playwright 가 아래로
    // 자동 스크롤해 버려, 보존 여부를 잴 기준점 자체가 흔들린다
    await scrollToRevealing(page, page2Button, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page2Button.click();
      },
      async () => {
        await page.waitForURL(/page=2/);
      }
    );
  });
});
