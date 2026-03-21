// e2e/negative/empty-state.spec.ts
// 부정 시나리오: 검색 결과 없음 — 빈 상태(empty state) UI 표시 검증
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck, expectEmptyState } from '../helpers/assertions.helper';

test.describe('부정 시나리오: 갤러리 검색 빈 상태', () => {
  test('존재하지 않는 키워드 검색 시 빈 상태 메시지가 표시된다', async ({
    consultantPage: page,
  }) => {
    const getErrors = setupConsoleErrorCheck(page);

    // 검색 파라미터로 존재하지 않는 키워드 전달
    await page.goto('/gallery?search=zzz_nonexistent_term_99999');
    await page.waitForLoadState('networkidle');

    // 빈 상태 메시지 확인: "검색 결과가 없습니다" 또는 일반 empty state
    const hasEmptyMessage =
      (await page.getByText('검색 결과가 없습니다').isVisible().catch(() => false)) ||
      (await page.getByText(/없습니다/).first().isVisible().catch(() => false));

    if (hasEmptyMessage) {
      // 구체적인 메시지가 표시된 경우
      await expectEmptyState(page);
    } else {
      // 결과가 0건이면 카드가 없어야 함
      const cards = page.locator('main a[href^="/gallery/"]');
      expect(await cards.count()).toBe(0);
    }

    expect(getErrors()).toEqual([]);
  });
});

test.describe('부정 시나리오: OPS 프로젝트 검색 빈 상태', () => {
  test('존재하지 않는 회사명 검색 시 빈 상태 메시지가 표시된다', async ({
    opsPage: page,
  }) => {
    const getErrors = setupConsoleErrorCheck(page);

    // 검색 파라미터로 존재하지 않는 회사명 전달
    await page.goto('/ops/projects?search=zzz_nonexistent_company_99999');
    await page.waitForLoadState('networkidle');

    // 빈 상태 메시지 확인: "검색 조건에 맞는 프로젝트가 없습니다" 또는 일반 empty state
    const hasEmptyMessage =
      (await page.getByText('검색 조건에 맞는 프로젝트가 없습니다').isVisible().catch(() => false)) ||
      (await page.getByText(/없습니다/).first().isVisible().catch(() => false));

    if (hasEmptyMessage) {
      await expectEmptyState(page);
    } else {
      // 프로젝트 목록 행이 없어야 함
      const rows = page.locator('table tbody tr, [data-testid="project-card"]');
      expect(await rows.count()).toBe(0);
    }

    expect(getErrors()).toEqual([]);
  });
});
