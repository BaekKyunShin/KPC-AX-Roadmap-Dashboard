// e2e/mobile/ops-projects.mobile.spec.ts
// 모바일 뷰포트 프로젝트 목록 테스트
import { test, expect, checkNoHorizontalOverflow } from '../fixtures/mobile.fixture';

test.describe('모바일 프로젝트 목록 — 카드 뷰', () => {
  test('프로젝트 관리 페이지 로딩', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 페이지 제목 확인
    await expect(page.getByRole('heading', { name: '프로젝트 관리' })).toBeVisible();

    // 가로 오버플로 없음
    const noOverflow = await checkNoHorizontalOverflow(page);
    expect(noOverflow).toBe(true);

    await context.close();
  });

  test('통계 요약 카드가 모바일에서 세로 배치됨', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 통계 카드들이 표시됨
    const totalButton = page.getByRole('button', { name: /전체 프로젝트/ });
    await expect(totalButton).toBeVisible();

    // 카드들의 너비가 뷰포트 너비에 가까움 (모바일에서 카드 뷰)
    const totalBox = await totalButton.boundingBox();
    // 393px 뷰포트에서 카드가 충분히 넓게 표시됨
    expect(totalBox!.width).toBeGreaterThan(150);

    await context.close();
  });

  test('검색 필터가 모바일에서 동작', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 검색 입력 필드 확인
    const searchInput = page.getByPlaceholder('회사명 또는 이메일 검색...');
    await expect(searchInput).toBeVisible();

    // 모바일에서도 검색 입력 가능
    await searchInput.fill('테스트');
    await expect(searchInput).toHaveValue('테스트');

    await context.close();
  });

  test('프로젝트 테이블/카드가 모바일에서 가로 스크롤 없이 표시됨', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 메인 콘텐츠 영역이 뷰포트 내에 표시됨
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // 가로 오버플로 없음
    const noOverflow = await checkNoHorizontalOverflow(page);
    expect(noOverflow).toBe(true);

    await context.close();
  });

  test('"새 프로젝트 생성" 버튼이 모바일에서 접근 가능', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true,
      storageState: '.auth/ops-admin.json',
    });
    const page = await context.newPage();

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // "새 프로젝트 생성" 버튼/링크가 표시됨
    const newProjectLink = page.getByRole('link', { name: /새 프로젝트 생성/ });
    await expect(newProjectLink).toBeVisible();

    // 클릭하여 이동
    await newProjectLink.click();
    await expect(page).toHaveURL('/ops/projects/new');

    await context.close();
  });
});
