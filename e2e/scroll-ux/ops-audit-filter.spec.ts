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
    await scrollToY(page, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page.getByPlaceholder(/검색/i).first().fill('테스트');
      },
      async () => {
        await page.waitForURL(/search=/, { timeout: 5_000 });
      },
    );
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
