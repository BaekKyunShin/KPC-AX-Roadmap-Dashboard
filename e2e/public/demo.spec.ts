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
    await expect(
      page.getByText(/실제 AI 생성 결과가 아닌 샘플 데이터/),
    ).toBeVisible();
  });

  test('기업 정보 카드 — (주)샘플유통 표시', async ({ page }) => {
    // 기업 정보 카드와 진단 요약 문단에 동일 텍스트가 있어 strict mode 회피 필요
    await expect(page.getByText('(주)샘플유통').first()).toBeVisible();
  });

  test('로드맵 탭 4개 전환 (산인공 양식)', async ({ page }) => {
    // 데모 페이지 탭은 커스텀 button — OFA 통합 후 산인공 4개 탭 구조
    // 기본 활성: 역량 모델링
    const modelingTab = page.getByRole('button', { name: '역량 모델링' });
    const matrixTab = page.getByRole('button', { name: '훈련체계도' });
    const planTab = page.getByRole('button', { name: '연간 훈련계획' });
    const specTab = page.getByRole('button', { name: '훈련과정 명세서' });

    // 모든 탭이 렌더되는지 확인
    await expect(modelingTab).toBeVisible();
    await expect(matrixTab).toBeVisible();
    await expect(planTab).toBeVisible();
    await expect(specTab).toBeVisible();

    // 다른 탭으로 전환 시 해당 탭이 활성화되는지 확인 (클릭 가능성)
    await matrixTab.click();
    await planTab.click();
    await specTab.click();
    await modelingTab.click();
  });

  test('"지금 시작하기" CTA → /register 이동', async ({ page }) => {
    const cta = page.getByRole('link', { name: '지금 시작하기' });
    await cta.click();
    await expect(page).toHaveURL('/register');
  });
});
