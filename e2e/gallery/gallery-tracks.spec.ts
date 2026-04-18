// e2e/gallery/gallery-tracks.spec.ts
// OFA-11: 갤러리 트랙 필터 + 카드 뱃지 + 상세 분기 E2E
import { test, expect } from '../fixtures/auth.fixture';

test.describe('갤러리 트랙 필터·뱃지·상세 분기', () => {
  test('트랙 필터(전체/로드맵/PBL) 토글 렌더 + URL 반영', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    // 3개 토글 노출
    await expect(page.getByTestId('track-filter-ALL')).toBeVisible();
    await expect(page.getByTestId('track-filter-ROADMAP')).toBeVisible();
    await expect(page.getByTestId('track-filter-PBL')).toBeVisible();

    // ROADMAP 클릭 → URL에 track=ROADMAP
    await page.getByTestId('track-filter-ROADMAP').click();
    await expect(page).toHaveURL(/track=ROADMAP/, { timeout: 5_000 });

    // PBL 클릭 → URL에 track=PBL
    await page.getByTestId('track-filter-PBL').click();
    await expect(page).toHaveURL(/track=PBL/, { timeout: 5_000 });

    // ALL 클릭 → URL에서 track 제거
    await page.getByTestId('track-filter-ALL').click();
    await expect(page).not.toHaveURL(/track=/, { timeout: 5_000 });
  });

  test('카드에 트랙 뱃지 표시 + 클릭 시 ?track 쿼리로 상세 진입', async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('a[href*="/gallery/"]').first();
    const hasCard = await firstCard.isVisible().catch(() => false);

    if (!hasCard) {
      test.skip(true, '공유된 산출물이 없어 카드 검증을 건너뜀');
      return;
    }

    // 카드의 href 에 ?track 포함
    const href = await firstCard.getAttribute('href');
    expect(href).toMatch(/\?track=(ROADMAP|PBL)/);

    // TrackBadge 렌더 (최소 1개 이상)
    const badges = page.locator('[data-testid="track-badge"]');
    expect(await badges.count()).toBeGreaterThan(0);

    // 상세 진입
    await firstCard.click();
    await expect(page).toHaveURL(/\/gallery\/[a-f0-9-]+\?track=(ROADMAP|PBL)/, {
      timeout: 10_000,
    });

    // 상세 페이지에서도 트랙 뱃지 표출
    await expect(page.getByTestId('track-badge').first()).toBeVisible();
  });

  test('PBL 필터만 선택 시 PBL 카드만 남거나 빈 상태', async ({ opsPage: page }) => {
    await page.goto('/gallery?track=PBL');
    await page.waitForLoadState('networkidle');

    const badges = page.locator('[data-testid="track-badge"]');
    const count = await badges.count();

    if (count === 0) {
      // 빈 상태 메시지
      await expect(page.getByText(/공유된.*(PBL|산출물).*없습니다/)).toBeVisible();
    } else {
      // 모든 뱃지가 PBL
      for (let i = 0; i < count; i++) {
        await expect(badges.nth(i)).toHaveAttribute('data-track', 'PBL');
      }
    }
  });
});
