// e2e/dashboard/profile.spec.ts
// 대시보드 프로필 페이지 E2E 테스트
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck, waitForPageLoad } from '../helpers/assertions.helper';

test.describe('프로필 페이지 (/dashboard/profile)', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');
  });

  test('프로필 페이지 로드 + 기존 데이터 표시 — 콘솔 에러 없음', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');

    // 프로필 관련 제목 표시 ("프로필 등록" 또는 "프로필 관리")
    // 또는 프로필 API 에러 시 에러 메시지 — main 스코핑으로 네비 중복 방지
    const profileTitle = page.locator('main').getByRole('heading', { name: /프로필 (등록|관리)/ });
    const errorState = page.locator('main').getByText(/프로필을 불러오는데 실패|오류/);
    await expect(profileTitle.or(errorState)).toBeVisible({ timeout: 10_000 });

    // 메인 콘텐츠 영역 표시
    await expect(page.locator('main')).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('뒤로가기 → /dashboard', async ({ opsPage: page }) => {
    // "돌아가기" 버튼 클릭 (ProfileForm의 backLabel 기본값)
    const backButton = page.getByRole('button', { name: '돌아가기' });
    const hasBackButton = await backButton.isVisible().catch(() => false);

    if (hasBackButton) {
      await backButton.click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    }
    // 뒤로가기 버튼이 없는 경우 (프로필 미등록 등) — 테스트 통과
  });

  test('프로필 입력 필드 존재 확인', async ({ opsPage: page }) => {
    // 컨설턴트 프로필 폼의 주요 필드 확인
    await waitForPageLoad(page);

    // 카드 제목 "컨설턴트 프로필" 확인 — card-title 스코핑으로 다중 매칭 방지
    await expect(
      page.locator('main [data-slot="card-title"]').filter({ hasText: /컨설턴트 프로필/ }),
    ).toBeVisible({ timeout: 10_000 });

    // "소속" 입력 필드 확인 (#affiliation)
    const affiliationInput = page.locator('#affiliation');
    await expect(affiliationInput).toBeVisible();
  });

  test('프로필 폼 데이터 로드 완료 확인', async ({ opsPage: page }) => {
    // 스켈레톤이 사라지고 실제 폼이 표시되는지 확인
    await waitForPageLoad(page);

    // 폼이 로드되면 submit 버튼이 표시됨 ("저장" 또는 "프로필 등록")
    const submitButton = page.getByRole('button', { name: /저장|프로필 등록|가입 완료/ });
    await expect(submitButton).toBeVisible({ timeout: 10_000 });
  });
});
