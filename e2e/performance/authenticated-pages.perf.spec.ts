// e2e/performance/authenticated-pages.perf.spec.ts
import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

/** 인증 페이지 성능 임계값 (서버 사이드 인증 처리로 공개 페이지보다 넉넉하게 설정) */
const THRESHOLDS = {
  /** LCP 최대 허용 시간 (ms) */
  LCP_MAX_MS: 3500,
  /** TTFB 최대 허용 시간 (ms) — 인증 처리 포함으로 공개 페이지보다 넉넉하게 */
  TTFB_MAX_MS: 1500,
  /** CLS (Cumulative Layout Shift) 최대 허용값 — Google 권장 0.1 이하 */
  CLS_MAX: 0.1,
} as const;

/** Navigation Timing API에서 TTFB를 계산합니다. */
async function measureTTFB(page: Page): Promise<number> {
  return page.evaluate(() => {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (!nav) return -1;
    return nav.responseStart - nav.requestStart;
  });
}

/** CLS(Cumulative Layout Shift)를 PerformanceObserver로 측정합니다. */
async function measureCLS(page: Page): Promise<number> {
  return page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (!shift.hadRecentInput) {
            clsValue += shift.value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 3000);
    });
  });
}

/** LCP를 측정합니다. 페이지 완전 로드 후 호출합니다. */
async function getLCP(page: Page): Promise<number> {
  return page.evaluate(() => {
    return new Promise<number>((resolve) => {
      const entries = performance.getEntriesByType('largest-contentful-paint');
      if (entries.length > 0) {
        const last = entries[entries.length - 1] as PerformancePaintTiming;
        resolve(last.startTime);
        return;
      }

      let resolved = false;
      const observer = new PerformanceObserver((list) => {
        const lcpEntries = list.getEntries();
        if (lcpEntries.length > 0) {
          const last = lcpEntries[lcpEntries.length - 1] as PerformancePaintTiming;
          if (!resolved) {
            resolved = true;
            observer.disconnect();
            resolve(last.startTime);
          }
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          const fcp = performance.getEntriesByName('first-contentful-paint')[0] as PerformancePaintTiming | undefined;
          resolve(fcp ? fcp.startTime : -1);
        }
      }, 5000);
    });
  });
}

/** 운영관리자 페이지 성능 테스트 */
test.describe('인증 페이지 성능 측정 (운영관리자)', () => {
  const ops_페이지_목록 = [
    { 경로: '/dashboard', 이름: '공통 대시보드' },
    { 경로: '/ops/projects', 이름: '운영 프로젝트 목록' },
    { 경로: '/gallery', 이름: '로드맵 갤러리' },
  ] as const;

  for (const { 경로, 이름 } of ops_페이지_목록) {
    test.describe(이름, () => {
      test(`TTFB가 ${THRESHOLDS.TTFB_MAX_MS}ms 미만이어야 한다`, async ({ opsPage }) => {
        await opsPage.goto(경로, { waitUntil: 'domcontentloaded' });
        await opsPage.waitForLoadState('networkidle');

        const ttfb = await measureTTFB(opsPage);

        console.log(`[운영관리자/${이름}] TTFB: ${ttfb.toFixed(1)}ms`);
        expect(
          ttfb,
          `${이름} TTFB(${ttfb.toFixed(1)}ms)가 임계값(${THRESHOLDS.TTFB_MAX_MS}ms)을 초과합니다`,
        ).toBeLessThan(THRESHOLDS.TTFB_MAX_MS);
      });

      test(`LCP가 ${THRESHOLDS.LCP_MAX_MS}ms 미만이어야 한다`, async ({ opsPage }) => {
        await opsPage.goto(경로, { waitUntil: 'networkidle' });

        const lcp = await getLCP(opsPage);

        console.log(`[운영관리자/${이름}] LCP: ${lcp.toFixed(1)}ms`);
        if (lcp === -1) {
          test.skip(true, 'LCP 측정값을 가져올 수 없습니다');
          return;
        }
        expect(
          lcp,
          `${이름} LCP(${lcp.toFixed(1)}ms)가 임계값(${THRESHOLDS.LCP_MAX_MS}ms)을 초과합니다`,
        ).toBeLessThan(THRESHOLDS.LCP_MAX_MS);
      });

      test(`CLS가 ${THRESHOLDS.CLS_MAX} 미만이어야 한다`, async ({ opsPage }) => {
        await opsPage.goto(경로, { waitUntil: 'networkidle' });

        const cls = await measureCLS(opsPage);

        console.log(`[운영관리자/${이름}] CLS: ${cls.toFixed(4)}`);
        expect(
          cls,
          `${이름} CLS(${cls.toFixed(4)})가 임계값(${THRESHOLDS.CLS_MAX})을 초과합니다`,
        ).toBeLessThan(THRESHOLDS.CLS_MAX);
      });
    });
  }
});

/** 컨설턴트 페이지 성능 테스트 */
test.describe('인증 페이지 성능 측정 (컨설턴트)', () => {
  const consultant_페이지_목록 = [
    { 경로: '/consultant/home', 이름: '컨설턴트 홈' },
  ] as const;

  for (const { 경로, 이름 } of consultant_페이지_목록) {
    test.describe(이름, () => {
      test(`TTFB가 ${THRESHOLDS.TTFB_MAX_MS}ms 미만이어야 한다`, async ({ consultantPage }) => {
        await consultantPage.goto(경로, { waitUntil: 'domcontentloaded' });
        await consultantPage.waitForLoadState('networkidle');

        const ttfb = await measureTTFB(consultantPage);

        console.log(`[컨설턴트/${이름}] TTFB: ${ttfb.toFixed(1)}ms`);
        expect(
          ttfb,
          `${이름} TTFB(${ttfb.toFixed(1)}ms)가 임계값(${THRESHOLDS.TTFB_MAX_MS}ms)을 초과합니다`,
        ).toBeLessThan(THRESHOLDS.TTFB_MAX_MS);
      });

      test(`LCP가 ${THRESHOLDS.LCP_MAX_MS}ms 미만이어야 한다`, async ({ consultantPage }) => {
        await consultantPage.goto(경로, { waitUntil: 'networkidle' });

        const lcp = await getLCP(consultantPage);

        console.log(`[컨설턴트/${이름}] LCP: ${lcp.toFixed(1)}ms`);
        if (lcp === -1) {
          test.skip(true, 'LCP 측정값을 가져올 수 없습니다');
          return;
        }
        expect(
          lcp,
          `${이름} LCP(${lcp.toFixed(1)}ms)가 임계값(${THRESHOLDS.LCP_MAX_MS}ms)을 초과합니다`,
        ).toBeLessThan(THRESHOLDS.LCP_MAX_MS);
      });

      test(`CLS가 ${THRESHOLDS.CLS_MAX} 미만이어야 한다`, async ({ consultantPage }) => {
        await consultantPage.goto(경로, { waitUntil: 'networkidle' });

        const cls = await measureCLS(consultantPage);

        console.log(`[컨설턴트/${이름}] CLS: ${cls.toFixed(4)}`);
        expect(
          cls,
          `${이름} CLS(${cls.toFixed(4)})가 임계값(${THRESHOLDS.CLS_MAX})을 초과합니다`,
        ).toBeLessThan(THRESHOLDS.CLS_MAX);
      });
    });
  }
});
