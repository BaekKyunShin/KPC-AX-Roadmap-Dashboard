// e2e/scroll-ux/consultant-projects-filter.spec.ts
// PR1 P0 회귀 — consultant/projects ProjectList 필터·리셋 시 스크롤 위치 보존
import { test, expect } from '../fixtures/auth.fixture';
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import {
  CONSULTANT_PROJECT_STATUS,
  registerConsultantProjectSeed,
} from '../helpers/bulk-seed.helper';

// 컨설턴트 담당 프로젝트가 3개뿐이라 스크롤이 생기지 않아 아래 감시가 skip 됐다.
// 이 파일 전용으로 배정 프로젝트를 만들고 끝나면 지운다.
registerConsultantProjectSeed();

test.describe('스크롤 위치 유지 — 컨설턴트 프로젝트 목록 필터', () => {
  test('상태 필터 변경 시 스크롤 위치 유지', async ({ consultantPage: page }) => {
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '컨설턴트 담당 프로젝트 시드 데이터 부족');
    const statusCombo = page.getByRole('combobox').first();
    const hasCombo = await statusCombo.isVisible().catch(() => false);
    test.skip(!hasCombo, '상태 필터 컴보박스 미노출');

    await scrollToRevealing(page, statusCombo, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await statusCombo.click();
        await page.getByRole('option').nth(1).click();
      },
      async () => {
        await page.waitForURL(/status=/);
      },
      // 기본 50px 대신 100px — 필터를 적용하면 상단에 필터 뱃지(`FilterBadge`)가 생겨
      // 콘텐츠가 아래로 밀리고, 브라우저가 보던 요소를 유지하려 스크롤을 ~68px 조정한다
      // (2026-07-30 계측: 130 → 62, 문서는 여전히 637px 로 충분해 clamp 가 아니다).
      // 이는 스크롤 보존 관점에서 바람직한 동작이므로 오차로 인정한다.
      //
      // ⚠️ **이 케이스의 감지력은 약하다** — `{ scroll: false }` 를 지워도 통과한다
      // (결함 주입으로 확인). 쿼리를 **추가**하는 `router.replace` 는 Next.js 가 스크롤을
      // 건드리지 않기 때문이다. 쿼리를 **제거**하는 아래 초기화 테스트는 정상 검출된다.
      // `ops-audit-filter` 의 검색 케이스와 동일한 구조적 한계다.
      100
    );
  });

  test('필터 초기화 시 스크롤 위치 유지', async ({ consultantPage: page }) => {
    // status=NEW 로 진입하면 목록이 0건이 되어(담당 프로젝트는 배정 이후 상태다)
    // 스크롤 자체가 생기지 않는다 → 시드 상태로 진입해 목록을 남긴다.
    // 이 필터는 워크플로 단계 키가 아니라 실제 status 값을 쓴다
    // (`consultant/projects/actions.ts:76`).
    await page.goto(`/consultant/projects?status=${CONSULTANT_PROJECT_STATUS}`);
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '컨설턴트 프로젝트 시드 데이터 부족');

    const resetButton = page.getByRole('button', { name: /초기화|리셋/ }).first();
    const hasReset = await resetButton.isVisible().catch(() => false);
    test.skip(!hasReset, '초기화 버튼 미노출');

    await scrollToRevealing(page, resetButton, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await resetButton.click();
      },
      async () => {
        await expect(page).toHaveURL('/consultant/projects');
      }
    );
  });
});
