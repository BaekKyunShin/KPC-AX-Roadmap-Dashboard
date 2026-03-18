// e2e/consultant/test-roadmap.spec.ts
// Phase C-13: 테스트 로드맵 페이지 접근 + 기본 요소 렌더링 (LLM 호출 없음)
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

// ─── 테스트 로드맵 페이지 (컨설턴트) ────────────────────────────────────────

test.describe('테스트 로드맵 페이지 — 컨설턴트', () => {
  test.beforeEach(async ({ consultantPage: page }) => {
    await page.goto('/test-roadmap');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 접근 + 기본 요소 렌더링 — 콘솔 에러 없음', async ({ consultantPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/test-roadmap');
    await page.waitForLoadState('networkidle');

    // 페이지 헤더 — "테스트 로드맵" heading 또는 승인 대기 카드
    const hasHeader = await page.getByRole('heading', { name: '테스트 로드맵' }).isVisible().catch(() => false);
    const hasPendingCard = await page.getByText('승인 대기').isVisible().catch(() => false);

    // 승인된 컨설턴트이면 헤더가 보이고, 미승인이면 대기 카드가 보임
    expect(hasHeader || hasPendingCard).toBeTruthy();

    expect(getErrors()).toEqual([]);
  });

  test('접근 권한 검증 — 컨설턴트는 접근 가능', async ({ consultantPage: page }) => {
    // 로그인 페이지로 리다이렉트되지 않음
    await expect(page).not.toHaveURL('/login');

    // /test-roadmap URL에 머물러 있거나 페이지 콘텐츠가 렌더링됨
    const url = page.url();
    expect(url).toContain('/test-roadmap');
  });

  test('페이지 기본 요소 렌더링 — 승인된 컨설턴트', async ({ consultantPage: page }) => {
    // 승인된 컨설턴트인 경우에만 메인 폼이 보임
    const hasMainForm = await page.getByRole('heading', { name: '테스트 로드맵' }).isVisible().catch(() => false);

    if (!hasMainForm) {
      // 미승인 → 대기 카드만 확인하고 종료
      await expect(page.getByText(/승인 대기|프로필/)).toBeVisible();
      return;
    }

    // 테스트 모드 안내 알림
    await expect(page.getByText('테스트 모드 안내')).toBeVisible();
    await expect(page.getByText(/테스트 결과는 저장되지 않으며/)).toBeVisible();

    // 뒤로가기 링크
    await expect(page.getByRole('link', { name: /담당 프로젝트로 돌아가기/ })).toBeVisible();

    // 스테퍼가 표시됨 (인터뷰 스텝)
    // 스텝 컨텐츠 영역이 존재
    const contentArea = page.locator('.bg-white.shadow.rounded-lg');
    await expect(contentArea.first()).toBeVisible();
  });
});

// ─── 테스트 로드맵 페이지 (운영관리자) ──────────────────────────────────────

test.describe('테스트 로드맵 페이지 — 운영관리자', () => {
  test('OPS 관리자도 접근 가능', async ({ opsPage: page }) => {
    await page.goto('/test-roadmap');
    await page.waitForLoadState('networkidle');

    // 로그인 페이지로 리다이렉트되지 않음
    await expect(page).not.toHaveURL('/login');

    // 페이지 헤더 확인
    await expect(page.getByRole('heading', { name: '테스트 로드맵' })).toBeVisible();

    // OPS 관리자용 뒤로가기 링크
    await expect(page.getByRole('link', { name: /프로젝트 관리로 돌아가기/ })).toBeVisible();
  });
});
