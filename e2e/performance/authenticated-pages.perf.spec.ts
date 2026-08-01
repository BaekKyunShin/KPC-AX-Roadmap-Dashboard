// e2e/performance/authenticated-pages.perf.spec.ts
import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/auth.fixture';

/**
 * 인증 페이지 성능 임계값.
 *
 * 2026-08-01 서울 리전 이전(#159·#160) 후 CI 실측 4런을 기준으로 조였다.
 * 이전 값(LCP 6000 / TTFB 2000)은 실측의 20배라 어떤 회귀도 잡지 못했다.
 * 완화할 때는 반드시 CI 로그의 실측값을 근거로 남길 것.
 */
const THRESHOLDS = {
  /** LCP 최대 허용 시간 (ms) — 실측 최대 348ms 대비 약 4배 */
  LCP_MAX_MS: 1500,
  /** TTFB 최대 허용 시간 (ms) — 실측 최대 113ms(인증 처리 포함) 대비 약 7배 */
  TTFB_MAX_MS: 800,
  /** CLS 최대 허용값 — 실측 최대 0.0022 대비 20배 이상. Google 권장(0.1)보다 엄격 */
  CLS_MAX: 0.05,
} as const;

/**
 * 결과 화면 임계 경로 JS 예산 (bytes).
 *
 * 결과 화면 3종(로드맵·PBL·갤러리 PBL)은 지금까지 어떤 번들 예산에도 잡히지 않았다.
 * `bundle-budget.perf.spec.ts` 가 공개 페이지(`/`, `/login`)만 재기 때문이다.
 * 대표로 로드맵 결과 화면을 재서 **화면이 조용히 부풀지 않게** 막는다.
 *
 * ⚠️ 이 화면의 탭은 의도적으로 코드 분할하지 않는다 —
 * `docs/decisions/2026-08-01-result-tabs-no-code-split.md` (분할 시 탭 전환 59ms → 401ms).
 * 따라서 이 예산은 "분할이 유지되는지"가 아니라 "탭 본문이 불어나지 않는지"를 본다.
 * 측정 방식은 하단 describe 주석 참조.
 */
/** 500KB. 2026-08-01 CI 실측 454.8KB 대비 +10% */
const RESULT_PAGE_JS_MAX_BYTES = 512_000;

/**
 * 시드기업D 의 로드맵 결과 화면 경로.
 * `supabase/seed.sql` 이 FINALIZED·ROADMAP 프로젝트(고정 UUID)와 FINAL 로드맵 버전을
 * 시드 컨설턴트에게 배정해 두므로, 조건 분기·스킵 없이 결과 3탭이 렌더된다.
 */
const ROADMAP_RESULT_PATH = '/consultant/projects/dddddddd-dddd-dddd-dddd-dddddddddddd/roadmap';

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
          const fcp = performance.getEntriesByName('first-contentful-paint')[0] as
            | PerformancePaintTiming
            | undefined;
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
          `${이름} TTFB(${ttfb.toFixed(1)}ms)가 임계값(${THRESHOLDS.TTFB_MAX_MS}ms)을 초과합니다`
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
          `${이름} LCP(${lcp.toFixed(1)}ms)가 임계값(${THRESHOLDS.LCP_MAX_MS}ms)을 초과합니다`
        ).toBeLessThan(THRESHOLDS.LCP_MAX_MS);
      });

      test(`CLS가 ${THRESHOLDS.CLS_MAX} 미만이어야 한다`, async ({ opsPage }) => {
        await opsPage.goto(경로, { waitUntil: 'networkidle' });

        const cls = await measureCLS(opsPage);

        console.log(`[운영관리자/${이름}] CLS: ${cls.toFixed(4)}`);
        expect(
          cls,
          `${이름} CLS(${cls.toFixed(4)})가 임계값(${THRESHOLDS.CLS_MAX})을 초과합니다`
        ).toBeLessThan(THRESHOLDS.CLS_MAX);
      });
    });
  }
});

/** 컨설턴트 페이지 성능 테스트 */
test.describe('인증 페이지 성능 측정 (컨설턴트)', () => {
  const consultant_페이지_목록 = [
    { 경로: '/consultant/home', 이름: '컨설턴트 홈' },
    // 컨설턴트 핵심 산출물 화면. 시드기업D(FINALIZED·ROADMAP, 확정 로드맵 보유)는
    // 고정 UUID 라 CI 에서 조건 없이 도달한다 (supabase/seed.sql).
    { 경로: `${ROADMAP_RESULT_PATH}`, 이름: '로드맵 결과' },
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
          `${이름} TTFB(${ttfb.toFixed(1)}ms)가 임계값(${THRESHOLDS.TTFB_MAX_MS}ms)을 초과합니다`
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
          `${이름} LCP(${lcp.toFixed(1)}ms)가 임계값(${THRESHOLDS.LCP_MAX_MS}ms)을 초과합니다`
        ).toBeLessThan(THRESHOLDS.LCP_MAX_MS);
      });

      test(`CLS가 ${THRESHOLDS.CLS_MAX} 미만이어야 한다`, async ({ consultantPage }) => {
        await consultantPage.goto(경로, { waitUntil: 'networkidle' });

        const cls = await measureCLS(consultantPage);

        console.log(`[컨설턴트/${이름}] CLS: ${cls.toFixed(4)}`);
        expect(
          cls,
          `${이름} CLS(${cls.toFixed(4)})가 임계값(${THRESHOLDS.CLS_MAX})을 초과합니다`
        ).toBeLessThan(THRESHOLDS.CLS_MAX);
      });
    });
  }
});

/**
 * 결과 화면 **임계 경로(critical path)** JS 예산.
 *
 * `bundle-budget.perf.spec.ts` 는 공개 페이지(`/`, `/login`)만 재기 때문에
 * 결과 화면은 어떤 예산에도 걸리지 않았다. 여기서 막는다.
 *
 * **서버가 내려준 HTML 에 `<script src>` 로 박힌 파일**만 잰다. 하이드레이션 전에
 * 반드시 받아야 하는 진짜 임계 경로이고, 빌드가 결정하는 값이라 실행 간 변동이 없다.
 *
 * ⚠️ **"페이지가 받은 JS 총량"으로 바꾸지 말 것.** 지연 로딩·프리페치가 끼면 총량은
 * 어차피 같아져서 게이트가 아무것도 잡지 못한다(= 공허한 단언). 2026-08-01 에
 * 실제로 그렇게 만들었다가 바로잡았다.
 */
test.describe('결과 화면 임계 경로 JS 예산 (컨설턴트)', () => {
  test(`로드맵 결과 화면 임계 경로 JS 가 ${Math.round(RESULT_PAGE_JS_MAX_BYTES / 1024)}KB 미만이어야 한다`, async ({
    consultantPage,
  }) => {
    const response = await consultantPage.goto(ROADMAP_RESULT_PATH, {
      waitUntil: 'domcontentloaded',
    });
    const html = (await response?.text()) ?? '';

    // 결과 화면이 실제로 렌더됐는지 확인 — 리다이렉트·빈 상태를 재고 통과하는 것을 막는다.
    await expect(consultantPage.getByRole('tab', { name: 'Ⅰ. 개요' })).toBeVisible({
      timeout: 15_000,
    });

    // 초기 HTML 의 <script src="..."> 목록 (빌드 결정적)
    const criticalPaths = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((src) => /\.(m?js|cjs)$/.test(src.split('?')[0]));

    expect(criticalPaths.length, '초기 HTML 에서 script 태그를 찾지 못했습니다').toBeGreaterThan(0);

    const { totalBytes, matched } = await consultantPage.evaluate((paths: string[]) => {
      const wanted = new Set(paths.map((p) => p.split('?')[0]));
      const entries = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .filter((r) => {
          try {
            return wanted.has(new URL(r.name).pathname);
          } catch {
            return false;
          }
        })
        .filter((r) => r.transferSize > 0);
      return {
        totalBytes: entries.reduce((sum, r) => sum + r.transferSize, 0),
        matched: entries.length,
      };
    }, criticalPaths);

    console.log(
      `[컨설턴트/로드맵 결과] 임계 경로 JS: ${(totalBytes / 1024).toFixed(1)}KB ` +
        `(HTML script ${criticalPaths.length}개 중 ${matched}개 측정)`
    );

    // 캐시 히트 등으로 transferSize 가 0 이면 합계가 과소 집계돼 게이트가 공허해진다.
    expect(matched, '초기 HTML 의 script 중 실제로 측정된 것이 없습니다').toBeGreaterThan(0);

    expect(
      totalBytes,
      `로드맵 결과 화면 임계 경로 JS(${(totalBytes / 1024).toFixed(1)}KB)가 예산(${Math.round(
        RESULT_PAGE_JS_MAX_BYTES / 1024
      )}KB)을 초과합니다. 탭 본문이나 공용 의존성이 커지지 않았는지 확인하세요.`
    ).toBeLessThan(RESULT_PAGE_JS_MAX_BYTES);
  });
});
