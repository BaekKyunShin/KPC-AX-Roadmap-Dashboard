/**
 * SYSTEM_ADMIN 라우트 접근 E2E 테스트
 *
 * SYSTEM_ADMIN이 OPS 라우트 및 test-roadmap에 접근 가능한지 검증합니다.
 * 환경변수(E2E_SYSTEM_ADMIN_EMAIL/PASSWORD) 미설정 시 자동 skip됩니다.
 */

import { test, expect } from '../fixtures/auth.fixture';
import { HAS_SYSTEM_ADMIN, URLS } from '../fixtures/test-data';
import { setupConsoleErrorCheck, waitForPageLoad } from '../helpers/assertions.helper';

// SYSTEM_ADMIN 계정 미설정 시 전체 skip
const describeOrSkip = HAS_SYSTEM_ADMIN ? test.describe : test.describe.skip;

describeOrSkip('SYSTEM_ADMIN 라우트 접근', () => {
  test('OPS 프로젝트 관리 페이지 접근 가능', async ({ systemAdminPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto(URLS.opsProjects);
    await waitForPageLoad(page);

    // 프로젝트 관리 페이지 로드 확인
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    expect(getErrors()).toEqual([]);
  });

  test('OPS 사용자 관리 페이지 접근 가능', async ({ systemAdminPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto(URLS.opsUsers);
    await waitForPageLoad(page);

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    expect(getErrors()).toEqual([]);
  });

  test('로드맵 테스트 페이지 접근 가능', async ({ systemAdminPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto(URLS.testRoadmap);
    await waitForPageLoad(page);

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    expect(getErrors()).toEqual([]);
  });

  test('감사 로그 페이지 접근 가능', async ({ systemAdminPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto(URLS.opsAudit);
    await waitForPageLoad(page);

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 });
    expect(getErrors()).toEqual([]);
  });
});
