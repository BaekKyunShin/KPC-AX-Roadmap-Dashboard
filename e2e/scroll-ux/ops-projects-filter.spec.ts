// e2e/scroll-ux/ops-projects-filter.spec.ts
// PR1 P0 회귀 — ops/projects ProjectList 필터·리셋 시 스크롤 위치 보존
//
// 이력: 2026-07-26 시드 확대(시드기업C·D)로 이 spec 이 처음 실제 실행되면서 실패해
//   `test.fixme` 로 보류됐다가, 2026-07-28 원인 규명 후 복구됐다.
//
// 당시 관측된 궤적 `261 → 157 → 37 → 9 → 0` 은 제품 결함이 아니라 **테스트 헬퍼가
//   만든 조건** 때문이었다. `scrollToY` 가 `window.scrollTo(0, 400)` 을 부르는데
//   `globals.css` 의 `html { scroll-behavior: smooth }` 로 애니메이션이 걸리고,
//   목표(400)가 실제 최대 스크롤(261)보다 커서 애니메이션이 미완료로 남는다.
//   그 상태에서 목록 갱신으로 DOM 높이가 변하면 브라우저가 애니메이션을 취소하며
//   시작점(0)으로 되돌린다. 계측 결과 `scrollTop=0` 대입도 `scrollTo` 호출도 0건이었고,
//   `ProjectList` 는 처음부터 스크롤을 건드리지 않았다.
//   → `scrollToY` 를 `behavior:'instant'` + 목표 clamp + 정착 대기로 고쳐 해결
//     (실사용자의 휠 스크롤과 같은 조건). 상세는 helpers/scroll.helper.ts 주석 참조.
import { test, expect } from '../fixtures/auth.fixture';
import { isScrollable, scrollToY, expectScrollPreserved } from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 운영 프로젝트 관리 필터', () => {
  test('업종 필터 변경 시 스크롤 위치 유지', async ({ opsPage: page }) => {
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

  // ⚠️ 진입 URL 은 시드에 실재하는 업종이어야 한다.
  //   2026-07-28 page.tsx 가 searchParams 를 서버 조회에 반영하도록 고쳐지면서,
  //   시드에 없는 값(구 '?industry=IT')으로 진입하면 목록이 0건이 되고 페이지가
  //   스크롤 불가가 되어 이 테스트가 실패가 아니라 **조용한 skip** 으로 죽는다.
  //   시드 업종은 '제조업' 과 'IT/SW' 뿐이므로 인코딩한 'IT%2FSW' 를 쓴다.
  test('필터 초기화 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/ops/projects?industry=IT%2FSW');
    await page.waitForLoadState('networkidle');

    test.skip(
      !(await isScrollable(page)),
      '업종 필터 적용 후 목록이 짧아 스크롤 불가 — 시드 확대 필요'
    );
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
