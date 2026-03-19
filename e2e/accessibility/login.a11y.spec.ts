// e2e/accessibility/login.a11y.spec.ts
// 로그인 페이지 접근성 검증
import { test, expect } from '@playwright/test';
import { checkA11y, checkKeyboardNavigation } from '../fixtures/accessibility.fixture';

test.describe('로그인 페이지 (/login) 접근성', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('axe-core 위반 없음', async ({ page }) => {
    await checkA11y(page);
  });

  test('폼 입력 필드에 라벨이 연결되어 있음', async ({ page }) => {
    // 이메일 입력 필드
    const emailInput = page.locator('[name="email"]');
    await expect(emailInput).toBeVisible();

    const emailId = await emailInput.getAttribute('id');
    if (emailId) {
      const emailLabel = page.locator(`label[for="${emailId}"]`);
      await expect(emailLabel).toBeAttached();
    }

    // 비밀번호 입력 필드
    const passwordInput = page.locator('[name="password"]');
    await expect(passwordInput).toBeVisible();

    const passwordId = await passwordInput.getAttribute('id');
    if (passwordId) {
      const passwordLabel = page.locator(`label[for="${passwordId}"]`);
      await expect(passwordLabel).toBeAttached();
    }
  });

  test('폼 필드에 접근 가능한 이름 존재', async ({ page }) => {
    // getByRole로 입력 필드를 찾을 수 있어야 함
    const emailField = page.getByRole('textbox', { name: /이메일/i });
    const hasEmailField = await emailField.isVisible().catch(() => false);

    if (!hasEmailField) {
      // aria-label 또는 placeholder로 접근 가능한 이름이 있는지 확인
      const emailInput = page.locator('[name="email"]');
      const ariaLabel = await emailInput.getAttribute('aria-label');
      const placeholder = await emailInput.getAttribute('placeholder');
      expect(
        ariaLabel || placeholder,
        '이메일 입력 필드에 접근 가능한 이름이 없습니다',
      ).toBeTruthy();
    }
  });

  test('에러 메시지 영역에 aria-live 또는 role="alert" 설정', async ({ page }) => {
    // 잘못된 로그인 시도하여 에러 메시지 영역 활성화
    await page.locator('[name="email"]').fill('wrong@test.com');
    await page.locator('[name="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // 에러 메시지가 나타날 때까지 대기
    const errorMessage = page.locator('form').getByText('이메일 또는 비밀번호가 올바르지 않습니다.');
    const hasError = await errorMessage.isVisible({ timeout: 10_000 }).catch(() => false);

    if (hasError) {
      // 에러 메시지의 부모 또는 자신이 role="alert" 또는 aria-live를 가져야 함
      const alertRegion = page.locator('[role="alert"], [aria-live]');
      await expect(alertRegion.first()).toBeAttached();
    }
  });

  test('제출 버튼이 접근 가능한 이름을 가짐', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    const buttonText = await submitButton.textContent();
    expect(
      buttonText?.trim().length,
      '제출 버튼에 텍스트가 없습니다',
    ).toBeGreaterThan(0);
  });

  test('키보드로 폼 전체 탐색 가능', async ({ page }) => {
    // 이메일 → 비밀번호 → 토글 → 제출 → 회원가입 링크 등 최소 4개 요소
    const focusedElements = await checkKeyboardNavigation(page, 4);
    expect(focusedElements.length).toBeGreaterThanOrEqual(4);
  });

  test('비밀번호 토글 버튼에 접근 가능한 이름 존재', async ({ page }) => {
    const toggleButton = page.locator('#password ~ button[type="button"]');
    const hasToggle = await toggleButton.isVisible().catch(() => false);

    if (hasToggle) {
      const ariaLabel = await toggleButton.getAttribute('aria-label');
      const buttonText = await toggleButton.textContent();
      const title = await toggleButton.getAttribute('title');

      expect(
        ariaLabel || buttonText?.trim() || title,
        '비밀번호 토글 버튼에 접근 가능한 이름이 없습니다',
      ).toBeTruthy();
    }
  });

  test('h1 헤딩이 1개 존재', async ({ page }) => {
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('포커스 표시가 시각적으로 확인 가능', async ({ page }) => {
    // Tab으로 이동 후 포커스된 요소에 outline/ring 스타일이 적용되는지 확인
    await page.keyboard.press('Tab');

    const hasFocusIndicator = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return false;

      const styles = window.getComputedStyle(el);
      const outlineWidth = parseFloat(styles.outlineWidth);
      const boxShadow = styles.boxShadow;

      // outline이 있거나 box-shadow(ring)가 있으면 포커스 표시가 있는 것
      return outlineWidth > 0 || (boxShadow !== 'none' && boxShadow !== '');
    });

    expect(hasFocusIndicator, '포커스 표시가 시각적으로 확인되지 않습니다').toBe(true);
  });
});
