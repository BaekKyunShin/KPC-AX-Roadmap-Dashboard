// e2e/global-setup.ts
import { chromium } from '@playwright/test';
import { TEST_ACCOUNTS, HAS_SYSTEM_ADMIN } from './fixtures/test-data';
import fs from 'fs';
import path from 'path';

const AUTH_DIR = path.join(process.cwd(), '.auth');

const ACCOUNTS = [
  { file: path.join(AUTH_DIR, 'ops-admin.json'), ...TEST_ACCOUNTS.opsAdmin },
  { file: path.join(AUTH_DIR, 'consultant.json'), ...TEST_ACCOUNTS.consultant },
  // SYSTEM_ADMIN은 환경변수 설정 시에만 포함
  ...(HAS_SYSTEM_ADMIN
    ? [{ file: path.join(AUTH_DIR, 'system-admin.json'), ...TEST_ACCOUNTS.systemAdmin }]
    : []),
];

async function globalSetup() {
  // .auth 디렉터리 생성
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const account of ACCOUNTS) {
    // 기존 세션 파일이 있고 50분 이내면 재사용 (JWT 만료 60분 전에 재로그인)
    if (fs.existsSync(account.file)) {
      const stat = fs.statSync(account.file);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs < 50 * 60 * 1000) {
        continue;
      }
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://localhost:3000/login');
    await page.locator('[name="email"]').fill(account.email);
    await page.locator('[name="password"]').fill(account.password);
    await page.locator('button[type="submit"]').click();
    // 로그인 후 리다이렉트 대기
    await page.waitForURL(/\/(ops|consultant|dashboard)/, { timeout: 15_000 });

    await context.storageState({ path: account.file });
    await context.close();
  }

  await browser.close();
}

export default globalSetup;
