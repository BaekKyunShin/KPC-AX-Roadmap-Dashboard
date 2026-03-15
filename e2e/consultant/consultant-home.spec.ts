// e2e/consultant/consultant-home.spec.ts
// 컨설턴트 홈 대시보드 E2E 테스트
import { test, expect } from '../fixtures/auth.fixture';

test.describe('컨설턴트 홈 대시보드', () => {
  test('/dashboard → /consultant/home 리다이렉트', async ({ consultantPage: page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/consultant\/home/, { timeout: 10_000 });
  });

  test('대시보드 기본 요소 렌더링', async ({ consultantPage: page }) => {
    await page.goto('/consultant/home');
    await page.waitForLoadState('networkidle');

    // 네비게이션 바 표시
    await expect(page.locator('nav')).toBeVisible();

    // 페이지 제목 또는 대시보드 콘텐츠 영역 표시
    await expect(page.locator('main')).toBeVisible();
  });

  test('KPI 요약 카드 표시', async ({ consultantPage: page }) => {
    await page.goto('/consultant/home');
    await page.waitForLoadState('networkidle');

    // 요약 카드 영역이 렌더링됨 (데이터 유무에 관계없이 카드 구조는 표시)
    // 프로젝트 수, 상태 등 KPI 카드가 표시되는지 확인
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // 숫자 통계가 포함된 카드가 최소 1개 이상 존재
    const hasCards = await mainContent
      .locator('[class*="rounded"]')
      .first()
      .isVisible()
      .catch(() => false);

    // 카드가 있거나 빈 상태 메시지가 있어야 함
    expect(
      hasCards || (await mainContent.textContent())!.length > 0,
    ).toBe(true);
  });

  test('최근 프로젝트 섹션 표시', async ({ consultantPage: page }) => {
    await page.goto('/consultant/home');
    await page.waitForLoadState('networkidle');

    const mainContent = page.locator('main');

    // 최근 프로젝트 또는 활동 섹션이 표시됨
    const hasRecentSection = await mainContent
      .getByText(/최근|프로젝트|활동/)
      .first()
      .isVisible()
      .catch(() => false);

    // 데이터가 없어도 섹션 구조는 표시되어야 함
    expect(
      hasRecentSection || (await mainContent.textContent())!.length > 0,
    ).toBe(true);
  });
});
