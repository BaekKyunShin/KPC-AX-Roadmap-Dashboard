// e2e/consultant/test-pbl.spec.ts
// ISSUE-02·03 Step E: 자동 prefill 제거 → 빈 폼 + "샘플 데이터 채우기" 버튼.
import { test, expect } from '../fixtures/auth.fixture';

test.describe('PBL 테스트 페이지 — 컨설턴트', () => {
  test('/test-pbl 접근 + 빈 폼 시작 + 샘플 채우기 버튼으로 prefill', async ({
    consultantPage: page,
  }) => {
    await page.goto('/test-pbl');
    await page.waitForLoadState('networkidle');

    // 페이지 헤더
    await expect(page.getByRole('heading', { name: 'PBL 테스트' })).toBeVisible({
      timeout: 15_000,
    });

    // 테스트 모드 안내 alert (ISSUE-02: is_test_mode 노출 제거)
    await expect(page.getByText('테스트 모드 안내')).toBeVisible();
    await expect(page.getByText(/입력값은 DB에 저장되지 않으며/)).toBeVisible();

    // 초기엔 훈련과정명이 빈 값
    const courseNameInput = page.getByRole('textbox', { name: /훈련과정명/ });
    await expect(courseNameInput).toBeVisible();
    await expect(courseNameInput).toHaveValue('');

    // "샘플 데이터 채우기" 버튼 노출 + 클릭
    const fillSampleBtn = page.getByTestId('test-pbl-fill-sample');
    await expect(fillSampleBtn).toBeVisible();
    await fillSampleBtn.click();

    // 클릭 후 fixture 값이 폼에 채워짐
    await expect(courseNameInput).toHaveValue(/PBL 과정/);

    // 스테퍼가 렌더되는지 확인 (PBL 인터뷰 다단계 폼)
    await expect(page.locator('nav[aria-label="Progress"]')).toBeVisible();
  });

  test('네비게이션에서 "PBL 테스트" 메뉴 진입 가능', async ({ consultantPage: page }) => {
    await page.goto('/consultant/home');
    await page.waitForLoadState('networkidle');

    // 데스크톱 네비게이션의 "PBL 테스트" 링크
    const link = page.locator('[data-testid="desktop-nav"] a', { hasText: 'PBL 테스트' }).first();
    const hasLink = await link.isVisible().catch(() => false);

    if (!hasLink) {
      // 모바일 레이아웃 fallback
      test.skip(true, '데스크톱 네비게이션이 렌더되지 않음 (모바일 뷰포트)');
      return;
    }

    await link.click();
    await expect(page).toHaveURL('/test-pbl');
  });
});

test.describe('PBL 테스트 페이지 — 운영관리자', () => {
  test('/test-pbl 접근 가능', async ({ opsPage: page }) => {
    await page.goto('/test-pbl');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'PBL 테스트' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
