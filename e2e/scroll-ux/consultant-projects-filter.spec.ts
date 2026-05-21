// e2e/scroll-ux/consultant-projects-filter.spec.ts
// PR1 P0 회귀 — consultant/projects ProjectList 필터·리셋 시 스크롤 위치 보존
import { test, expect } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 컨설턴트 프로젝트 목록 필터', () => {
  test('상태 필터 변경 시 스크롤 위치 유지', async ({ consultantPage: page }) => {
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    test.skip(
      !(await isScrollable(page)),
      '컨설턴트 담당 프로젝트 시드 데이터 부족',
    );
    await scrollToY(page, 400);

    const statusCombo = page.getByRole('combobox').first();
    const hasCombo = await statusCombo.isVisible().catch(() => false);
    test.skip(!hasCombo, '상태 필터 컴보박스 미노출');

    await expectScrollPreserved(
      page,
      async () => {
        await statusCombo.click();
        await page.getByRole('option').nth(1).click();
      },
      async () => {
        await page.waitForURL(/status=/);
      },
    );
  });

  test('필터 초기화 시 스크롤 위치 유지', async ({ consultantPage: page }) => {
    await page.goto('/consultant/projects?status=NEW');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '컨설턴트 프로젝트 시드 데이터 부족');
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
        await expect(page).toHaveURL('/consultant/projects');
      },
    );
  });
});
