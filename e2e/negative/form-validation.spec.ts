// e2e/negative/form-validation.spec.ts
// 부정 시나리오: OPS 폼 유효성 검증 — 빈 제출, 잘못된 입력 처리 확인
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck, expectToast } from '../helpers/assertions.helper';

test.describe('부정 시나리오: 프로젝트 생성 폼 유효성 검증', () => {
  test('빈 폼 제출 시 에러 메시지가 표시된다', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto('/ops/projects/new');
    await page.waitForLoadState('networkidle');

    // "프로젝트 생성" 제출 버튼 클릭 (모든 필수 필드 비워둔 상태)
    await page.getByRole('button', { name: /프로젝트 생성/ }).click();

    // JS 유효성 검증: "필수 항목을 모두 입력해주세요" 에러 또는 토스트 표시
    // 폼은 noValidate이므로 HTML5 검증 대신 JS 검증 사용
    const errorAlert = page.locator('.bg-red-50');
    const hasErrorAlert = await errorAlert.isVisible({ timeout: 5_000 }).catch(() => false);

    // 에러 알럿 또는 토스트 중 하나가 표시되어야 함
    if (hasErrorAlert) {
      await expect(errorAlert).toContainText('필수');
    } else {
      // Sonner 토스트로 에러가 표시되는 경우
      await expectToast(page, '필수');
    }

    expect(getErrors()).toEqual([]);
  });

  test('잘못된 이메일 형식 입력 후 제출 시 에러 처리', async ({ opsPage: page }) => {
    await page.goto('/ops/projects/new');
    await page.waitForLoadState('networkidle');

    // 회사명, 담당자명 입력 (필수 필드 일부 채우기)
    await page.fill('#company_name', '테스트 회사');
    await page.fill('#contact_name', '홍길동');

    // 잘못된 이메일 형식 입력
    await page.fill('#contact_email', 'not-an-email');

    // 제출 시도 — 기업 규모, 업종이 비어있으므로 JS 검증에서 차단됨
    await page.getByRole('button', { name: /프로젝트 생성/ }).click();

    // 필수 필드 에러 또는 이메일 형식 에러가 표시되어야 함
    const errorAlert = page.locator('.bg-red-50');
    const hasErrorAlert = await errorAlert.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasErrorAlert) {
      await expect(errorAlert).toBeVisible();
    } else {
      // 토스트로 에러가 표시되는 경우
      const toast = page.locator('[data-sonner-toast]');
      await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    }
  });
});

test.describe('부정 시나리오: 템플릿 생성 폼 유효성 검증', () => {
  test('빈 이름으로 제출 시 에러 메시지가 표시된다', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto('/ops/templates/new');
    await page.waitForLoadState('networkidle');

    // 템플릿 이름을 비운 채로 제출 버튼 클릭
    // 생성 또는 저장 버튼 찾기 (form 스코핑으로 다중 매칭 방지)
    const submitButton = page.locator('form').getByRole('button', { name: /생성|저장/ }).first();
    await expect(submitButton).toBeVisible({ timeout: 10_000 });
    await submitButton.click();

    // JS 유효성 검증: "템플릿 이름을 입력하세요" 에러 또는 토스트
    const errorAlert = page.locator('.bg-red-50');
    const hasErrorAlert = await errorAlert.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasErrorAlert) {
      await expect(errorAlert).toContainText('이름');
    } else {
      // Sonner 토스트로 에러가 표시되는 경우
      await expectToast(page, '이름');
    }

    expect(getErrors()).toEqual([]);
  });
});
