// e2e/scroll-ux/notices-pagination.spec.ts
// PR1 P0 회귀 — NoticePagination 페이지 변경 시 스크롤 위치 보존
import { test } from '../fixtures/auth.fixture';
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import { registerNoticeSeed } from '../helpers/bulk-seed.helper';

// 공지 시드가 0건이라 스크롤이 생기지 않아 아래 감시가 skip 됐다.
// 이 파일 전용으로 공지를 만들고 끝나면 지운다.
registerNoticeSeed();

// 공지 목록은 **한 페이지에 10개 고정**(per_page=10)이라 시드를 늘려도 문서 높이가
// 그대로다 — 기본 1280×720 에서 여유가 168px 뿐이라 isScrollable 임계(200px)에 32px
// 모자라 감시가 skip 됐다. 노트북 크기로 낮춰 실사용자가 실제로 스크롤을 겪는 조건을
// 만든다. PR 1 에서 도입한 scrollToRevealing 이 클릭 자동 스크롤 함정을 막아주므로
// 이 축소는 안전하다(HANDOFF GOTCHAS 의 금지는 그 함정 때문이었다).
test.use({ viewport: { width: 1280, height: 640 } });

test.describe('스크롤 위치 유지 — 공지사항 페이지네이션', () => {
  test('2페이지 버튼 클릭 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/notices');
    await page.waitForLoadState('networkidle');

    const page2Button = page.getByRole('button', { name: '2', exact: true });
    const hasMultiplePages = await page2Button.isVisible().catch(() => false);
    test.skip(
      !hasMultiplePages,
      '공지사항이 페이지네이션 발생할 만큼 충분하지 않음 (2페이지 없음)'
    );

    test.skip(!(await isScrollable(page)), '공지사항 페이지 콘텐츠가 스크롤 가능 분량 미만');
    // 페이지 버튼은 목록 하단 — 400 에 머물면 클릭 시 Playwright 가 아래로 자동
    // 스크롤해 기준점이 흔들린다
    await scrollToRevealing(page, page2Button, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await page2Button.click();
      },
      async () => {
        await page.waitForURL(/page=2/);
      }
    );
  });
});
