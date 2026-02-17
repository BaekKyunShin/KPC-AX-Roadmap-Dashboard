// e2e/fixtures/auth.fixture.ts
import { test as base, type Page } from '@playwright/test';

type AuthFixtures = {
  opsPage: Page;
  consultantPage: Page;
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
});

export { expect } from '@playwright/test';
