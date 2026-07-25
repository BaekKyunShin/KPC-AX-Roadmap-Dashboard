// e2e/public/demo.spec.ts
// TEST_PLAN Phase 1.2: 데모 페이지
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('Phase 1.2: 데모 페이지 (/demo)', () => {
  test.describe.configure({ mode: 'parallel' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/demo');
  });

  test('페이지 정상 로딩 + 콘솔 에러 없음', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/demo');
    await expect(page.getByText('기업 정보 (샘플)')).toBeVisible();
    expect(getErrors()).toEqual([]);
  });

  test('"데모 화면" 배지 표시', async ({ page }) => {
    await expect(page.getByText('데모 화면', { exact: true })).toBeVisible();
  });

  test('"로그인" 링크 → /login 이동', async ({ page }) => {
    await page.getByRole('link', { name: '로그인' }).click();
    await expect(page).toHaveURL('/login');
  });

  test('"회원가입" 링크 → /register 이동', async ({ page }) => {
    await page.getByRole('link', { name: '회원가입' }).click();
    await expect(page).toHaveURL('/register');
  });

  test('샘플 데이터 경고 배너 표시', async ({ page }) => {
    await expect(page.getByText(/실제 AI 생성 결과가 아닌 샘플 데이터/)).toBeVisible();
  });

  test('기업 정보 카드 — (주)샘플유통 표시', async ({ page }) => {
    // 기업 정보 카드와 진단 요약 문단에 동일 텍스트가 있어 strict mode 회피 필요
    await expect(page.getByText('(주)샘플유통').first()).toBeVisible();
  });

  test('로드맵 탭 — 산인공 양식 v2 는 "훈련과정 명세서" 1개', async ({ page }) => {
    // 데모 페이지 탭은 커스텀 button. 양식 v2(2026-07-13 개정)에서 Ⅲ장이
    // 훈련과정 명세서 1섹션으로 축소됐다 — 단일 출처: src/types/roadmap-ui.ts ROADMAP_TABS
    const specTab = page.getByRole('button', { name: '훈련과정 명세서' });
    await expect(specTab).toBeVisible();

    // 탭 영역에 버튼이 정확히 1개 — 탭이 늘면 즉시 실패해 SSOT 이탈을 잡는다.
    await expect(page.locator('main nav').getByRole('button')).toHaveCount(1);

    // v1 삭제 탭 역단언 (회귀 감시)
    await expect(page.getByRole('button', { name: '역량 모델링' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '훈련체계도' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '연간 훈련계획' })).toHaveCount(0);

    // 클릭해도 활성 상태가 유지되고 콘텐츠가 렌더된다
    await specTab.click();
    await expect(specTab).toBeVisible();
  });

  test('"지금 시작하기" CTA → /register 이동', async ({ page }) => {
    const cta = page.getByRole('link', { name: '지금 시작하기' });
    await cta.click();
    await expect(page).toHaveURL('/register');
  });
});
