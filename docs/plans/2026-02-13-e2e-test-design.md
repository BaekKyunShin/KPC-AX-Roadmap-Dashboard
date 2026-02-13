# Playwright E2E 테스트 도입 설계서

> 작성일: 2026-02-13
> 목적: 기존 Puppeteer 수동 테스트를 Playwright 자동화 코드로 전환
> 접근법: 하이브리드 — 기능 단위 파일 구조 + TEST_PLAN.md 항목 매핑

---

## 목차

1. [목표 및 원칙](#1-목표-및-원칙)
2. [디렉터리 구조](#2-디렉터리-구조)
3. [TEST_PLAN.md 매핑표](#3-testplanmd-매핑표)
4. [Fixture 및 인증 전략](#4-fixture-및-인증-전략)
5. [파괴적 액션 복원 전략](#5-파괴적-액션-복원-전략)
6. [LLM 의존 테스트 처리](#6-llm-의존-테스트-처리)
7. [병렬 실행 및 격리 전략](#7-병렬-실행-및-격리-전략)
8. [Playwright 설정](#8-playwright-설정)
9. [CI 통합](#9-ci-통합)
10. [공통 헬퍼](#10-공통-헬퍼)
11. [세션별 구현 계획](#11-세션별-구현-계획)
12. [진행 추적표](#12-진행-추적표)

---

## 1. 목표 및 원칙

### 목표

1. **회귀 방지**: 코드 수정 후 `npx playwright test`로 전체 기능 검증
2. **CI 자동화**: PR 생성 / main 푸시 시 GitHub Actions에서 자동 실행
3. **전체 커버리지**: 기존 Puppeteer 테스트 전 항목 100% 전환

### 원칙

- **기존 TEST_PLAN.md와 1:1 매핑**: 모든 spec 파일에 해당 Phase/항목 번호를 주석으로 기록
- **독립적 실행**: 각 spec 파일은 독립적으로 실행 가능 (순서 의존 없음)
- **빠른 실행**: 세션 재사용으로 전체 테스트 5분 이내 목표
- **파괴적 액션 복원**: DB를 변경하는 테스트는 afterEach에서 API로 복원
- **LLM 호출 제외**: LLM 의존 테스트는 skip 처리, UI 존재만 검증

### 항목 수에 대한 참고

`docs/testing/TEST_PLAN.md`에는 개별 체크박스가 약 470개 있습니다. 이 중 밀접하게 연관된 하위 항목을 하나의 테스트 케이스로 그룹화하면 약 **285개 테스트 케이스**가 됩니다. 예를 들어 "이메일만 입력 후 제출 → 비밀번호 valueMissing 검사 확인"은 하나의 `test()`로 작성합니다. 구현 시 실제 test() 수는 TEST_PLAN의 논리적 시나리오 단위에 맞추되, 필요하면 세분화합니다.

---

## 2. 디렉터리 구조

```
e2e/
├── global-setup.ts              # 테스트 전 한 번: 로그인 → 세션 파일 저장
├── fixtures/
│   ├── auth.fixture.ts          # 역할별 로그인 상태 fixture (opsPage, consultantPage)
│   └── test-data.ts             # 테스트 URL, 공통 상수 (계정 정보는 환경 변수)
├── helpers/
│   ├── navigation.helper.ts     # 메뉴 클릭, 탭 전환, 뒤로가기
│   ├── assertions.helper.ts     # 콘솔 에러, 토스트, 빈 상태, 네비 활성 상태 확인
│   └── cleanup.helper.ts        # DB 복원용 Supabase Admin API 헬퍼
├── public/
│   ├── landing.spec.ts          # Phase 1.1: 랜딩 페이지
│   └── demo.spec.ts             # Phase 1.2: 데모 페이지
├── auth/
│   ├── login.spec.ts            # Phase 1.3: 로그인 검증
│   ├── register.spec.ts         # Phase 1.4: 회원가입 검증
│   └── protected-routes.spec.ts # Phase 1.5: 보호 경로 접근 제어
├── ops/
│   ├── navigation.spec.ts       # Phase 2.0~2.3, 2.20: 관리자 네비게이션, 알림벨, 로그아웃
│   ├── projects.spec.ts         # Phase 2.4~2.8: 프로젝트 목록/생성/상세/로드맵
│   ├── users.spec.ts            # Phase 2.9: 사용자 관리 (승인/정지/활성화/프로필)
│   ├── templates.spec.ts        # Phase 2.10~2.12: 템플릿 목록/생성/수정
│   └── audit-quota.spec.ts      # Phase 2.13~2.14: 감사로그, 쿼터 관리
├── consultant/
│   ├── navigation.spec.ts       # Phase 3.0~3.3, 3.16: 컨설턴트 네비게이션, 알림벨, 로그아웃
│   ├── home.spec.ts             # Phase 3.4: 컨설턴트 대시보드 (카드, 차트, 최근활동)
│   ├── profile.spec.ts          # Phase 3.5: 프로필 관리 (폼 필드, 수정, 복원)
│   ├── projects.spec.ts         # Phase 3.6~3.7: 프로젝트 목록/상세 (활동일지 CRUD)
│   ├── interview.spec.ts        # Phase 3.8: 인터뷰 입력 (6단계 스테퍼)
│   ├── roadmap.spec.ts          # Phase 3.9: 로드맵 뷰/편집/확정/공유/다운로드
│   └── access-control.spec.ts   # Phase 3.15: OPS 경로 접근 차단
├── shared/
│   ├── gallery.spec.ts          # Phase 2.17~2.18, 3.12~3.13: 갤러리 (양 역할)
│   ├── messages.spec.ts         # Phase 2.15, 3.10: 메시지 (양방향 통신)
│   ├── settings.spec.ts         # Phase 2.16, 3.11: 설정 (양 역할)
│   └── test-roadmap.spec.ts     # Phase 2.19, 3.14: 테스트 로드맵 (양 역할)
└── cross/
    ├── cross-feature.spec.ts    # Phase 4.1, 4.3, 4.4: 크로스 기능, 브라우저 히스토리, 로그아웃 정리
    └── edge-cases.spec.ts       # Phase 4.2: 존재하지 않는 ID → 404
```

**총 21개 spec 파일**

---

## 3. TEST_PLAN.md 매핑표

기존 `docs/testing/TEST_PLAN.md`의 각 항목이 어떤 spec 파일에 대응되는지 추적합니다.

| TEST_PLAN Phase | spec 파일 | 비고 |
|-----------------|-----------|------|
| 1.1 랜딩 페이지 | `public/landing.spec.ts` | |
| 1.2 데모 페이지 | `public/demo.spec.ts` | |
| 1.3 로그인 | `auth/login.spec.ts` | |
| 1.4 회원가입 | `auth/register.spec.ts` | 실제 가입은 스킵 |
| 1.5 보호 경로 | `auth/protected-routes.spec.ts` | |
| 2.0~2.3 관리자 로그인/네비/알림 | `ops/navigation.spec.ts` | |
| 2.4~2.8 프로젝트 | `ops/projects.spec.ts` | 파괴적: 생성→삭제 |
| 2.9 사용자 관리 | `ops/users.spec.ts` | 파괴적: 승인/정지→복원 |
| 2.10~2.12 템플릿 | `ops/templates.spec.ts` | 파괴적: 복제→삭제 |
| 2.13~2.14 감사/쿼터 | `ops/audit-quota.spec.ts` | |
| 2.15 메시지 (관리자) | `shared/messages.spec.ts` | |
| 2.16 설정 (관리자) | `shared/settings.spec.ts` | 파괴적: 알림 토글→복원 |
| 2.17~2.18 갤러리 (관리자) | `shared/gallery.spec.ts` | |
| 2.19 테스트 로드맵 (관리자) | `shared/test-roadmap.spec.ts` | LLM 생성 skip |
| 2.20 로그아웃 | `ops/navigation.spec.ts` | |
| 3.0~3.3 컨설턴트 로그인/네비/알림 | `consultant/navigation.spec.ts` | |
| 3.4 컨설턴트 홈 | `consultant/home.spec.ts` | |
| 3.5 프로필 | `consultant/profile.spec.ts` | 파괴적: 수정→복원 |
| 3.6~3.7 프로젝트 목록/상세 | `consultant/projects.spec.ts` | 파괴적: 활동일지 CRUD |
| 3.8 인터뷰 | `consultant/interview.spec.ts` | |
| 3.9 로드맵 | `consultant/roadmap.spec.ts` | 파괴적: 공유 토글→복원 |
| 3.10 메시지 (컨설턴트) | `shared/messages.spec.ts` | |
| 3.11 설정 (컨설턴트) | `shared/settings.spec.ts` | |
| 3.12~3.13 갤러리 (컨설턴트) | `shared/gallery.spec.ts` | |
| 3.14 테스트 로드맵 (컨설턴트) | `shared/test-roadmap.spec.ts` | |
| 3.15 접근 제어 | `consultant/access-control.spec.ts` | |
| 3.16 로그아웃 | `consultant/navigation.spec.ts` | |
| 4.1 크로스 기능 | `cross/cross-feature.spec.ts` | |
| 4.2 URL 직접 입력 | `cross/edge-cases.spec.ts` | |
| 4.3 브라우저 기능 | `cross/cross-feature.spec.ts` | |
| 4.4 로그아웃 후 정리 | `cross/cross-feature.spec.ts` | |
| 공통 검사 항목 | `assertions.helper.ts` | 모든 페이지에서 자동 적용 |

---

## 4. Fixture 및 인증 전략

### 테스트 계정 관리 (보안)

테스트 계정 정보는 **환경 변수**로 관리합니다. 소스코드에 비밀번호를 하드코딩하지 않습니다.

```bash
# .env.test (gitignore에 추가)
E2E_OPS_ADMIN_EMAIL=...
E2E_OPS_ADMIN_PASSWORD=...
E2E_CONSULTANT_EMAIL=...
E2E_CONSULTANT_PASSWORD=...
```

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
```

### Global Setup — 세션 파일 생성

테스트 실행 전에 **한 번만** 로그인하고, 세션(쿠키/토큰)을 파일로 저장합니다.

```typescript
// e2e/global-setup.ts
import { chromium } from '@playwright/test';
import { TEST_ACCOUNTS } from './fixtures/test-data';

const ACCOUNTS = [
  { file: '.auth/ops-admin.json', ...TEST_ACCOUNTS.opsAdmin },
  { file: '.auth/consultant.json', ...TEST_ACCOUNTS.consultant },
];

async function globalSetup() {
  const browser = await chromium.launch();

  for (const account of ACCOUNTS) {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/login');
    await page.fill('[name=email]', account.email);
    await page.fill('[name=password]', account.password);
    await page.click('button[type=submit]');
    await page.waitForURL(/\/(ops|consultant)/);
    await page.context().storageState({ path: account.file });
    await page.close();
  }

  await browser.close();
}

export default globalSetup;
```

### 세션 만료 대응

Supabase Auth의 기본 JWT 만료는 1시간입니다. 전체 테스트가 5분 이내 목표이므로 일반적으로 문제없지만, CI에서 재시도 등으로 길어지는 경우를 대비해 global-setup에서 **세션 만료 시간을 체크**하고, 만료되었으면 재로그인하는 로직을 추가합니다.

### Auth Fixture — 역할별 페이지 제공

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base, Page } from '@playwright/test';

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

### `.gitignore` 추가

```
.auth/
.env.test
```

---

## 5. 파괴적 액션 복원 전략

### 원칙

1. **읽기 전용 테스트는 복원 불필요** — 페이지 로딩, UI 확인, 필터 동작 등
2. **생성 → 삭제**: 프로젝트 생성, 템플릿 복제 등은 테스트 후 API로 삭제
3. **상태 변경 → 원복**: 사용자 승인/정지, 프로필 수정, 토글 변경 등은 원래 상태로 복원
4. **복원은 UI가 아니라 API로**: Supabase Admin Client를 사용해 직접 DB 조작

### Cleanup Helper

```typescript
// e2e/helpers/cleanup.helper.ts
import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client (RLS 우회)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function deleteProject(id: string) {
  await supabase.from('projects').delete().eq('id', id);
}

export async function restoreUserStatus(userId: string, originalStatus: string) {
  await supabase.from('profiles').update({ status: originalStatus }).eq('id', userId);
}

export async function deleteTemplate(id: string) {
  await supabase.from('assessment_templates').delete().eq('id', id);
}

export async function deleteActivityLog(id: string) {
  await supabase.from('activity_logs').delete().eq('id', id);
}

export async function restoreProfile(userId: string, originalData: object) {
  await supabase.from('consultant_profiles').update(originalData).eq('user_id', userId);
}

export async function restoreEmailNotify(userId: string, originalValue: boolean) {
  await supabase.from('profiles').update({ email_notify: originalValue }).eq('id', userId);
}

export async function restoreShareStatus(roadmapId: string, originalValue: boolean) {
  await supabase.from('roadmap_versions').update({ is_shared: originalValue }).eq('id', roadmapId);
}
```

### 복원 대상 목록

| spec 파일 | 파괴적 액션 | 복원 방법 |
|-----------|-----------|----------|
| `ops/projects.spec.ts` | 프로젝트 생성 | `deleteProject(id)` |
| `ops/projects.spec.ts` | 자가진단 제출 | 프로젝트 삭제로 자동 제거 |
| `ops/projects.spec.ts` | 컨설턴트 배정 | 프로젝트 삭제로 자동 제거 |
| `ops/users.spec.ts` | 사용자 승인/정지 | `restoreUserStatus()` |
| `ops/templates.spec.ts` | 템플릿 복제 | `deleteTemplate(id)` |
| `consultant/profile.spec.ts` | 프로필 수정 | `restoreProfile()` |
| `consultant/projects.spec.ts` | 활동일지 CRUD | `deleteActivityLog(id)` |
| `consultant/roadmap.spec.ts` | 공유 토글 | `restoreShareStatus()` |
| `consultant/roadmap.spec.ts` | 최종 확정 | **읽기 전용으로만 테스트 (확정 실행하지 않음)** |
| `shared/settings.spec.ts` | 이메일 알림 토글 | `restoreEmailNotify()` |
| `shared/gallery.spec.ts` | 좋아요 토글 | 다시 토글로 복원 (UI에서) |
| `shared/messages.spec.ts` | 메시지 전송 | 삭제하지 않음 (무해, 단 누적 주의 — 아래 참고) |

### 메시지 누적 주의

메시지 전송 테스트는 매 실행마다 메시지가 쌓입니다. 안읽음 배지 수 등 UI 상태에 영향을 줄 수 있으므로, 메시지 관련 assertion에서는 **정확한 숫자 대신 "존재 여부"**로 검증합니다. (예: `toHaveCount(2)` 대신 `toBeVisible()`)

---

## 6. LLM 의존 테스트 처리

### 원칙

- LLM 호출이 필요한 테스트는 **`test.skip`** 처리
- 해당 기능의 **UI 존재 여부와 클릭 가능성만** 검증
- 수동 실행이 필요한 경우 `--grep @llm` 태그로 분리

### LLM 의존 항목

| 기능 | 위치 | 테스트 방식 |
|------|------|-----------|
| AI 컨설턴트 매칭 | `ops/projects.spec.ts` | 매칭 버튼 존재 확인만, 실제 호출 skip |
| 로드맵 생성 | `shared/test-roadmap.spec.ts` | 6단계 입력까지만 검증, 생성 버튼 skip |
| 인터뷰 가이드 생성 | `consultant/projects.spec.ts` | 사전 분석 탭 기존 내용 표시 확인만 |
| "분석 재생성" 버튼 | `consultant/projects.spec.ts` | 버튼 존재만 확인, **클릭하지 않음** (LLM 호출됨) |
| 새 버전 로드맵 생성 | `consultant/roadmap.spec.ts` | 버튼 존재 확인만 |
| STT 인사이트 추출 | `consultant/interview.spec.ts` | 파일 업로드 UI 존재 확인만, **실제 업로드하지 않음** (LLM 호출됨) |

### Phase 2.7 (자가진단 → 매칭 → 배정) 처리 방침

Phase 2.7은 자가진단 30문항 입력 → AI 매칭 실행 → 배정까지의 전체 플로우입니다. 이 중 AI 매칭은 LLM 호출이 필요하므로:

- **자가진단 30문항 입력 + 제출**: 정상 테스트 (LLM 불필요)
- **DIAGNOSED 상태 전환 확인**: 정상 테스트
- **AI 매칭 버튼**: 존재 확인만, 실행 skip
- **매칭 결과 → 배정**: skip (매칭 결과가 없으므로 배정 불가)
- **배정 UI 검증**: 이미 배정된 기존 프로젝트의 배정 정보 표시 확인으로 대체

---

## 7. 병렬 실행 및 격리 전략

### 문제

여러 spec 파일이 같은 테스트 계정과 같은 DB 레코드를 공유합니다. 병렬 실행 시 한 테스트가 사용자 상태를 변경하는 도중에 다른 테스트가 같은 데이터를 읽으면 간헐적 실패가 발생할 수 있습니다.

### 해결: Serial 실행 그룹 지정

**파괴적 액션이 있는 spec 파일**끼리는 순차 실행합니다:

```typescript
// ops/users.spec.ts
test.describe.configure({ mode: 'serial' });
// 파일 내 테스트는 순차 실행

// ops/projects.spec.ts
test.describe.configure({ mode: 'serial' });
// 프로젝트 생성 → 진단 → 배정 순서 보장
```

**읽기 전용 spec 파일**은 병렬 실행 가능:

- `public/`, `auth/`, `cross/edge-cases.spec.ts` — 완전 독립
- `consultant/home.spec.ts`, `consultant/access-control.spec.ts` — 읽기 전용

### Playwright 프로젝트 분리 (선택적)

충돌이 심한 경우 `playwright.config.ts`에서 projects로 분리하여 순서를 보장할 수 있습니다:

```typescript
projects: [
  { name: 'read-only', testMatch: /public|auth|edge-cases|access-control|home/ },
  { name: 'destructive', testMatch: /projects|users|templates|profile|roadmap|settings|gallery|messages/, dependencies: ['read-only'] },
  { name: 'cross', testMatch: /cross-feature/, dependencies: ['destructive'] },
]
```

이렇게 하면 읽기 전용 → 파괴적 → 크로스 순서로 실행됩니다.

---

## 8. Playwright 설정

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // 파괴적 테스트 충돌 방지 — projects로 병렬 제어
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
    timeout: 120000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### package.json 스크립트 추가

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:report": "playwright show-report"
  }
}
```

### .gitignore 추가

```
# Playwright
.auth/
.env.test
playwright-report/
test-results/
```

---

## 9. CI 통합

### GitHub Actions 워크플로우

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

### CI 환경 주의사항

- Supabase **개발 DB**에 연결 (프로덕션 DB 절대 사용하지 않음)
- 테스트 계정은 개발 DB에만 존재
- `LLM_API_KEY`는 앱 기동에 필요할 수 있으므로 포함 (실제 LLM 호출은 skip)
- CI에서는 워커 1개로 순차 실행 (안정성 우선)

---

## 10. 공통 헬퍼

### navigation.helper.ts

```typescript
// 메뉴 드롭다운 열기 + 항목 클릭
export async function clickDropdownMenu(page: Page, triggerText: string, itemText: string);

// 탭 전환
export async function switchTab(page: Page, tabName: string);

// 뒤로가기 링크 클릭
export async function clickBackLink(page: Page);

// 네비게이션 활성 메뉴 확인
export async function expectActiveNavItem(page: Page, itemText: string);
```

### assertions.helper.ts

```typescript
// JS 콘솔 에러 수집 + 검증 (모든 페이지에서 사용)
export function setupConsoleErrorCheck(page: Page): () => string[];

// 토스트 메시지 확인
export async function expectToast(page: Page, message: string);

// 빈 상태 메시지 확인
export async function expectEmptyState(page: Page, message?: string);

// 페이지 로딩 완료 대기 (스켈레톤 사라짐)
export async function waitForPageLoad(page: Page);

// 네비게이션 활성 상태 확인
export async function expectActiveNav(page: Page, menuText: string);
```

### cleanup.helper.ts

```typescript
// Supabase Admin Client로 DB 직접 조작
export async function deleteProject(id: string);
export async function restoreUserStatus(userId: string, status: string);
export async function deleteTemplate(id: string);
export async function deleteActivityLog(id: string);
export async function restoreProfile(userId: string, originalData: object);
export async function restoreEmailNotify(userId: string, originalValue: boolean);
export async function restoreShareStatus(roadmapId: string, originalValue: boolean);
```

---

## 11. 세션별 구현 계획

### Session 0: 인프라 구축

- **작업**:
  - `playwright.config.ts` 생성
  - `e2e/global-setup.ts` 생성 (세션 파일 저장)
  - `e2e/fixtures/auth.fixture.ts` 생성
  - `e2e/fixtures/test-data.ts` 생성 (환경 변수 기반)
  - `e2e/helpers/` 3개 파일 생성
  - `.env.test` 생성 (gitignore 추가)
  - `package.json` 스크립트 추가
  - `.gitignore` 추가
- **검증**: `npx playwright test --list`로 파일 인식 확인
- **위험도**: 낮음

### Session 1: public/ + auth/ (5개 파일)

- **파일**:
  - `e2e/public/landing.spec.ts` — Phase 1.1
  - `e2e/public/demo.spec.ts` — Phase 1.2
  - `e2e/auth/login.spec.ts` — Phase 1.3
  - `e2e/auth/register.spec.ts` — Phase 1.4
  - `e2e/auth/protected-routes.spec.ts` — Phase 1.5
- **특이사항**: 비로그인 상태 테스트이므로 fixture 불필요, `base.test` 사용
- **파괴적 액션**: 없음
- **검증**: `npx playwright test e2e/public e2e/auth`

### Session 2: ops/navigation + ops/projects (2개 파일)

- **파일**:
  - `e2e/ops/navigation.spec.ts` — Phase 2.0~2.3, 2.20
  - `e2e/ops/projects.spec.ts` — Phase 2.4~2.8
- **특이사항**: `opsPage` fixture 사용
- **파괴적 액션**: 프로젝트 생성 → afterEach에서 `deleteProject()`
- **LLM 의존**: 컨설턴트 매칭 버튼 존재만 확인, 실행 skip. 자가진단 입력까지만 테스트
- **검증**: `npx playwright test e2e/ops/navigation e2e/ops/projects`

### Session 3: ops/users + templates + audit-quota (3개 파일)

- **파일**:
  - `e2e/ops/users.spec.ts` — Phase 2.9
  - `e2e/ops/templates.spec.ts` — Phase 2.10~2.12
  - `e2e/ops/audit-quota.spec.ts` — Phase 2.13~2.14
- **파괴적 액션**: 사용자 상태 변경 → `restoreUserStatus()`, 템플릿 복제 → `deleteTemplate()`
- **검증**: `npx playwright test e2e/ops/users e2e/ops/templates e2e/ops/audit-quota`

### Session 4: consultant/navigation + home + profile (3개 파일)

- **파일**:
  - `e2e/consultant/navigation.spec.ts` — Phase 3.0~3.3, 3.16
  - `e2e/consultant/home.spec.ts` — Phase 3.4
  - `e2e/consultant/profile.spec.ts` — Phase 3.5
- **특이사항**: `consultantPage` fixture 사용
- **파괴적 액션**: 프로필 수정 → `restoreProfile()`로 복원
- **검증**: `npx playwright test e2e/consultant/navigation e2e/consultant/home e2e/consultant/profile`

### Session 5: consultant/projects + interview + roadmap + access-control (4개 파일)

- **파일**:
  - `e2e/consultant/projects.spec.ts` — Phase 3.6~3.7
  - `e2e/consultant/interview.spec.ts` — Phase 3.8
  - `e2e/consultant/roadmap.spec.ts` — Phase 3.9
  - `e2e/consultant/access-control.spec.ts` — Phase 3.15
- **파괴적 액션**: 활동일지 CRUD → `deleteActivityLog()`, 공유 토글 → `restoreShareStatus()`
- **LLM 의존**: 인터뷰 가이드 생성 skip, "분석 재생성" 클릭 금지, STT 업로드 skip, 로드맵 새 버전 생성 skip
- **검증**: `npx playwright test e2e/consultant`

### Session 6: shared/ (4개 파일)

- **파일**:
  - `e2e/shared/gallery.spec.ts` — Phase 2.17~2.18, 3.12~3.13
  - `e2e/shared/messages.spec.ts` — Phase 2.15, 3.10
  - `e2e/shared/settings.spec.ts` — Phase 2.16, 3.11
  - `e2e/shared/test-roadmap.spec.ts` — Phase 2.19, 3.14
- **특이사항**: 양 역할 모두 테스트 → `opsPage`와 `consultantPage` 모두 사용
- **파괴적 액션**: 좋아요 토글 → UI로 복원, 이메일 알림 토글 → `restoreEmailNotify()`
- **LLM 의존**: 테스트 로드맵 생성 skip
- **검증**: `npx playwright test e2e/shared`

### Session 7: cross/ + CI 설정 (2개 파일 + CI 설정)

- **파일**:
  - `e2e/cross/cross-feature.spec.ts` — Phase 4.1, 4.3, 4.4
  - `e2e/cross/edge-cases.spec.ts` — Phase 4.2
- **추가 작업**: `.github/workflows/e2e.yml` 생성
- **검증**: `npx playwright test` (전체 실행) + CI에서 확인
- **최종 확인**: 모든 21개 spec 파일이 통과하는지 전체 실행

---

## 12. 진행 추적표

| Session | 작업 | spec 파일 수 | 상태 |
|---------|------|-------------|------|
| 0 | 인프라 구축 (config, fixtures, helpers) | 0 (+7 인프라) | - |
| 1 | public/ + auth/ | 5 | - |
| 2 | ops/navigation + ops/projects | 2 | - |
| 3 | ops/users + templates + audit-quota | 3 | - |
| 4 | consultant/navigation + home + profile | 3 | - |
| 5 | consultant/projects + interview + roadmap + access-control | 4 | - |
| 6 | shared/ (gallery, messages, settings, test-roadmap) | 4 | - |
| 7 | cross/ + CI 설정 | 2 | - |
| **합계** | | **21 (+7 인프라)** | |

> **상태 표기**: `-` 미시작 / `진행중` / `완료` / `건너뜀`
