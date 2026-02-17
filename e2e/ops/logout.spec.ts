// e2e/ops/logout.spec.ts
// TEST_PLAN Phase 2.20: 관리자 로그아웃
// ⚠️ 로그아웃은 Supabase 세션을 서버 측에서 무효화하므로
//    다른 모든 ops 테스트 완료 후 실행되어야 함 (Playwright project dependency)
import { test, expect } from '../fixtures/auth.fixture';
import { clickUserMenu } from '../helpers/navigation.helper';

test.describe('Phase 2.20: 관리자 로그아웃', () => {
  test('로그아웃 → /login 이동 + 세션 정리', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');
    await clickUserMenu(page, '로그아웃');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // 세션 정리 확인: 보호 경로 재접근 시 /login 리다이렉트
    await page.goto('/ops/projects');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
