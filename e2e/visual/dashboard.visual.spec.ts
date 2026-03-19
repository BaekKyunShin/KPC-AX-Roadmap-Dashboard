// e2e/visual/dashboard.visual.spec.ts
// 대시보드 메인 레이아웃 시각적 회귀 테스트
import { test as base, expect } from '@playwright/test';

// 인증된 상태에서 시각적 테스트를 위해 storageState 설정
const test = base.extend({});

test.describe('시각적 회귀 — 관리자 대시보드', () => {
  test('프로젝트 관리 페이지 레이아웃', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 페이지 로딩 완료 대기 (스켈레톤 사라짐)
    const skeleton = page.locator('.animate-pulse, .animate-shimmer');
    const hasSkeleton = await skeleton.first().isVisible({ timeout: 1_000 }).catch(() => false);
    if (hasSkeleton) {
      await skeleton.first().waitFor({ state: 'hidden', timeout: 10_000 });
    }

    // 네비게이션 바 포함 전체 레이아웃
    await expect(page.getByRole('heading', { name: '프로젝트 관리' })).toBeVisible();

    await expect(page).toHaveScreenshot('ops-dashboard-layout.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    });

    await context.close();
  });

  test('네비게이션 바 레이아웃', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    const navbar = page.locator('nav').first();
    await expect(navbar).toBeVisible();

    await expect(navbar).toHaveScreenshot('dashboard-navbar.png', {
      maxDiffPixelRatio: 0.05,
    });

    await context.close();
  });
});

test.describe('시각적 회귀 — 컨설턴트 대시보드', () => {
  test('컨설턴트 홈 레이아웃', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '.auth/consultant.json',
    });
    const page = await context.newPage();

    await page.goto('/consultant/home');
    await page.waitForLoadState('networkidle');

    // 로딩 완료 대기
    const skeleton = page.locator('.animate-pulse, .animate-shimmer');
    const hasSkeleton = await skeleton.first().isVisible({ timeout: 1_000 }).catch(() => false);
    if (hasSkeleton) {
      await skeleton.first().waitFor({ state: 'hidden', timeout: 10_000 });
    }

    await expect(page.getByText(/컨설턴트님/)).toBeVisible();

    await expect(page).toHaveScreenshot('consultant-home-layout.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    });

    await context.close();
  });
});
