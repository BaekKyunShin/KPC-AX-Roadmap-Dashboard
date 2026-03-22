// e2e/public/landing.spec.ts
// TEST_PLAN Phase 1.1: 랜딩 페이지
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('Phase 1.1: 랜딩 페이지 (/)', () => {
  test.describe.configure({ mode: 'parallel' });

  test('페이지 정상 로딩 + 콘솔 에러 없음', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/');
    await expect(page).toHaveTitle('KPC AI 훈련 로드맵');
    expect(getErrors()).toEqual([]);
  });

  test('"로그인" 링크 → /login 이동', async ({ page }) => {
    await page.goto('/');
    // Navbar 데스크톱 CTA의 로그인 버튼 (모바일 메뉴 중복 방지)
    await page.locator('[data-testid="desktop-cta"]').getByRole('link', { name: '로그인' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('"회원가입" 링크 → /register 이동', async ({ page }) => {
    await page.goto('/');
    // Navbar 데스크톱 CTA의 회원가입 버튼
    await page.locator('[data-testid="desktop-cta"]').getByRole('link', { name: '회원가입' }).click();
    await expect(page).toHaveURL('/register');
  });

  test('Hero CTA "서비스 이용하기" → /register 이동', async ({ page }) => {
    await page.goto('/');
    // HeroSection의 CTA 버튼 (Link > Button)
    await page.getByRole('link', { name: '서비스 이용하기' }).first().click();
    await expect(page).toHaveURL('/register');
  });

  test('FeaturesSection CTA "로그인하여 시작하기" → /login 이동', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '로그인하여 시작하기' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('DemoSection CTA "무료로 시작하기" → /register 이동', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '무료로 시작하기' }).click();
    await expect(page).toHaveURL('/register');
  });

  test('주요 섹션 존재 확인 (hero, features, workflow, demo, footer)', async ({ page }) => {
    await page.goto('/');
    // 네비게이션 바
    await expect(page.locator('nav')).toBeAttached();
    // ID가 있는 섹션
    await expect(page.locator('section#features')).toBeAttached();
    await expect(page.locator('section#workflow')).toBeAttached();
    await expect(page.locator('section#demo')).toBeAttached();
    // main 내부 section 요소 5개 (Hero + Features + Workflow + Demo + Footer)
    await expect(page.locator('main section')).toHaveCount(5);
  });

  test('KPC 외부 링크 존재 확인', async ({ page }) => {
    await page.goto('/');
    const kpcLink = page.locator('a[href="https://www.kpc.or.kr"]');
    await expect(kpcLink).toBeAttached();
  });
});
