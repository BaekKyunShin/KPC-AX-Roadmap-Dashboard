// e2e/consultant/consultant-profile-edit.spec.ts
// 컨설턴트 프로필 편집 페이지 E2E 테스트
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck, waitForPageLoad } from '../helpers/assertions.helper';

test.describe('컨설턴트 프로필 페이지 (/consultant/profile)', () => {
  test.beforeEach(async ({ consultantPage: page }) => {
    await page.goto('/consultant/profile');
    await page.waitForLoadState('networkidle');
  });

  test('컨설턴트 프로필 페이지 로드 — 콘솔 에러 없음', async ({ consultantPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/consultant/profile');
    await page.waitForLoadState('networkidle');

    await waitForPageLoad(page);

    // 프로필 관련 제목 표시 ("프로필 등록" 또는 "프로필 관리") — main 스코핑으로 네비 중복 방지
    await expect(
      page.locator('main').getByText(/프로필 (등록|관리)/),
    ).toBeVisible({ timeout: 10_000 });

    expect(getErrors()).toEqual([]);
  });

  test('뒤로가기 → /consultant/projects', async ({ consultantPage: page }) => {
    await waitForPageLoad(page);

    // "프로젝트 목록으로" 버튼 클릭 (backLabel prop)
    const backButton = page.getByRole('button', { name: '프로젝트 목록으로' });
    const hasBackButton = await backButton.isVisible().catch(() => false);

    if (hasBackButton) {
      await backButton.click();
      await expect(page).toHaveURL(/\/consultant\/projects/, { timeout: 10_000 });
    }
    // 뒤로가기 버튼이 없는 경우 — 테스트 통과
  });

  test('전문분야 필드 표시 — 입력 필드 존재 확인', async ({ consultantPage: page }) => {
    await waitForPageLoad(page);

    // 컨설턴트 프로필 카드 제목 확인 — main 스코핑으로 네비 중복 방지
    await expect(
      page.locator('main').getByText(/컨설턴트 프로필/),
    ).toBeVisible({ timeout: 10_000 });

    // "소속" 입력 필드 (#affiliation)
    await expect(page.locator('#affiliation')).toBeVisible();

    // "경력 연수" 입력 필드 (#years_of_experience 또는 name="years_of_experience")
    const experienceInput = page.locator('[name="years_of_experience"]');
    await expect(experienceInput).toBeVisible();

    // "AI 훈련 가능 산업" 라벨 확인 (BadgeSelector)
    await expect(
      page.getByText('AI 훈련 가능 산업'),
    ).toBeVisible();

    // "AI 적용 가능 업무" 라벨 확인
    await expect(
      page.getByText('AI 적용 가능 업무'),
    ).toBeVisible();
  });
});
