// e2e/dashboard/notifications.spec.ts
// 알림 벨(NotificationBell) Popover E2E — 드롭다운 열림, 목록 렌더, 모두 읽음, 알림 클릭
// Navbar 내 드롭다운 구조이므로 별도 페이지 없음
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('알림 Popover (Navbar)', () => {
  test('벨 버튼 클릭 → 드롭다운 열림 + 헤더 "알림" + 목록 또는 빈 상태', async ({
    consultantPage: page,
  }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 벨 버튼 (aria-label에 "알림" 포함)
    const bell = page.getByRole('button', { name: /알림/ });
    await expect(bell).toBeVisible();
    await bell.click();

    // Popover 헤더 "알림"
    await expect(page.getByRole('heading', { name: '알림' })).toBeVisible();

    // 알림 목록이 있거나 "새로운 알림이 없습니다" 빈 상태
    const hasEmpty = await page
      .getByText('새로운 알림이 없습니다')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasList = await page
      .locator('[role="dialog"] [class*="divide-y"]')
      .isVisible({ timeout: 1_000 })
      .catch(() => false);

    expect(hasEmpty || hasList).toBeTruthy();

    expect(getErrors()).toEqual([]);
  });

  test('안읽은 알림 있을 때 "모두 읽음" 버튼 노출 → 클릭 → 배지 사라짐', async ({
    consultantPage: page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const bell = page.getByRole('button', { name: /알림/ });

    // aria-label이 "알림 N개 안읽음" 형태면 안읽은 알림 존재
    const bellLabel = (await bell.getAttribute('aria-label')) ?? '';
    const hasUnread = /\d+개 안읽음/.test(bellLabel);
    test.skip(!hasUnread, '테스트 데이터 없음: 안읽은 알림이 없습니다');

    await bell.click();

    // "모두 읽음" 버튼
    const markAllBtn = page.getByRole('button', { name: /모두 읽음/ });
    await expect(markAllBtn).toBeVisible({ timeout: 5_000 });
    await markAllBtn.click();

    // 배지가 사라지고 aria-label에서 "안읽음" 제거
    await expect(async () => {
      const updatedLabel = (await bell.getAttribute('aria-label')) ?? '';
      expect(updatedLabel).not.toMatch(/\d+개 안읽음/);
    }).toPass({ timeout: 5_000 });
  });

  test('운영관리자는 "전체/시스템/업무" 탭 노출, 컨설턴트는 미노출', async ({
    opsPage,
    consultantPage,
  }) => {
    // OPS: 탭 노출
    await opsPage.goto('/dashboard');
    await opsPage.waitForLoadState('networkidle');
    await opsPage.getByRole('button', { name: /알림/ }).click();

    // OPS_NOTIFICATION_TABS에 정의된 탭이 Popover에 노출되는지 확인
    // 첫 탭 이름 "전체"로 smoke 확인
    await expect(
      opsPage.locator('[role="dialog"]').getByRole('button', { name: /^전체$/ }),
    ).toBeVisible({ timeout: 5_000 });

    // 컨설턴트: 탭 미노출 (Popover 안에 "전체" 버튼이 없어야 함)
    await consultantPage.goto('/dashboard');
    await consultantPage.waitForLoadState('networkidle');
    await consultantPage.getByRole('button', { name: /알림/ }).click();
    await consultantPage.waitForTimeout(500);

    const consultantHasTab = await consultantPage
      .locator('[role="dialog"]')
      .getByRole('button', { name: /^전체$/ })
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    expect(consultantHasTab).toBe(false);
  });
});
