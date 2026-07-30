// e2e/scroll-ux/notices-search.spec.ts
// PR1 P0 회귀 — NoticeSearchBar 검색·리셋 시 스크롤 위치 보존
import { test, expect } from '../fixtures/auth.fixture';
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import { SEED_TAG, registerNoticeSeed } from '../helpers/bulk-seed.helper';

// 공지 시드가 0건이라 스크롤이 생기지 않아 아래 감시가 skip 됐다.
// 이 파일 전용으로 공지를 만들고 끝나면 지운다.
registerNoticeSeed();

// 공지 목록은 **한 페이지에 10개 고정**(per_page=10)이라 시드를 늘려도 문서 높이가
// 그대로다 — 기본 1280×720 에서 여유가 168px 뿐이라 isScrollable 임계(200px)에 32px
// 모자라 감시가 skip 됐다. 노트북 크기로 낮춰 실사용자가 실제로 스크롤을 겪는 조건을
// 만든다. PR 1 에서 도입한 scrollToRevealing 이 클릭 자동 스크롤 함정을 막아주므로
// 이 축소는 안전하다(HANDOFF GOTCHAS 의 금지는 그 함정 때문이었다).
test.use({ viewport: { width: 1280, height: 640 } });

test.describe('스크롤 위치 유지 — 공지사항 검색', () => {
  test('검색어 입력 → 검색 버튼 클릭 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/notices');
    await page.waitForLoadState('networkidle');

    test.skip(
      !(await isScrollable(page)),
      '공지사항 시드 데이터가 스크롤 발생할 만큼 충분하지 않음'
    );
    const submitButton = page.locator('[data-testid="notice-search-bar"] button[type="submit"]');
    await scrollToRevealing(page, submitButton, 400);

    await expectScrollPreserved(
      page,
      async () => {
        // 0건이 되는 키워드로 검색하면 문서가 짧아져 기대값이 0 으로 보정되고, 스크롤이
        // 최상단으로 튀어도 통과해 버린다. 시드 제목으로 검색해 목록을 남긴다.
        await page.locator('[data-testid="notice-search-bar"] input[name="q"]').fill(SEED_TAG);
        await submitButton.click();
      },
      async () => {
        await page.waitForURL(/q=/);
      }
    );
  });

  test('검색어가 있을 때 초기화 버튼 클릭 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    // 0건이 되는 검색어로 진입하면 목록이 비어 스크롤 자체가 생기지 않는다 → 시드 제목으로
    await page.goto(`/notices?q=${encodeURIComponent(SEED_TAG)}`);
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '공지사항 시드 데이터가 부족');

    const resetButton = page.getByRole('button', { name: '필터 초기화' });
    const hasReset = await resetButton.isVisible().catch(() => false);
    test.skip(!hasReset, '초기화 버튼 미노출 (검색어 미적용 상태)');

    await scrollToRevealing(page, resetButton, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await resetButton.click();
      },
      async () => {
        await expect(page).toHaveURL('/notices');
      }
    );
  });
});
