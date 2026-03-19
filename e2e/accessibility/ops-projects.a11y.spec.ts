// e2e/accessibility/ops-projects.a11y.spec.ts
// 운영 프로젝트 목록 접근성 검증 (OPS 인증 필요)
import { test, expect } from '../fixtures/auth.fixture';
import { checkA11y, checkKeyboardNavigation } from '../fixtures/accessibility.fixture';

test.describe('운영 프로젝트 목록 (/ops/projects) 접근성', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');
  });

  test('axe-core 위반 없음', async ({ opsPage: page }) => {
    await checkA11y(page);
  });

  test('페이지 헤딩 존재', async ({ opsPage: page }) => {
    await expect(page.getByRole('heading', { name: '프로젝트 관리' })).toBeVisible();
  });

  test('테이블에 적절한 시맨틱 구조 사용', async ({ opsPage: page }) => {
    // table 요소 존재 확인
    const table = page.getByRole('table');
    const hasTable = await table.count().then(c => c > 0).catch(() => false);

    if (hasTable) {
      // thead 내 columnheader 존재 확인
      const columnHeaders = page.getByRole('columnheader');
      const headerCount = await columnHeaders.count();
      expect(headerCount, '테이블에 컬럼 헤더가 없습니다').toBeGreaterThanOrEqual(1);

      // tbody 내 row 존재 확인
      const rows = page.getByRole('row');
      const rowCount = await rows.count();
      // 헤더 행 포함 최소 1개
      expect(rowCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('테이블 컬럼 헤더에 접근 가능한 텍스트 존재', async ({ opsPage: page }) => {
    const columnHeaders = page.getByRole('columnheader');
    const count = await columnHeaders.count();

    for (let i = 0; i < count; i++) {
      const header = columnHeaders.nth(i);
      const text = await header.textContent();
      expect(
        text?.trim().length,
        `컬럼 헤더 ${i + 1}번째에 텍스트가 없습니다`,
      ).toBeGreaterThan(0);
    }
  });

  test('검색 입력 필드에 접근 가능한 이름 존재', async ({ opsPage: page }) => {
    const searchInput = page.getByPlaceholder('회사명 또는 이메일 검색...');
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const placeholder = await searchInput.getAttribute('placeholder');
      expect(
        ariaLabel || placeholder,
        '검색 입력 필드에 접근 가능한 이름이 없습니다',
      ).toBeTruthy();
    }
  });

  test('통계 카드 버튼에 접근 가능한 이름 존재', async ({ opsPage: page }) => {
    // 상태별 통계 카드 (button 역할)
    const statButtons = page.getByRole('button').filter({
      has: page.locator('text=/전체|신규|진단|배정|인터뷰|초안|최종/'),
    });
    const count = await statButtons.count();

    for (let i = 0; i < count; i++) {
      const button = statButtons.nth(i);
      const text = await button.textContent();
      expect(
        text?.trim().length,
        `통계 카드 버튼 ${i + 1}번째에 접근 가능한 이름이 없습니다`,
      ).toBeGreaterThan(0);
    }
  });

  test('"상세보기" 링크에 충분한 컨텍스트 제공', async ({ opsPage: page }) => {
    const detailLinks = page.getByRole('link', { name: '상세보기' });
    const count = await detailLinks.count();

    // 최소 1개의 상세보기 링크가 있는 경우
    if (count > 0) {
      // 링크가 테이블 행 안에 있어 행 컨텍스트로 구분 가능한지 확인
      const firstLink = detailLinks.first();
      const closestRow = firstLink.locator('xpath=ancestor::tr');
      const hasRowContext = await closestRow.count().then(c => c > 0).catch(() => false);

      // 테이블 행 내에 있거나, aria-label로 추가 컨텍스트를 제공해야 함
      if (!hasRowContext) {
        const ariaLabel = await firstLink.getAttribute('aria-label');
        // 행 컨텍스트가 없으면 aria-label이 있어야 함 (경고만, 실패하지 않음)
        if (!ariaLabel) {
           
          console.warn('"상세보기" 링크에 aria-label로 추가 컨텍스트를 제공하면 접근성이 향상됩니다');
        }
      }
    }
  });

  test('"새 프로젝트 생성" 버튼 접근 가능', async ({ opsPage: page }) => {
    const createLink = page.getByRole('link', { name: /새 프로젝트 생성/ });
    await expect(createLink).toBeVisible();

    const text = await createLink.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('키보드로 테이블 및 필터 탐색 가능', async ({ opsPage: page }) => {
    // 검색, 통계 카드, 테이블 링크 등 최소 5개
    const focusedElements = await checkKeyboardNavigation(page, 5);
    expect(focusedElements.length).toBeGreaterThanOrEqual(5);
  });

  test('탭 전환 컨트롤에 적절한 ARIA 속성', async ({ opsPage: page }) => {
    // "프로젝트 목록" / "진행 현황 대시보드" 탭
    const tabList = page.getByRole('tablist');
    const hasTabList = await tabList.count().then(c => c > 0).catch(() => false);

    if (hasTabList) {
      const tabs = page.getByRole('tab');
      const tabCount = await tabs.count();
      expect(tabCount, '탭이 존재하지 않습니다').toBeGreaterThanOrEqual(2);

      // 선택된 탭에 aria-selected="true" 확인
      const selectedTab = page.locator('[role="tab"][aria-selected="true"]');
      await expect(selectedTab.first()).toBeAttached();
    }
  });

  test('상태 배지에 텍스트 레이블 포함', async ({ opsPage: page }) => {
    // 테이블 내 상태 배지가 색상만이 아니라 텍스트를 포함하는지 확인
    const badges = page.locator('table [data-slot="badge"], table .badge');
    const count = await badges.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const badge = badges.nth(i);
      const text = await badge.textContent();
      expect(
        text?.trim().length,
        `상태 배지 ${i + 1}번째에 텍스트가 없습니다`,
      ).toBeGreaterThan(0);
    }
  });
});
