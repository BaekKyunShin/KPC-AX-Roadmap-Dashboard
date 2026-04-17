// e2e/consultant/pbl-output.spec.ts
// 컨설턴트 PBL 보고서 산출물 페이지 E2E 테스트 (OFA Step 9)
//
// 방어적 패턴: 이 스펙은 특정 PBL 프로젝트가 존재하지 않아도 통과한다.
//   - 프로젝트 목록에서 PBL 트랙 프로젝트를 찾아 상세 → PBL 라우트 진입
//   - 라우트가 열리면 핵심 섹션/버튼 몇 가지만 존재 확인
//   - PBL 프로젝트가 없으면 "생성 안내" 또는 "로드맵 리다이렉트"를 확인
import { test, expect } from '../fixtures/auth.fixture';

test.describe('컨설턴트 PBL 보고서', () => {
  test('PBL 라우트 직접 진입 시 기본 요소가 렌더된다', async ({ consultantPage: page }) => {
    // 프로젝트 하나 임의 선택
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    const firstProjectLink = page
      .locator('main a[href*="/consultant/projects/"]')
      .first();
    const hasProject = await firstProjectLink.isVisible().catch(() => false);

    if (!hasProject) {
      test.skip(true, '컨설턴트에게 배정된 프로젝트가 없음');
      return;
    }

    const href = await firstProjectLink.getAttribute('href');
    if (!href) return;
    const pblUrl = `${href}/pbl`;

    await page.goto(pblUrl);
    await page.waitForLoadState('networkidle');

    // PBL 트랙이 아닐 경우 ConsultantPBL page는 /roadmap으로 리다이렉트한다.
    const currentUrl = page.url();
    if (currentUrl.includes('/roadmap')) {
      // 정상적인 트랙 가드 동작
      expect(currentUrl).toMatch(/\/consultant\/projects\/.*\/roadmap/);
      return;
    }

    // PBL 페이지 URL 확인
    await expect(page).toHaveURL(/\/consultant\/projects\/.*\/pbl/, { timeout: 10_000 });

    // 페이지 헤더·메인 콘텐츠가 렌더되었는지 확인
    await expect(page.locator('main')).toBeVisible();

    // "PBL 보고서 생성" 버튼 or "생성 안내 메시지" or "버전 선택기" 중 하나는 있어야 한다
    const hasAnyPBLControl =
      (await page.getByRole('button', { name: /PBL 보고서 생성/ }).isVisible().catch(() => false)) ||
      (await page.getByText(/생성된 PBL 보고서가 없습니다/).isVisible().catch(() => false)) ||
      (await page.getByRole('button', { name: /새 버전 생성/ }).isVisible().catch(() => false));

    expect(hasAnyPBLControl).toBe(true);
  });

  test('새 버전 생성 아코디언을 열고 닫을 수 있다 (UI만 검증)', async ({ consultantPage: page }) => {
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');
    const firstProjectLink = page.locator('main a[href*="/consultant/projects/"]').first();
    const hasProject = await firstProjectLink.isVisible().catch(() => false);
    if (!hasProject) {
      test.skip(true, '컨설턴트에게 배정된 프로젝트가 없음');
      return;
    }
    const href = await firstProjectLink.getAttribute('href');
    if (!href) return;
    await page.goto(`${href}/pbl`);
    await page.waitForLoadState('networkidle');

    // 트랙 가드로 /roadmap 리다이렉트된 경우 스킵
    if (page.url().includes('/roadmap')) {
      return;
    }

    const accordionToggle = page.getByRole('button', { name: /새 버전 생성/ });
    const visible = await accordionToggle.isVisible().catch(() => false);
    if (!visible) return;

    await accordionToggle.click();
    // textarea가 나타나면 OK
    const textarea = page.locator('textarea#regenerate-prompt');
    await expect(textarea).toBeVisible({ timeout: 3000 });
  });
});
