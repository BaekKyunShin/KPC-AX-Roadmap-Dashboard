// e2e/auth/role-access.spec.ts
// 역할 간 교차 접근 차단 테스트
// 비인증 접근은 protected-routes.spec.ts에서 커버, 여기선 인증된 사용자의 역할 불일치 접근을 테스트
import { test, expect } from '../fixtures/auth.fixture';

test.describe('역할 간 접근 차단 — 컨설턴트 → OPS 라우트', () => {
  const opsRoutes = [
    '/ops/projects',
    '/ops/users',
    '/ops/templates',
    '/ops/quota',
    '/ops/audit',
  ];

  for (const route of opsRoutes) {
    test(`컨설턴트 → ${route} → /dashboard 리다이렉트`, async ({ consultantPage: page }) => {
      await page.goto(route);
      // ops/layout.tsx: 비 OPS_ADMIN/SYSTEM_ADMIN → /dashboard 리다이렉트
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
      // /ops/ 경로에 남아있지 않아야 함
      expect(page.url()).not.toContain('/ops/');
    });
  }
});

test.describe('역할 간 접근 차단 — OPS 관리자 → 컨설턴트 라우트', () => {
  const consultantRoutes = [
    '/consultant/home',
    '/consultant/projects',
    '/consultant/profile',
  ];

  for (const route of consultantRoutes) {
    test(`OPS 관리자 → ${route} → /dashboard 리다이렉트`, async ({ opsPage: page }) => {
      await page.goto(route);
      // 각 컨설턴트 페이지: 비 CONSULTANT_APPROVED → /dashboard 리다이렉트
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
      // /consultant/ 경로에 남아있지 않아야 함
      expect(page.url()).not.toContain('/consultant/');
    });
  }
});
