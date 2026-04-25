// e2e/consultant/test-roadmap.spec.ts
// Phase C-13: 로드맵 테스트 페이지 접근 + 기본 요소 렌더링 (LLM 호출 없음)
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

// ─── 로드맵 테스트 페이지 (컨설턴트) ────────────────────────────────────────

test.describe('로드맵 테스트 페이지 — 컨설턴트', () => {
  test.beforeEach(async ({ consultantPage: page }) => {
    await page.goto('/test-roadmap');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 접근 + 기본 요소 렌더링 — 콘솔 에러 없음', async ({ consultantPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/test-roadmap');
    await page.waitForLoadState('networkidle');

    // 페이지 헤더 — "로드맵 테스트" heading 또는 승인 대기 카드
    const hasHeader = await page.getByRole('heading', { name: '로드맵 테스트' }).isVisible().catch(() => false);
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
    const hasMainForm = await page.getByRole('heading', { name: '로드맵 테스트' }).isVisible().catch(() => false);

    if (!hasMainForm) {
      // 미승인 → 대기 카드만 확인하고 종료
      await expect(page.getByText(/승인 대기|프로필/).first()).toBeVisible();
      return;
    }

    // 테스트 모드 안내 알림
    await expect(page.getByText('테스트 모드 안내')).toBeVisible();
    await expect(page.getByText(/입력값은 DB에 저장되지 않으며/)).toBeVisible();

    // 뒤로가기 버튼 (backLink.useBack: true → BackButton = <button>)
    await expect(page.getByRole('button', { name: /담당 프로젝트로 돌아가기/ })).toBeVisible();

    // V2 스테퍼 (InterviewStepper) + 첫 스텝(Ⅰ-1 수립 필요성) 섹션 헤딩이 렌더된다.
    // Tailwind 토큰화 이후 ".bg-card.shadow.rounded-lg" wrapper 는 사라졌으므로
    // 새 구조의 안정된 셀렉터(스텝 헤딩 + 테스트 모드 안내)를 사용한다.
    await expect(
      page.getByRole('heading', { name: /수립 필요성/ }).first(),
    ).toBeVisible();
  });

  test('샘플 채우기 버튼 클릭 → fixture 값이 폼에 주입됨', async ({ consultantPage: page }) => {
    const hasMainForm = await page
      .getByRole('heading', { name: '로드맵 테스트' })
      .isVisible()
      .catch(() => false);

    if (!hasMainForm) {
      test.skip(true, '미승인 컨설턴트 — 메인 폼 미렌더');
      return;
    }

    // 빈 상태에서는 confirm 없이 즉시 채워짐
    const fillSampleBtn = page.getByTestId('test-roadmap-fill-sample');
    await expect(fillSampleBtn).toBeVisible();
    await fillSampleBtn.click();

    // Step 1 ("개요") 의 "수립 필요성" textarea 에 fixture 값(샘플정밀공업 …) 이 채워짐
    const necessityTextarea = page.locator('textarea').first();
    await expect(necessityTextarea).toHaveValue(/샘플정밀공업|자동차 부품/);
  });
});

// ─── 로드맵 테스트 페이지 (운영관리자) ──────────────────────────────────────

test.describe('로드맵 테스트 페이지 — 운영관리자', () => {
  test('OPS 관리자도 접근 가능', async ({ opsPage: page }) => {
    await page.goto('/test-roadmap');
    await page.waitForLoadState('networkidle');

    // 로그인 페이지로 리다이렉트되지 않음
    await expect(page).not.toHaveURL('/login');

    // 페이지 헤더 확인 (CI 환경 클라이언트 컴포넌트 렌더 지연 대비)
    await expect(page.getByRole('heading', { name: '로드맵 테스트' })).toBeVisible({ timeout: 15_000 });

    // OPS 관리자용 뒤로가기 링크
    await expect(page.getByRole('button', { name: /프로젝트 관리로 돌아가기/ })).toBeVisible();
  });
});
