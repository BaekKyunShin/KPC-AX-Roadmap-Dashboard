// e2e/public/mockup.spec.ts
// 결과물 제출 목업 페이지 5종 + 랜딩 smoke 테스트
// 목업 상태 (실제 기능 미구현). 실기능 승격 시 E2E 확장 필요.
// 후속 작업: docs/2026-04-21-e2e-followup-plan.md
import { test, expect } from '@playwright/test';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

type MockupRoute = {
  path: string;
  label: string;
};

const MOCKUP_ROUTES: readonly MockupRoute[] = [
  { path: '/mockup', label: '목업 인덱스' },
  { path: '/mockup/consultant-deliverable-tab', label: '컨설턴트 — 프로젝트 결과물 탭' },
  { path: '/mockup/consultant-results', label: '컨설턴트 — 결과물 관리' },
  { path: '/mockup/ops-deliverable-section', label: '운영관리자 — 프로젝트 결과물 섹션' },
  { path: '/mockup/ops-results', label: '운영관리자 — 결과물 관리' },
  { path: '/mockup/ops-templates', label: '운영관리자 — 서류 템플릿 관리' },
];

test.describe('결과물 제출 목업 smoke', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const route of MOCKUP_ROUTES) {
    test(`${route.label} (${route.path}) — 렌더 + 콘솔 에러 없음`, async ({ page }) => {
      const getErrors = setupConsoleErrorCheck(page);
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      // 목업 배너: 전 페이지 공통
      await expect(page.getByText(/목업 미리보기/)).toBeVisible();

      // 사이드바 브랜드 링크 (Layout)
      await expect(
        page.getByRole('link', { name: '결과물 제출 목업' }),
      ).toBeVisible();

      expect(getErrors()).toEqual([]);
    });
  }

  test('사이드바에서 모든 목업 페이지로 네비게이션 가능', async ({ page }) => {
    await page.goto('/mockup');
    await page.waitForLoadState('networkidle');

    // 컨설턴트 그룹의 첫 항목 클릭
    await page.getByRole('link', { name: /프로젝트 결과물 탭/ }).click();
    await expect(page).toHaveURL('/mockup/consultant-deliverable-tab');

    // 운영관리자 그룹의 첫 항목 클릭
    await page.getByRole('link', { name: /프로젝트 결과물 섹션/ }).click();
    await expect(page).toHaveURL('/mockup/ops-deliverable-section');
  });
});
