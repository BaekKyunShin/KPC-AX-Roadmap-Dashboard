// e2e/negative/invalid-routes.spec.ts
// 부정 시나리오: 존재하지 않는 URL 경로 접근 시 404 처리 검증
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

// ---------------------------------------------------------------------------
// 비인증 상태에서 존재하지 않는 공개 경로 접근
// ---------------------------------------------------------------------------
test.describe('부정 시나리오: 존재하지 않는 공개 경로 → 404', () => {
  test('존재하지 않는 페이지 /nonexistent-page → 404 표시', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    const response = await page.goto('/nonexistent-page');
    await page.waitForLoadState('networkidle');

    // 404 상태 코드 확인
    expect(response?.status()).toBe(404);

    // 404 페이지 텍스트 확인
    const pageText = await page.locator('body').textContent();
    const is404 =
      pageText!.includes('404') ||
      pageText!.includes('찾을 수 없') ||
      pageText!.includes('Not Found');
    expect(is404).toBe(true);

    expect(getErrors()).toEqual([]);
  });

  test('404 페이지에 "홈으로 돌아가기" 링크가 표시되고 클릭 시 홈으로 이동한다', async ({
    page,
  }) => {
    await page.goto('/nonexistent-page');
    await page.waitForLoadState('networkidle');

    // "홈으로 돌아가기" 링크 확인 (다중 매칭 방지)
    const homeLink = page.getByRole('link', { name: '홈으로 돌아가기', exact: true }).first();
    await expect(homeLink).toBeVisible();

    // 링크 클릭 → 홈(/) 이동 확인
    await homeLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/^\/$/, { timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 인증된 OPS 관리자: 잘못된 UUID 형식 / 존재하지 않는 리소스 접근
// ---------------------------------------------------------------------------
authTest.describe('부정 시나리오: OPS 관리자 — 잘못된 리소스 접근', () => {
  authTest('잘못된 UUID 형식 /ops/projects/not-a-uuid → 에러 처리', async ({
    opsPage: page,
  }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto('/ops/projects/not-a-uuid');
    await page.waitForLoadState('networkidle');

    // 404 페이지 또는 에러 메시지 표시 확인
    const pageText = await page.locator('body').textContent();
    const isErrorHandled =
      pageText!.includes('404') ||
      pageText!.includes('찾을 수 없') ||
      pageText!.includes('Not Found') ||
      pageText!.includes('존재하지 않') ||
      pageText!.includes('오류');

    authExpect(isErrorHandled).toBe(true);

    authExpect(getErrors()).toEqual([]);
  });

  authTest('존재하지 않는 프로젝트 UUID /ops/projects/00000000-... → 에러 처리', async ({
    opsPage: page,
  }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await page.goto(`/ops/projects/${fakeId}`);
    await page.waitForLoadState('networkidle');

    // 404 또는 에러 페이지 확인
    const pageText = await page.locator('body').textContent();
    const is404 =
      pageText!.includes('404') ||
      pageText!.includes('찾을 수 없') ||
      pageText!.includes('Not Found') ||
      pageText!.includes('존재하지 않');

    authExpect(is404).toBe(true);
  });

  authTest('존재하지 않는 템플릿 UUID /ops/templates/00000000-... → 에러 처리', async ({
    opsPage: page,
  }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await page.goto(`/ops/templates/${fakeId}`);
    await page.waitForLoadState('networkidle');

    // 404 또는 에러 페이지 확인
    const pageText = await page.locator('body').textContent();
    const is404 =
      pageText!.includes('404') ||
      pageText!.includes('찾을 수 없') ||
      pageText!.includes('Not Found') ||
      pageText!.includes('존재하지 않');

    authExpect(is404).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 인증된 컨설턴트: 존재하지 않는 갤러리 리소스 접근
// ---------------------------------------------------------------------------
authTest.describe('부정 시나리오: 컨설턴트 — 존재하지 않는 갤러리 접근', () => {
  authTest('존재하지 않는 갤러리 UUID /gallery/00000000-... → 404 처리', async ({
    consultantPage: page,
  }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await page.goto(`/gallery/${fakeId}`);
    await page.waitForLoadState('networkidle');

    // 404 페이지 확인
    const pageText = await page.locator('body').textContent();
    const is404 =
      pageText!.includes('404') ||
      pageText!.includes('찾을 수 없') ||
      pageText!.includes('Not Found') ||
      pageText!.includes('존재하지 않');

    authExpect(is404).toBe(true);
  });
});
