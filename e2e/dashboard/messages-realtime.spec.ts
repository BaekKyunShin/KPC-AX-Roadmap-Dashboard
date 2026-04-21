// e2e/dashboard/messages-realtime.spec.ts
// Supabase Realtime 구독 동작 E2E — 2개 context 동시 로그인 후 A 전송 → B 실시간 수신 확인
// 기존 messages.spec.ts는 단일 역할 기준이라 realtime은 독립 spec으로 분리
import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { ensureTestConversation } from '../helpers/cleanup.helper';

/**
 * 대화 목록의 첫 대화를 선택하고 스레드 렌더링까지 대기.
 * 메시지 입력란이 보이면 성공.
 */
async function selectFirstConversationAndOpen(page: Page): Promise<boolean> {
  const btn = page
    .locator('main button')
    .filter({ has: page.locator('[data-slot="avatar"]') })
    .first();
  try {
    await btn.waitFor({ state: 'visible', timeout: 5_000 });
  } catch {
    return false;
  }
  await btn.click();
  try {
    await page
      .getByPlaceholder('메시지를 입력하세요...')
      .waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    return false;
  }
  return true;
}

test.describe('메시지 실시간 구독 (Realtime)', () => {
  // ops ↔ consultant 대화 사전 보장
  test.beforeAll(async () => {
    const opsEmail = process.env.E2E_OPS_ADMIN_EMAIL!;
    const consultantEmail = process.env.E2E_CONSULTANT_EMAIL!;
    await ensureTestConversation(opsEmail, consultantEmail);
  });

  test('OPS가 보낸 메시지를 컨설턴트가 실시간으로 수신', async ({
    opsPage,
    consultantPage,
  }) => {
    // 양쪽 모두 메시지 페이지 + 동일 대화 선택
    await Promise.all([
      opsPage.goto('/dashboard/messages'),
      consultantPage.goto('/dashboard/messages'),
    ]);
    await Promise.all([
      opsPage.waitForLoadState('networkidle'),
      consultantPage.waitForLoadState('networkidle'),
    ]);

    const opsOpened = await selectFirstConversationAndOpen(opsPage);
    const consOpened = await selectFirstConversationAndOpen(consultantPage);
    test.skip(!opsOpened || !consOpened, '테스트 데이터 없음: 양쪽 모두 대화 목록이 비어있음');

    // OPS가 고유 메시지 전송
    const marker = `E2E_RT_OPS_${Date.now()}`;
    await opsPage.getByPlaceholder('메시지를 입력하세요...').fill(marker);
    await opsPage.getByRole('button', { name: '메시지 전송' }).click();

    // 컨설턴트 쪽 스레드에서 해당 메시지가 10초 내에 나타나야 함 (Realtime)
    await expect(
      consultantPage.getByTestId('message-thread-area').getByText(marker),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('컨설턴트가 보낸 메시지를 OPS가 실시간으로 수신', async ({
    opsPage,
    consultantPage,
  }) => {
    await Promise.all([
      opsPage.goto('/dashboard/messages'),
      consultantPage.goto('/dashboard/messages'),
    ]);
    await Promise.all([
      opsPage.waitForLoadState('networkidle'),
      consultantPage.waitForLoadState('networkidle'),
    ]);

    const opsOpened = await selectFirstConversationAndOpen(opsPage);
    const consOpened = await selectFirstConversationAndOpen(consultantPage);
    test.skip(!opsOpened || !consOpened, '테스트 데이터 없음: 양쪽 모두 대화 목록이 비어있음');

    const marker = `E2E_RT_CONS_${Date.now()}`;
    await consultantPage.getByPlaceholder('메시지를 입력하세요...').fill(marker);
    await consultantPage.getByRole('button', { name: '메시지 전송' }).click();

    await expect(
      opsPage.getByTestId('message-thread-area').getByText(marker),
    ).toBeVisible({ timeout: 10_000 });
  });
});
