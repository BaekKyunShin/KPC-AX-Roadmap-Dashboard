// e2e/auth/register.spec.ts
// TEST_PLAN Phase 1.4: 회원가입 검증
// 참고: 실제 가입 완료는 데이터 오염 우려로 유효성 검사까지만 테스트
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('Phase 1.4: 회원가입 페이지 (/register)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    // 초기화 로딩(세션 클리어) 완료 대기 — skeleton이 사라지고 폼이 표시될 때까지
    await expect(page.getByText('기본 정보 입력')).toBeVisible({ timeout: 10_000 });
  });

  test('페이지 정상 로딩 + 2단계 스테퍼 표시', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/register');
    await expect(page.getByText('기본 정보 입력')).toBeVisible({ timeout: 10_000 });
    // 기본 정보 스텝 표시 (exact: 카드 제목/설명과 구분)
    await expect(page.getByText('기본 정보', { exact: true })).toBeVisible();
    // 프로필 등록 스텝 (컨설턴트 기본 선택 시)
    await expect(page.getByText('프로필 등록')).toBeVisible();
    expect(getErrors()).toEqual([]);
  });

  test('가입 유형 선택 — 컨설턴트/운영관리자', async ({ page }) => {
    // 기본값: 컨설턴트 선택 상태
    const consultantRadio = page.locator('input[name="registerTypeRadio"][value="CONSULTANT"]');
    const opsRadio = page.locator('input[name="registerTypeRadio"][value="OPS_ADMIN"]');

    await expect(consultantRadio).toBeChecked();
    await expect(opsRadio).not.toBeChecked();

    // 운영관리자 레이블 클릭 (sr-only 라디오의 부모 label 클릭)
    await page.getByText('운영관리자').first().click();
    await expect(opsRadio).toBeChecked();
    await expect(consultantRadio).not.toBeChecked();

    // 다시 컨설턴트
    await page.getByText('컨설턴트').first().click();
    await expect(consultantRadio).toBeChecked();
  });

  test('빈 폼 "다음" 클릭 → HTML5 required 유효성 검사', async ({ page }) => {
    await page.getByRole('button', { name: /다음/ }).click();
    // HTML5 required가 폼 제출 차단 — URL 변경 없음
    await expect(page).toHaveURL(/\/register/);
  });

  test('이메일 형식 오류 → typeMismatch', async ({ page }) => {
    await page.locator('[name="email"]').fill('abc');
    await page.locator('[name="name"]').fill('테스트');
    await page.locator('[name="password"]').fill('Test1234');
    await page.locator('[name="confirmPassword"]').fill('Test1234');
    await page.locator('#agreeToTerms').click();
    await page.getByRole('button', { name: /다음/ }).click();
    // HTML5 type="email" typeMismatch 검사
    await expect(page).toHaveURL(/\/register/);
  });

  test('비밀번호 8자 미만 → Zod 커스텀 에러', async ({ page }) => {
    await page.locator('[name="email"]').fill('test-new@example.com');
    await page.locator('[name="name"]').fill('테스트');
    await page.locator('[name="password"]').fill('Ab1');
    await page.locator('[name="confirmPassword"]').fill('Ab1');
    await page.locator('#agreeToTerms').click();
    await page.getByRole('button', { name: /다음/ }).click();
    await expect(page.getByText('비밀번호는 최소 8자 이상이어야 합니다.')).toBeVisible();
  });

  test('비밀번호 영문만 (숫자 없음) → Zod 커스텀 에러', async ({ page }) => {
    await page.locator('[name="email"]').fill('test-new@example.com');
    await page.locator('[name="name"]').fill('테스트');
    await page.locator('[name="password"]').fill('abcdefgh');
    await page.locator('[name="confirmPassword"]').fill('abcdefgh');
    await page.locator('#agreeToTerms').click();
    await page.getByRole('button', { name: /다음/ }).click();
    await expect(page.getByText('비밀번호에 숫자가 포함되어야 합니다.')).toBeVisible();
  });

  test('비밀번호 확인 불일치 → Zod 에러', async ({ page }) => {
    await page.locator('[name="email"]').fill('test-new@example.com');
    await page.locator('[name="name"]').fill('테스트');
    await page.locator('[name="password"]').fill('Test1234');
    await page.locator('[name="confirmPassword"]').fill('Different1234');
    await page.locator('#agreeToTerms').click();
    await page.getByRole('button', { name: /다음/ }).click();
    await expect(page.getByText('비밀번호가 일치하지 않습니다.')).toBeVisible();
  });

  test('이미 존재하는 이메일 → 서버 에러', async ({ page }) => {
    await page.locator('[name="email"]').fill(process.env.E2E_OPS_ADMIN_EMAIL!);
    await page.locator('[name="name"]').fill('테스트');
    await page.locator('[name="password"]').fill('Test1234');
    await page.locator('[name="confirmPassword"]').fill('Test1234');
    await page.locator('#agreeToTerms').click();
    await page.getByRole('button', { name: /다음/ }).click();
    // 서버 에러 Alert + Sonner 토스트 양쪽에 표시되므로 Alert(data-slot)로 한정
    await expect(
      page.locator('[data-slot="alert-description"]').getByText(/이미 등록된 이메일/),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('"로그인" 링크 → /login 이동', async ({ page }) => {
    await page.getByRole('link', { name: '로그인' }).click();
    await expect(page).toHaveURL('/login');
  });
});
