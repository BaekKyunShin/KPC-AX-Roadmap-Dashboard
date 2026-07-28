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
 *
 * **`behavior: 'instant'` + 목표 clamp 가 필수인 이유** (2026-07-28 규명):
 * `globals.css` 가 `html { scroll-behavior: smooth }` 를 걸어두어, 그냥
 * `window.scrollTo(0, 400)` 을 부르면 스크롤이 애니메이션으로 이동한다. 게다가
 * 목표(400)가 실제 최대 스크롤(예: 261)보다 크면 애니메이션이 목표에 영원히
 * 도달하지 못해 **미완료 상태로 남는다**. 그 상태에서 DOM 높이가 조금이라도
 * 변하면 브라우저가 애니메이션을 취소하며 스크롤이 **시작점(0)으로 되돌아간다**.
 * 그러면 `{ scroll: false }` 가 올바로 지정된 화면에서도 테스트가 실패한다
 * (계측 결과 `scrollTop=0` 대입도 `scrollTo` 호출도 없이 0 이 됐다).
 *
 * 실사용자의 휠 스크롤은 애니메이션이 아니라 즉시 이동이므로, 테스트도 즉시
 * 이동으로 같은 조건을 만들어야 한다. 원래 잡으려던 회귀(`scroll: false` 누락)는
 * 그대로 검출된다 — 누락되면 라우터가 실제로 최상단으로 보내기 때문이다.
 */
export async function scrollToY(page: Page, targetY: number = DEFAULT_TARGET_PX): Promise<number> {
  await page.evaluate((y) => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: Math.min(y, max), behavior: 'instant' });
  }, targetY);
  // 스크롤이 멈췄는지(연속 프레임 동일) 확인 — 진행 중인 이동을 남기지 않는다
  await page
    .waitForFunction(
      () => {
        const w = window as unknown as { __sy?: number; __sn?: number };
        const y = Math.round(window.scrollY);
        if (w.__sy === y) {
          w.__sn = (w.__sn ?? 0) + 1;
        } else {
          w.__sy = y;
          w.__sn = 0;
        }
        return (w.__sn ?? 0) >= 2;
      },
      undefined,
      { timeout: 2000, polling: 'raf' }
    )
    .catch(() => {});
  return await page.evaluate(() => window.scrollY);
}

/**
 * 문서 높이가 안정될 때까지 대기 (최대 1초).
 *
 * 필터·리셋 직후에는 스켈레톤 → 실제 목록 순으로 렌더되어 scrollHeight 가 출렁인다.
 * 그 순간에 측정하면 스크롤 보존 여부를 잘못 판정하므로 높이가 멎은 뒤에 잰다.
 */
async function waitForStableHeight(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const w = window as unknown as { __h?: number; __n?: number };
        const h = document.documentElement.scrollHeight;
        if (w.__h === h) {
          w.__n = (w.__n ?? 0) + 1;
        } else {
          w.__h = h;
          w.__n = 0;
        }
        return (w.__n ?? 0) >= 3;
      },
      undefined,
      { timeout: 1000, polling: 100 }
    )
    .catch(() => {});
}

/**
 * 액션 실행 후 스크롤 위치가 보존되는지 검증.
 *
 * - 액션 실행 전 scrollY 기록
 * - 액션 실행 (필터 변경 등)
 * - waitFor 콜백으로 URL/네트워크 안정화 대기 + 문서 높이 안정화 대기
 * - 액션 후 scrollY 가 tolerance(기본 50px) 이내인지 확인
 *
 * **문서 높이 축소 보정**: 필터 적용으로 목록이 짧아지면 문서 높이가 줄고, 브라우저는
 * scrollY 를 새 최대 스크롤 위치로 **clamp** 한다. 이는 `scroll: false` 로도 막을 수
 * 없는 브라우저 기본 동작이므로(존재하지 않는 위치는 보존 불가), 기대값을
 * `min(before, 액션 후 maxScroll)` 로 보정한다.
 *
 * 이 보정은 원래 잡으려던 회귀를 약화시키지 않는다 — `scroll: false` 가 누락되면
 * 문서가 충분히 긴 상태에서도 scrollY 가 0 이 되므로 여전히 실패한다.
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
  tolerance: number = DEFAULT_TOLERANCE_PX
): Promise<void> {
  const before = await page.evaluate(() => window.scrollY);
  await action();
  if (waitFor) await waitFor();
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await waitForStableHeight(page);

  const { scrollY: after, maxScroll } = await page.evaluate(() => ({
    scrollY: window.scrollY,
    maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  }));

  const expected = Math.min(before, maxScroll);
  expect(
    Math.abs(after - expected),
    `스크롤 위치 변동이 ${tolerance}px 초과: before=${before}, after=${after}, ` +
      `기대=${expected} (액션 후 maxScroll=${maxScroll})`
  ).toBeLessThan(tolerance);
}
