// e2e/public/demo.spec.ts
// TEST_PLAN Phase 1.2: 데모 페이지
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('Phase 1.2: 데모 페이지 (/demo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo');
  });

  test('페이지 정상 로딩 + 콘솔 에러 없음', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/demo');
    await expect(page.getByText('KPC AI 로드맵')).toBeVisible();
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

  test('기업 정보 카드 — (주)샘플제조 표시', async ({ page }) => {
    await expect(page.getByText('(주)샘플제조')).toBeVisible();
  });

  test('로드맵 탭 3개 전환', async ({ page }) => {
    // 데모 페이지 탭은 커스텀 button (shadcn Tabs 아님)
    // 기본 활성: 과정 체계도
    const matrixTab = page.getByRole('button', { name: '과정 체계도' });
    const coursesTab = page.getByRole('button', { name: '과정 상세' });
    const pblTab = page.getByRole('button', { name: 'PBL 과정' });

    // 과정 체계도 — 기본 활성 상태
    await expect(matrixTab).toHaveClass(/border-purple-500/);

    // 과정 상세 탭 클릭
    await coursesTab.click();
    await expect(coursesTab).toHaveClass(/border-purple-500/);

    // PBL 과정 탭 클릭
    await pblTab.click();
    await expect(pblTab).toHaveClass(/border-purple-500/);
  });

  test('"지금 시작하기" CTA → /register 이동', async ({ page }) => {
    const cta = page.getByRole('link', { name: '지금 시작하기' });
    await cta.click();
    await expect(page).toHaveURL('/register');
  });
});
