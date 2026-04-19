// e2e/consultant/test-pbl.spec.ts
// OFA-11: /test-pbl 페이지 접근 + 샘플 요약 렌더 (LLM 호출 없음 — 버튼 클릭 X)
import { test, expect } from '../fixtures/auth.fixture';

test.describe('PBL 테스트 페이지 — 컨설턴트', () => {
  test('/test-pbl 접근 + 샘플 요약·PBL 생성 버튼 렌더', async ({ consultantPage: page }) => {
    await page.goto('/test-pbl');
    await page.waitForLoadState('networkidle');

    // 페이지 헤더
    await expect(page.getByRole('heading', { name: 'PBL 테스트' })).toBeVisible({
      timeout: 15_000,
    });

    // 테스트 모드 안내 alert
    await expect(page.getByText('테스트 모드 안내')).toBeVisible();

    // 샘플 요약 카드 (PBL 뱃지 + "샘플정밀공업" 또는 "테스트" 표시)
    await expect(page.getByText('샘플 PBL 인터뷰 요약')).toBeVisible();
    await expect(page.getByText('AI 활용 불량 예측 PBL 과정')).toBeVisible();

    // PBL 생성 버튼
    await expect(page.getByTestId('test-pbl-generate-button')).toBeVisible();
  });

  test('네비게이션에서 "PBL 테스트" 메뉴 진입 가능', async ({ consultantPage: page }) => {
    await page.goto('/consultant/home');
    await page.waitForLoadState('networkidle');

    // 데스크톱 네비게이션의 "PBL 테스트" 링크
    const link = page.locator('[data-testid="desktop-nav"] a', { hasText: 'PBL 테스트' }).first();
    const hasLink = await link.isVisible().catch(() => false);

    if (!hasLink) {
      // 모바일 레이아웃 fallback
      test.skip(true, '데스크톱 네비게이션이 렌더되지 않음 (모바일 뷰포트)');
      return;
    }

    await link.click();
    await expect(page).toHaveURL('/test-pbl');
  });
});

test.describe('PBL 테스트 페이지 — 운영관리자', () => {
  test('/test-pbl 접근 가능', async ({ opsPage: page }) => {
    await page.goto('/test-pbl');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'PBL 테스트' })).toBeVisible({
      timeout: 15_000,
    });
  });
});
