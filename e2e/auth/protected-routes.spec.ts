// e2e/auth/protected-routes.spec.ts
// TEST_PLAN Phase 1.5: 보호 경로 접근 제어
import { test, expect } from '@playwright/test';

test.describe('Phase 1.5: 보호 경로 — 비인증 접근 시 리다이렉트', () => {
  // 비로그인 상태에서 보호 경로 접근 → /login?redirect=... 리다이렉트
  const protectedPaths = [
    '/dashboard',
    '/consultant/home',
    '/ops/projects',
    '/gallery',
    '/dashboard/messages',
  ];

  for (const path of protectedPaths) {
    test(`${path} → /login 리다이렉트`, async ({ page }) => {
      await page.goto(path);
      // 미들웨어가 /login?redirect={pathname} 으로 리다이렉트
      await expect(page).toHaveURL(/\/login/);
      // redirect 쿼리 파라미터 확인
      const url = new URL(page.url());
      expect(url.pathname).toBe('/login');
      expect(url.searchParams.get('redirect')).toBe(path);
    });
  }
});
