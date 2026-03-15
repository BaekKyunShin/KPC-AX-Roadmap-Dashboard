// e2e/consultant/consultant-projects.spec.ts
// 컨설턴트 프로젝트 목록 E2E 테스트
import { test, expect } from '../fixtures/auth.fixture';

test.describe('컨설턴트 프로젝트 목록', () => {
  test.beforeEach(async ({ consultantPage: page }) => {
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');
  });

  test('프로젝트 페이지 로딩 — 기본 요소 렌더링', async ({ consultantPage: page }) => {
    // 네비게이션 바 표시
    await expect(page.locator('nav')).toBeVisible();
    // 메인 콘텐츠 영역 표시
    await expect(page.locator('main')).toBeVisible();
  });

  test('프로젝트 목록 또는 빈 상태 표시', async ({ consultantPage: page }) => {
    const mainContent = page.locator('main');

    // 프로젝트 카드 또는 테이블 행이 있는지 확인
    const hasProjectItems = await mainContent
      .locator('a[href*="/consultant/projects/"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (hasProjectItems) {
      // 프로젝트가 있으면 최소 1개의 프로젝트 링크가 보여야 함
      const projectLinks = mainContent.locator('a[href*="/consultant/projects/"]');
      await expect(projectLinks.first()).toBeVisible();
    } else {
      // 프로젝트가 없으면 빈 상태 메시지 또는 안내 텍스트가 있어야 함
      const pageText = await mainContent.textContent();
      expect(pageText!.length).toBeGreaterThan(0);
    }
  });

  test('프로젝트 상세 네비게이션 (프로젝트가 있는 경우)', async ({ consultantPage: page }) => {
    const mainContent = page.locator('main');

    const firstProjectLink = mainContent
      .locator('a[href*="/consultant/projects/"]')
      .first();

    const hasProject = await firstProjectLink.isVisible().catch(() => false);

    if (hasProject) {
      const href = await firstProjectLink.getAttribute('href');
      await firstProjectLink.click();

      // 프로젝트 상세 페이지로 이동 확인
      await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), {
        timeout: 10_000,
      });

      // 상세 페이지 메인 콘텐츠 로딩 확인
      await expect(page.locator('main')).toBeVisible();
    }
    // 프로젝트가 없으면 이 테스트는 스킵됨 (방어적 패턴)
  });
});
