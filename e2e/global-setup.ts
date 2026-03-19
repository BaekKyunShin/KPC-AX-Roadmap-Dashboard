// e2e/global-setup.ts
import { chromium, type Browser } from '@playwright/test';
import { TEST_ACCOUNTS, HAS_SYSTEM_ADMIN } from './fixtures/test-data';
import fs from 'fs';
import path from 'path';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const AUTH_DIR = path.join(process.cwd(), '.auth');
const SESSION_CACHE_TTL_MS = 30 * 60 * 1000; // JWT 만료 60분, 30분 버퍼
const LOGIN_TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 2_000;
const MAX_RETRIES = 3;

const ACCOUNTS = [
  { file: path.join(AUTH_DIR, 'ops-admin.json'), ...TEST_ACCOUNTS.opsAdmin },
  { file: path.join(AUTH_DIR, 'consultant.json'), ...TEST_ACCOUNTS.consultant },
  // SYSTEM_ADMIN은 환경변수 설정 시에만 포함
  ...(HAS_SYSTEM_ADMIN
    ? [{ file: path.join(AUTH_DIR, 'system-admin.json'), ...TEST_ACCOUNTS.systemAdmin }]
    : []),
];

// ─── 헬퍼 함수 ──────────────────────────────────────────────────────────────

/** 캐시된 세션 파일이 유효한지 확인 */
function isCacheValid(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const ageMs = Date.now() - fs.statSync(filePath).mtimeMs;
  return ageMs < SESSION_CACHE_TTL_MS;
}

/** 로그인 후 세션 저장 (최대 maxRetries회 재시도) */
async function loginAndSaveSession(
  browser: Browser,
  account: { file: string; email: string; password: string },
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000/login');
      await page.locator('[name="email"]').fill(account.email);
      await page.locator('[name="password"]').fill(account.password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/\/(ops|consultant|dashboard)/, { timeout: LOGIN_TIMEOUT_MS });

      await context.storageState({ path: account.file });
      await context.close();
      return; // 성공
    } catch (err) {
      await context.close();
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `로그인 실패 (${account.email}): ${MAX_RETRIES}회 재시도 후에도 실패 — ${err}`,
        );
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

// ─── 글로벌 셋업 ────────────────────────────────────────────────────────────

async function globalSetup() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const account of ACCOUNTS) {
    if (isCacheValid(account.file)) continue;
    await loginAndSaveSession(browser, account);
  }

  await browser.close();
}

export default globalSetup;
