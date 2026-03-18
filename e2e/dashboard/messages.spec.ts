// e2e/dashboard/messages.spec.ts
// 메시지 페이지 E2E 테스트
import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

/** 대화 목록에서 첫 번째 대화를 선택. 없으면 false 반환. */
async function selectFirstConversation(page: Page): Promise<boolean> {
  const btn = page
    .locator('button')
    .filter({ has: page.locator('[data-slot="avatar"]') })
    .first();
  const visible = await btn.isVisible().catch(() => false);
  if (!visible) return false;
  await btn.click();
  return true;
}

test.describe('메시지 페이지 (/dashboard/messages)', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/dashboard/messages');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 + 대화 목록 또는 빈 상태 — 콘솔 에러 없음', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/dashboard/messages');
    await page.waitForLoadState('networkidle');

    // 페이지 제목 "메시지" 표시
    await expect(page.getByText('메시지', { exact: false })).toBeVisible({ timeout: 10_000 });

    // 대화 목록이 있거나, 빈 상태 메시지가 표시되어야 함
    const hasConversations = await page
      .locator('button')
      .filter({ has: page.locator('[data-slot="avatar"]') })
      .first()
      .isVisible()
      .catch(() => false);

    if (!hasConversations) {
      // 빈 상태: "아직 메시지가 없습니다" 또는 "메시지가 없습니다"
      await expect(
        page.getByText(/메시지가 없습니다/),
      ).toBeVisible({ timeout: 5_000 });
    }

    expect(getErrors()).toEqual([]);
  });

  test('대화 선택 → 메시지 스레드 표시 (대화가 있는 경우)', async ({ opsPage: page }) => {
    if (!(await selectFirstConversation(page))) {
      test.skip();
      return;
    }

    // 메시지 입력 영역이 표시되어야 함 (textarea placeholder)
    await expect(
      page.getByPlaceholder('메시지를 입력하세요...'),
    ).toBeVisible({ timeout: 5_000 });

    // 전송 버튼이 표시되어야 함
    await expect(
      page.getByRole('button', { name: '메시지 전송' }),
    ).toBeVisible();
  });

  test('메시지 입력 + 전송 (대화가 있는 경우)', async ({ opsPage: page }) => {
    if (!(await selectFirstConversation(page))) {
      test.skip();
      return;
    }

    // 입력 필드 대기
    const textarea = page.getByPlaceholder('메시지를 입력하세요...');
    await expect(textarea).toBeVisible({ timeout: 5_000 });

    // 메시지 입력
    const testMessage = `E2E 테스트 메시지 ${Date.now()}`;
    await textarea.fill(testMessage);

    // 전송 버튼 클릭
    const sendButton = page.getByRole('button', { name: '메시지 전송' });
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // 전송된 메시지가 화면에 표시되는지 확인
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10_000 });
  });

  test('새 메시지 다이얼로그 열기', async ({ opsPage: page }) => {
    // "새 메시지" 버튼 클릭 (aria-label="새 메시지")
    const newMessageButton = page.getByRole('button', { name: '새 메시지' });

    // 빈 상태인 경우 "새 메시지 보내기" 버튼일 수 있음
    const hasNewButton = await newMessageButton.isVisible().catch(() => false);

    if (hasNewButton) {
      await newMessageButton.click();
    } else {
      // 빈 상태 화면의 "새 메시지 보내기" 버튼
      const altButton = page.getByRole('button', { name: '새 메시지 보내기' });
      const hasAltButton = await altButton.isVisible().catch(() => false);
      if (!hasAltButton) {
        test.skip();
        return;
      }
      await altButton.click();
    }

    // 다이얼로그 제목 "새 메시지" 확인
    await expect(
      page.getByRole('heading', { name: '새 메시지' }),
    ).toBeVisible({ timeout: 5_000 });

    // 검색 입력 필드 확인
    await expect(
      page.getByPlaceholder('이름으로 검색...'),
    ).toBeVisible();
  });

  test('모바일 뷰: 목록/스레드 전환', async ({ opsPage: page }) => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/messages');
    await page.waitForLoadState('networkidle');

    if (!(await selectFirstConversation(page))) {
      test.skip();
      return;
    }

    // 모바일에서 스레드가 표시되면 "뒤로가기" 버튼이 보여야 함
    const backButton = page.getByRole('button', { name: '뒤로가기' });
    await expect(backButton).toBeVisible({ timeout: 5_000 });

    // 뒤로가기 클릭 → 목록으로 복귀
    await backButton.click();

    // 목록 영역이 다시 보여야 함 (대화 버튼이 다시 표시)
    await expect(
      page.locator('button').filter({ has: page.locator('[data-slot="avatar"]') }).first(),
    ).toBeVisible({ timeout: 5_000 });
  });
});
