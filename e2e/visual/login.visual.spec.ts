// e2e/visual/login.visual.spec.ts
// 로그인/회원가입 폼 시각적 회귀 테스트
import { test, expect } from '@playwright/test';

test.describe('시각적 회귀 — 로그인 폼', () => {
  test('로그인 폼 스크린샷', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 애니메이션 안정화 대기
    await page.waitForTimeout(500);

    // 로그인 폼 카드 영역
    const loginForm = page.locator('[data-slot="card"]').filter({
      has: page.getByRole('button', { name: /로그인/ }),
    }).first();

    const hasForm = await loginForm.isVisible().catch(() => false);

    if (hasForm) {
      await expect(loginForm).toHaveScreenshot('login-form.png', {
        maxDiffPixelRatio: 0.05,
      });
    } else {
      // 카드가 없으면 main 영역 전체 캡처
      const main = page.locator('main');
      await expect(main).toBeVisible();
      await expect(main).toHaveScreenshot('login-form.png', {
        maxDiffPixelRatio: 0.05,
      });
    }
  });
});

test.describe('시각적 회귀 — 회원가입 폼', () => {
  test('회원가입 폼 스크린샷', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // 애니메이션 안정화 대기
    await page.waitForTimeout(500);

    // 회원가입 폼 카드 영역
    const registerForm = page.locator('[data-slot="card"]').filter({
      has: page.getByRole('button', { name: /회원가입|가입/ }),
    }).first();

    const hasForm = await registerForm.isVisible().catch(() => false);

    if (hasForm) {
      await expect(registerForm).toHaveScreenshot('register-form.png', {
        maxDiffPixelRatio: 0.05,
      });
    } else {
      // 카드가 없으면 main 영역 전체 캡처
      const main = page.locator('main');
      await expect(main).toBeVisible();
      await expect(main).toHaveScreenshot('register-form.png', {
        maxDiffPixelRatio: 0.05,
      });
    }
  });
});
