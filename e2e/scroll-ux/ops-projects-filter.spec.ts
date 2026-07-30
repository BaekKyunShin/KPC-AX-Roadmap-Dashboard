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
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import { registerConsultantProjectSeed } from '../helpers/bulk-seed.helper';

// 아래 두 번째 감시는 `?industry=IT/SW` 진입 시 목록이 2건이라 스크롤이 없어 skip 됐다.
// 시드는 업종을 IT/SW·제조업으로 번갈아 만들므로 절반이 IT/SW 로 잡혀 목록이 길어진다.
// (헬퍼 이름은 consultant 지만 `/ops/projects` 는 전체 프로젝트를 보여주므로 그대로 쓴다.
//  created_at 이 2025년으로 고정돼 시드기업A~D 를 2페이지로 밀어내지 않는다 —
//  `e2e/ops/projects-deeplink.spec.ts` 가 그 노출에 의존한다.)
registerConsultantProjectSeed();

test.describe('스크롤 위치 유지 — 운영 프로젝트 관리 필터', () => {
  test('업종 필터 변경 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '운영 프로젝트 시드 데이터 부족');

    const industryCombo = page.getByRole('combobox', { name: /업종/ });
    await scrollToRevealing(page, industryCombo, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await industryCombo.click();
        await page.getByRole('option').nth(1).click();
      },
      async () => {
        await page.waitForURL(/industry=/);
      }
    );
  });

  // ⚠️ 2026-07-29 page.tsx 가 searchParams 를 서버 조회에 반영하면서 조건이 달라졌다.
  //   그 전에는 서버가 industry 를 무시해 어떤 값으로 진입해도 전체 4건이 그려졌고
  //   페이지가 충분히 길어 이 테스트가 실행됐다. 이제는 필터가 실제로 적용돼 목록이
  //   2건으로 줄어 isScrollable 가드에 걸리므로, 시드가 늘기 전까지는 skip 된다.
  //
  //   진입 URL 은 시드에 실재하는 업종으로 맞춰 둔다(시드 업종은 '제조업'·'IT/SW' 뿐).
  //   구 '?industry=IT' 는 0건이라 필터가 걸렸는지조차 확인할 수 없었다.
  //
  //   ⚠️ 뷰포트를 낮춰 스크롤 여지를 만드는 우회는 쓰지 말 것. 초기화 버튼이 뷰포트
  //   밖으로 밀려나면 Playwright 가 클릭 전에 요소를 보이게 하려고 스스로 스크롤해
  //   (계측: 클릭 핸들러 진입 시점에 이미 400 → 160) 제품 결함처럼 보이는 실패가
  //   만들어진다. 제품 동작은 정상이었다.
  //
  //   근본 해소는 시드 확대이며, 그때 다른 9개 spec 이 의존하는 '첫 프로젝트'
  //   (created_at DESC) 전제를 함께 손봐야 한다(seed.sql 주석 참조).
  test('필터 초기화 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/ops/projects?industry=IT%2FSW');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '업종 필터 적용 후 목록이 짧아 스크롤 불가');

    const resetButton = page.getByRole('button', { name: /초기화|리셋/ }).first();
    const hasReset = await resetButton.isVisible().catch(() => false);
    test.skip(!hasReset, '필터 초기화 버튼 미노출');

    await scrollToRevealing(page, resetButton, 400);

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
