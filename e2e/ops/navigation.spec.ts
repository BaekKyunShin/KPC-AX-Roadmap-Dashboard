// e2e/ops/navigation.spec.ts
// TEST_PLAN Phase 2.0~2.3, 2.20: 관리자 로그인, 네비게이션, 알림벨, 로그아웃
import { test, expect } from '../fixtures/auth.fixture';
import { clickOpsNavMenu, clickUserMenu } from '../helpers/navigation.helper';

// ─── Phase 2.0: 관리자 로그인 ─────────────────────────────────────────────────

test.describe('Phase 2.0: 관리자 로그인', () => {
  test('로그인 성공 → /ops/projects 리다이렉트', async ({ opsPage: page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/ops\/projects/, { timeout: 10_000 });
  });
});

// ─── Phase 2.1: 관리자 네비게이션 ─────────────────────────────────────────────

test.describe('Phase 2.1: 관리자 네비게이션', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');
  });

  test('로고 표시 확인', async ({ opsPage: page }) => {
    await expect(page.locator('nav').getByRole('link').first()).toBeVisible();
  });

  test('워크스페이스 드롭다운 — 프로젝트 관리', async ({ opsPage: page }) => {
    await clickOpsNavMenu(page, '워크스페이스', '프로젝트 관리');
    await expect(page).toHaveURL('/ops/projects');
  });

  test('워크스페이스 드롭다운 — 테스트 로드맵', async ({ opsPage: page }) => {
    await clickOpsNavMenu(page, '워크스페이스', '테스트 로드맵');
    await expect(page).toHaveURL('/test-roadmap');
  });

  test('운영관리 드롭다운 — 사용자 관리', async ({ opsPage: page }) => {
    await clickOpsNavMenu(page, '운영관리', '사용자 관리');
    await expect(page).toHaveURL('/ops/users');
  });

  test('운영관리 드롭다운 — 쿼터 관리', async ({ opsPage: page }) => {
    await clickOpsNavMenu(page, '운영관리', '쿼터 관리');
    await expect(page).toHaveURL('/ops/quota');
  });

  test('운영관리 드롭다운 — 감사로그', async ({ opsPage: page }) => {
    await clickOpsNavMenu(page, '운영관리', '감사로그');
    await expect(page).toHaveURL('/ops/audit');
  });

  test('라이브러리 드롭다운 — 로드맵 갤러리', async ({ opsPage: page }) => {
    await clickOpsNavMenu(page, '라이브러리', '로드맵 갤러리');
    await expect(page).toHaveURL('/gallery');
  });

  test('라이브러리 드롭다운 — 자가진단 템플릿', async ({ opsPage: page }) => {
    await clickOpsNavMenu(page, '라이브러리', '자가진단 템플릿');
    await expect(page).toHaveURL('/ops/templates');
  });

  test('메시지 아이콘 표시', async ({ opsPage: page }) => {
    // MessageIcon은 <Link> 요소 (role=link)
    await expect(
      page.getByRole('link', { name: /메시지/ }),
    ).toBeVisible();
  });

  test('메시지 안읽음 배지 존재 확인', async ({ opsPage: page }) => {
    const messageLink = page.getByRole('link', { name: /메시지/ });
    // 안읽음 배지: bg-blue-500 둥근 span (unreadCount > 0일 때 렌더)
    await expect(messageLink.locator('.bg-blue-500')).toBeAttached();
  });

  test('메시지 아이콘 클릭 → /dashboard/messages', async ({ opsPage: page }) => {
    await page.getByRole('link', { name: /메시지/ }).click();
    await expect(page).toHaveURL('/dashboard/messages');
  });

  test('사용자 드롭다운 — 이름, 이메일, 역할 배지 표시', async ({ opsPage: page }) => {
    // 사용자 드롭다운 열기
    await page
      .locator('nav')
      .getByRole('button')
      .filter({ has: page.locator('[data-slot="avatar"]') })
      .first()
      .click();

    // 드롭다운 내에서 이름, 이메일 표시 확인
    const dropdown = page.locator('[data-testid="user-dropdown-menu"]');
    await expect(dropdown).toBeVisible();
    // 역할 배지 (시스템관리자 or 운영관리자)
    await expect(
      page.locator('nav').getByText(/시스템관리자|운영관리자/),
    ).toBeVisible();
  });

  test('알림 벨 아이콘 표시 확인', async ({ opsPage: page }) => {
    await expect(page.getByRole('button', { name: /알림/ })).toBeVisible();
  });

  test('활성 메뉴 하이라이트 확인', async ({ opsPage: page }) => {
    // /ops/projects 페이지에서 "워크스페이스" 드롭다운 트리거가 활성 상태
    const trigger = page.getByRole('button', { name: '워크스페이스', exact: true });
    await expect(trigger).toHaveClass(/bg-blue-50/);
    await expect(trigger).toHaveClass(/text-blue-700/);
  });

  test('사용자 드롭다운 → 계정 설정', async ({ opsPage: page }) => {
    await clickUserMenu(page, '계정 설정');
    await expect(page).toHaveURL('/dashboard/settings');
  });
});

// ─── Phase 2.2: 알림 벨 ──────────────────────────────────────────────────────

test.describe('Phase 2.2: 알림 벨', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');
  });

  test('벨 아이콘 클릭 → 팝오버 열림', async ({ opsPage: page }) => {
    await page.getByRole('button', { name: /알림/ }).click();
    // Popover 내 "알림" 제목
    await expect(page.locator('h3').filter({ hasText: '알림' })).toBeVisible();
  });

  test('4개 탭 (전체/인터뷰/초안/확정) 표시', async ({ opsPage: page }) => {
    await page.getByRole('button', { name: /알림/ }).click();
    await expect(page.locator('h3').filter({ hasText: '알림' })).toBeVisible();

    // Popover 콘텐츠 내 관리자 전용 탭 4개
    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover.getByRole('button', { name: '전체' })).toBeVisible();
    await expect(popover.getByRole('button', { name: '인터뷰' })).toBeVisible();
    await expect(popover.getByRole('button', { name: '초안' })).toBeVisible();
    await expect(popover.getByRole('button', { name: '확정' })).toBeVisible();
  });

  test('각 탭 클릭 시 콘텐츠 로딩 완료', async ({ opsPage: page }) => {
    await page.getByRole('button', { name: /알림/ }).click();
    const popover = page.locator('[data-slot="popover-content"]');
    for (const tab of ['전체', '인터뷰', '초안', '확정']) {
      await popover.getByRole('button', { name: tab }).click();
      // 로딩 완료 후 빈 상태 메시지 또는 알림 아이템 중 하나가 표시됨
      const emptyState = popover.getByText('새로운 알림이 없습니다');
      const firstItem = popover.locator('.divide-y > button').first();
      await expect(emptyState.or(firstItem)).toBeVisible({ timeout: 5000 });
    }
  });

  test('팝오버 Escape 키로 닫힘', async ({ opsPage: page }) => {
    await page.getByRole('button', { name: /알림/ }).click();
    await expect(page.locator('h3').filter({ hasText: '알림' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(
      page.locator('h3').filter({ hasText: '알림' }),
    ).not.toBeVisible();
  });
});

// ─── Phase 2.3: 대시보드 리다이렉트 ──────────────────────────────────────────

test.describe('Phase 2.3: 대시보드 리다이렉트', () => {
  test('/dashboard → /ops/projects 리다이렉트', async ({ opsPage: page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/ops\/projects/, { timeout: 10_000 });
  });
});

// Phase 2.20 (관리자 로그아웃)은 세션 무효화 방지를 위해
// e2e/ops/logout.spec.ts로 분리 → Playwright project dependency로 마지막에 실행
