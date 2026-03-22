// e2e/helpers/navigation.helper.ts
import { type Page, expect } from '@playwright/test';

/**
 * 탭 전환
 * @example await switchTab(page, '과정 체계도');
 */
export async function switchTab(page: Page, tabName: string) {
  await page.getByRole('tab', { name: tabName }).click();
  // 탭 활성화 확인
  await expect(
    page.getByRole('tab', { name: tabName }),
  ).toHaveAttribute('data-state', 'active');
}

/**
 * 뒤로가기 링크 클릭 (페이지 상단 "← 목록으로" 스타일)
 */
export async function clickBackLink(page: Page, linkText: string) {
  await page.getByRole('link', { name: linkText }).click();
}

/**
 * OPS 네비게이션 드롭다운 메뉴 클릭
 * 관리자 네비게이션은 드롭다운 그룹으로 구성되어 있음
 * @param triggerText 드롭다운 트리거 텍스트 (예: "워크스페이스")
 * @param itemText 메뉴 항목 텍스트 (예: "프로젝트 관리")
 */
export async function clickOpsNavMenu(
  page: Page,
  triggerText: string,
  itemText: string,
) {
  // 드롭다운 트리거 클릭 (desktop-nav 스코핑 + exact 매칭으로 모바일 메뉴/오매칭 방지)
  await page
    .locator('[data-testid="desktop-nav"]')
    .getByRole('button', { name: triggerText, exact: true })
    .click();
  // 드롭다운 내 메뉴 항목 클릭
  await page.getByRole('link', { name: itemText }).click();
}

/**
 * 사용자 드롭다운 열기 → 메뉴 항목 클릭
 */
export async function clickUserMenu(page: Page, itemText: string) {
  // 사용자 드롭다운 트리거 (desktop-user-area 스코핑으로 모바일 아바타 제외)
  await page
    .locator('[data-testid="desktop-user-area"]')
    .getByRole('button')
    .filter({ has: page.locator('[data-slot="avatar"]') })
    .click();
  // 메뉴 항목 클릭
  if (itemText === '로그아웃') {
    await page.getByRole('button', { name: '로그아웃' }).click();
  } else {
    await page.getByRole('link', { name: itemText }).click();
  }
}

/**
 * main 영역에서 href 패턴에 매칭하는 첫 링크의 href를 반환.
 * 링크가 없으면 null — 호출부에서 test.skip() 판단.
 */
export async function findFirstLinkHref(
  page: Page,
  hrefPattern: string,
): Promise<string | null> {
  const firstLink = page
    .locator('main')
    .locator(`a[href*="${hrefPattern}"]`)
    .first();

  const isVisible = await firstLink.isVisible().catch(() => false);
  if (!isVisible) return null;

  return firstLink.getAttribute('href');
}
