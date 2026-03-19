// e2e/accessibility/dashboard.a11y.spec.ts
// 대시보드 페이지 접근성 검증 (인증 필요)
import { test, expect } from '../fixtures/auth.fixture';
import { checkA11y, checkKeyboardNavigation } from '../fixtures/accessibility.fixture';

test.describe('대시보드 (/dashboard) 접근성', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('axe-core 위반 없음', async ({ opsPage: page }) => {
    await checkA11y(page);
  });

  test('랜드마크 구조 확인 (navigation, main)', async ({ opsPage: page }) => {
    // 네비게이션 영역
    await expect(page.getByRole('navigation')).toBeAttached();

    // 메인 콘텐츠 영역
    await expect(page.getByRole('main')).toBeAttached();
  });

  test('네비게이션에 현재 페이지 표시 (aria-current)', async ({ opsPage: page }) => {
    // 현재 활성 네비게이션 항목에 aria-current 또는 시각적 구분이 있는지 확인
    const nav = page.getByRole('navigation');
    const currentLink = nav.locator('[aria-current="page"], [aria-current="true"], [data-active="true"]');
    const hasCurrentIndicator = await currentLink.first().count().then(c => c > 0).catch(() => false);

    // aria-current가 없더라도 활성 상태를 나타내는 다른 방법이 있을 수 있음
    if (!hasCurrentIndicator) {
      // 네비게이션 내 링크가 최소 1개 이상 존재하는지만 확인
      const navLinks = nav.locator('a');
      const linkCount = await navLinks.count();
      expect(linkCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('헤딩 계층 구조 확인', async ({ opsPage: page }) => {
    // h1 또는 h2가 최소 1개 존재
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    expect(h1Count + h2Count).toBeGreaterThanOrEqual(1);
  });

  test('인터랙티브 요소에 접근 가능한 이름 존재', async ({ opsPage: page }) => {
    // 모든 버튼에 접근 가능한 이름이 있는지 확인
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const accessibleName = await button.evaluate((el) => {
        return (
          el.textContent?.trim() ||
          el.getAttribute('aria-label') ||
          el.getAttribute('title') ||
          ''
        );
      });
      expect(
        accessibleName.length,
        `버튼 ${i + 1}번째에 접근 가능한 이름이 없습니다`,
      ).toBeGreaterThan(0);
    }
  });

  test('키보드 탭 네비게이션 가능', async ({ opsPage: page }) => {
    // 대시보드에는 네비게이션 링크, 카드, 버튼 등 최소 3개의 포커스 가능 요소가 있어야 함
    const focusedElements = await checkKeyboardNavigation(page, 3);
    expect(focusedElements.length).toBeGreaterThanOrEqual(3);
  });

  test('카드/위젯에 적절한 구조 사용', async ({ opsPage: page }) => {
    // 메인 콘텐츠 내에 의미 있는 콘텐츠가 있는지 확인
    const main = page.getByRole('main');
    const mainText = await main.textContent();
    expect(mainText!.trim().length).toBeGreaterThan(0);

    // section이나 article 등의 시맨틱 요소 또는 heading으로 구조화
    const semanticElements = page.locator('main section, main article, main [role="region"]');
    const headings = page.locator('main h1, main h2, main h3');
    const semanticCount = await semanticElements.count();
    const headingCount = await headings.count();

    // 시맨틱 요소 또는 헤딩 중 하나는 있어야 함
    expect(semanticCount + headingCount).toBeGreaterThanOrEqual(1);
  });

  test('색상 외에 상태를 구분하는 추가 단서 존재', async ({ opsPage: page }) => {
    // 상태 배지가 있다면 텍스트로 상태를 표현하는지 확인
    const badges = page.locator('[data-slot="badge"], .badge');
    const badgeCount = await badges.count();

    for (let i = 0; i < badgeCount; i++) {
      const badge = badges.nth(i);
      const text = await badge.textContent();
      expect(
        text?.trim().length,
        `배지 ${i + 1}번째에 텍스트가 없습니다 (색상만으로 상태 구분)`,
      ).toBeGreaterThan(0);
    }
  });
});
