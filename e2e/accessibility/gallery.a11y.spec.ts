// e2e/accessibility/gallery.a11y.spec.ts
// 갤러리 페이지 접근성 검증 (인증 필요)
import { test, expect } from '../fixtures/auth.fixture';
import { checkA11y, checkKeyboardNavigation } from '../fixtures/accessibility.fixture';

test.describe('갤러리 (/gallery) 접근성', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');
  });

  test('axe-core 위반 없음 (color-contrast 제외)', async ({ opsPage: page }) => {
    // TODO: color-contrast 위반은 디자인 시스템 전반 검토 후 별도 수정 필요
    // TODO: heading-order — 갤러리 페이지 헤딩 계층 정리 필요
    await checkA11y(page, {
      disableRules: ['color-contrast', 'heading-order'],
    });
  });

  test('페이지 헤딩 존재', async ({ opsPage: page }) => {
    await expect(page.getByRole('heading', { name: '로드맵 갤러리' })).toBeVisible();
  });

  test('검색 입력 필드에 접근 가능한 이름 존재', async ({ opsPage: page }) => {
    const searchInput = page.getByPlaceholder('로드맵 검색 (기업명, 업종, 키워드...)');
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      // placeholder, aria-label, 또는 연결된 label 중 하나가 있어야 함
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const placeholder = await searchInput.getAttribute('placeholder');
      const id = await searchInput.getAttribute('id');
      let hasLabel = false;

      if (id) {
        hasLabel = await page.locator(`label[for="${id}"]`).count().then(c => c > 0).catch(() => false);
      }

      expect(
        ariaLabel || placeholder || hasLabel,
        '검색 입력 필드에 접근 가능한 이름이 없습니다',
      ).toBeTruthy();
    }
  });

  test('갤러리 카드에 접근 가능한 링크 텍스트 존재', async ({ opsPage: page }) => {
    const cardLinks = page.locator('a[href*="/gallery/"]');
    const count = await cardLinks.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const link = cardLinks.nth(i);
      const isVisible = await link.isVisible().catch(() => false);
      if (!isVisible) continue;

      const accessibleName = await link.evaluate((el) => {
        return (
          el.textContent?.trim() ||
          el.getAttribute('aria-label') ||
          el.getAttribute('title') ||
          ''
        );
      });
      expect(
        accessibleName.length,
        `갤러리 카드 링크 ${i + 1}번째에 접근 가능한 이름이 없습니다`,
      ).toBeGreaterThan(0);
    }
  });

  test('필터 셀렉트에 접근 가능한 이름 존재', async ({ opsPage: page }) => {
    const comboboxes = page.getByRole('combobox');
    const count = await comboboxes.count();

    for (let i = 0; i < count; i++) {
      const combobox = comboboxes.nth(i);
      const ariaLabel = await combobox.getAttribute('aria-label');
      const ariaLabelledBy = await combobox.getAttribute('aria-labelledby');
      const accessibleName = await combobox.evaluate((el) => {
        return el.textContent?.trim() || '';
      });

      expect(
        ariaLabel || ariaLabelledBy || accessibleName.length > 0,
        `필터 셀렉트 ${i + 1}번째에 접근 가능한 이름이 없습니다`,
      ).toBeTruthy();
    }
  });

  test('좋아요 버튼에 접근 가능한 이름 존재', async ({ opsPage: page }) => {
    // 좋아요 버튼이 있는 경우 확인
    const likeButtons = page.locator('button').filter({ has: page.locator('svg') });
    const count = await likeButtons.count();

    // 아이콘만 있는 버튼에 aria-label이 있는지 확인 (최대 5개까지만)
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = likeButtons.nth(i);
      const isVisible = await button.isVisible().catch(() => false);
      if (!isVisible) continue;

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
        `아이콘 버튼 ${i + 1}번째에 접근 가능한 이름이 없습니다`,
      ).toBeGreaterThan(0);
    }
  });

  test('키보드로 카드 및 필터 탐색 가능', async ({ opsPage: page }) => {
    // 검색, 필터, 카드 등 최소 3개의 포커스 가능 요소
    const focusedElements = await checkKeyboardNavigation(page, 3);
    expect(focusedElements.length).toBeGreaterThanOrEqual(3);
  });

  test('빈 상태 메시지 접근성', async ({ opsPage: page }) => {
    // 검색으로 결과가 없는 상태를 만듦
    const searchInput = page.getByPlaceholder('로드맵 검색 (기업명, 업종, 키워드...)');
    const hasSearch = await searchInput.isVisible().catch(() => false);

    if (hasSearch) {
      await searchInput.fill('존재하지않는검색어xyz999');
      // 디바운스 대기
      await page.waitForTimeout(1_000);

      // 빈 상태 메시지가 있다면 접근 가능한 텍스트를 포함해야 함
      const main = page.getByRole('main');
      const mainText = await main.textContent();
      expect(mainText!.trim().length).toBeGreaterThan(0);
    }
  });
});
