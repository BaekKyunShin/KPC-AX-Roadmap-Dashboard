// e2e/scroll-ux/ops-users-filter.spec.ts
// PR1 P0 회귀 — UserManagementTable 필터·검색 변경 시 스크롤 위치 보존
// 주의: 같은 파일의 scrollPositionRef+useLayoutEffect 복원 로직은 router.refresh
// 액션 전용. 필터 변경은 router.replace 만 호출하므로 {scroll: false} 필요.
import { test } from '../fixtures/auth.fixture';
import {
  isScrollable,
  scrollToY,
  expectScrollPreserved,
} from '../helpers/scroll.helper';

test.describe('스크롤 위치 유지 — 운영 사용자 관리 필터', () => {
  test('검색어 입력(디바운스) 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/ops/users');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '사용자 관리 시드 데이터 부족');
    await scrollToY(page, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page.getByPlaceholder(/검색|이름|이메일/i).first().fill('테스트');
      },
      async () => {
        await page.waitForURL(/search=/, { timeout: 5_000 });
      },
    );
  });
});
