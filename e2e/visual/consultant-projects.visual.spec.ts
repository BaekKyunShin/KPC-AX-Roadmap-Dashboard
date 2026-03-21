// e2e/visual/consultant-projects.visual.spec.ts
// 컨설턴트 프로젝트 목록 시각적 회귀 테스트
import { test as base, expect } from '@playwright/test';

const test = base.extend({});

test.describe('시각적 회귀 — 컨설턴트 프로젝트 목록', () => {
  test('프로젝트 목록 페이지 레이아웃', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '.auth/consultant.json',
    });
    const page = await context.newPage();

    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    // 로딩 완료 대기 (스켈레톤 사라짐)
    const skeleton = page.locator('.animate-pulse, .animate-shimmer');
    const hasSkeleton = await skeleton.first().isVisible({ timeout: 1_000 }).catch(() => false);
    if (hasSkeleton) {
      await skeleton.first().waitFor({ state: 'hidden', timeout: 10_000 });
    }

    // 프로젝트 목록 영역 (카드 그리드 또는 테이블)
    const projectList = page.locator('main');
    await expect(projectList).toBeVisible();

    await expect(page).toHaveScreenshot('consultant-projects-list.png', {
      maxDiffPixelRatio: 0.05,
      fullPage: false,
    });

    await context.close();
  });
});
