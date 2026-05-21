// e2e/scroll-ux/pbl-result-regenerate.spec.ts
// PR1 P0 회귀 — PBLResultClient ?regenerate=open 쿼리 정리 시 스크롤 위치 보존
// 동일 패턴: scrollIntoView 직후 router.replace 가 그 위치를 0으로 되돌리지 않아야 함.
import { test } from '../fixtures/auth.fixture';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe('스크롤 위치 유지 — PBLResultClient regenerate', () => {
  test('?regenerate=open 진입 후 URL 정리될 때 scrollIntoView 위치 보존', async ({
    consultantPage: page,
  }) => {
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    const projectHref = await findFirstLinkHref(page, '/consultant/projects/');
    test.skip(!projectHref, '컨설턴트 담당 프로젝트가 없음');

    await page.goto(`${projectHref}/pbl?regenerate=open`);
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(800);

    const afterScrollInto = await page.evaluate(() => window.scrollY);

    await page.waitForURL(/\/pbl$/, { timeout: 5_000 }).catch(() => {});

    const afterCleanup = await page.evaluate(() => window.scrollY);

    test.skip(
      afterScrollInto < 50,
      'scrollIntoView 가 결정한 위치가 페이지 상단이라 점프 검증 불가',
    );

    const delta = Math.abs(afterCleanup - afterScrollInto);
    if (delta >= 50) {
      throw new Error(
        `scrollIntoView 후 URL cleanup 시 점프 발생: ${afterScrollInto} → ${afterCleanup}`,
      );
    }
  });
});
