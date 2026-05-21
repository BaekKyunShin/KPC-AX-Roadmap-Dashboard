// e2e/helpers/scroll.helper.ts
// 스크롤 위치 보존 회귀 테스트 헬퍼 (PR1: 스크롤 UX P0 패치)
//
// 같은 페이지 내 쿼리 변경(필터·검색·페이지네이션·정렬) 시 router.push/replace 에
// `{ scroll: false }` 옵션이 누락되면 Next.js 기본값 `scroll: true` 가 적용되어
// 스크롤이 맨 위로 점프한다. 본 헬퍼는 액션 실행 전후 scrollY 가 보존되는지
// 검증해 회귀를 방지한다.
import { type Page, expect } from '@playwright/test';

const DEFAULT_TARGET_PX = 400;
const DEFAULT_TOLERANCE_PX = 50;
const MIN_SCROLLABLE_HEIGHT = 200;

/**
 * 페이지가 충분히 스크롤 가능한 분량을 가졌는지 확인.
 * 시드 데이터가 부족해 페이지 높이가 뷰포트보다 작으면 false.
 */
export async function isScrollable(page: Page): Promise<boolean> {
  const { pageHeight, viewportHeight } = await page.evaluate(() => ({
    pageHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  }));
  return pageHeight - viewportHeight >= MIN_SCROLLABLE_HEIGHT;
}

/**
 * 지정 위치로 스크롤한 뒤 실제 scrollY 를 반환.
 * 페이지 높이가 부족하면 max scroll 위치로 떨어질 수 있음.
 */
export async function scrollToY(
  page: Page,
  targetY: number = DEFAULT_TARGET_PX,
): Promise<number> {
  await page.evaluate((y) => window.scrollTo(0, y), targetY);
  await page.waitForFunction(
    (y) => window.scrollY >= Math.min(y, document.documentElement.scrollHeight - window.innerHeight) - 5,
    targetY,
    { timeout: 2000 },
  ).catch(() => {});
  return await page.evaluate(() => window.scrollY);
}

/**
 * 액션 실행 후 스크롤 위치가 보존되는지 검증.
 *
 * - 액션 실행 전 scrollY 기록
 * - 액션 실행 (필터 변경 등)
 * - waitFor 콜백으로 URL/네트워크 안정화 대기
 * - 액션 후 scrollY 가 tolerance(기본 50px) 이내인지 확인
 *
 * @example
 * await expectScrollPreserved(page, async () => {
 *   await page.getByRole('button', { name: '2' }).click();
 * }, async () => {
 *   await page.waitForURL(/page=2/);
 * });
 */
export async function expectScrollPreserved(
  page: Page,
  action: () => Promise<void>,
  waitFor?: () => Promise<void>,
  tolerance: number = DEFAULT_TOLERANCE_PX,
): Promise<void> {
  const before = await page.evaluate(() => window.scrollY);
  await action();
  if (waitFor) await waitFor();
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  const after = await page.evaluate(() => window.scrollY);
  expect(
    Math.abs(after - before),
    `스크롤 위치 변동이 ${tolerance}px 초과: before=${before}, after=${after}`,
  ).toBeLessThan(tolerance);
}
