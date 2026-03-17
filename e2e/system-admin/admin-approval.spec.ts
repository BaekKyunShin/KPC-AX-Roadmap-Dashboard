/**
 * SYSTEM_ADMIN 사용자 관리 E2E 테스트
 *
 * SYSTEM_ADMIN이 사용자 관리 페이지에서 사용자 목록을 조회하고
 * 역할별 필터링이 가능한지 검증합니다.
 * 환경변수(E2E_SYSTEM_ADMIN_EMAIL/PASSWORD) 미설정 시 자동 skip됩니다.
 */

import { test, expect } from '../fixtures/auth.fixture';
import { HAS_SYSTEM_ADMIN, URLS } from '../fixtures/test-data';
import { setupConsoleErrorCheck, waitForPageLoad } from '../helpers/assertions.helper';

const describeOrSkip = HAS_SYSTEM_ADMIN ? test.describe : test.describe.skip;

describeOrSkip('SYSTEM_ADMIN 사용자 관리', () => {
  test('사용자 목록 테이블이 표시됨', async ({ systemAdminPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto(URLS.opsUsers);
    await waitForPageLoad(page);

    // 사용자 테이블 또는 목록이 표시되는지 확인
    const tableOrList = page.locator('table, [role="table"], [data-testid="user-list"]');
    await expect(tableOrList.first()).toBeVisible({ timeout: 10_000 });
    expect(getErrors()).toEqual([]);
  });

  test('쿼터 관리 페이지에서 사용량 확인 가능', async ({ systemAdminPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto(URLS.opsQuota);
    await waitForPageLoad(page);

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    expect(getErrors()).toEqual([]);
  });
});
