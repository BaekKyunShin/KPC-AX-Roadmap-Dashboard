// e2e/mobile/gallery.mobile.spec.ts
// 모바일 뷰포트 갤러리 페이지 테스트
import { test, expect, checkNoHorizontalOverflow } from '../fixtures/mobile.fixture';

test.describe('모바일 갤러리 — 레이아웃', () => {
  test('갤러리 카드가 세로(1열) 레이아웃으로 표시됨', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    // 갤러리 헤더 확인
    await expect(page.getByRole('heading', { name: '로드맵 갤러리' })).toBeVisible();

    // 카드 그리드가 1열(grid-cols-1)로 렌더링됨 확인
    // lg:grid-cols-2이지만 모바일에서는 grid-cols-1
    const gridContainer = page.locator('.grid.grid-cols-1').first();
    const hasGrid = await gridContainer.isVisible().catch(() => false);

    if (hasGrid) {
      // 카드들이 세로로 쌓여있는지 확인: 첫 번째와 두 번째 카드의 Y 좌표 비교
      const cards = gridContainer.locator('> *');
      const cardCount = await cards.count();

      if (cardCount >= 2) {
        const firstCardBox = await cards.nth(0).boundingBox();
        const secondCardBox = await cards.nth(1).boundingBox();

        // 두 번째 카드가 첫 번째 카드 아래에 위치 (세로 레이아웃)
        expect(secondCardBox!.y).toBeGreaterThan(firstCardBox!.y);

        // 두 카드의 너비가 동일 (1열)
        expect(Math.abs(firstCardBox!.width - secondCardBox!.width)).toBeLessThan(5);
      }
    }

    // 가로 오버플로 없음
    const noOverflow = await checkNoHorizontalOverflow(page);
    expect(noOverflow).toBe(true);

    await context.close();
  });

  test('검색 입력 필드가 모바일에서 전체 너비로 표시됨', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('로드맵 검색 (기업명, 업종, 키워드...)');
    await expect(searchInput).toBeVisible();

    // 검색 입력이 화면 너비에 가깝게 표시됨 (패딩 고려)
    const inputBox = await searchInput.boundingBox();
    expect(inputBox!.width).toBeGreaterThan(300); // 393px 뷰포트에서 최소 300px 이상

    await context.close();
  });
});

test.describe('모바일 갤러리 — 필터', () => {
  test('필터 컨트롤이 세로로 축소 배치됨', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    // 필터 영역: flex-col로 변경되어 검색과 셀렉트가 세로 배치
    // 검색 입력과 셀렉트 트리거가 모두 표시됨
    const searchInput = page.getByPlaceholder('로드맵 검색 (기업명, 업종, 키워드...)');
    await expect(searchInput).toBeVisible();

    // 셀렉트 트리거(업종, 정렬)가 표시됨
    const comboboxes = page.getByRole('combobox');
    const comboboxCount = await comboboxes.count();
    expect(comboboxCount).toBeGreaterThanOrEqual(2);

    // 검색 입력과 첫 번째 셀렉트의 Y좌표 비교 → 세로 배치 확인
    const searchBox = await searchInput.boundingBox();
    const firstComboBox = await comboboxes.first().boundingBox();

    // 셀렉트가 검색 입력 아래에 위치
    expect(firstComboBox!.y).toBeGreaterThan(searchBox!.y);

    await context.close();
  });

  test('업종 필터 선택 동작', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    // 업종 셀렉트 클릭
    const industryTrigger = page.getByRole('combobox').first();
    await industryTrigger.click();

    // 옵션 목록이 표시됨
    const options = page.getByRole('option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(0);

    // 첫 번째 옵션 선택
    await options.first().click();

    await context.close();
  });
});
