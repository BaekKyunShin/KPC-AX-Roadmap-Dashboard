/* eslint-disable no-console -- CLI 도구 스크립트 */
/**
 * 4개 화면 × 3 해상도 스크린샷 그리드 생성기 (Task 2.12).
 *
 * 목적
 * ----
 * 4개 재설계 화면(로드맵 인터뷰/결과, PBL 인터뷰/결과)이 계획서 §3 의 15개 통일 원칙
 * (컨테이너 폭·헤더·다운로드 버튼·상태 배지·버전 셀렉터·재생성 아코디언·편집·빈 상태·
 * 스텝퍼·하단 네비·반응형 브레이크포인트 등) 을 일관되게 따르는지 **육안 검증** 하기
 * 위한 스크린샷 12장을 생성한다.
 *
 * 실행
 * ----
 *   1. 개발 서버 실행: `npm run dev` (별도 터미널)
 *      - dev 서버가 붙는 Supabase 와 E2E_CONSULTANT_EMAIL 계정이 **같은 Supabase** 여야 함.
 *      - 로컬 Supabase 를 사용하려면 `supabase start` → dev 서버를 `.env.test` 로 기동.
 *      - 클라우드 Supabase 를 사용하려면 .env.local 에 컨설턴트 계정이 존재해야 하고
 *        .env.test 에 동일 계정을 E2E_CONSULTANT_EMAIL / _PASSWORD 로 설정.
 *   2. 기존 E2E 인증 storage state 사용 — .auth/consultant.json 이 없거나 만료되면
 *      스크립트가 자동으로 로그인 수행.
 *   3. 스크립트 실행: `npm run snapshot:4-screens`
 *
 *   ※ 로그인 실패 / 담당 프로젝트 부재 등 환경 문제 시 해당 컷은 skip 되고 나머지만
 *     캡처된다 (fail-soft).
 *
 * 출력
 * ----
 *   docs/screenshots/2026-04-24/{screen}-{viewport}.png  (총 12장 목표)
 *   - screen: roadmap-interview / roadmap-result / pbl-interview / pbl-result
 *   - viewport: mobile-375 / tablet-768 / desktop-1280
 *
 * 캡처 대상 URL 결정
 * ------------------
 *   - **인터뷰 화면**: `/test-roadmap` · `/test-pbl` (DB 저장 없는 V2 인터뷰 UI 재사용).
 *   - **결과 화면**: 실제 `/consultant/projects/{firstId}/roadmap` · `/pbl` — 첫 담당
 *     프로젝트의 "생성 전 빈 상태" 또는 "이미 생성된 결과" 화면을 캡처. 담당 프로젝트가
 *     없거나 페이지 로드가 실패하면 해당 컷은 skip (스크립트 진행은 계속).
 *
 *   ※ LLM 호출은 하지 않는다 (시간·비용). 결과는 DB 에 미리 저장돼 있거나 빈 상태로
 *     캡처된다.
 */

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// ─── 환경변수 (.env.test 우선 → .env.local 보완) ──────────────────────────────
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env.local' });

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(process.cwd(), 'docs', 'screenshots', '2026-04-24');
const AUTH_DIR = path.join(process.cwd(), '.auth');
const CONSULTANT_AUTH_FILE = path.join(AUTH_DIR, 'consultant.json');
const LOGIN_TIMEOUT_MS = 30_000;
const PAGE_LOAD_TIMEOUT_MS = 90_000;

// ─── 뷰포트 3종 ───────────────────────────────────────────────────────────────
interface Viewport {
  slug: string;
  width: number;
  height: number;
}

const VIEWPORTS: Viewport[] = [
  { slug: 'mobile-375', width: 375, height: 812 },
  { slug: 'tablet-768', width: 768, height: 1024 },
  { slug: 'desktop-1280', width: 1280, height: 900 },
];

// ─── 4개 화면 정의 ────────────────────────────────────────────────────────────
interface ScreenTarget {
  slug: string;
  label: string;
  /** URL 을 반환. 프로젝트 ID 가 필요한 경우 동적으로 조회해 반환. */
  getUrl: (ctx: UrlContext) => Promise<string | null>;
  /** 페이지 로드 후 렌더 완료를 판단할 셀렉터. 여러 개면 하나라도 보이면 OK. */
  readySelectors: string[];
}

interface UrlContext {
  firstProjectId: string | null;
}

const SCREENS: ScreenTarget[] = [
  {
    slug: 'roadmap-interview',
    label: '로드맵 인터뷰',
    getUrl: async () => `${BASE_URL}/test-roadmap`,
    // V2 인터뷰는 StickyFormNav·InterviewStepper 를 공통 사용. 둘 중 하나라도 보이면 OK.
    readySelectors: ['nav[aria-label="Progress"]', 'text=기본 정보', 'button:has-text("다음")'],
  },
  {
    slug: 'pbl-interview',
    label: 'PBL 인터뷰',
    getUrl: async () => `${BASE_URL}/test-pbl`,
    readySelectors: ['nav[aria-label="Progress"]', 'text=기본 정보', 'button:has-text("다음")'],
  },
  {
    slug: 'roadmap-result',
    label: '로드맵 결과',
    getUrl: async ({ firstProjectId }) =>
      firstProjectId ? `${BASE_URL}/consultant/projects/${firstProjectId}/roadmap` : null,
    // 결과 페이지는 생성 전 empty state ("로드맵을 생성해주세요") 또는 실제 결과 탭/헤더.
    readySelectors: [
      'h1',
      'text=로드맵',
      'button:has-text("로드맵 생성")',
      '[role="tablist"]',
    ],
  },
  {
    slug: 'pbl-result',
    label: 'PBL 결과',
    getUrl: async ({ firstProjectId }) =>
      firstProjectId ? `${BASE_URL}/consultant/projects/${firstProjectId}/pbl` : null,
    readySelectors: [
      'h1',
      'text=PBL',
      'button:has-text("PBL 생성")',
      '[role="tablist"]',
    ],
  },
];

// ─── 헬퍼: dev 서버 가동 확인 ────────────────────────────────────────────────
async function waitForDevServer(maxAttempts = 60, delayMs = 1_000): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(BASE_URL);
      if (res.status > 0) return true;
    } catch {
      // 아직 안 뜸
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

// ─── 헬퍼: 로그인 + storage state 저장 ───────────────────────────────────────
/**
 * 컨설턴트 storage state 를 준비한다.
 *
 * 반환값:
 *  - `'cached'`  : 기존 .auth/consultant.json 을 그대로 사용 (TTL 30분 이내)
 *  - `'logged-in'` : 이번 세션에서 로그인 후 storage state 새로 저장
 *  - `'unauthenticated'` : 로그인 실패 — 공개 경로만 캡처하는 best-effort 모드
 */
async function ensureConsultantAuth(
  browser: Browser,
): Promise<'cached' | 'logged-in' | 'unauthenticated'> {
  if (fs.existsSync(CONSULTANT_AUTH_FILE)) {
    const ageMs = Date.now() - fs.statSync(CONSULTANT_AUTH_FILE).mtimeMs;
    // 30분 이내면 재사용 (만료돼도 일단 시도 — 로그인 실패 시 fallback)
    if (ageMs < 30 * 60 * 1000) {
      console.log('   (cached consultant storage state 재사용)');
      return 'cached';
    }
  }

  const email = process.env.E2E_CONSULTANT_EMAIL;
  const password = process.env.E2E_CONSULTANT_PASSWORD;
  if (!email || !password) {
    console.log(
      '   ⚠ E2E_CONSULTANT_EMAIL / _PASSWORD 가 없어 로그인 생략 — 공개 경로만 캡처합니다.',
    );
    return 'unauthenticated';
  }

  console.log(`   로그인 수행 중 (${email})...`);
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.locator('[name="email"]').fill(email);
    await page.locator('[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(ops|consultant|dashboard)/, { timeout: LOGIN_TIMEOUT_MS });
    await context.storageState({ path: CONSULTANT_AUTH_FILE });
    return 'logged-in';
  } catch (err) {
    const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
    console.log(`   ⚠ 로그인 실패 (${msg}) — 공개 경로만 캡처합니다.`);
    return 'unauthenticated';
  } finally {
    await context.close();
  }
}

// ─── 헬퍼: 첫 번째 담당 프로젝트 ID 추출 ─────────────────────────────────────
async function findFirstProjectId(context: BrowserContext): Promise<string | null> {
  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}/consultant/projects`, { timeout: PAGE_LOAD_TIMEOUT_MS });
    await page.waitForLoadState('networkidle', { timeout: PAGE_LOAD_TIMEOUT_MS }).catch(() => {
      /* 일부 환경에서 networkidle 이 오래 걸려도 링크 추출은 가능 */
    });
    const href = await page
      .locator('a[href*="/consultant/projects/"]')
      .first()
      .getAttribute('href')
      .catch(() => null);
    if (!href) return null;
    // /consultant/projects/{uuid}  또는 /consultant/projects/{uuid}/xxx
    const match = href.match(/\/consultant\/projects\/([0-9a-fA-F-]{36})/);
    return match?.[1] ?? null;
  } catch {
    return null;
  } finally {
    await page.close();
  }
}

// ─── 헬퍼: 페이지 렌더 대기 (selectors 중 하나가 보이면 OK) ──────────────────
async function waitForAnySelector(page: Page, selectors: string[], timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const sel of selectors) {
      try {
        const visible = await page.locator(sel).first().isVisible({ timeout: 500 });
        if (visible) return true;
      } catch {
        // try next
      }
    }
    await page.waitForTimeout(250);
  }
  return false;
}

// ─── 메인 캡처 로직 ───────────────────────────────────────────────────────────
interface CaptureResult {
  screen: string;
  viewport: string;
  status: 'ok' | 'skipped' | 'failed';
  filePath?: string;
  reason?: string;
  durationMs?: number;
}

async function captureOne(
  context: BrowserContext,
  screen: ScreenTarget,
  viewport: Viewport,
  urlCtx: UrlContext,
  index: number,
  total: number,
): Promise<CaptureResult> {
  const start = Date.now();
  const progressPrefix = `[${index}/${total}] ${screen.label} @ ${viewport.width}px`;

  const url = await screen.getUrl(urlCtx);
  if (!url) {
    console.log(`${progressPrefix} (skip: URL 없음 — 담당 프로젝트가 없을 가능성)`);
    return {
      screen: screen.slug,
      viewport: viewport.slug,
      status: 'skipped',
      reason: 'URL unavailable (no assigned project)',
    };
  }

  const page = await context.newPage();
  try {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(url, { timeout: PAGE_LOAD_TIMEOUT_MS, waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: PAGE_LOAD_TIMEOUT_MS }).catch(() => {
      /* networkidle 미도달해도 선택자 기반 체크로 진행 */
    });
    // 인증 실패 → /login 리다이렉트 감지. 통일성 검증에 무관한 화면이므로 skip.
    const finalUrl = page.url();
    if (/\/login\b/.test(finalUrl)) {
      console.log(`${progressPrefix} (skip: /login 리다이렉트 — 인증 필요)`);
      return {
        screen: screen.slug,
        viewport: viewport.slug,
        status: 'skipped',
        reason: 'redirected to /login (unauthenticated)',
      };
    }
    const ready = await waitForAnySelector(page, screen.readySelectors, 8_000);
    if (!ready) {
      console.log(`${progressPrefix} (warn: 주요 셀렉터 미감지 — 그래도 캡처 시도)`);
    }
    // 폰트/레이아웃 정착 대기
    await page.waitForTimeout(500);
    const filePath = path.join(OUTPUT_DIR, `${screen.slug}-${viewport.slug}.png`);
    await page.screenshot({ path: filePath, fullPage: true, animations: 'disabled' });
    const durationMs = Date.now() - start;
    console.log(`${progressPrefix} ✓ (${durationMs}ms)`);
    return { screen: screen.slug, viewport: viewport.slug, status: 'ok', filePath, durationMs };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.log(`${progressPrefix} ✗ (${reason.split('\n')[0]})`);
    return {
      screen: screen.slug,
      viewport: viewport.slug,
      status: 'failed',
      reason,
      durationMs: Date.now() - start,
    };
  } finally {
    await page.close();
  }
}

async function main(): Promise<void> {
  console.log('─ 4개 화면 × 3 해상도 스크린샷 그리드 ─');
  console.log(`   BASE_URL     : ${BASE_URL}`);
  console.log(`   OUTPUT_DIR   : ${OUTPUT_DIR}\n`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('▸ dev 서버 가동 확인...');
  const ok = await waitForDevServer();
  if (!ok) {
    console.error(`\n❌ ${BASE_URL} 에서 dev 서버가 응답하지 않습니다. \`npm run dev\` 를 먼저 실행하세요.`);
    process.exit(1);
  }
  console.log('   서버 응답 확인 ✓\n');

  const browser = await chromium.launch({ headless: true });

  try {
    console.log('▸ 컨설턴트 인증 준비...');
    const authStatus = await ensureConsultantAuth(browser);

    const contextOpts: Parameters<Browser['newContext']>[0] = {
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      deviceScaleFactor: 2, // Retina 품질
    };
    if (authStatus !== 'unauthenticated' && fs.existsSync(CONSULTANT_AUTH_FILE)) {
      contextOpts.storageState = CONSULTANT_AUTH_FILE;
    }
    const context = await browser.newContext(contextOpts);

    console.log('\n▸ 첫 번째 담당 프로젝트 ID 조회 (결과 화면 URL 용)...');
    const firstProjectId = await findFirstProjectId(context);
    console.log(
      firstProjectId
        ? `   firstProjectId = ${firstProjectId}`
        : '   담당 프로젝트 없음 — 결과 화면 2컷(총 6장) 은 skip 됩니다.',
    );

    const urlCtx: UrlContext = { firstProjectId };
    const results: CaptureResult[] = [];
    const total = SCREENS.length * VIEWPORTS.length;
    let i = 0;

    console.log('\n▸ 캡처 시작 (한 컷씩, 실패 시 다음 컷으로 진행)\n');
    for (const screen of SCREENS) {
      for (const viewport of VIEWPORTS) {
        i += 1;
        const result = await captureOne(context, screen, viewport, urlCtx, i, total);
        results.push(result);
      }
    }

    await context.close();

    // ─── 요약 ────────────────────────────────────────────────────────────────
    const ok = results.filter((r) => r.status === 'ok');
    const skipped = results.filter((r) => r.status === 'skipped');
    const failed = results.filter((r) => r.status === 'failed');

    console.log('\n─ 요약 ─────────────────────────────────────────────────');
    console.log(`   성공 : ${ok.length}/${total}`);
    console.log(`   스킵 : ${skipped.length}`);
    console.log(`   실패 : ${failed.length}`);
    if (failed.length > 0) {
      console.log('\n   실패 상세:');
      for (const f of failed) {
        console.log(`     - ${f.screen} @ ${f.viewport}: ${f.reason?.split('\n')[0]}`);
      }
    }
    if (skipped.length > 0) {
      console.log('\n   스킵 상세:');
      for (const s of skipped) {
        console.log(`     - ${s.screen} @ ${s.viewport}: ${s.reason}`);
      }
    }
    console.log(`\n   파일 경로: ${OUTPUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ 스크립트 실행 중 치명적 오류:', err);
  process.exit(1);
});
