# Playwright E2E 테스트 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 기존 Puppeteer 수동 테스트(470+ 항목)를 Playwright 자동화 코드로 전환하여, `npx playwright test` 한 번으로 전체 기능 회귀 테스트 실행

**Architecture:** 21개 spec 파일을 기능 단위로 구성하고, 역할별 인증 Fixture + DB 복원 Helper로 독립 실행 보장. Session 0에서 인프라를 구축한 뒤, Session 1~7에서 spec 파일을 세션별로 작성.

**Tech Stack:** Playwright 1.58.1, Supabase Admin Client (cleanup), dotenv (.env.test)

**참조 문서:**
- 설계서: `docs/plans/2026-02-13-e2e-test-design.md`
- 원본 테스트 계획: `docs/testing/TEST_PLAN.md`

**셀렉터 전략 (우선순위):**
1. `getByRole()` — 버튼, 탭, 링크, 텍스트박스
2. `getByLabel()` — 폼 필드 (label 연결된 경우)
3. `getByPlaceholder()` — 검색 필드
4. `getByText()` — 일반 텍스트
5. `locator('[name="..."]')` — name 속성이 있는 폼 필드
6. `locator('[data-slot="..."]')` — shadcn/ui 컴포넌트
7. `locator('[data-sonner-toast]')` — Sonner 토스트

---

## Session 0: 인프라 구축

### Task 0-1: dotenv 설치

**Step 1: 패키지 설치**

```bash
npm install -D dotenv --legacy-peer-deps
```

Expected: 설치 성공

**Step 2: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: dotenv 설치 (Playwright E2E 환경 변수용)"
```

---

### Task 0-2: .env.test 및 .gitignore 설정

**Files:**
- Create: `.env.test.example`
- Modify: `.gitignore`

**Step 1: .env.test.example 생성**

```bash
# .env.test.example
# E2E 테스트 환경 변수 — .env.test로 복사 후 실제 값 입력
# .env.test는 gitignore에 포함되어 커밋되지 않음

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM (앱 기동에 필요, 실제 호출은 skip)
LLM_API_KEY=

# 테스트 계정 (개발 DB 전용)
E2E_OPS_ADMIN_EMAIL=
E2E_OPS_ADMIN_PASSWORD=
E2E_CONSULTANT_EMAIL=
E2E_CONSULTANT_PASSWORD=
```

**Step 2: .env.test 생성 (로컬 전용)**

실제 값을 입력한 `.env.test` 파일을 생성합니다. 이 파일은 커밋하지 않습니다.

**Step 3: .gitignore에 추가**

`.gitignore`의 `# testing` 섹션에 다음을 추가:

```
# testing
/coverage
.auth/
.env.test
playwright-report/
test-results/
```

**Step 4: 커밋**

```bash
git add .env.test.example .gitignore
git commit -m "chore: E2E 환경 변수 템플릿 및 gitignore 추가"
```

---

### Task 0-3: playwright.config.ts 생성

**Files:**
- Create: `playwright.config.ts`

**Step 1: 설정 파일 작성**

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html'], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },

  globalSetup: './e2e/global-setup.ts',

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

**Step 2: 설정 검증**

```bash
npx playwright test --list
```

Expected: "no tests found" (아직 spec 파일 없음 — 에러가 아닌 정상)

**Step 3: 커밋**

```bash
git add playwright.config.ts
git commit -m "chore: Playwright 설정 파일 생성"
```

---

### Task 0-4: 테스트 데이터 및 Auth Fixture

**Files:**
- Create: `e2e/fixtures/test-data.ts`
- Create: `e2e/fixtures/auth.fixture.ts`

**Step 1: test-data.ts 작성**

```typescript
// e2e/fixtures/test-data.ts

export const TEST_ACCOUNTS = {
  opsAdmin: {
    email: process.env.E2E_OPS_ADMIN_EMAIL!,
    password: process.env.E2E_OPS_ADMIN_PASSWORD!,
  },
  consultant: {
    email: process.env.E2E_CONSULTANT_EMAIL!,
    password: process.env.E2E_CONSULTANT_PASSWORD!,
  },
};

/** 자주 사용하는 테스트 URL */
export const URLS = {
  landing: '/',
  demo: '/demo',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  // OPS
  opsProjects: '/ops/projects',
  opsProjectNew: '/ops/projects/new',
  opsUsers: '/ops/users',
  opsTemplates: '/ops/templates',
  opsTemplateNew: '/ops/templates/new',
  opsAudit: '/ops/audit',
  opsQuota: '/ops/quota',
  // Consultant
  consultantHome: '/consultant/home',
  consultantProjects: '/consultant/projects',
  consultantProfile: '/consultant/profile',
  // Shared
  messages: '/dashboard/messages',
  settings: '/dashboard/settings',
  gallery: '/gallery',
  testRoadmap: '/test-roadmap',
} as const;
```

**Step 2: auth.fixture.ts 작성**

```typescript
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
```

**Step 3: 커밋**

```bash
git add e2e/fixtures/
git commit -m "chore: E2E 테스트 데이터 및 Auth Fixture 생성"
```

---

### Task 0-5: Global Setup

**Files:**
- Create: `e2e/global-setup.ts`

**Step 1: global-setup.ts 작성**

```typescript
// e2e/global-setup.ts
import { chromium } from '@playwright/test';
import { TEST_ACCOUNTS } from './fixtures/test-data';
import fs from 'fs';
import path from 'path';

const AUTH_DIR = path.join(process.cwd(), '.auth');

const ACCOUNTS = [
  { file: path.join(AUTH_DIR, 'ops-admin.json'), ...TEST_ACCOUNTS.opsAdmin },
  { file: path.join(AUTH_DIR, 'consultant.json'), ...TEST_ACCOUNTS.consultant },
];

async function globalSetup() {
  // .auth 디렉터리 생성
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const account of ACCOUNTS) {
    // 기존 세션 파일이 있고 1시간 이내면 재사용
    if (fs.existsSync(account.file)) {
      const stat = fs.statSync(account.file);
      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs < 50 * 60 * 1000) {
        // 50분 이내 — JWT 만료(60분) 전에 재로그인
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
```

**Step 2: 커밋**

```bash
git add e2e/global-setup.ts
git commit -m "chore: Global Setup — 역할별 로그인 세션 파일 생성"
```

---

### Task 0-6: Helper — assertions

**Files:**
- Create: `e2e/helpers/assertions.helper.ts`

**Step 1: assertions.helper.ts 작성**

```typescript
// e2e/helpers/assertions.helper.ts
import { type Page, expect } from '@playwright/test';

/**
 * 페이지 JS 콘솔 에러 수집기
 * 사용: const getErrors = setupConsoleErrorCheck(page);
 *       // ... 테스트 ...
 *       expect(getErrors()).toEqual([]);
 */
export function setupConsoleErrorCheck(page: Page): () => string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return () => [...errors];
}

/**
 * Sonner 토스트 메시지 확인
 */
export async function expectToast(page: Page, text: string) {
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: text }),
  ).toBeVisible({ timeout: 5_000 });
}

/**
 * 빈 상태 메시지 확인
 */
export async function expectEmptyState(page: Page, message?: string) {
  if (message) {
    await expect(page.getByText(message)).toBeVisible();
  } else {
    // 일반적으로 "없습니다" 또는 "비어" 텍스트가 포함됨
    await expect(
      page.locator('text=/없습니다|비어|No /i'),
    ).toBeVisible();
  }
}

/**
 * 페이지 로딩 완료 대기 (스켈레톤/Loader가 사라질 때까지)
 */
export async function waitForPageLoad(page: Page) {
  // Skeleton이 있으면 사라질 때까지 대기
  const skeleton = page.locator('[data-slot="skeleton"], .animate-pulse');
  if (await skeleton.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
    await skeleton.first().waitFor({ state: 'hidden', timeout: 10_000 });
  }
  // 네트워크 안정화 대기
  await page.waitForLoadState('networkidle');
}
```

**Step 2: 커밋**

```bash
git add e2e/helpers/assertions.helper.ts
git commit -m "chore: E2E Assertions Helper 생성"
```

---

### Task 0-7: Helper — navigation

**Files:**
- Create: `e2e/helpers/navigation.helper.ts`

**Step 1: navigation.helper.ts 작성**

```typescript
// e2e/helpers/navigation.helper.ts
import { type Page, expect } from '@playwright/test';

/**
 * 탭 전환
 * @example await switchTab(page, '과정 체계도');
 */
export async function switchTab(page: Page, tabName: string) {
  await page.getByRole('tab', { name: tabName }).click();
  // 탭 활성화 확인
  await expect(
    page.getByRole('tab', { name: tabName }),
  ).toHaveAttribute('data-state', 'active');
}

/**
 * 뒤로가기 링크 클릭 (페이지 상단 "← 목록으로" 스타일)
 */
export async function clickBackLink(page: Page, linkText: string) {
  await page.getByRole('link', { name: linkText }).click();
}

/**
 * OPS 네비게이션 드롭다운 메뉴 클릭
 * 관리자 네비게이션은 드롭다운 그룹으로 구성되어 있음
 * @param triggerText 드롭다운 트리거 텍스트 (예: "워크스페이스")
 * @param itemText 메뉴 항목 텍스트 (예: "프로젝트 관리")
 */
export async function clickOpsNavMenu(
  page: Page,
  triggerText: string,
  itemText: string,
) {
  // 드롭다운 트리거 클릭
  await page.getByRole('button', { name: new RegExp(triggerText) }).click();
  // 메뉴 항목 클릭
  await page.getByRole('link', { name: itemText }).click();
}

/**
 * 사용자 드롭다운 열기 → 메뉴 항목 클릭
 */
export async function clickUserMenu(page: Page, itemText: string) {
  // 사용자 드롭다운 트리거 (아바타/이름이 있는 버튼)
  await page
    .locator('nav')
    .getByRole('button')
    .filter({ has: page.locator('[data-slot="avatar"]') })
    .click();
  // 메뉴 항목 클릭
  if (itemText === '로그아웃') {
    await page.getByRole('button', { name: '로그아웃' }).click();
  } else {
    await page.getByRole('link', { name: itemText }).click();
  }
}
```

**Step 2: 커밋**

```bash
git add e2e/helpers/navigation.helper.ts
git commit -m "chore: E2E Navigation Helper 생성"
```

---

### Task 0-8: Helper — cleanup

**Files:**
- Create: `e2e/helpers/cleanup.helper.ts`

**Step 1: cleanup.helper.ts 작성**

```typescript
// e2e/helpers/cleanup.helper.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin Client (RLS 우회)
 * E2E 테스트의 파괴적 액션을 복원하기 위해 사용
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** 프로젝트 삭제 (생성 테스트 후 정리) */
export async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) console.warn(`deleteProject(${id}) 실패:`, error.message);
}

/** 사용자 상태 복원 (승인/정지 테스트 후) */
export async function restoreUserStatus(
  userId: string,
  originalStatus: string,
) {
  const { error } = await supabase
    .from('profiles')
    .update({ status: originalStatus })
    .eq('id', userId);
  if (error)
    console.warn(`restoreUserStatus(${userId}) 실패:`, error.message);
}

/** 템플릿 삭제 (복제 테스트 후 정리) */
export async function deleteTemplate(id: string) {
  const { error } = await supabase
    .from('assessment_templates')
    .delete()
    .eq('id', id);
  if (error) console.warn(`deleteTemplate(${id}) 실패:`, error.message);
}

/** 활동일지 삭제 */
export async function deleteActivityLog(id: string) {
  const { error } = await supabase
    .from('activity_logs')
    .delete()
    .eq('id', id);
  if (error) console.warn(`deleteActivityLog(${id}) 실패:`, error.message);
}

/** 컨설턴트 프로필 복원 */
export async function restoreProfile(
  userId: string,
  originalData: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('consultant_profiles')
    .update(originalData)
    .eq('user_id', userId);
  if (error) console.warn(`restoreProfile(${userId}) 실패:`, error.message);
}

/** 이메일 알림 설정 복원 */
export async function restoreEmailNotify(
  userId: string,
  originalValue: boolean,
) {
  const { error } = await supabase
    .from('profiles')
    .update({ email_notify: originalValue })
    .eq('id', userId);
  if (error)
    console.warn(`restoreEmailNotify(${userId}) 실패:`, error.message);
}

/** 로드맵 공유 상태 복원 */
export async function restoreShareStatus(
  roadmapId: string,
  originalValue: boolean,
) {
  const { error } = await supabase
    .from('roadmap_versions')
    .update({ is_shared: originalValue })
    .eq('id', roadmapId);
  if (error)
    console.warn(`restoreShareStatus(${roadmapId}) 실패:`, error.message);
}
```

**Step 2: 커밋**

```bash
git add e2e/helpers/cleanup.helper.ts
git commit -m "chore: E2E Cleanup Helper 생성 (Supabase Admin API)"
```

---

### Task 0-9: package.json 스크립트 추가

**Files:**
- Modify: `package.json`

**Step 1: scripts 섹션에 추가**

`package.json`의 `"scripts"` 블록에 다음 4개를 추가:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:headed": "playwright test --headed",
"test:e2e:report": "playwright show-report"
```

**Step 2: Playwright 브라우저 설치**

```bash
npx playwright install chromium
```

Expected: Chromium 다운로드 완료

**Step 3: 커밋**

```bash
git add package.json
git commit -m "chore: E2E 테스트 npm 스크립트 추가"
```

---

### Task 0-10: 인프라 통합 검증

**Step 1: 개발 서버 실행 확인**

```bash
npm run dev
# 별도 터미널에서:
npx playwright test --list
```

Expected: "no tests found" (spec 파일 없지만 config 로딩 성공)

**Step 2: Global Setup 실행 확인**

```bash
npx playwright test --global-setup e2e/global-setup.ts --list
```

Expected: `.auth/ops-admin.json`과 `.auth/consultant.json` 생성 확인

```bash
ls -la .auth/
```

Expected: 두 파일 존재, 크기 > 0

**Step 3: 인프라 완료 기록**

설계서 `docs/plans/2026-02-13-e2e-test-design.md`의 진행 추적표에서 Session 0을 "완료"로 업데이트

---

## Session 1: public/ + auth/ (5개 파일)

> **참조:** TEST_PLAN.md Phase 1.1~1.5
> **인증 필요:** 없음 (비로그인 테스트) — `base.test` 사용, fixture 불필요
> **파괴적 액션:** 없음

### Task 1-1: landing.spec.ts

**Files:**
- Create: `e2e/public/landing.spec.ts`
- Test: `npx playwright test e2e/public/landing.spec.ts`

**Step 1: 테스트 작성**

```typescript
// e2e/public/landing.spec.ts
// TEST_PLAN Phase 1.1: 랜딩 페이지
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('Phase 1.1: 랜딩 페이지 (/)', () => {
  test('페이지 정상 로딩 + 콘솔 에러 없음', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/');
    await expect(page).toHaveTitle(/KPC|AI|로드맵/);
    expect(getErrors()).toEqual([]);
  });

  test('"로그인" 링크 → /login 이동', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '로그인' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('"회원가입" 링크 → /register 이동', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '회원가입' }).click();
    await expect(page).toHaveURL('/register');
  });

  test('Hero CTA "서비스 이용하기" → /register 이동', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /서비스 이용하기/ }).click();
    await expect(page).toHaveURL('/register');
  });

  test('페이지 스크롤하며 각 섹션 표시 확인', async ({ page }) => {
    await page.goto('/');
    // 주요 섹션들이 DOM에 존재하는지 확인
    // 실제 섹션 텍스트는 구현 시 조정
    await expect(page.locator('section').first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
  });

  test('KPC 외부 링크 존재 확인', async ({ page }) => {
    await page.goto('/');
    const kpcLink = page.locator('a[href="https://www.kpc.or.kr/"]');
    await expect(kpcLink).toHaveCount(1);
  });
});
```

**Step 2: 테스트 실행**

```bash
npx playwright test e2e/public/landing.spec.ts --headed
```

Expected: 모든 테스트 PASS

**Step 3: 커밋**

```bash
git add e2e/public/landing.spec.ts
git commit -m "test: E2E 랜딩 페이지 테스트 (Phase 1.1)"
```

---

### Task 1-2: demo.spec.ts

**Files:**
- Create: `e2e/public/demo.spec.ts`
- Test: `npx playwright test e2e/public/demo.spec.ts`

**Step 1: 테스트 작성**

```typescript
// e2e/public/demo.spec.ts
// TEST_PLAN Phase 1.2: 데모 페이지
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('Phase 1.2: 데모 페이지 (/demo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo');
  });

  test('페이지 정상 로딩 + 콘솔 에러 없음', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/demo'); // beforeEach 이후 에러 체크용 재로딩
    await expect(page.getByText('KPC AI 로드맵')).toBeVisible();
    expect(getErrors()).toEqual([]);
  });

  test('"데모 화면" 배지 표시', async ({ page }) => {
    await expect(page.getByText('데모 화면')).toBeVisible();
  });

  test('"로그인" 버튼 → /login 이동', async ({ page }) => {
    await page.getByRole('link', { name: '로그인' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('"회원가입" 버튼 → /register 이동', async ({ page }) => {
    await page.getByRole('link', { name: '회원가입' }).click();
    await expect(page).toHaveURL('/register');
  });

  test('샘플 데이터 경고 배너 표시', async ({ page }) => {
    await expect(
      page.getByText(/실제 AI 생성 결과가 아닌 샘플 데이터/),
    ).toBeVisible();
  });

  test('기업 정보 카드 — (주)샘플제조 표시', async ({ page }) => {
    await expect(page.getByText('(주)샘플제조')).toBeVisible();
  });

  test('로드맵 탭 3개 전환', async ({ page }) => {
    // 과정 체계도
    await page.getByRole('tab', { name: /과정 체계도/ }).click();
    await expect(
      page.getByRole('tab', { name: /과정 체계도/ }),
    ).toHaveAttribute('data-state', 'active');

    // PBL 과정
    await page.getByRole('tab', { name: /PBL/ }).click();
    await expect(
      page.getByRole('tab', { name: /PBL/ }),
    ).toHaveAttribute('data-state', 'active');

    // 과정 상세
    await page.getByRole('tab', { name: /과정 상세/ }).click();
    await expect(
      page.getByRole('tab', { name: /과정 상세/ }),
    ).toHaveAttribute('data-state', 'active');
  });

  test('"지금 시작하기" CTA → /register 이동', async ({ page }) => {
    // 하단 CTA
    const cta = page.getByRole('link', { name: /지금 시작하기|시작하기/ }).last();
    await cta.click();
    await expect(page).toHaveURL('/register');
  });
});
```

**Step 2: 테스트 실행**

```bash
npx playwright test e2e/public/demo.spec.ts --headed
```

Expected: 모든 테스트 PASS

**Step 3: 커밋**

```bash
git add e2e/public/demo.spec.ts
git commit -m "test: E2E 데모 페이지 테스트 (Phase 1.2)"
```

---

### Task 1-3: login.spec.ts

**Files:**
- Create: `e2e/auth/login.spec.ts`
- Test: `npx playwright test e2e/auth/login.spec.ts`

**Step 1: 테스트 작성**

```typescript
// e2e/auth/login.spec.ts
// TEST_PLAN Phase 1.3: 로그인 검증
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck, expectToast } from '../helpers/assertions.helper';

test.describe('Phase 1.3: 로그인 페이지 (/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('페이지 정상 로딩 + 콘솔 에러 없음', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/login');
    await expect(page.locator('[name="email"]')).toBeVisible();
    expect(getErrors()).toEqual([]);
  });

  test('빈 폼 제출 → HTML5 required 유효성 검사', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    // HTML5 required는 폼 제출을 막음 — URL 변경 없음
    await expect(page).toHaveURL('/login');
  });

  test('이메일만 입력 후 제출 → 비밀번호 required', async ({ page }) => {
    await page.locator('[name="email"]').fill('test@example.com');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/login');
  });

  test('비밀번호만 입력 후 제출 → 이메일 required', async ({ page }) => {
    await page.locator('[name="password"]').fill('test1234');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/login');
  });

  test('잘못된 이메일 형식 → typeMismatch', async ({ page }) => {
    await page.locator('[name="email"]').fill('abc');
    await page.locator('[name="password"]').fill('test1234');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/login');
  });

  test('존재하지 않는 계정 → 에러 메시지', async ({ page }) => {
    await page.locator('[name="email"]').fill('notexist@test.com');
    await page.locator('[name="password"]').fill('test1234');
    await page.locator('button[type="submit"]').click();
    // Alert 또는 토스트로 에러 표시
    await expect(
      page.getByText(/올바르지 않습니다|실패/),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('올바른 이메일 + 잘못된 비밀번호 → 에러 메시지', async ({ page }) => {
    await page.locator('[name="email"]').fill(process.env.E2E_OPS_ADMIN_EMAIL!);
    await page.locator('[name="password"]').fill('wrongpassword123');
    await page.locator('button[type="submit"]').click();
    await expect(
      page.getByText(/올바르지 않습니다|실패/),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('비밀번호 보기/숨기기 토글', async ({ page }) => {
    const pwInput = page.locator('[name="password"]');
    await expect(pwInput).toHaveAttribute('type', 'password');
    // 토글 버튼 클릭 (Eye 아이콘 버튼)
    await page.locator('[name="password"]').locator('..').getByRole('button').click();
    await expect(pwInput).toHaveAttribute('type', 'text');
    // 다시 클릭
    await page.locator('[name="password"]').locator('..').getByRole('button').click();
    await expect(pwInput).toHaveAttribute('type', 'password');
  });

  test('"회원가입" 링크 → /register 이동', async ({ page }) => {
    await page.getByRole('link', { name: /회원가입/ }).click();
    await expect(page).toHaveURL('/register');
  });

  test('로딩 상태 "로그인 중..." 표시', async ({ page }) => {
    await page.locator('[name="email"]').fill(process.env.E2E_OPS_ADMIN_EMAIL!);
    await page.locator('[name="password"]').fill(process.env.E2E_OPS_ADMIN_PASSWORD!);
    await page.locator('button[type="submit"]').click();
    // 로딩 중 버튼 텍스트 변경 (빠르게 사라지므로 캡처 시도)
    // 성공하면 리다이렉트
    await expect(page).toHaveURL(/\/(ops|consultant|dashboard)/, { timeout: 15_000 });
  });
});
```

**Step 2: 테스트 실행**

```bash
npx playwright test e2e/auth/login.spec.ts --headed
```

Expected: 모든 테스트 PASS

> **주의:** "비밀번호 보기/숨기기 토글" 테스트의 셀렉터는 실제 DOM 구조에 따라 조정이 필요할 수 있습니다. 구현 시 `--headed` 모드에서 Playwright Inspector를 사용하여 정확한 셀렉터를 확인하세요.

**Step 3: 커밋**

```bash
git add e2e/auth/login.spec.ts
git commit -m "test: E2E 로그인 페이지 테스트 (Phase 1.3)"
```

---

### Task 1-4: register.spec.ts

**Files:**
- Create: `e2e/auth/register.spec.ts`
- Test: `npx playwright test e2e/auth/register.spec.ts`

**Step 1: 테스트 작성**

```typescript
// e2e/auth/register.spec.ts
// TEST_PLAN Phase 1.4: 회원가입 검증
// 참고: 실제 가입 완료는 데이터 오염 우려로 유효성 검사까지만 테스트
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('Phase 1.4: 회원가입 페이지 (/register)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('페이지 정상 로딩 + 2단계 스테퍼 표시', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/register');
    // 2단계 스테퍼 확인
    await expect(page.getByText(/기본 정보/)).toBeVisible();
    expect(getErrors()).toEqual([]);
  });

  test('가입 유형 선택 — 컨설턴트/운영관리자', async ({ page }) => {
    // 컨설턴트 카드 클릭
    await page.getByText(/컨설턴트/).first().click();
    const consultantRadio = page.locator('[name="registerTypeRadio"][value="CONSULTANT"]');
    await expect(consultantRadio).toBeChecked();

    // 운영관리자 카드 클릭
    await page.getByText(/운영관리자/).first().click();
    const opsRadio = page.locator('[name="registerTypeRadio"][value="OPS_ADMIN"]');
    await expect(opsRadio).toBeChecked();
    await expect(consultantRadio).not.toBeChecked();
  });

  test('빈 폼 "다음" 클릭 → HTML5 required 유효성 검사', async ({ page }) => {
    await page.getByRole('button', { name: /다음|가입 완료/ }).click();
    await expect(page).toHaveURL('/register');
  });

  test('이메일 형식 오류 → typeMismatch', async ({ page }) => {
    await page.locator('[name="email"]').fill('abc');
    await page.locator('[name="name"]').fill('테스트');
    await page.locator('[name="password"]').fill('Test1234');
    await page.locator('[name="confirmPassword"]').fill('Test1234');
    await page.locator('[name="agreeToTerms"]').check();
    await page.getByRole('button', { name: /다음|가입 완료/ }).click();
    await expect(page).toHaveURL('/register');
  });

  test('비밀번호 8자 미만 → 커스텀 에러', async ({ page }) => {
    await page.locator('[name="email"]').fill('test-new@example.com');
    await page.locator('[name="name"]').fill('테스트');
    await page.locator('[name="password"]').fill('Ab1');
    await page.locator('[name="confirmPassword"]').fill('Ab1');
    await page.locator('[name="agreeToTerms"]').check();
    await page.getByRole('button', { name: /다음|가입 완료/ }).click();
    await expect(page.getByText(/최소 8자/)).toBeVisible();
  });

  test('비밀번호 영문만 (숫자 없음) → 커스텀 에러', async ({ page }) => {
    await page.locator('[name="email"]').fill('test-new@example.com');
    await page.locator('[name="name"]').fill('테스트');
    await page.locator('[name="password"]').fill('abcdefgh');
    await page.locator('[name="confirmPassword"]').fill('abcdefgh');
    await page.locator('[name="agreeToTerms"]').check();
    await page.getByRole('button', { name: /다음|가입 완료/ }).click();
    await expect(page.getByText(/숫자가 포함/)).toBeVisible();
  });

  test('비밀번호 확인 불일치 → 에러', async ({ page }) => {
    await page.locator('[name="email"]').fill('test-new@example.com');
    await page.locator('[name="name"]').fill('테스트');
    await page.locator('[name="password"]').fill('Test1234');
    await page.locator('[name="confirmPassword"]').fill('Different1234');
    await page.locator('[name="agreeToTerms"]').check();
    await page.getByRole('button', { name: /다음|가입 완료/ }).click();
    await expect(page.getByText(/일치하지 않습니다/)).toBeVisible();
  });

  test('이미 존재하는 이메일 → 에러', async ({ page }) => {
    await page.locator('[name="email"]').fill(process.env.E2E_OPS_ADMIN_EMAIL!);
    await page.locator('[name="name"]').fill('테스트');
    await page.locator('[name="password"]').fill('Test1234');
    await page.locator('[name="confirmPassword"]').fill('Test1234');
    await page.locator('[name="agreeToTerms"]').check();
    await page.getByRole('button', { name: /다음|가입 완료/ }).click();
    await expect(page.getByText(/이미 등록된 이메일/)).toBeVisible({ timeout: 10_000 });
  });

  test('"로그인" 링크 → /login 이동', async ({ page }) => {
    await page.getByRole('link', { name: /로그인/ }).click();
    await expect(page).toHaveURL('/login');
  });
});
```

**Step 2: 테스트 실행**

```bash
npx playwright test e2e/auth/register.spec.ts --headed
```

Expected: 모든 테스트 PASS

**Step 3: 커밋**

```bash
git add e2e/auth/register.spec.ts
git commit -m "test: E2E 회원가입 페이지 테스트 (Phase 1.4)"
```

---

### Task 1-5: protected-routes.spec.ts

**Files:**
- Create: `e2e/auth/protected-routes.spec.ts`
- Test: `npx playwright test e2e/auth/protected-routes.spec.ts`

**Step 1: 테스트 작성**

```typescript
// e2e/auth/protected-routes.spec.ts
// TEST_PLAN Phase 1.5: 보호 경로 접근 제어
import { test, expect } from '@playwright/test';

test.describe('Phase 1.5: 보호 경로 — 비인증 접근 시 리다이렉트', () => {
  // 비로그인 상태에서 보호 경로 접근 → /login으로 리다이렉트
  const protectedPaths = [
    { path: '/dashboard', expectedRedirect: '/login?redirect=%2Fdashboard' },
    { path: '/consultant/home', expectedRedirect: '/login?redirect=%2Fconsultant%2Fhome' },
    { path: '/ops/projects', expectedRedirect: '/login?redirect=%2Fops%2Fprojects' },
    { path: '/gallery', expectedRedirect: '/login' },
    { path: '/dashboard/messages', expectedRedirect: '/login?redirect=%2Fdashboard%2Fmessages' },
  ];

  for (const { path, expectedRedirect } of protectedPaths) {
    test(`${path} → /login 리다이렉트`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(expectedRedirect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
  }
});
```

**Step 2: 테스트 실행**

```bash
npx playwright test e2e/auth/protected-routes.spec.ts
```

Expected: 모든 테스트 PASS

**Step 3: Session 1 전체 실행**

```bash
npx playwright test e2e/public e2e/auth
```

Expected: 모든 테스트 PASS

**Step 4: 커밋**

```bash
git add e2e/auth/protected-routes.spec.ts
git commit -m "test: E2E 보호 경로 접근 제어 테스트 (Phase 1.5)"
```

---

## Session 2: ops/navigation + ops/projects (2개 파일)

> **참조:** TEST_PLAN.md Phase 2.0~2.8, 2.20
> **인증:** `opsPage` fixture 사용
> **파괴적 액션:** 프로젝트 생성 → `deleteProject()` 복원

### Task 2-1: ops/navigation.spec.ts

**Files:**
- Create: `e2e/ops/navigation.spec.ts`
- Test: `npx playwright test e2e/ops/navigation.spec.ts`

**테스트 케이스 목록 (Phase 2.0~2.3, 2.20):**

```typescript
// e2e/ops/navigation.spec.ts
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { clickUserMenu } from '../helpers/navigation.helper';

test.describe('Phase 2.0: 관리자 로그인', () => {
  test('로그인 성공 → /ops/projects 리다이렉트', async ({ opsPage: page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/ops\/projects/);
  });
});

test.describe('Phase 2.1: 관리자 네비게이션', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
  });

  test('로고 표시 확인', async ({ opsPage: page }) => {
    await expect(page.locator('nav').getByRole('link').first()).toBeVisible();
  });

  test('워크스페이스 드롭다운 — 프로젝트 관리', async ({ opsPage: page }) => {
    // 워크스페이스 그룹 드롭다운 클릭 → 프로젝트 관리
    // 실제 구현 시 드롭다운 트리거 텍스트에 맞게 조정
    await page.getByRole('link', { name: /프로젝트 관리/ }).click();
    await expect(page).toHaveURL('/ops/projects');
  });

  test('운영관리 드롭다운 — 사용자 관리, 감사로그, 쿼터 관리', async ({ opsPage: page }) => {
    // 사용자 관리
    // 드롭다운 열기 → 메뉴 항목 클릭
    // 실제 셀렉터는 구현 시 Playwright Inspector로 확인
  });

  test('라이브러리 — 자가진단 템플릿, 로드맵 갤러리', async ({ opsPage: page }) => {
    // 템플릿
    // 갤러리
  });

  test('메시지 아이콘 + 안읽음 배지', async ({ opsPage: page }) => {
    await expect(page.getByRole('link', { name: /메시지/ })).toBeVisible();
  });

  test('메시지 아이콘 클릭 → /dashboard/messages', async ({ opsPage: page }) => {
    await page.getByRole('link', { name: /메시지/ }).click();
    await expect(page).toHaveURL('/dashboard/messages');
  });

  test('사용자 드롭다운 — 이름, 이메일, 역할 배지', async ({ opsPage: page }) => {
    // 사용자 드롭다운 열기
    // 이름, 이메일, 역할 표시 확인
  });

  test('사용자 드롭다운 → 계정 설정', async ({ opsPage: page }) => {
    await clickUserMenu(page, '계정 설정');
    await expect(page).toHaveURL('/dashboard/settings');
  });
});

test.describe('Phase 2.2: 알림 벨', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
  });

  test('벨 아이콘 클릭 → 팝오버 열림', async ({ opsPage: page }) => {
    await page.locator('button[aria-label*="알림"]').click();
    await expect(page.getByText('알림')).toBeVisible();
  });

  test('4개 탭 (전체/인터뷰/초안/확정) 표시', async ({ opsPage: page }) => {
    await page.locator('button[aria-label*="알림"]').click();
    // 탭 확인 — 관리자만 탭 있음
  });

  test('팝오버 바깥 클릭 → 닫힘', async ({ opsPage: page }) => {
    await page.locator('button[aria-label*="알림"]').click();
    await expect(page.getByText('알림')).toBeVisible();
    await page.keyboard.press('Escape');
    // 팝오버 사라짐 확인
  });
});

test.describe('Phase 2.3: 대시보드 리다이렉트', () => {
  test('/dashboard → /ops/projects 리다이렉트', async ({ opsPage: page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/ops\/projects/);
  });
});

test.describe('Phase 2.20: 관리자 로그아웃', () => {
  test('로그아웃 → /login 이동 + 세션 정리', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await clickUserMenu(page, '로그아웃');
    await expect(page).toHaveURL('/login');
    // 세션 정리 확인
    await page.goto('/ops/projects');
    await expect(page).toHaveURL(/\/login/);
  });
});
```

> **구현 시 참고:** 위 코드는 골격입니다. 각 테스트의 빈 부분은 구현 시 `--headed` 모드와 Playwright Inspector(`npx playwright test --debug`)로 정확한 셀렉터를 확인하며 채워야 합니다.

**Step 2: 테스트 실행**

```bash
npx playwright test e2e/ops/navigation.spec.ts --headed
```

**Step 3: 커밋**

```bash
git add e2e/ops/navigation.spec.ts
git commit -m "test: E2E 관리자 네비게이션 테스트 (Phase 2.0~2.3, 2.20)"
```

---

### Task 2-2: ops/projects.spec.ts

**Files:**
- Create: `e2e/ops/projects.spec.ts`
- Test: `npx playwright test e2e/ops/projects.spec.ts`

**테스트 케이스 목록 (Phase 2.4~2.8):**

```typescript
// e2e/ops/projects.spec.ts
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck, expectToast } from '../helpers/assertions.helper';
import { switchTab } from '../helpers/navigation.helper';
import { deleteProject } from '../helpers/cleanup.helper';

test.describe.configure({ mode: 'serial' });

// 테스트 중 생성된 프로젝트 ID를 추적
let createdProjectId: string | null = null;

test.afterAll(async () => {
  // 파괴적 액션 복원: 생성된 프로젝트 삭제
  if (createdProjectId) {
    await deleteProject(createdProjectId);
  }
});

test.describe('Phase 2.4: 프로젝트 목록', () => {
  test('페이지 로딩 + 콘솔 에러 없음', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/ops/projects');
    await expect(page.getByText('프로젝트 관리')).toBeVisible();
    expect(getErrors()).toEqual([]);
  });

  test('통계 요약 카드 7개 표시', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    // 전체/신규/진단/배정/인터뷰/초안/확정 7개 카드
    // 카드 클릭 시 필터 적용
  });

  test('검색 필터 — 회사명 입력', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.getByPlaceholder(/회사명|이메일|검색/).fill('유한정밀');
    // 디바운스 대기
    await page.waitForTimeout(500);
    // 필터된 결과 확인
    await expect(page.getByText('유한정밀')).toBeVisible();
  });

  test('상태 드롭다운 필터', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    // 상태 Select 열기 → 특정 상태 선택
  });

  test('업종 드롭다운 필터', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    // 업종 Select 열기 → 특정 업종 선택
  });

  test('필터 초기화', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    // 필터 적용 → 초기화 버튼 클릭 → 전체 복원
  });

  test('테이블 컬럼 표시', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await expect(page.getByText('기업명')).toBeVisible();
    await expect(page.getByText('업종')).toBeVisible();
    await expect(page.getByText('진행 상태')).toBeVisible();
    await expect(page.getByText('담당 컨설턴트')).toBeVisible();
  });

  test('"상세보기" 클릭 → 프로젝트 상세 이동', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.getByRole('link', { name: '상세보기' }).first().click();
    await expect(page).toHaveURL(/\/ops\/projects\/[a-f0-9-]+/);
  });

  test('페이지네이션 동작', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    // 2페이지 이동 → 데이터 변경 확인
  });

  test('"새 프로젝트 생성" 버튼 → /ops/projects/new', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.getByRole('link', { name: /새 프로젝트 생성/ }).click();
    await expect(page).toHaveURL('/ops/projects/new');
  });

  test('탭 전환 — 프로젝트 목록 / 진행 현황 대시보드', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await switchTab(page, '진행 현황 대시보드');
    await switchTab(page, '프로젝트 목록');
  });
});

test.describe('Phase 2.5: 프로젝트 생성', () => {
  test('빈 폼 제출 → required 검사', async ({ opsPage: page }) => {
    await page.goto('/ops/projects/new');
    await page.getByRole('button', { name: /프로젝트 생성/ }).click();
    await expect(page).toHaveURL('/ops/projects/new');
  });

  test('정상 생성 → 성공 토스트 + 리다이렉트', async ({ opsPage: page }) => {
    await page.goto('/ops/projects/new');

    // 필수 필드 입력
    await page.locator('[name="companyName"]').fill('E2E테스트기업');
    // 기업 규모 Select
    // 업종 Select
    // 담당자명, 이메일
    await page.locator('[name="contactName"]').fill('테스트담당자');
    await page.locator('[name="contactEmail"]').fill('e2e-test@example.com');

    await page.getByRole('button', { name: /프로젝트 생성/ }).click();

    // 성공 토스트
    await expectToast(page, '프로젝트가 성공적으로 생성되었습니다');

    // 리다이렉트된 URL에서 프로젝트 ID 추출
    await expect(page).toHaveURL(/\/ops\/projects\/[a-f0-9-]+/);
    const url = page.url();
    createdProjectId = url.split('/ops/projects/')[1]?.split('?')[0] ?? null;
  });
});

test.describe('Phase 2.6: 프로젝트 상세 (기존)', () => {
  test('기업 정보 표시', async ({ opsPage: page }) => {
    // 기존 프로젝트의 상세 페이지 접근
    await page.goto('/ops/projects');
    await page.getByRole('link', { name: '상세보기' }).first().click();
    // 기업명, 업종, 규모, 담당자 확인
  });

  test('뒤로가기 링크 → /ops/projects', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.getByRole('link', { name: '상세보기' }).first().click();
    await page.getByRole('link', { name: /프로젝트 목록/ }).click();
    await expect(page).toHaveURL('/ops/projects');
  });
});

test.describe('Phase 2.7: 자가진단 + 매칭 (새 프로젝트)', () => {
  test('자가진단 폼 표시 + 30문항 입력 + 제출', async ({ opsPage: page }) => {
    // 새로 생성한 프로젝트의 자가진단 폼
    if (!createdProjectId) test.skip();
    await page.goto(`/ops/projects/${createdProjectId}`);

    // 30문항 "보통이다" (3점) 선택
    // 스텝 5개를 순차 진행
    // 실제 구현 시 라디오 버튼 셀렉터 확인 필요
  });

  test('DIAGNOSED 상태 전환 확인', async ({ opsPage: page }) => {
    if (!createdProjectId) test.skip();
    await page.goto(`/ops/projects/${createdProjectId}`);
    await expect(page.getByText(/진단결과 입력 완료/)).toBeVisible();
  });

  test('AI 매칭 버튼 존재 확인 (실행 skip — LLM)', async ({ opsPage: page }) => {
    if (!createdProjectId) test.skip();
    await page.goto(`/ops/projects/${createdProjectId}`);
    // 매칭 버튼 존재 확인만 (클릭하지 않음)
    // 실제 매칭은 LLM 호출이 필요하므로 skip
  });
});

test.describe('Phase 2.8: 로드맵 OPS 뷰', () => {
  test('로드맵 페이지 로딩 + 탭 전환', async ({ opsPage: page }) => {
    // 로드맵이 존재하는 프로젝트에서 테스트
    // /ops/projects/{id}/roadmap
    // 버전 히스토리, 탭 전환, 다운로드 버튼 확인
  });
});
```

> **구현 시 참고:** Select 컴포넌트(Radix)는 `getByRole('combobox')` + `getByRole('option', { name: '...' })` 패턴으로 조작합니다. 정확한 셀렉터는 `--debug` 모드에서 확인하세요.

**Step 2: 테스트 실행**

```bash
npx playwright test e2e/ops/projects.spec.ts --headed
```

**Step 3: 커밋**

```bash
git add e2e/ops/projects.spec.ts
git commit -m "test: E2E 관리자 프로젝트 테스트 (Phase 2.4~2.8)"
```

---

## Session 3: ops/users + templates + audit-quota (3개 파일)

> **참조:** TEST_PLAN.md Phase 2.9~2.14
> **인증:** `opsPage` fixture
> **파괴적 액션:** 사용자 상태 변경 → `restoreUserStatus()`, 템플릿 복제 → `deleteTemplate()`

### Task 3-1: ops/users.spec.ts

**Files:** `e2e/ops/users.spec.ts`

**테스트 케이스 (Phase 2.9):**
- 테이블 컬럼 표시 (사용자, 역할, 상태, 프로필, 가입일, 작업)
- 역할/상태 배지 표시
- 사용자 승인 (PENDING → ACTIVE) — 파괴적, `restoreUserStatus()`로 복원
- 사용자 정지 (ACTIVE → SUSPENDED) — 파괴적, `restoreUserStatus()`로 복원
- 사용자 재활성화 (SUSPENDED → ACTIVE)
- 프로필 상세 모달 열기/닫기 (기본정보, 전문분야, 역량 태그 등)
- 모달 Escape/외부 클릭으로 닫기

**핵심 셀렉터:**
```typescript
// 승인 버튼
page.getByRole('button', { name: '승인' })
// 정지 버튼
page.getByRole('button', { name: '정지' })
// 활성화 버튼
page.getByRole('button', { name: '활성화' })
// 프로필 보기 링크
page.getByRole('link', { name: '프로필 보기' })
// 모달
page.locator('[data-slot="dialog-content"]')
```

---

### Task 3-2: ops/templates.spec.ts

**Files:** `e2e/ops/templates.spec.ts`

**테스트 케이스 (Phase 2.10~2.12):**
- 목록 테이블 (버전, 이름, 문항 수, 사용 현황, 상태, 생성일, 작업)
- 템플릿 이름 클릭 → 상세 이동
- "복제" 버튼 클릭 → 복제 성공 — 파괴적, `deleteTemplate()`로 복원
- 새 템플릿 생성 페이지 (폼 필드 확인)
- 템플릿 상세/수정 페이지 (기존 데이터 로딩, 질문 편집)

---

### Task 3-3: ops/audit-quota.spec.ts

**Files:** `e2e/ops/audit-quota.spec.ts`

**테스트 케이스 (Phase 2.13~2.14):**

**감사로그:**
- 필터 바 (검색, 액션, 대상, 사용자, 날짜)
- 총 건수 표시
- 다운로드 버튼
- 테이블 6개 컬럼
- 페이지네이션

**쿼터 관리:**
- 조회 월 드롭다운
- 테이블 (사용자, 역할, 월간 사용량, 일일/월간 한도, 한도 설정)
- 한도 설정 "수정" → 편집 모드 → "취소"

---

## Session 4: consultant/navigation + home + profile (3개 파일)

> **참조:** TEST_PLAN.md Phase 3.0~3.5, 3.16
> **인증:** `consultantPage` fixture
> **파괴적 액션:** 프로필 수정 → `restoreProfile()` 복원

### Task 4-1: consultant/navigation.spec.ts

**Phase 3.0~3.3, 3.16:**
- 로그인 리다이렉트 확인 (/consultant/projects)
- 플랫 메뉴 4개 (대시보드, 담당 프로젝트, 테스트 로드맵, 로드맵 갤러리)
- OPS 메뉴 미표시 확인
- 메시지 아이콘 + 안읽음 배지
- 알림 벨 (탭 미표시 확인 — 컨설턴트)
- 사용자 드롭다운 (프로필 관리, 계정 설정, 로그아웃)
- 로그아웃 → /login + 세션 정리

---

### Task 4-2: consultant/home.spec.ts

**Phase 3.4:**
- 요약 카드 (전체, 인터뷰 대기, 로드맵 작성 중, 완료)
- 상태 분포 파이차트 (Recharts SVG 존재 확인)
- 최근 프로젝트 목록 + 클릭 → 상세 이동
- 최근 활동 로그 표시
- "전체 보기" → /consultant/projects

---

### Task 4-3: consultant/profile.spec.ts

**Phase 3.5:**
- ProfileForm 필드 확인 (소속, 산업, 업무, 수준, 방식, 역량, 경력 등)
- 기존 값 로딩 확인
- 저장 버튼 비활성화 (필수 미선택 시)
- 수정 + 저장 → `restoreProfile()`로 복원
- 취소 → /consultant/projects 이동

---

## Session 5: consultant/projects + interview + roadmap + access-control (4개 파일)

> **참조:** TEST_PLAN.md Phase 3.6~3.9, 3.15
> **인증:** `consultantPage` fixture
> **파괴적 액션:** 활동일지 CRUD → `deleteActivityLog()`, 공유 토글 → `restoreShareStatus()`
> **LLM skip:** 인터뷰 가이드, "분석 재생성", STT 업로드, 로드맵 새 버전

### Task 5-1: consultant/projects.spec.ts

**Phase 3.6~3.7:**
- 필터/검색, 상태 드롭다운
- 테이블 (기업명, 업종, 규모, 상태, 배정일, 작업)
- 자신의 담당 프로젝트만 표시
- 프로젝트 상세: 기업 정보 탭, 사전 분석 탭, 활동 일지 탭
- 활동 일지 생성/수정/삭제 — `deleteActivityLog()`로 복원
- "분석 재생성" 버튼 존재만 확인 (클릭 금지 — LLM)

---

### Task 5-2: consultant/interview.spec.ts

**Phase 3.8:**
- 6단계 스테퍼 표시
- 각 단계 필드 확인 (날짜, 참석자, 시스템/AI, 업무, 페인포인트, 목표/제약)
- 스텝 이동 (다음/이전/인디케이터 클릭)
- 6단계 확인 — 각 "수정" 버튼 → 해당 스텝 이동
- STT 파일 업로드 UI 존재만 확인 (실제 업로드 skip — LLM)
- 자동 저장 상태 표시

---

### Task 5-3: consultant/roadmap.spec.ts

**Phase 3.9:**
- 버전 히스토리 표시
- 탭 전환 (과정 체계도, PBL, 과정 상세)
- 수동 편집 버튼 존재 확인
- "새 버전 생성" 버튼 존재만 확인 (click skip — LLM)
- 최종 확정 — **읽기 전용으로만 테스트** (확정 실행하지 않음)
- 다운로드 (PDF/Excel) 버튼 존재 확인
- 공유 토글 — `restoreShareStatus()`로 복원

---

### Task 5-4: consultant/access-control.spec.ts

**Phase 3.15:**
```typescript
// e2e/consultant/access-control.spec.ts
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Phase 3.15: 컨설턴트 접근 제어', () => {
  const blockedPaths = [
    { path: '/ops/projects', expectedRedirect: '/consultant/projects' },
    { path: '/ops/users', expectedRedirect: '/consultant/projects' },
    { path: '/ops/templates', expectedRedirect: '/consultant/projects' },
    { path: '/ops/audit', expectedRedirect: '/dashboard' },
    { path: '/ops/quota', expectedRedirect: '/dashboard' },
  ];

  for (const { path, expectedRedirect } of blockedPaths) {
    test(`${path} → ${expectedRedirect} 리다이렉트`, async ({ consultantPage: page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(expectedRedirect));
    });
  }
});
```

---

## Session 6: shared/ (4개 파일)

> **참조:** TEST_PLAN.md Phase 2.15~2.19, 3.10~3.14
> **인증:** `opsPage` + `consultantPage` 모두 사용
> **파괴적 액션:** 좋아요 토글 (UI 복원), 이메일 토글 → `restoreEmailNotify()`

### Task 6-1: shared/gallery.spec.ts

**Phase 2.17~2.18, 3.12~3.13:**
- 필터/검색 (업종, 정렬)
- 관리자 전용 필터 3개 (ops만 표시, consultant 미표시 확인)
- 카드 그리드 표시
- 카드 클릭 → /gallery/{id}
- 좋아요 토글 (클릭 → 증가 → 다시 클릭 → 원복)
- 갤러리 상세: 탭 3개, 뒤로가기, 좋아요
- 컨설턴트: "이 로드맵 사용하기" 다이얼로그

---

### Task 6-2: shared/messages.spec.ts

**Phase 2.15, 3.10:**
- 대화 목록 (아바타, 이름, 역할, 마지막 메시지)
- 대화 클릭 → 스레드 표시
- 메시지 전송 (Ctrl+Enter)
- 크로스 확인: ops → consultant 메시지 수신 확인
- 안읽음 배지 "존재 여부"로만 검증 (정확한 숫자 아님)

---

### Task 6-3: shared/settings.spec.ts

**Phase 2.16, 3.11:**
- 이메일 알림 토글 (양 역할)
- 비밀번호 변경 폼 구조 (실제 변경 skip)
- 계정 삭제 섹션 표시 (실제 삭제 skip)
- 뒤로가기 링크

---

### Task 6-4: shared/test-roadmap.spec.ts

**Phase 2.19, 3.14:**
- 6단계 스테퍼 표시 (양 역할)
- 1단계 필드 입력 (회사명, 업종, 규모)
- 2~5단계 진행 (다음/이전/인디케이터)
- 6단계 확인 (입력 요약 표시)
- "테스트 로드맵 생성" 버튼 존재 확인만 (실행 skip — LLM)

---

## Session 7: cross/ + CI 설정

> **참조:** TEST_PLAN.md Phase 4.1~4.4
> **인증:** `opsPage` + `consultantPage`
> **파괴적 액션:** 없음

### Task 7-1: cross/cross-feature.spec.ts

**Phase 4.1, 4.3, 4.4:**
- 메시지 양방향 확인 (관리자 → 컨설턴트 → 관리자)
- 프로젝트 배정 반영 확인
- 갤러리 공유 반영 확인
- 브라우저 뒤로가기/앞으로가기 정상 동작
- 페이지 새로고침 → 데이터 유지
- 최종 로그아웃 → 세션 정리

---

### Task 7-2: cross/edge-cases.spec.ts

**Phase 4.2:**
```typescript
// e2e/cross/edge-cases.spec.ts
import { test, expect } from '../fixtures/auth.fixture';

test.describe('Phase 4.2: URL 직접 입력 — 404 처리', () => {
  const invalidIds = [
    '/ops/projects/00000000-0000-0000-0000-000000000000',
    '/ops/templates/00000000-0000-0000-0000-000000000000',
    '/gallery/00000000-0000-0000-0000-000000000000',
  ];

  for (const path of invalidIds) {
    test(`${path} → 404`, async ({ opsPage: page }) => {
      await page.goto(path);
      await expect(page.getByText(/404|찾을 수 없|존재하지 않/)).toBeVisible();
    });
  }

  test('다른 컨설턴트의 프로젝트 → 접근 차단', async ({ consultantPage: page }) => {
    // 배정되지 않은 프로젝트 ID 사용
    await page.goto('/consultant/projects/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/404|찾을 수 없|존재하지 않/)).toBeVisible();
  });
});
```

---

### Task 7-3: CI 설정

**Files:**
- Create: `.github/workflows/e2e.yml`

**Step 1: GitHub Actions 워크플로우 생성**

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          E2E_OPS_ADMIN_EMAIL: ${{ secrets.E2E_OPS_ADMIN_EMAIL }}
          E2E_OPS_ADMIN_PASSWORD: ${{ secrets.E2E_OPS_ADMIN_PASSWORD }}
          E2E_CONSULTANT_EMAIL: ${{ secrets.E2E_CONSULTANT_EMAIL }}
          E2E_CONSULTANT_PASSWORD: ${{ secrets.E2E_CONSULTANT_PASSWORD }}

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

**Step 2: 커밋**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci: E2E 테스트 GitHub Actions 워크플로우 추가"
```

---

### Task 7-4: 전체 실행 검증

**Step 1: 전체 테스트 실행**

```bash
npx playwright test
```

Expected: 모든 21개 spec 파일 PASS

**Step 2: 리포트 확인**

```bash
npx playwright show-report
```

Expected: 브라우저에서 HTML 리포트 열림, 모든 테스트 녹색

**Step 3: 설계서 진행 추적표 업데이트**

`docs/plans/2026-02-13-e2e-test-design.md`의 Session 0~7 모두 "완료"로 업데이트

**Step 4: 최종 커밋**

```bash
git add docs/plans/2026-02-13-e2e-test-design.md
git commit -m "docs: E2E 테스트 전체 구현 완료 — 진행 추적표 업데이트"
```

---

## 구현 참고사항

### 셀렉터 디버깅 방법

구현 중 셀렉터가 동작하지 않을 때:

```bash
# Playwright Inspector 열기 (UI에서 셀렉터 확인)
npx playwright test e2e/ops/navigation.spec.ts --debug

# headed 모드로 실행 (브라우저 보면서)
npx playwright test e2e/ops/navigation.spec.ts --headed

# 특정 테스트만 실행
npx playwright test -g "프로젝트 목록"
```

### Radix Select 조작 패턴

Radix UI Select는 일반 `<select>`가 아니므로 특별한 조작이 필요합니다:

```typescript
// Select 열기
await page.getByRole('combobox').first().click();
// 옵션 선택 (Radix는 role="option" 사용)
await page.getByRole('option', { name: '제조업' }).click();
```

### data-slot 활용

shadcn/ui 컴포넌트는 `data-slot` 속성을 가집니다:

```typescript
// Dialog 내부 요소
page.locator('[data-slot="dialog-content"]')
page.locator('[data-slot="dialog-title"]')

// 특정 상태의 탭
page.locator('[data-slot="tabs-trigger"][data-state="active"]')
```

### 느린 네트워크 대응

Supabase 쿼리가 느릴 수 있으므로 적절한 timeout 설정:

```typescript
// 기본 타임아웃보다 긴 대기
await expect(page.getByText('프로젝트 관리')).toBeVisible({ timeout: 10_000 });

// 네트워크 안정화 대기
await page.waitForLoadState('networkidle');
```
