// e2e/negative/session-error.spec.ts
// 부정 시나리오: 세션 만료 시 보호 페이지 접근 제어 테스트
import { test, expect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';

// ---------------------------------------------------------------------------
// 테스트 1: 비인증 상태(세션 없음)로 보호 페이지 접근 → /login 리다이렉트
// ---------------------------------------------------------------------------
// 기존 protected-routes.spec.ts와 차별점:
//   - protected-routes는 단순 비로그인 접근만 확인
//   - 이 테스트는 "세션 만료" 시나리오를 시뮬레이션 (새 컨텍스트 = 세션 없는 상태)
//   - redirect 쿼리 파라미터의 인코딩된 값까지 정밀 검증
// ---------------------------------------------------------------------------
test.describe('부정 시나리오: 세션 만료 — 비인증 접근', () => {
  test('세션 만료 후 /dashboard 접근 시 /login?redirect=%2Fdashboard 로 리다이렉트된다', async ({
    browser,
  }) => {
    // 세션이 만료된 상태를 시뮬레이션: 저장된 인증 정보 없이 새 컨텍스트 생성
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/dashboard');

      // /login 으로 리다이렉트 확인
      await expect(page).toHaveURL(/\/login/);

      // redirect 쿼리 파라미터가 원래 경로를 정확히 포함하는지 확인
      const url = new URL(page.url());
      expect(url.pathname).toBe('/login');
      expect(url.searchParams.get('redirect')).toBe('/dashboard');
    } finally {
      await context.close();
    }
  });

  // 다양한 보호 경로에 대해서도 세션 만료 시나리오 검증
  const sessionExpiredPaths = [
    { path: '/ops/projects', description: '운영관리 프로젝트' },
    { path: '/consultant/home', description: '컨설턴트 홈' },
    { path: '/notifications', description: '알림' },
    { path: '/test-roadmap', description: '테스트 로드맵' },
  ];

  for (const { path, description } of sessionExpiredPaths) {
    test(`세션 만료 후 ${description}(${path}) 접근 시 /login 리다이렉트`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto(path);

        await expect(page).toHaveURL(/\/login/);

        const url = new URL(page.url());
        expect(url.pathname).toBe('/login');
        expect(url.searchParams.get('redirect')).toBe(path);
      } finally {
        await context.close();
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 테스트 2: 인증 상태에서 쿠키 삭제(세션 만료) → 리다이렉트 확인
// ---------------------------------------------------------------------------
// 핵심 차별점: 이미 인증된 상태에서 세션이 만료되는 시나리오
//   - opsPage fixture로 인증된 세션 보유
//   - clearCookies()로 세션 쿠키를 강제 제거하여 세션 만료 시뮬레이션
//   - 이후 페이지 리로드/네비게이션 시 /login 리다이렉트 확인
// ---------------------------------------------------------------------------
authTest.describe('부정 시나리오: 세션 만료 — 인증 후 쿠키 삭제', () => {
  authTest('인증된 상태에서 쿠키 삭제 후 페이지 리로드 시 /login 으로 리다이렉트된다', async ({
    opsPage,
  }) => {
    // 1. 인증된 상태에서 보호 페이지 로드 (정상 접근 확인)
    await opsPage.goto('/dashboard');
    // 리다이렉트 없이 /dashboard에 머무는지 확인 (인증 성공)
    await authExpect(opsPage).toHaveURL(/\/dashboard/);

    // 2. 세션 쿠키 강제 삭제 → 세션 만료 시뮬레이션
    await opsPage.context().clearCookies();

    // 3. 페이지 리로드 → 미들웨어가 세션 없음을 감지하고 /login으로 리다이렉트
    await opsPage.reload();
    await authExpect(opsPage).toHaveURL(/\/login/);

    // redirect 파라미터로 원래 경로가 전달되는지 확인
    const url = new URL(opsPage.url());
    authExpect(url.pathname).toBe('/login');
    authExpect(url.searchParams.get('redirect')).toBe('/dashboard');
  });

  authTest('인증된 상태에서 쿠키 삭제 후 다른 보호 페이지 네비게이션 시 /login 으로 리다이렉트된다', async ({
    opsPage,
  }) => {
    // 1. 인증된 상태에서 보호 페이지 정상 접근
    await opsPage.goto('/dashboard');
    await authExpect(opsPage).toHaveURL(/\/dashboard/);

    // 2. 세션 쿠키 강제 삭제
    await opsPage.context().clearCookies();

    // 3. 다른 보호 경로로 네비게이션 시도 → /login 리다이렉트
    await opsPage.goto('/ops/projects');
    await authExpect(opsPage).toHaveURL(/\/login/);

    const url = new URL(opsPage.url());
    authExpect(url.pathname).toBe('/login');
    authExpect(url.searchParams.get('redirect')).toBe('/ops/projects');
  });
});
