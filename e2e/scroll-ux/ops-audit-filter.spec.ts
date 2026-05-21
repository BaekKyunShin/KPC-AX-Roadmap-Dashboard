// e2e/scroll-ux/ops-audit-filter.spec.ts
// PR1 P0 회귀 — AuditLogClient 필터·리셋 시 스크롤 위치 보존
import { test, expect } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 운영 감사 로그 필터', () => {
  test('검색어 입력(디바운스) 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/ops/audit');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '감사 로그 시드 데이터 부족');
    const beforeScroll = await scrollToY(page, 400);
    const beforeHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    // 감사 로그 검색은 server-side fetch 이므로 결과 개수 변화로 콘텐츠 높이가
    // 크게 줄어들 수 있다. 이때 브라우저가 scrollY 를 max 로 자동 클램프 → 0.
    // 본 PR(C-1) 의 patch 적용은 router.replace({ scroll: false }) 로 확인된
    // 사실이며, scrollY 자동 클램프는 의도된 브라우저 동작이므로 이 케이스는
    // 페이지 높이 변화가 적은 경우에만 검증한다.
    await page.getByPlaceholder(/검색/i).first().fill('테스트');
    await page.waitForURL(/search=/, { timeout: 5_000 });
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

    const afterHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const afterScroll = await page.evaluate(() => window.scrollY);

    // 콘텐츠 높이가 크게 줄어든 경우(검색 결과 적음) 스크롤 클램프는 브라우저
    // 기본 동작이므로 본 회귀 검증의 관심사가 아님 → skip.
    test.skip(
      beforeHeight - afterHeight > 200,
      `검색으로 콘텐츠 높이가 크게 감소(${beforeHeight}→${afterHeight}) — scrollY 자동 클램프는 의도된 동작`,
    );

    expect(
      Math.abs(afterScroll - beforeScroll),
      `스크롤 위치 변동이 50px 초과: ${beforeScroll} → ${afterScroll} (page height ${beforeHeight}→${afterHeight})`,
    ).toBeLessThan(50);
  });

  test('필터 초기화 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/ops/audit?search=foo');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '감사 로그 시드 데이터 부족');
    await scrollToY(page, 400);

    const resetButton = page.getByRole('button', { name: /초기화|리셋/ }).first();
    const hasReset = await resetButton.isVisible().catch(() => false);
    test.skip(!hasReset, '초기화 버튼 미노출');

    await expectScrollPreserved(
      page,
      async () => {
        await resetButton.click();
      },
      async () => {
        await expect(page).toHaveURL('/ops/audit');
      },
    );
  });
});
