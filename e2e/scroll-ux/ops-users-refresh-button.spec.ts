// e2e/scroll-ux/ops-users-refresh-button.spec.ts
// PR1 P0 회귀 — RefreshButton "다시 시도" 클릭 시 풀 리로드(window.location.reload)
// 가 발생하지 않아야 함. router.refresh() 로 교체된 후에는 페이지 navigation 이
// 일어나지 않으므로 클라이언트 상태(스크롤·폼 입력)가 유지됨.
import { test, expect } from '../fixtures/auth.fixture';

test.describe('스크롤 위치 유지 — RefreshButton', () => {
  test('"다시 시도" 클릭 시 풀 페이지 리로드 발생하지 않음', async ({
    opsPage: page,
  }) => {
    await page.goto('/ops/users');
    await page.waitForLoadState('networkidle');

    const refreshButton = page.getByRole('button', { name: '다시 시도' });
    const hasButton = await refreshButton.isVisible().catch(() => false);
    test.skip(
      !hasButton,
      'RefreshButton 은 DB 에러 분기에서만 노출 — 정상 상태에서는 미노출',
    );

    // 풀 리로드 감지: navigation 이벤트로 'reload' 발생 여부 추적
    let didReload = false;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        didReload = true;
      }
    });

    await refreshButton.click();
    await page.waitForTimeout(1000);

    expect(
      didReload,
      'window.location.reload() 가 호출되어 풀 페이지 리로드가 발생했습니다',
    ).toBe(false);
  });
});
