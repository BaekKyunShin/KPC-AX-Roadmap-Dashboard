// e2e/regression/console-clean.spec.ts
//
// ISSUE-20 회귀 방지: 주요 화면에서 React 에러(특히 #418 hydration mismatch)
// 0건을 보장한다.
//
// 핵심 트릭: server runtime(UTC) ≠ browser timezone(KST) 차이로 발생하던
// hydration text mismatch를 재현하기 위해, 일부 테스트는 'America/Los_Angeles'
// 같은 다른 타임존으로 페이지를 렌더해 검증한다. 모든 날짜 포맷이
// `Asia/Seoul` 타임존을 명시하면 사용자 timezone 과 무관하게 동일 결과가
// 나오므로 mismatch 가 발생하지 않아야 한다.

import { test, expect } from '../fixtures/auth.fixture';

/**
 * React 에러만 수집한다.
 * - "Minified React error" 또는 "Hydration" 키워드를 가진 console error 만 잡음
 * - 네트워크 일시 실패(net::ERR, Failed to fetch) 등은 무시
 */
function setupReactErrorCheck(page: import('@playwright/test').Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // React 관련 에러만 감지 (hydration / minified react error)
    if (
      /Minified React error|Hydration|did not match/i.test(text) ||
      // 명시적으로 react.dev/errors 링크 포함
      /react\.dev\/errors/i.test(text)
    ) {
      errors.push(text);
    }
  });
  return () => [...errors];
}

const PUBLIC_PAGES = [
  { name: '랜딩', url: '/' },
  { name: '로그인', url: '/login' },
  { name: '회원가입', url: '/register' },
];

const CONSULTANT_PAGES = [
  { name: '컨설턴트 홈', url: '/consultant/home' },
  { name: '담당 프로젝트 목록', url: '/consultant/projects' },
  { name: '갤러리', url: '/gallery' },
  { name: '공지사항', url: '/notices' },
];

const OPS_PAGES = [
  { name: '프로젝트 관리', url: '/ops/projects' },
  { name: '사용자 관리', url: '/ops/users' },
];

test.describe('ISSUE-20: 공개 페이지 React 에러 0', () => {
  for (const p of PUBLIC_PAGES) {
    test(`${p.name} - console에 React 에러 없음`, async ({ page }) => {
      const getErrors = setupReactErrorCheck(page);
      await page.goto(p.url);
      await page.waitForLoadState('networkidle');
      expect(getErrors()).toEqual([]);
    });
  }
});

test.describe('ISSUE-20: 컨설턴트 인증 페이지 React 에러 0 (KST)', () => {
  for (const p of CONSULTANT_PAGES) {
    test(`${p.name} - console에 React 에러 없음`, async ({ consultantPage }) => {
      const getErrors = setupReactErrorCheck(consultantPage);
      await consultantPage.goto(p.url);
      await consultantPage.waitForLoadState('networkidle');
      expect(getErrors()).toEqual([]);
    });
  }
});

test.describe('ISSUE-20: 운영자 인증 페이지 React 에러 0 (KST)', () => {
  for (const p of OPS_PAGES) {
    test(`${p.name} - console에 React 에러 없음`, async ({ opsPage }) => {
      const getErrors = setupReactErrorCheck(opsPage);
      await opsPage.goto(p.url);
      await opsPage.waitForLoadState('networkidle');
      expect(getErrors()).toEqual([]);
    });
  }
});

/**
 * Cross-timezone 회귀 테스트.
 *
 * playwright.config.ts 는 기본 timezone 을 'Asia/Seoul' 로 고정해 hydration
 * mismatch 재현이 어렵다. 여기서는 별도 컨텍스트를 LA timezone 으로 만들어,
 * 우리 코드의 모든 날짜 포맷터가 KST 를 명시적으로 사용하는지 검증한다.
 *
 * 실패 시: 어딘가에 `new Date(iso).toLocaleDateString('ko-KR')` 처럼 timezone
 * 미지정 호출이 남아있다는 신호. `src/lib/utils/date.ts` 의 헬퍼로 교체할 것.
 */
test.describe('ISSUE-20: cross-timezone hydration 회귀', () => {
  test('컨설턴트 프로젝트 목록 - LA timezone 에서도 React 에러 없음', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: '.auth/consultant.json',
      timezoneId: 'America/Los_Angeles',
      locale: 'ko-KR',
    });
    const page = await context.newPage();
    const getErrors = setupReactErrorCheck(page);
    try {
      await page.goto('/consultant/projects');
      await page.waitForLoadState('networkidle');
      expect(getErrors()).toEqual([]);
    } finally {
      await context.close();
    }
  });

  test('운영자 프로젝트 관리 - LA timezone 에서도 React 에러 없음', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: '.auth/ops-admin.json',
      timezoneId: 'America/Los_Angeles',
      locale: 'ko-KR',
    });
    const page = await context.newPage();
    const getErrors = setupReactErrorCheck(page);
    try {
      await page.goto('/ops/projects');
      await page.waitForLoadState('networkidle');
      expect(getErrors()).toEqual([]);
    } finally {
      await context.close();
    }
  });
});
