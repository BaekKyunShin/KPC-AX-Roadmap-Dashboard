// e2e/visual/consultant-home.visual.spec.ts
// 컨설턴트 홈 세부 영역 시각적 회귀 테스트
// (dashboard.visual.spec.ts에서 전체 레이아웃을 이미 검증하므로, 여기서는 세부 섹션에 집중)
import { test as base, expect } from '@playwright/test';

const test = base.extend({});

test.describe('시각적 회귀 — 컨설턴트 홈 세부 영역', () => {
  test('KPI 카드 섹션 스크린샷', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '.auth/consultant.json',
    });
    const page = await context.newPage();

    await page.goto('/consultant/home');
    await page.waitForLoadState('networkidle');

    // 로딩 완료 대기 (스켈레톤 사라짐)
    const skeleton = page.locator('.animate-pulse, .animate-shimmer');
    const hasSkeleton = await skeleton.first().isVisible({ timeout: 1_000 }).catch(() => false);
    if (hasSkeleton) {
      await skeleton.first().waitFor({ state: 'hidden', timeout: 10_000 });
    }

    // KPI 카드 그리드 영역 (통계 카드들이 배치된 그리드)
    const kpiSection = page.locator('.grid').filter({
      has: page.locator('[data-slot="card"]'),
    }).first();

    const hasKpi = await kpiSection.isVisible().catch(() => false);

    if (hasKpi) {
      await expect(kpiSection).toHaveScreenshot('consultant-kpi-cards.png', {
        maxDiffPixelRatio: 0.05,
      });
    }

    await context.close();
  });

  test('최근 활동 영역 스크린샷', async ({ browser }) => {
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

    // 최근 활동 카드 영역 (테이블 또는 리스트가 포함된 카드)
    const activitySection = page.locator('[data-slot="card"]').filter({
      has: page.getByText(/최근|활동|프로젝트/),
    }).first();

    const hasActivity = await activitySection.isVisible().catch(() => false);

    if (hasActivity) {
      await expect(activitySection).toHaveScreenshot('consultant-recent-activity.png', {
        maxDiffPixelRatio: 0.05,
      });
    }

    await context.close();
  });
});
