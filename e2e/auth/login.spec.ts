// e2e/auth/login.spec.ts
// TEST_PLAN Phase 1.3: 로그인 검증
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('Phase 1.3: 로그인 페이지 (/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('페이지 정상 로딩 + 콘솔 에러 없음', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/login');
    await expect(page.locator('[name="email"]')).toBeVisible();
    expect(getErrors()).toEqual([]);
  });

  test('빈 폼 제출 → HTML5 required 유효성 검사', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    // HTML5 required는 폼 제출을 막음 — URL 변경 없음
    await expect(page).toHaveURL(/\/login/);
  });

  test('이메일만 입력 후 제출 → 비밀번호 required', async ({ page }) => {
    await page.locator('[name="email"]').fill('test@example.com');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('비밀번호만 입력 후 제출 → 이메일 required', async ({ page }) => {
    await page.locator('[name="password"]').fill('test1234');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('잘못된 이메일 형식 → typeMismatch', async ({ page }) => {
    await page.locator('[name="email"]').fill('abc');
    await page.locator('[name="password"]').fill('test1234');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('존재하지 않는 계정 → 에러 메시지', async ({ page }) => {
    await page.locator('[name="email"]').fill('notexist@test.com');
    await page.locator('[name="password"]').fill('test1234');
    await page.locator('button[type="submit"]').click();
    // Alert(data-slot="alert-description")와 Sonner 토스트 양쪽에 표시되므로 폼 내부로 한정
    await expect(
      page.locator('form').getByText('이메일 또는 비밀번호가 올바르지 않습니다.'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('올바른 이메일 + 잘못된 비밀번호 → 에러 메시지', async ({ page }) => {
    await page.locator('[name="email"]').fill(process.env.E2E_OPS_ADMIN_EMAIL!);
    await page.locator('[name="password"]').fill('wrongpassword123');
    await page.locator('button[type="submit"]').click();
    await expect(
      page.locator('form').getByText('이메일 또는 비밀번호가 올바르지 않습니다.'),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('비밀번호 보기/숨기기 토글', async ({ page }) => {
    const pwInput = page.locator('#password');
    await expect(pwInput).toHaveAttribute('type', 'password');

    // 토글 버튼: password input의 부모 .relative 안의 button[type="button"]
    const toggleBtn = page.locator('#password ~ button[type="button"]');
    await toggleBtn.click();
    await expect(pwInput).toHaveAttribute('type', 'text');

    // 다시 토글
    await toggleBtn.click();
    await expect(pwInput).toHaveAttribute('type', 'password');
  });

  test('"회원가입" 링크 → /register 이동', async ({ page }) => {
    // main 스코핑으로 Navbar의 회원가입 버튼과 중복 방지
    await page.locator('main').getByRole('link', { name: '회원가입' }).click();
    await expect(page).toHaveURL('/register');
  });

  test('제출 시 "로그인 중..." 로딩 상태 + 버튼 비활성화', async ({ page }) => {
    await page.locator('[name="email"]').fill(process.env.E2E_OPS_ADMIN_EMAIL!);
    await page.locator('[name="password"]').fill(process.env.E2E_OPS_ADMIN_PASSWORD!);

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // 로딩 상태: 서버 응답 + 리다이렉트까지 유지 (성공 시 setIsLoading(false) 미호출)
    await expect(submitBtn).toContainText('로그인 중...');
    await expect(submitBtn).toBeDisabled();

    // 로그인 완료 후 리다이렉트
    await expect(page).toHaveURL(/\/(ops|consultant|dashboard)/, { timeout: 15_000 });
  });

  test('올바른 계정 로그인 → 리다이렉트', async ({ page }) => {
    await page.locator('[name="email"]').fill(process.env.E2E_OPS_ADMIN_EMAIL!);
    await page.locator('[name="password"]').fill(process.env.E2E_OPS_ADMIN_PASSWORD!);
    await page.locator('button[type="submit"]').click();
    // 성공 시 /dashboard로 이동 (역할에 따라 추가 리다이렉트)
    await expect(page).toHaveURL(/\/(ops|consultant|dashboard)/, { timeout: 15_000 });
  });
});
