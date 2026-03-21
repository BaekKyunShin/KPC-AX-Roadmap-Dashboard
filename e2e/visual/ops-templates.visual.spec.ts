// e2e/visual/ops-templates.visual.spec.ts
// 운영관리 템플릿 목록 시각적 회귀 테스트
import { test as base, expect } from '@playwright/test';

const test = base.extend({});

test.describe('시각적 회귀 — 템플릿 목록 페이지', () => {
  test('템플릿 목록 페이지 레이아웃', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/templates');
    await page.waitForLoadState('networkidle');

    // 로딩 완료 대기 (스켈레톤 사라짐)
    const skeleton = page.locator('.animate-pulse, .animate-shimmer');
    const hasSkeleton = await skeleton.first().isVisible({ timeout: 1_000 }).catch(() => false);
    if (hasSkeleton) {
      await skeleton.first().waitFor({ state: 'hidden', timeout: 10_000 });
    }

    // 템플릿 목록 영역
    const main = page.locator('main');
    await expect(main).toBeVisible();

    await expect(page).toHaveScreenshot('ops-templates-list.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    });

    await context.close();
  });
});
