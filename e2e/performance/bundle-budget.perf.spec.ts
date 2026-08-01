// e2e/performance/bundle-budget.perf.spec.ts
import { test, expect, type Page } from '@playwright/test';

/**
 * 번들 크기 예산 (bytes).
 *
 * 2026-08-01 CI 실측 기준. 번들 크기는 빌드 결정적이라 실행 간 변동이 없어
 * (4런 모두 바이트까지 동일) 타이트하게 잡아도 flaky 하지 않다.
 * 완화할 때는 반드시 CI 로그의 실측값을 근거로 남길 것.
 */
const BUDGET = {
  /** JS 총 transferSize 합계 최대값 — 540KB. 실측 503.6KB(`/`) 대비 +7% */
  JS_TOTAL_BYTES: 552_960,
  /** CSS 총 transferSize 합계 최대값 — 40KB. 실측 25.1KB 대비 +59% */
  CSS_TOTAL_BYTES: 40_960,
} as const;

/** 리소스 항목 타입 */
interface ResourceEntry {
  name: string;
  initiatorType: string;
  transferSize: number;
  encodedBodySize: number;
}

/** JS 리소스 목록을 수집합니다. (확장자 기반 매칭 — jsdelivr CDN 등 호스트명에 .js가 포함된 URL 오분류 방지) */
async function collectJSResources(page: Page): Promise<ResourceEntry[]> {
  return page.evaluate(() => {
    return (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
      .filter((r) => {
        // 쿼리스트링 제거 후 pathname 기준으로 확장자 매칭
        const pathname = r.name.split('?')[0];
        return /\.(m?js|cjs)$/.test(pathname);
      })
      .map((r) => ({
        name: r.name,
        initiatorType: r.initiatorType,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
      }));
  });
}

/** CSS 리소스 목록을 수집합니다. */
async function collectCSSResources(page: Page): Promise<ResourceEntry[]> {
  return page.evaluate(() => {
    return (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
      .filter((r) => r.initiatorType === 'link' && r.name.includes('.css'))
      .map((r) => ({
        name: r.name,
        initiatorType: r.initiatorType,
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
      }));
  });
}

/** next/image srcset 없는 대형 이미지(width > 1000px)를 탐지합니다. */
async function findUnoptimizedLargeImages(
  page: Page
): Promise<Array<{ src: string; width: number }>> {
  return page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img[src]')) as HTMLImageElement[];
    return images
      .filter((img) => {
        const hasSrcset = img.hasAttribute('srcset') || img.closest('picture') !== null;
        const isLarge = img.naturalWidth > 1000 || img.width > 1000;
        return isLarge && !hasSrcset;
      })
      .map((img) => ({
        src: img.getAttribute('src') ?? '',
        width: img.naturalWidth || img.width,
      }));
  });
}

test.describe('번들 크기 예산 검사', () => {
  test.describe('랜딩 페이지 (/) 리소스 분석', () => {
    test(`JS 번들 총 크기가 ${BUDGET.JS_TOTAL_BYTES / 1024}KB 미만이어야 한다`, async ({
      page,
    }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      const jsResources = await collectJSResources(page);
      const totalBytes = jsResources.reduce((sum, r) => sum + r.transferSize, 0);
      const totalKB = (totalBytes / 1024).toFixed(1);

      // 상위 5개 파일 로깅
      const sorted = [...jsResources].sort((a, b) => b.transferSize - a.transferSize);
      console.log(`[번들 예산] JS 총 크기: ${totalKB}KB (파일 ${jsResources.length}개)`);
      sorted.slice(0, 5).forEach((r) => {
        const name = r.name.split('/').pop() ?? r.name;
        console.log(`  - ${name}: ${(r.transferSize / 1024).toFixed(1)}KB`);
      });

      expect(
        totalBytes,
        `JS 번들 총 크기(${totalKB}KB)가 예산(${BUDGET.JS_TOTAL_BYTES / 1024}KB)을 초과합니다.\n상위 파일:\n${sorted
          .slice(0, 5)
          .map((r) => `  ${r.name.split('/').pop()}: ${(r.transferSize / 1024).toFixed(1)}KB`)
          .join('\n')}`
      ).toBeLessThan(BUDGET.JS_TOTAL_BYTES);
    });

    test(`CSS 총 크기가 ${BUDGET.CSS_TOTAL_BYTES / 1024}KB 미만이어야 한다`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      const cssResources = await collectCSSResources(page);
      const totalBytes = cssResources.reduce((sum, r) => sum + r.transferSize, 0);
      const totalKB = (totalBytes / 1024).toFixed(1);

      console.log(`[번들 예산] CSS 총 크기: ${totalKB}KB (파일 ${cssResources.length}개)`);
      cssResources.forEach((r) => {
        const name = r.name.split('/').pop() ?? r.name;
        console.log(`  - ${name}: ${(r.transferSize / 1024).toFixed(1)}KB`);
      });

      expect(
        totalBytes,
        `CSS 총 크기(${totalKB}KB)가 예산(${BUDGET.CSS_TOTAL_BYTES / 1024}KB)을 초과합니다`
      ).toBeLessThan(BUDGET.CSS_TOTAL_BYTES);
    });

    test('next/image 미사용 대형 이미지(width > 1000px)가 없어야 한다', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // 이미지 자연 크기가 로드될 때까지 대기
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.images)
            .filter((img) => !img.complete)
            .map(
              (img) =>
                new Promise<void>((resolve) => {
                  img.addEventListener('load', () => resolve());
                  img.addEventListener('error', () => resolve());
                })
            )
        )
      );

      const unoptimized = await findUnoptimizedLargeImages(page);

      if (unoptimized.length > 0) {
        console.warn(
          `[번들 예산] next/image 미사용 대형 이미지 ${unoptimized.length}개 발견:\n` +
            unoptimized.map((img) => `  - ${img.src} (${img.width}px)`).join('\n')
        );
      } else {
        console.log('[번들 예산] 대형 이미지 최적화 통과: 비최적화 이미지 없음');
      }

      expect(
        unoptimized,
        `next/image를 사용하지 않는 대형 이미지(width > 1000px)가 발견되었습니다:\n${unoptimized
          .map((img) => `  ${img.src} (${img.width}px)`)
          .join('\n')}`
      ).toHaveLength(0);
    });
  });

  test.describe('로그인 페이지 (/login) 리소스 분석', () => {
    test(`JS 번들 총 크기가 ${BUDGET.JS_TOTAL_BYTES / 1024}KB 미만이어야 한다`, async ({
      page,
    }) => {
      await page.goto('/login', { waitUntil: 'networkidle' });

      const jsResources = await collectJSResources(page);
      const totalBytes = jsResources.reduce((sum, r) => sum + r.transferSize, 0);
      const totalKB = (totalBytes / 1024).toFixed(1);

      console.log(`[번들 예산/로그인] JS 총 크기: ${totalKB}KB`);

      expect(
        totalBytes,
        `로그인 페이지 JS 번들(${totalKB}KB)이 예산(${BUDGET.JS_TOTAL_BYTES / 1024}KB)을 초과합니다`
      ).toBeLessThan(BUDGET.JS_TOTAL_BYTES);
    });
  });
});
