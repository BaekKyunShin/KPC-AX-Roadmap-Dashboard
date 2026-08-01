// e2e/performance/public-pages.perf.spec.ts
import { test, expect, type Page } from '@playwright/test';

/**
 * 공개 페이지 성능 임계값.
 *
 * 2026-08-01 서울 리전 이전(#159·#160) 후 CI 실측 4런을 기준으로 조였다.
 * 완화할 때는 반드시 CI 로그의 실측값을 근거로 남길 것 —
 * 근거 없는 완화는 회귀를 조용히 통과시킨다.
 */
const THRESHOLDS = {
  /** LCP 최대 허용 시간 (ms) — 실측 최대 576ms(랜딩, GSAP 애니메이션 포함) 대비 약 3배 */
  LCP_MAX_MS: 1800,
  /** TTFB 최대 허용 시간 (ms) — 실측 최대 28ms 대비 10배 */
  TTFB_MAX_MS: 300,
  /** 페이지당 JS transferSize 합계 최대값 (bytes) — 540KB. 실측 503.6KB(랜딩) 대비 +7% */
  JS_BUNDLE_MAX_BYTES: 552_960,
  /** CLS 최대 허용값 — 실측 최대 0.0172(랜딩) 대비 약 3배. Google 권장(0.1)보다 엄격 */
  CLS_MAX: 0.05,
} as const;

/** Navigation Timing API에서 TTFB를 계산합니다. */
async function measureTTFB(page: Page): Promise<number> {
  return page.evaluate(() => {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (!nav) return -1;
    return nav.responseStart - nav.requestStart;
  });
}

/** LCP를 PerformanceObserver로 측정합니다. 페이지 완전 로드 후 호출합니다. */
async function getLCP(page: Page): Promise<number> {
  return page.evaluate(() => {
    return new Promise<number>((resolve) => {
      // 이미 LCP가 측정된 경우 (페이지 완전 로드 후)
      const entries = performance.getEntriesByType('largest-contentful-paint');
      if (entries.length > 0) {
        const last = entries[entries.length - 1] as PerformancePaintTiming;
        resolve(last.startTime);
        return;
      }

      // 아직 없으면 Observer로 기다림 (최대 5초)
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
          // 타임아웃 시 FCP로 대체
          const fcp = performance.getEntriesByName('first-contentful-paint')[0] as
            | PerformancePaintTiming
            | undefined;
          resolve(fcp ? fcp.startTime : -1);
        }
      }, 5000);
    });
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

/** JS 리소스 총 transferSize를 계산합니다. (확장자 기반 매칭 — jsdelivr CDN 등 호스트명에 .js가 포함된 URL 오분류 방지) */
async function measureJSBundleSize(page: Page): Promise<number> {
  return page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resources
      .filter((r) => {
        const pathname = r.name.split('?')[0];
        return /\.(m?js|cjs)$/.test(pathname);
      })
      .reduce((sum, r) => sum + (r.transferSize ?? 0), 0);
  });
}

const 공개_페이지_목록 = [
  { 경로: '/', 이름: '랜딩 페이지' },
  { 경로: '/login', 이름: '로그인 페이지' },
  { 경로: '/demo', 이름: '데모 페이지' },
] as const;

test.describe('공개 페이지 성능 측정', () => {
  for (const { 경로, 이름 } of 공개_페이지_목록) {
    test.describe(이름, () => {
      test(`TTFB가 ${THRESHOLDS.TTFB_MAX_MS}ms 미만이어야 한다`, async ({ page }) => {
        await page.goto(경로, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle');

        const ttfb = await measureTTFB(page);

        console.log(`[${이름}] TTFB: ${ttfb.toFixed(1)}ms`);
        expect(
          ttfb,
          `${이름} TTFB(${ttfb.toFixed(1)}ms)가 임계값(${THRESHOLDS.TTFB_MAX_MS}ms)을 초과합니다`
        ).toBeLessThan(THRESHOLDS.TTFB_MAX_MS);
      });

      test(`LCP가 ${THRESHOLDS.LCP_MAX_MS}ms 미만이어야 한다`, async ({ page }) => {
        await page.goto(경로, { waitUntil: 'networkidle' });

        const lcp = await getLCP(page);

        console.log(`[${이름}] LCP: ${lcp.toFixed(1)}ms`);
        // LCP 측정 실패(-1)는 건너뜀
        if (lcp === -1) {
          test.skip(true, 'LCP 측정값을 가져올 수 없습니다');
          return;
        }
        expect(
          lcp,
          `${이름} LCP(${lcp.toFixed(1)}ms)가 임계값(${THRESHOLDS.LCP_MAX_MS}ms)을 초과합니다`
        ).toBeLessThan(THRESHOLDS.LCP_MAX_MS);
      });

      test(`JS 번들 총 크기가 ${THRESHOLDS.JS_BUNDLE_MAX_BYTES / 1024}KB 미만이어야 한다`, async ({
        page,
      }) => {
        await page.goto(경로, { waitUntil: 'networkidle' });

        const jsBundleBytes = await measureJSBundleSize(page);
        const jsBundleKB = (jsBundleBytes / 1024).toFixed(1);

        console.log(`[${이름}] JS 번들 크기: ${jsBundleKB}KB`);
        expect(
          jsBundleBytes,
          `${이름} JS 번들(${jsBundleKB}KB)이 예산(${THRESHOLDS.JS_BUNDLE_MAX_BYTES / 1024}KB)을 초과합니다`
        ).toBeLessThan(THRESHOLDS.JS_BUNDLE_MAX_BYTES);
      });

      test(`CLS가 ${THRESHOLDS.CLS_MAX} 미만이어야 한다`, async ({ page }) => {
        await page.goto(경로, { waitUntil: 'networkidle' });

        const cls = await measureCLS(page);

        console.log(`[${이름}] CLS: ${cls.toFixed(4)}`);
        expect(
          cls,
          `${이름} CLS(${cls.toFixed(4)})가 임계값(${THRESHOLDS.CLS_MAX})을 초과합니다`
        ).toBeLessThan(THRESHOLDS.CLS_MAX);
      });
    });
  }
});
