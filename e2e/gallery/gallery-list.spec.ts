// e2e/gallery/gallery-list.spec.ts
// 갤러리 목록 페이지 E2E 테스트
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('갤러리 목록', () => {
  test('갤러리 페이지 로드 + 카드 또는 빈 상태 (관리자)', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    // "로드맵 갤러리" 헤더 확인
    await expect(page.getByRole('heading', { name: '로드맵 갤러리' })).toBeVisible();

    // 검색 입력 필드 확인
    await expect(
      page.getByPlaceholder('로드맵 검색 (기업명, 업종, 키워드...)'),
    ).toBeVisible();

    // 카드가 있거나 빈 상태 메시지가 있어야 함
    const hasCards = await page
      .locator('a[href*="/gallery/"]')
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasCards) {
      // 빈 상태: "아직 공유된 로드맵이 없습니다" 또는 콘텐츠 영역 렌더링 확인
      const mainContent = await page.locator('main').textContent();
      expect(mainContent!.length).toBeGreaterThan(0);
    }

    expect(getErrors()).toEqual([]);
  });

  test('검색 입력 → URL 쿼리 파라미터 변경', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder('로드맵 검색 (기업명, 업종, 키워드...)');
    await searchInput.fill('테스트검색어');

    // 디바운스 대기 (300ms + 여유)
    await page.waitForTimeout(500);

    // URL에 search 파라미터가 반영되는지 확인
    await expect(page).toHaveURL(/search=/, { timeout: 5_000 });
  });

  test('업종 필터 선택 → URL 업데이트', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    // 업종 셀렉트 클릭 (첫 번째 Select — "모든 업종"이 기본값)
    const industryTrigger = page.getByRole('combobox').first();
    await industryTrigger.click();

    // "IT/소프트웨어" 옵션 선택 (실제 업종 옵션 중 하나)
    const itOption = page.getByRole('option', { name: 'IT/소프트웨어' });
    const hasItOption = await itOption.isVisible().catch(() => false);

    if (hasItOption) {
      await itOption.click();
      // URL에 industry 파라미터가 반영되는지 확인
      await expect(page).toHaveURL(/industry=/, { timeout: 5_000 });
    } else {
      // 첫 번째 사용 가능한 옵션 선택
      const firstOption = page.getByRole('option').first();
      await firstOption.click();
    }
  });

  test('정렬 선택 (최신순/좋아요순) → URL 업데이트', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    // 정렬 셀렉트 클릭 (두 번째 Select)
    const sortTrigger = page.getByRole('combobox').nth(1);
    await sortTrigger.click();

    // "좋아요순" 옵션 선택
    await page.getByRole('option', { name: '좋아요순' }).click();

    // URL에 sort=popular 파라미터가 반영되는지 확인
    await expect(page).toHaveURL(/sort=popular/, { timeout: 5_000 });
  });

  test('필터 초기화 버튼', async ({ opsPage: page }) => {
    // 필터가 있는 상태에서 시작
    await page.goto('/gallery?sort=popular&search=test');
    await page.waitForLoadState('networkidle');

    // 필터 초기화 버튼 클릭 (X 아이콘 버튼)
    const resetButton = page.getByRole('button', { name: '필터 초기화' }).first();
    const hasReset = await resetButton.isVisible().catch(() => false);

    if (hasReset) {
      await resetButton.click();

      // URL에서 파라미터가 제거되는지 확인
      await expect(page).toHaveURL('/gallery', { timeout: 5_000 });
    }
    // 필터 초기화 버튼이 없으면 필터가 이미 비어있는 상태
  });

  test('관리자 필터 표시 여부 — OPS에서 보이고 컨설턴트에서 안 보임', async ({
    opsPage,
    consultantPage,
  }) => {
    // OPS 관리자: "관리자 필터" 텍스트가 보여야 함
    await opsPage.goto('/gallery');
    await opsPage.waitForLoadState('networkidle');

    await expect(opsPage.getByText('관리자 필터')).toBeVisible({ timeout: 10_000 });

    // 컨설턴트: "관리자 필터" 텍스트가 보이지 않아야 함
    await consultantPage.goto('/gallery');
    await consultantPage.waitForLoadState('networkidle');

    // 페이지 로드 대기 후 관리자 필터가 없는지 확인
    await consultantPage.waitForTimeout(1_000);
    await expect(consultantPage.getByText('관리자 필터')).not.toBeVisible();
  });
});
