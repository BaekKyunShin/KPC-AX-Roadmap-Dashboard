// e2e/visual/gallery.visual.spec.ts
// 갤러리 목록 레이아웃 시각적 회귀 테스트
import { test as base, expect } from '@playwright/test';

const test = base.extend({});

test.describe('시각적 회귀 — 갤러리 목록', () => {
  test('갤러리 페이지 전체 레이아웃', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    // 로딩 완료 대기 (스켈레톤/shimmer 사라짐)
    const skeleton = page.locator('.animate-pulse, .animate-shimmer');
    const hasSkeleton = await skeleton.first().isVisible({ timeout: 1_000 }).catch(() => false);
    if (hasSkeleton) {
      await skeleton.first().waitFor({ state: 'hidden', timeout: 10_000 });
    }

    await expect(page.getByRole('heading', { name: '로드맵 갤러리' })).toBeVisible();

    await expect(page).toHaveScreenshot('gallery-list-layout.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    });

    await context.close();
  });

  test('갤러리 검색 필터 영역 스크린샷', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    // 검색 필터 카드 영역
    const filterCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByPlaceholder('로드맵 검색') })
      .first();

    const hasFilterCard = await filterCard.isVisible().catch(() => false);

    if (hasFilterCard) {
      await expect(filterCard).toHaveScreenshot('gallery-filter-area.png', {
        maxDiffPixelRatio: 0.05,
      });
    }

    await context.close();
  });

  test('갤러리 카드 그리드 스크린샷', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    // 로딩 완료 대기
    const skeleton = page.locator('.animate-shimmer');
    const hasSkeleton = await skeleton.first().isVisible({ timeout: 1_000 }).catch(() => false);
    if (hasSkeleton) {
      await skeleton.first().waitFor({ state: 'hidden', timeout: 10_000 });
    }

    // 카드 그리드 영역 (카드가 있는 경우)
    const cardGrid = page.locator('.grid.grid-cols-1').first();
    const hasCards = await cardGrid.isVisible().catch(() => false);

    if (hasCards) {
      await expect(cardGrid).toHaveScreenshot('gallery-card-grid.png', {
        maxDiffPixelRatio: 0.05,
      });
    }

    await context.close();
  });
});
