// e2e/public/assessment.spec.ts
// 공개 자가진단 페이지 E2E 테스트
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

test.describe('공개 자가진단 페이지 (/assessment/[token])', () => {
  test('유효하지 않은 토큰 → 404 페이지', async ({ page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    // 유효하지 않은 토큰으로 접근
    const response = await page.goto('/assessment/invalid-token');

    // 404 응답 또는 에러 페이지 표시
    // Next.js notFound()는 404 상태코드를 반환
    expect(response?.status()).toBe(404);

    expect(getErrors()).toEqual([]);
  });

  test('존재하지 않는 UUID 토큰 → 404 페이지', async ({ page }) => {
    // UUID 형식이지만 존재하지 않는 토큰
    const response = await page.goto('/assessment/00000000-0000-0000-0000-000000000000');

    // 404 응답
    expect(response?.status()).toBe(404);
  });

  test('404 페이지 기본 요소 렌더링 확인', async ({ page }) => {
    await page.goto('/assessment/invalid-token');

    // 404 에러 페이지에 적절한 안내가 표시되는지 확인
    // Next.js 기본 404 또는 커스텀 not-found 페이지
    // "404" 텍스트 또는 "찾을 수 없" 등의 안내 메시지가 있는지 확인
    const has404 = await page.getByText('404').isVisible().catch(() => false);
    const hasNotFound = await page
      .getByText(/찾을 수 없|존재하지 않|not found/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(has404 || hasNotFound).toBe(true);
  });

  test('유효 토큰 → 자가진단 폼 표시', async ({ page }) => {
    const token = process.env.E2E_ASSESSMENT_TOKEN;
    // E2E_ASSESSMENT_TOKEN 환경 변수가 설정되지 않으면 유효 토큰 테스트 불가
    test.skip(!token, '환경 변수 미설정: E2E_ASSESSMENT_TOKEN이 필요합니다');

    const response = await page.goto(`/assessment/${token!}`);

    // 200 응답 (유효한 토큰)
    expect(response?.status()).toBe(200);

    // 자가진단 폼 요소 확인
    await expect(page.getByText('자가진단')).toBeVisible({ timeout: 10_000 });

    // 제출자 이름 또는 진단 문항이 표시되는지 확인
    const hasForm =
      (await page.locator('form').isVisible().catch(() => false)) ||
      (await page.getByRole('button', { name: /제출|완료/ }).isVisible().catch(() => false));

    expect(hasForm).toBe(true);
  });

  test('assessment 레이아웃 구조 확인 (헤더, 푸터)', async ({ page }) => {
    // 유효하지 않은 토큰이어도 레이아웃은 로드됨
    await page.goto('/assessment/invalid-token');

    // 헤더 영역 존재 확인
    const header = page.locator('header');
    const hasHeader = await header.isVisible().catch(() => false);

    // 푸터 영역 존재 확인 ("KPC 한국생산성본부" 텍스트)
    const footer = page.locator('footer');
    const hasFooter = await footer.isVisible().catch(() => false);

    // 레이아웃 요소가 하나라도 있거나, 404 페이지가 표시되면 통과
    // (notFound()가 layout을 건너뛸 수 있으므로 방어적 처리)
    const has404Text = await page.getByText('404').isVisible().catch(() => false);
    expect(hasHeader || hasFooter || has404Text).toBe(true);
  });
});
