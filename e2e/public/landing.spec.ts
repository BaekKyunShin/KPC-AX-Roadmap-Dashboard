// e2e/public/landing.spec.ts
// TEST_PLAN Phase 1.1: 랜딩 페이지
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('Phase 1.1: 랜딩 페이지 (/)', () => {
  test('페이지 정상 로딩 + 콘솔 에러 없음', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/');
    await expect(page).toHaveTitle('KPC AI 훈련 로드맵');
    expect(getErrors()).toEqual([]);
  });

  test('"로그인" 링크 → /login 이동', async ({ page }) => {
    await page.goto('/');
    // Navbar의 로그인 버튼 (Link 안의 Button)
    await page.getByRole('link', { name: '로그인' }).first().click();
    await expect(page).toHaveURL('/login');
  });

  test('"회원가입" 링크 → /register 이동', async ({ page }) => {
    await page.goto('/');
    // Navbar의 회원가입 버튼
    await page.getByRole('link', { name: '회원가입' }).first().click();
    await expect(page).toHaveURL('/register');
  });

  test('Hero CTA "서비스 이용하기" → /register 이동', async ({ page }) => {
    await page.goto('/');
    // HeroSection의 CTA 버튼 (Link > Button)
    await page.getByRole('link', { name: '서비스 이용하기' }).first().click();
    await expect(page).toHaveURL('/register');
  });

  test('주요 섹션 존재 확인 (features, workflow, demo)', async ({ page }) => {
    await page.goto('/');
    // 각 섹션이 DOM에 존재하는지 확인 (애니메이션과 무관)
    await expect(page.locator('section#features')).toBeAttached();
    await expect(page.locator('section#workflow')).toBeAttached();
    await expect(page.locator('section#demo')).toBeAttached();
  });

  test('KPC 외부 링크 존재 확인', async ({ page }) => {
    await page.goto('/');
    const kpcLink = page.locator('a[href="https://www.kpc.or.kr"]');
    await expect(kpcLink).toBeAttached();
  });
});
