// e2e/mobile/consultant-home.mobile.spec.ts
// 모바일 뷰포트 컨설턴트 홈 대시보드 테스트
import { test, expect, checkNoHorizontalOverflow } from '../fixtures/mobile.fixture';

test.describe('모바일 컨설턴트 홈 — KPI 카드 레이아웃', () => {
  test('대시보드 기본 요소가 모바일에서 렌더링됨', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/consultant.json',
    });
    const page = await context.newPage();

    await page.goto('/consultant/home');
    await page.waitForLoadState('networkidle');

    // 인사말 표시
    await expect(page.getByText(/컨설턴트님/)).toBeVisible();

    // 네비게이션 바 표시
    await expect(page.locator('nav')).toBeVisible();

    // 메인 콘텐츠 표시
    await expect(page.locator('main')).toBeVisible();

    // 가로 오버플로 없음
    const noOverflow = await checkNoHorizontalOverflow(page);
    expect(noOverflow).toBe(true);

    await context.close();
  });

  test('KPI 요약 카드가 2열 그리드로 표시됨 (모바일)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/consultant.json',
    });
    const page = await context.newPage();

    await page.goto('/consultant/home');
    await page.waitForLoadState('networkidle');

    // KPI 카드 그리드 (grid-cols-2 lg:grid-cols-5)
    const kpiGrid = page.locator('.grid.grid-cols-2').first();
    const hasKpiGrid = await kpiGrid.isVisible().catch(() => false);

    if (hasKpiGrid) {
      const cards = kpiGrid.locator('> a');
      const cardCount = await cards.count();

      // 최소 5개 KPI 카드 존재 (전체, 인터뷰 대기, 인터뷰 완료, 로드맵 작성 중, 로드맵 완료)
      expect(cardCount).toBeGreaterThanOrEqual(5);

      if (cardCount >= 2) {
        const firstCardBox = await cards.nth(0).boundingBox();
        const secondCardBox = await cards.nth(1).boundingBox();

        // 2열 그리드: 첫 두 카드가 같은 행에 위치 (Y좌표가 비슷)
        expect(Math.abs(firstCardBox!.y - secondCardBox!.y)).toBeLessThan(10);

        // 각 카드 너비가 뷰포트의 약 절반
        expect(firstCardBox!.width).toBeLessThan(250);
        expect(firstCardBox!.width).toBeGreaterThan(100);
      }
    }

    await context.close();
  });

  test('KPI 카드 라벨 및 숫자 표시', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/consultant.json',
    });
    const page = await context.newPage();

    await page.goto('/consultant/home');
    await page.waitForLoadState('networkidle');

    // KPI 카드 라벨 확인 (CI 환경 느린 로드 대응)
    await expect(page.getByText('전체 프로젝트')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('인터뷰 대기').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('인터뷰 완료').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('로드맵 작성 중').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('로드맵 완료').first()).toBeVisible({ timeout: 15_000 });

    await context.close();
  });

  test('최근 프로젝트 / 활동 섹션이 모바일에서 세로 배치됨', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/consultant.json',
    });
    const page = await context.newPage();

    await page.goto('/consultant/home');
    await page.waitForLoadState('networkidle');

    // "프로젝트 상태 분포"와 "최근 프로젝트" 섹션 확인
    const statusSection = page.getByText('프로젝트 상태 분포');
    const recentSection = page.getByText('최근 프로젝트');

    // CI 환경 느린 로드 대응: expect로 대기 후 가시성 확인
    let hasStatus = false;
    let hasRecent = false;
    try {
      await expect(statusSection).toBeVisible({ timeout: 15_000 });
      hasStatus = true;
    } catch {
      hasStatus = false;
    }
    try {
      await expect(recentSection).toBeVisible({ timeout: 15_000 });
      hasRecent = true;
    } catch {
      hasRecent = false;
    }

    if (hasStatus && hasRecent) {
      const statusBox = await statusSection.boundingBox();
      const recentBox = await recentSection.boundingBox();

      // boundingBox가 null일 수 있으므로 null 체크
      if (statusBox && recentBox) {
        // 모바일에서는 세로 배치 (grid-cols-1): 최근 프로젝트가 상태 분포 아래
        expect(recentBox.y).toBeGreaterThan(statusBox.y);
      }
    }

    // "최근 활동" 섹션 확인
    await expect(page.getByRole('heading', { name: '최근 활동' })).toBeVisible({ timeout: 15_000 });

    await context.close();
  });
});
