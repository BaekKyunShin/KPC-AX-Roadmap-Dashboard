// e2e/scroll-ux/roadmap-result-regenerate.spec.ts
// PR1 P0 회귀 — RoadmapResultClient ?regenerate=open 쿼리 정리 시 스크롤 위치 보존
// 주의: 같은 useEffect 안의 scrollIntoView 는 의도된 동작이므로 미수정.
// 검증 대상은 그 뒤의 router.replace(pathname) — scrollIntoView 직후 호출되므로
// scrollIntoView 가 잡은 위치를 router.replace 가 다시 0으로 되돌리지 않는지 확인.
import { test } from '../fixtures/auth.fixture';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe('스크롤 위치 유지 — RoadmapResultClient regenerate', () => {
  test('?regenerate=open 진입 후 URL 정리될 때 scrollIntoView 위치 보존', async ({
    consultantPage: page,
  }) => {
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    const projectHref = await findFirstLinkHref(page, '/consultant/projects/');
    test.skip(!projectHref, '컨설턴트 담당 프로젝트가 없음');

    await page.goto(`${projectHref}/roadmap?regenerate=open`);
    await page.waitForLoadState('networkidle');

    // RegenerateAccordion 마운트 + scrollIntoView 완료 대기
    await page.waitForTimeout(800);

    // scrollIntoView 가 결정한 위치 기록
    const afterScrollInto = await page.evaluate(() => window.scrollY);

    // URL cleanup 동작 (router.replace) 이미 완료됨 → URL에 regenerate 가 없어야 함
    await page.waitForURL(/\/roadmap$/, { timeout: 5_000 }).catch(() => {});

    const afterCleanup = await page.evaluate(() => window.scrollY);

    // scrollIntoView 가 잡은 위치를 router.replace 가 0으로 점프시키지 않아야 함
    // (단, scrollIntoView 위치가 0인 경우 이 검증은 무의미하므로 skip)
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
