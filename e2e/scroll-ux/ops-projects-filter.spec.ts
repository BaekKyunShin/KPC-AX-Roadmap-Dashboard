// e2e/scroll-ux/ops-projects-filter.spec.ts
// PR1 P0 회귀 — ops/projects ProjectList 필터·리셋 시 스크롤 위치 보존
import { test, expect } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 운영 프로젝트 관리 필터', () => {
  test('업종 필터 변경 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '운영 프로젝트 시드 데이터 부족');
    await scrollToY(page, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page.getByRole('combobox', { name: /업종/ }).click();
        await page.getByRole('option').nth(1).click();
      },
      async () => {
        await page.waitForURL(/industry=/);
      },
    );
  });

  test('필터 초기화 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/ops/projects?industry=IT');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '운영 프로젝트 시드 데이터 부족');
    await scrollToY(page, 400);

    const resetButton = page.getByRole('button', { name: /초기화|리셋/ }).first();
    const hasReset = await resetButton.isVisible().catch(() => false);
    test.skip(!hasReset, '필터 초기화 버튼 미노출');

    await expectScrollPreserved(
      page,
      async () => {
        await resetButton.click();
      },
      async () => {
        await expect(page).toHaveURL('/ops/projects');
      },
    );
  });
});
