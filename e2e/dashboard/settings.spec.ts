// e2e/dashboard/settings.spec.ts
// 설정 페이지 E2E 테스트
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('설정 페이지 (/dashboard/settings)', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
  });

  test('설정 페이지 로드 + 섹션 표시 — 콘솔 에러 없음', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // 페이지 제목 "계정 설정" 표시
    await expect(
      page.getByRole('heading', { name: '계정 설정' }),
    ).toBeVisible({ timeout: 10_000 });

    // 페이지 설명 "비밀번호 변경 및 계정 관리" 표시
    await expect(
      page.getByText('비밀번호 변경 및 계정 관리'),
    ).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('이메일 알림 토글 — 상태 변경 확인', async ({ opsPage: page }) => {
    // 이메일 알림 토글이 있는지 확인 (역할에 따라 표시되지 않을 수 있음)
    const toggleSwitch = page.locator('#email-notify');
    const hasToggle = await toggleSwitch.isVisible().catch(() => false);

    // 이메일 알림 토글이 없으면 토글 테스트 불가 (역할에 따라 미표시)
    test.skip(!hasToggle, '테스트 데이터 없음: 이메일 알림 토글이 없습니다');

    // 현재 상태 확인 (checked 또는 data-state 속성)
    const currentState = await toggleSwitch.getAttribute('data-state');

    // UI에서 직접 토글을 두 번 클릭하여 원래 상태로 복원
    await toggleSwitch.click();

    // 상태 변경 확인
    const newState = await toggleSwitch.getAttribute('data-state');
    expect(newState).not.toBe(currentState);

    // 토스트 확인 ("이메일 알림이 활성화/비활성화되었습니다")
    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: /이메일 알림이/ }),
    ).toBeVisible({ timeout: 5_000 });

    // 원래 상태로 복원 (UI에서 직접 토글)
    await toggleSwitch.click();

    // 복원 확인
    const restoredState = await toggleSwitch.getAttribute('data-state');
    expect(restoredState).toBe(currentState);
  });

  test('비밀번호 변경 섹션 존재', async ({ opsPage: page }) => {
    // "비밀번호 변경" 카드 제목 확인 (CardTitle은 div[data-slot="card-title"] — heading role 없음)
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: '비밀번호 변경' }),
    ).toBeVisible();

    // 카드 설명 텍스트 확인
    await expect(
      page.getByText('계정 보안을 위해 주기적으로 비밀번호를 변경해주세요.'),
    ).toBeVisible();

    // 비밀번호 입력 필드 3개 확인
    await expect(page.locator('#currentPassword')).toBeVisible();
    await expect(page.locator('#newPassword')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();

    // "비밀번호 변경" 제출 버튼 확인
    await expect(
      page.getByRole('button', { name: '비밀번호 변경' }),
    ).toBeVisible();
  });

  test('계정 삭제 섹션 존재', async ({ opsPage: page }) => {
    // "계정 삭제" 카드 제목 확인 (CardTitle은 div[data-slot="card-title"] — heading role 없음)
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: '계정 삭제' }),
    ).toBeVisible();

    // 경고 설명 텍스트 확인
    await expect(
      page.getByText(/영구적으로 삭제/),
    ).toBeVisible();

    // "회원 탈퇴" 버튼 확인 (실제 클릭하지 않음)
    await expect(
      page.getByRole('button', { name: '회원 탈퇴' }),
    ).toBeVisible();
  });
});
