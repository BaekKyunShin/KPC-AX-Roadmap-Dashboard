// e2e/ops/users-detail.spec.ts
// Phase C-11: 사용자 관리 상세 기능 (검색, 필터, 프로필 모달)
// 기존 navigation.spec.ts의 사용자 관리 네비게이션과 중복하지 않고
// 검색, 역할 배지, 프로필 보기 모달 등 상세 기능에 집중합니다.
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

// ─── 사용자 목록 테이블 ─────────────────────────────────────────────────────

test.describe('사용자 목록 테이블', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/ops/users');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 + 테이블 표시 — 콘솔 에러 없음', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/ops/users');
    await page.waitForLoadState('networkidle');

    // 페이지 헤더 확인
    await expect(page.getByRole('heading', { name: '사용자 관리' })).toBeVisible();

    // 테이블 컬럼 헤더 확인
    await expect(page.getByRole('columnheader', { name: '사용자' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '역할' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '상태' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '프로필' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '가입일' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '관리' })).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('역할 배지 표시 — 승인 대기/컨설턴트/운영관리자 중 하나 이상', async ({ opsPage: page }) => {
    // 테이블 내에서 역할 배지 텍스트가 하나 이상 존재
    const roleBadgeTexts = [
      '컨설턴트 (승인 대기)',
      '운영관리자 (승인 대기)',
      '컨설턴트',
      '운영관리자',
      '시스템관리자',
    ];

    let foundAny = false;
    for (const badgeText of roleBadgeTexts) {
      if (await page.getByText(badgeText, { exact: false }).first().isVisible().catch(() => false)) {
        foundAny = true;
        break;
      }
    }

    // 사용자가 없으면 "등록된 사용자가 없습니다" 표시
    if (!foundAny) {
      await expect(page.getByText('등록된 사용자가 없습니다')).toBeVisible();
    }
  });

  test('상태 배지 표시 — 활성 또는 정지', async ({ opsPage: page }) => {
    const hasUsers = !(await page.getByText('등록된 사용자가 없습니다').isVisible().catch(() => false));
    // 사용자 데이터가 없으면 배지 검증 불가
    test.skip(!hasUsers, '테스트 데이터 없음: 등록된 사용자가 없습니다');

    // 테이블 내 "활성" 또는 "정지" 배지가 존재
    const hasActive = await page.locator('table').getByText('활성', { exact: true }).first().isVisible().catch(() => false);
    const hasSuspended = await page.locator('table').getByText('정지', { exact: true }).first().isVisible().catch(() => false);
    expect(hasActive || hasSuspended).toBeTruthy();
  });

  test('관리 액션 버튼 표시 — 승인/정지/활성화 중 하나', async ({ opsPage: page }) => {
    const hasUsers = !(await page.getByText('등록된 사용자가 없습니다').isVisible().catch(() => false));
    // 사용자 데이터가 없으면 관리 액션 검증 불가
    test.skip(!hasUsers, '테스트 데이터 없음: 등록된 사용자가 없습니다');

    // 관리 컬럼에 "승인", "정지", "활성화" 중 하나 이상 존재
    const hasApprove = await page.getByText('승인', { exact: true }).first().isVisible().catch(() => false);
    const hasSuspend = await page.getByText('정지', { exact: true }).first().isVisible().catch(() => false);
    const hasReactivate = await page.getByText('활성화', { exact: true }).first().isVisible().catch(() => false);
    expect(hasApprove || hasSuspend || hasReactivate).toBeTruthy();
  });
});

// ─── 프로필 모달 ────────────────────────────────────────────────────────────

test.describe('프로필 보기 모달', () => {
  test('프로필 보기 클릭 → 모달 열림 + 프로필 정보 표시', async ({ opsPage: page }) => {
    await page.goto('/ops/users');
    await page.waitForLoadState('networkidle');

    // "프로필 보기" 링크가 있는지 확인
    const profileLink = page.getByText('프로필 보기').first();
    const hasProfileLink = await profileLink.isVisible().catch(() => false);
    // 프로필 보기 링크가 없으면 모달 테스트 불가
    test.skip(!hasProfileLink, '테스트 데이터 없음: 프로필 보기 링크가 없습니다');

    await profileLink.click();

    // Dialog 모달이 열림
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });

    // 모달 제목에 "컨설턴트 프로필" 포함
    await expect(page.getByText('컨설턴트 프로필')).toBeVisible();

    // 프로필 섹션 확인 (전문분야, 가능 업종 등)
    await expect(page.getByText('전문분야')).toBeVisible();
    await expect(page.getByText('가능 업종')).toBeVisible();

    // 모달 닫기 (X 버튼 또는 ESC)
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
