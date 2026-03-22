// e2e/mobile/navigation.mobile.spec.ts
// 모바일 뷰포트 네비게이션 테스트
import { test, expect, openMobileMenu } from '../fixtures/mobile.fixture';

test.describe('모바일 네비게이션 — 랜딩 페이지', () => {
  test.beforeEach(async ({ mobilePage }) => {
    await mobilePage.goto('/');
    await mobilePage.waitForLoadState('networkidle');
  });

  test('햄버거 메뉴 버튼이 표시됨', async ({ mobilePage }) => {
    const menuButton = mobilePage.getByRole('button', { name: /메뉴 열기/ });
    await expect(menuButton).toBeVisible();
  });

  test('햄버거 메뉴 열기 → 메뉴 항목 표시', async ({ mobilePage }) => {
    await openMobileMenu(mobilePage);

    // 모바일 메뉴 스코핑으로 데스크톱 네비 중복 방지
    const mobileMenu = mobilePage.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu.getByText('서비스 소개')).toBeVisible();
    await expect(mobileMenu.getByText('워크플로우')).toBeVisible();
    await expect(mobileMenu.getByText('데모')).toBeVisible();
  });

  test('햄버거 메뉴 열기 → 닫기', async ({ mobilePage }) => {
    // 메뉴 열기
    await openMobileMenu(mobilePage);
    const mobileMenu = mobilePage.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu.getByText('서비스 소개')).toBeVisible();

    // 메뉴 닫기 (X 버튼 클릭)
    const closeButton = mobilePage.getByRole('button', { name: /메뉴 닫기/ });
    await closeButton.click();

    // 메뉴 항목이 숨겨짐 (opacity-0 또는 max-h-0으로 전환)
    await expect(mobileMenu.getByText('서비스 소개')).not.toBeVisible({ timeout: 3_000 });
  });

  test('메뉴 항목 "로그인" 클릭 → /login 이동', async ({ mobilePage }) => {
    await openMobileMenu(mobilePage);

    // 모바일 메뉴의 로그인 버튼 클릭
    const mobileMenu = mobilePage.locator('[data-testid="mobile-menu"]');
    await mobileMenu.getByRole('link', { name: '로그인' }).click();
    await expect(mobilePage).toHaveURL('/login');
  });

  test('메뉴 항목 "회원가입" 클릭 → /register 이동', async ({ mobilePage }) => {
    await openMobileMenu(mobilePage);

    const mobileMenu = mobilePage.locator('[data-testid="mobile-menu"]');
    await mobileMenu.getByRole('link', { name: '회원가입' }).click();
    await expect(mobilePage).toHaveURL('/register');
  });
});

test.describe('모바일 네비게이션 — 인증된 관리자', () => {
  test('관리자 모바일 메뉴 열기 → 아코디언 그룹 표시', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 햄버거 메뉴 버튼 클릭
    await openMobileMenu(page);

    // 관리자 아코디언 그룹 (워크스페이스, 운영관리, 라이브러리)이 표시됨
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu.getByText('워크스페이스', { exact: true })).toBeVisible();
    await expect(mobileMenu.getByText('운영관리', { exact: true })).toBeVisible();
    await expect(mobileMenu.getByText('라이브러리', { exact: true })).toBeVisible();

    await context.close();
  });

  test('관리자 아코디언 그룹 열기 → 하위 메뉴 네비게이션', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 햄버거 메뉴 열기
    await openMobileMenu(page);

    // "운영관리" 아코디언 그룹 클릭하여 하위 메뉴 표시
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await mobileMenu.getByText('운영관리', { exact: true }).click();

    // 하위 메뉴 항목 표시 확인
    await expect(page.getByRole('link', { name: '사용자 관리' })).toBeVisible();

    // 메뉴 항목 클릭 → 페이지 이동
    await page.getByRole('link', { name: '사용자 관리' }).click();
    await expect(page).toHaveURL('/ops/users');

    await context.close();
  });

  test('관리자 모바일 메뉴 — 사용자 정보 및 계정 설정 접근', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 햄버거 메뉴 열기
    await openMobileMenu(page);

    // 사용자 정보 영역 (아바타, 이름) 표시
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu.locator('[data-slot="avatar"]')).toBeVisible();

    // 계정 설정 링크 클릭
    await mobileMenu.getByRole('link', { name: '계정 설정' }).click();
    await expect(page).toHaveURL('/dashboard/settings');

    await context.close();
  });
});

test.describe('모바일 네비게이션 — 인증된 컨설턴트', () => {
  test('컨설턴트 모바일 메뉴 → 플랫 메뉴 항목 표시', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/consultant.json',
    });
    const page = await context.newPage();

    await page.goto('/consultant/home');
    await page.waitForLoadState('networkidle');

    // 햄버거 메뉴 열기
    await openMobileMenu(page);

    // 컨설턴트 플랫 메뉴 항목 확인 (아코디언 그룹이 아닌 단일 링크)
    const mainContent = page.locator('nav');
    await expect(mainContent).toBeVisible();

    // 프로필 관리 링크 표시 (모바일 메뉴 스코핑)
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu.getByRole('link', { name: '프로필 관리' })).toBeVisible();

    // 계정 설정 링크 표시
    await expect(mobileMenu.getByRole('link', { name: '계정 설정' })).toBeVisible();

    await context.close();
  });
});
