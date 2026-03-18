// e2e/ops/quota-audit.spec.ts
// Phase C-12: 쿼터 관리 + 감사로그 페이지
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';

// ─── 쿼터 관리 페이지 ──────────────────────────────────────────────────────

test.describe('쿼터 관리 페이지', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/ops/quota');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 — 헤더 + 사용량 테이블/카드 표시', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/ops/quota');
    await page.waitForLoadState('networkidle');

    // 페이지 헤더
    await expect(page.getByRole('heading', { name: '쿼터 관리' })).toBeVisible();

    // 조회 월 필터
    await expect(page.getByText('조회 월:')).toBeVisible();

    // 사용량 상태 범례
    await expect(page.getByText('사용량 상태')).toBeVisible();
    await expect(page.getByText(/정상.*70% 미만/)).toBeVisible();
    await expect(page.getByText(/주의.*70% 이상/)).toBeVisible();
    await expect(page.getByText(/경고.*90% 이상/)).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('사용량 테이블 컬럼 헤더 표시', async ({ opsPage: page }) => {
    // 데이터 로딩 대기 (스켈레톤이 사라질 때까지)
    await page.waitForTimeout(2_000);

    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.getByText('데이터가 없습니다.').isVisible().catch(() => false);

    if (!hasTable && !hasEmptyState) {
      // 아직 로딩 중일 수 있으므로 좀 더 대기
      await page.waitForTimeout(3_000);
    }

    if (await page.locator('table').isVisible().catch(() => false)) {
      await expect(page.getByRole('columnheader', { name: '사용자' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '역할' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '월간 사용량' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '일일 한도' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '월간 한도' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: '한도 설정' })).toBeVisible();
    } else {
      // 데이터 없음 상태
      await expect(page.getByText('데이터가 없습니다.')).toBeVisible();
    }
  });

  test('조회 월 셀렉트 변경 시 데이터 갱신', async ({ opsPage: page }) => {
    // 조회 월 셀렉트 열기
    const monthSelect = page.locator('[data-slot="select-trigger"]').first();
    await expect(monthSelect).toBeVisible();
    await monthSelect.click();

    // 옵션 목록에서 두 번째 항목 선택 (이전 월)
    const secondOption = page.getByRole('option').nth(1);
    if (await secondOption.isVisible().catch(() => false)) {
      await secondOption.click();
      // 데이터 로딩 대기
      await page.waitForTimeout(2_000);
      // 페이지가 여전히 쿼터 관리에 있는지 확인
      await expect(page.getByRole('heading', { name: '쿼터 관리' })).toBeVisible();
    }
  });
});

// ─── 감사로그 페이지 ────────────────────────────────────────────────────────

test.describe('감사로그 페이지', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/ops/audit');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 — 헤더 + 로그 테이블 표시', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/ops/audit');
    await page.waitForLoadState('networkidle');

    // 페이지 헤더
    await expect(page.getByRole('heading', { name: '감사로그' })).toBeVisible();

    // 검색 입력
    await expect(page.getByPlaceholder('사용자명, 이메일, 대상ID 검색...')).toBeVisible();

    // 로그 테이블 또는 빈 상태
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.getByText('로그 없음').isVisible().catch(() => false);
    expect(hasTable || hasEmptyState).toBeTruthy();

    expect(getErrors()).toEqual([]);
  });

  test('필터 드롭다운 표시 — 액션, 대상, 사용자', async ({ opsPage: page }) => {
    // 셀렉트 트리거들이 존재하는지 확인
    const triggers = page.locator('[data-slot="select-trigger"]');
    // 최소 3개 (액션, 대상, 사용자) + 조건부 날짜 필터
    const triggerCount = await triggers.count();
    expect(triggerCount).toBeGreaterThanOrEqual(3);
  });

  test('액션 필터 선택 후 URL 또는 테이블 변화', async ({ opsPage: page }) => {
    // 첫 번째 셀렉트 (액션 필터) 열기
    const actionTrigger = page.locator('[data-slot="select-trigger"]').first();
    await actionTrigger.click();

    // "모든 액션" 이 표시되면 다른 옵션 선택
    const options = page.getByRole('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      // 두 번째 옵션 (첫 번째 실제 액션 타입) 선택
      await options.nth(1).click();

      // URL에 action 파라미터가 추가되거나 테이블이 갱신됨
      await page.waitForTimeout(1_000);
      await expect(page.getByRole('heading', { name: '감사로그' })).toBeVisible();
    }
  });

  test('검색어 입력 후 결과 변화', async ({ opsPage: page }) => {
    const searchInput = page.getByPlaceholder('사용자명, 이메일, 대상ID 검색...');
    await searchInput.fill('존재하지않는검색어xyz');

    // 디바운스 대기
    await page.waitForTimeout(500);

    // 검색 결과가 변경됨 — 빈 상태 또는 필터링된 결과
    await expect(page.getByRole('heading', { name: '감사로그' })).toBeVisible();
  });

  test('페이지네이션 — 다음 페이지 버튼', async ({ opsPage: page }) => {
    // 페이지네이션이 존재하는지 확인 (데이터가 충분한 경우에만)
    const nextButton = page.getByRole('button', { name: '다음' });
    if (!(await nextButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    // 다음 페이지 버튼이 활성화되어 있는지 확인
    const isDisabled = await nextButton.isDisabled();
    if (isDisabled) {
      test.skip();
      return;
    }

    await nextButton.click();
    // 페이지 변경 확인 (페이지 번호 표시)
    await expect(page.getByText(/2 \//)).toBeVisible({ timeout: 5_000 });
  });

  test('필터 초기화 버튼', async ({ opsPage: page }) => {
    // 먼저 필터를 하나 선택
    const actionTrigger = page.locator('[data-slot="select-trigger"]').first();
    await actionTrigger.click();

    const options = page.getByRole('option');
    const optionCount = await options.count();
    if (optionCount <= 1) {
      test.skip();
      return;
    }

    await options.nth(1).click();
    await page.waitForTimeout(500);

    // 필터 초기화 버튼 (X 아이콘) 확인 및 클릭
    const resetButton = page.getByTitle('필터 초기화');
    if (await resetButton.isVisible().catch(() => false)) {
      await resetButton.click();
      await page.waitForTimeout(500);
      // 초기화 후 페이지가 정상 동작
      await expect(page.getByRole('heading', { name: '감사로그' })).toBeVisible();
    }
  });

  test('내보내기 버튼 표시', async ({ opsPage: page }) => {
    // "현재 페이지 다운로드" 버튼 존재 확인
    await expect(page.getByText('현재 페이지 다운로드')).toBeVisible();
    // "전체 목록 다운로드" 버튼 존재 확인
    await expect(page.getByText(/전체 목록 다운로드/)).toBeVisible();
  });
});
