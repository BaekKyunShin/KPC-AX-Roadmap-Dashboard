// e2e/visual/ops-projects.visual.spec.ts
// 운영관리 프로젝트 페이지 세부 영역 시각적 회귀 테스트
// (dashboard.visual.spec.ts에서 전체 레이아웃을 이미 검증하므로, 여기서는 세부 영역에 집중)
import { test as base, expect } from '@playwright/test';

const test = base.extend({});

test.describe('시각적 회귀 — 운영 프로젝트 세부 영역', () => {
  test('프로젝트 통계 카드 스크린샷', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 로딩 완료 대기 (스켈레톤 사라짐)
    const skeleton = page.locator('.animate-pulse, .animate-shimmer');
    const hasSkeleton = await skeleton.first().isVisible({ timeout: 1_000 }).catch(() => false);
    if (hasSkeleton) {
      await skeleton.first().waitFor({ state: 'hidden', timeout: 10_000 });
    }

    // 통계 카드 그리드 (상단 요약 카드 영역)
    const statsGrid = page.locator('.grid').filter({
      has: page.locator('[data-slot="card"]'),
    }).first();

    const hasStats = await statsGrid.isVisible().catch(() => false);

    if (hasStats) {
      await expect(statsGrid).toHaveScreenshot('ops-project-stats-cards.png', {
        maxDiffPixelRatio: 0.05,
      });
    }

    await context.close();
  });

  test('프로젝트 테이블 영역 스크린샷', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 로딩 완료 대기
    const skeleton = page.locator('.animate-pulse, .animate-shimmer');
    const hasSkeleton = await skeleton.first().isVisible({ timeout: 1_000 }).catch(() => false);
    if (hasSkeleton) {
      await skeleton.first().waitFor({ state: 'hidden', timeout: 10_000 });
    }

    // 프로젝트 테이블 또는 리스트 영역
    const tableSection = page.locator('table').first();
    const hasTable = await tableSection.isVisible().catch(() => false);

    if (hasTable) {
      await expect(tableSection).toHaveScreenshot('ops-project-table.png', {
        maxDiffPixelRatio: 0.05,
      });
    }

    await context.close();
  });
});
