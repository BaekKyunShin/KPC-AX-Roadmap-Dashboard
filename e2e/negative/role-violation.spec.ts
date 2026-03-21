// e2e/negative/role-violation.spec.ts
// 부정 시나리오: 역할 기반 접근 위반 — 심층 라우트 차단 검증
// 참고: role-access.spec.ts는 최상위 라우트(/ops/projects, /consultant/home 등)를 테스트
//       이 파일은 하위 라우트(new, messages 등)의 접근 차단을 검증
import { test, expect } from '../fixtures/auth.fixture';
import { test as bareTest, expect as bareExpect } from '@playwright/test';

// ---------------------------------------------------------------------------
// 컨설턴트 → OPS 하위 라우트 (role-access.spec.ts에서 미커버)
// ---------------------------------------------------------------------------
test.describe('부정 시나리오: 컨설턴트 → OPS 하위 라우트 접근 차단', () => {
  const opsSubRoutes = [
    { path: '/ops/projects/new', description: '프로젝트 생성' },
    { path: '/ops/templates/new', description: '템플릿 생성' },
  ];

  for (const { path, description } of opsSubRoutes) {
    test(`컨설턴트 → ${description}(${path}) → /dashboard 리다이렉트`, async ({
      consultantPage: page,
    }) => {
      await page.goto(path);

      // OPS 레이아웃에서 비 OPS_ADMIN/SYSTEM_ADMIN → /dashboard 리다이렉트
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

      // /ops/ 경로에 남아있지 않아야 함
      expect(page.url()).not.toContain('/ops/');
    });
  }
});

// ---------------------------------------------------------------------------
// OPS 관리자 → 컨설턴트 하위 라우트 (role-access.spec.ts에서 미커버)
// ---------------------------------------------------------------------------
test.describe('부정 시나리오: OPS 관리자 → 컨설턴트 하위 라우트 접근 차단', () => {
  test('OPS 관리자 → /consultant/projects → /dashboard 리다이렉트', async ({
    opsPage: page,
  }) => {
    await page.goto('/consultant/projects');

    // 컨설턴트 페이지: 비 CONSULTANT_APPROVED → /dashboard 리다이렉트
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // /consultant/ 경로에 남아있지 않아야 함
    expect(page.url()).not.toContain('/consultant/');
  });
});

// ---------------------------------------------------------------------------
// 비인증 상태 → 보호된 하위 라우트 (session-error.spec.ts에서 미커버)
// ---------------------------------------------------------------------------
bareTest.describe('부정 시나리오: 비인증 → 보호된 하위 라우트 접근 차단', () => {
  bareTest('비인증 → /dashboard/messages → /login 리다이렉트', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/dashboard/messages');

      // 미들웨어: 비인증 → /login 리다이렉트
      await bareExpect(page).toHaveURL(/\/login/, { timeout: 10_000 });

      // redirect 쿼리 파라미터가 원래 경로를 포함하는지 확인
      const url = new URL(page.url());
      bareExpect(url.pathname).toBe('/login');
      bareExpect(url.searchParams.get('redirect')).toBe('/dashboard/messages');
    } finally {
      await context.close();
    }
  });
});
