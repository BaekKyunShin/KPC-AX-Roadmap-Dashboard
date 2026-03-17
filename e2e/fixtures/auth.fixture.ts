/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture의 use()는 React Hook이 아님 */
// e2e/fixtures/auth.fixture.ts
import { test as base, type Page } from '@playwright/test';

type AuthFixtures = {
  opsPage: Page;
  consultantPage: Page;
  systemAdminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  opsPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  consultantPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: '.auth/consultant.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  systemAdminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: '.auth/system-admin.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
