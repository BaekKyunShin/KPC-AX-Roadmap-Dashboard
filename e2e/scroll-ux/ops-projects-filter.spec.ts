// e2e/scroll-ux/ops-projects-filter.spec.ts
// PR1 P0 회귀 — ops/projects ProjectList 필터·리셋 시 스크롤 위치 보존
//
// ⚠️ 알려진 제품 결함으로 **전체 보류(test.fixme)** — 2026-07-26, E2E v2 정합 작업 중 발견.
//
// 증상: `/ops/projects` 에서 업종 필터를 바꾸거나 「필터 초기화」를 누르면 스크롤이
//   최상단(0)으로 이동한다. scrollY 궤적 예: 261 → 157 → 37 → 9 → 0
//   (globals.css 의 `scroll-behavior: smooth` 때문에 애니메이션으로 관찰된다.)
//   같은 시점의 maxScroll 은 227 이므로 **문서 축소로 인한 브라우저 clamp 가 아니라
//   실제 스크롤 리셋**이다. 재현은 간헐적(초기화 경로는 상시, 필터 변경 경로는 flaky).
//
// 조사 결과: `ProjectList.handleResetFilters` / `updateParams` 는 모두
//   `router.replace(..., { scroll: false })` 를 올바르게 호출하고 focus()·scrollTo()
//   부작용도 없다(ProjectList.tsx:184, :291). 근본 원인 미규명.
//
// 왜 이제야 드러났나: 운영 프로젝트 시드가 2건뿐이라 페이지가 스크롤 불가였고,
//   `isScrollable` 가드에 걸려 CI 에서 **한 번도 실행되지 않은 채 skip** 되어 왔다.
//   E2E 시드 확대(시드기업C·D 추가)로 목록이 스크롤 가능해지며 노출됐다.
//
// 제품 수정은 HWPX v2 양식 정합과 무관하고 UI 동작 변경이라 별도 과제로 분리한다
//   — 사용자 결정(2026-07-26). 수정 후 아래 `test.fixme` 를 `test` 로 되돌릴 것.
import { test, expect } from '../fixtures/auth.fixture';
import { isScrollable, scrollToY, expectScrollPreserved } from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 운영 프로젝트 관리 필터', () => {
  test.fixme('업종 필터 변경 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '운영 프로젝트 시드 데이터 부족');
    await scrollToY(page, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page.getByRole('combobox', { name: /업종/ }).click();
        await page.getByRole('option').nth(1).click();
      },
      async () => {
        await page.waitForURL(/industry=/);
      }
    );
  });

  test.fixme('필터 초기화 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/ops/projects?industry=IT');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '운영 프로젝트 시드 데이터 부족');
    await scrollToY(page, 400);

    const resetButton = page.getByRole('button', { name: /초기화|리셋/ }).first();
    const hasReset = await resetButton.isVisible().catch(() => false);
    test.skip(!hasReset, '필터 초기화 버튼 미노출');

    await expectScrollPreserved(
      page,
      async () => {
        await resetButton.click();
      },
      async () => {
        await expect(page).toHaveURL('/ops/projects');
      }
    );
  });
});
