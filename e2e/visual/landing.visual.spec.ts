// e2e/visual/landing.visual.spec.ts
// 랜딩 페이지 시각적 회귀 테스트
import { test, expect } from '@playwright/test';

test.describe('시각적 회귀 — 랜딩 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 애니메이션 안정화 대기 (GSAP, Framer Motion 등)
    await page.waitForTimeout(1_000);
  });

  test('히어로 섹션 스크린샷', async ({ page }) => {
    // 히어로 섹션은 페이지 최상단 main 내 첫 번째 section
    const heroSection = page.locator('main section').first();
    await expect(heroSection).toBeVisible();

    await expect(page).toHaveScreenshot('hero-section.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    });
  });

  test('기능 소개 섹션 스크린샷', async ({ page }) => {
    // features 섹션으로 스크롤
    const featuresSection = page.locator('section#features');
    await expect(featuresSection).toBeAttached();
    await featuresSection.scrollIntoViewIfNeeded();

    // 스크롤 후 애니메이션 안정화 대기
    await page.waitForTimeout(500);

    await expect(featuresSection).toHaveScreenshot('features-section.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('워크플로우 섹션 스크린샷', async ({ page }) => {
    const workflowSection = page.locator('section#workflow');
    await expect(workflowSection).toBeAttached();
    await workflowSection.scrollIntoViewIfNeeded();

    await page.waitForTimeout(500);

    await expect(workflowSection).toHaveScreenshot('workflow-section.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('네비게이션 바 스크린샷', async ({ page }) => {
    const navbar = page.locator('nav').first();
    await expect(navbar).toBeVisible();

    await expect(navbar).toHaveScreenshot('landing-navbar.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});
