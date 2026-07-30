// e2e/scroll-ux/ops-users-filter.spec.ts
// PR1 P0 회귀 — UserManagementTable 필터·검색 변경 시 스크롤 위치 보존
// 주의: 같은 파일의 scrollPositionRef+useLayoutEffect 복원 로직은 router.refresh
// 액션 전용. 필터 변경은 router.replace 만 호출하므로 {scroll: false} 필요.
import { test } from '../fixtures/auth.fixture';
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import { SEED_TAG, registerConsultantSeed } from '../helpers/bulk-seed.helper';

// 사용자가 3명뿐(그중 컨설턴트 1명)이라 스크롤이 생기지 않아 이 감시가 skip 됐다.
// 운영관리자에게는 컨설턴트 역할만 보이므로 더미 컨설턴트를 만들고 끝나면 지운다.
registerConsultantSeed();

test.describe('스크롤 위치 유지 — 운영 사용자 관리 필터', () => {
  test('검색어 입력(디바운스) 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/ops/users');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '사용자 관리 시드 데이터 부족');
    const searchInput = page.getByPlaceholder(/검색|이름|이메일/i).first();
    await scrollToRevealing(page, searchInput, 400);

    await expectScrollPreserved(
      page,
      async () => {
        // 0건이 되는 키워드는 문서를 짧아지게 만들어 기대값이 0 으로 보정된다
        // (스크롤이 최상단으로 튀어도 통과) → 시드 이름으로 검색해 목록을 남긴다
        await searchInput.fill(SEED_TAG);
      },
      async () => {
        await page.waitForURL(/search=/, { timeout: 5_000 });
      }
    );
  });
});
