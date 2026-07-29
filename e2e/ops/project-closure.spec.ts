// e2e/ops/project-closure.spec.ts
// 행정 종결 E2E: 생성(NEW) → 종결(사유 필수) → 배지·종결 정보 → 목록 배지
//                → 종결 해제(이전 상태 복원) → 정리
// NEW 상태에서 종결 = "배정만 된 경우 포함" 요구사항의 최광의 검증.
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck, expectToast } from '../helpers/assertions.helper';
import { deleteProject, deleteProjectsByName } from '../helpers/cleanup.helper';

const E2E_COMPANY = 'E2E종결테스트';
const CLOSURE_REASON = '코치가 오프라인으로 작업을 완료하여 행정 종결 처리합니다.';

test.describe('운영관리자 프로젝트 행정 종결', () => {
  test.describe.configure({ mode: 'serial' });
  let projectId: string | null = null;

  test.afterAll(async () => {
    if (projectId) await deleteProject(projectId);
    await deleteProjectsByName(E2E_COMPANY);
  });

  // ─── 1단계: 프로젝트 생성 (NEW) ───────────────────────────────────────────
  test('1단계: 프로젝트 생성 → NEW 상태', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/ops/projects/new');
    await page.waitForLoadState('networkidle');

    await page.locator('#company_name').fill(E2E_COMPANY);

    await page.getByRole('combobox').first().click();
    await expect(page.getByRole('option', { name: /50~299명/ })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('option', { name: /50~299명/ }).click();

    await page.getByRole('combobox').nth(1).click();
    await expect(page.getByRole('option', { name: '제조업' })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('option', { name: '제조업' }).click();

    await page.locator('#contact_name').fill('종결테스트담당자');
    await page.locator('#contact_email').fill('e2e-closure@example.com');

    await page.getByRole('button', { name: /프로젝트 생성/ }).click();
    await expectToast(page, '프로젝트가 성공적으로 생성되었습니다');

    await expect(page).toHaveURL(/\/ops\/projects\/[a-f0-9-]+/, { timeout: 10_000 });
    projectId = page.url().split('/ops/projects/')[1]?.split('?')[0] ?? null;
    expect(projectId).toBeTruthy();

    expect(getErrors()).toEqual([]);
  });

  // ─── 2단계: 종결 처리 (사유 필수 + 배지·종결 정보) ─────────────────────────
  test('2단계: 종결 처리 → 배지·종결 정보 표시 + 해제 버튼 전환', async ({ opsPage: page }) => {
    test.skip(!projectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');

    await page.goto(`/ops/projects/${projectId!}`);
    await page.waitForLoadState('networkidle');

    // 최하단 종결 버튼 (드문 관리 작업 — 헤더가 아닌 페이지 하단 배치)
    const closeButton = page.getByRole('button', { name: '프로젝트 종결' });
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // 다이얼로그: 안내문 + 사유 10자 미만이면 확정 비활성
    await expect(page.getByText(/종결 후 담당 컨설턴트는/)).toBeVisible();
    const confirmButton = page.getByRole('button', { name: '종결', exact: true });
    await expect(confirmButton).toBeDisabled();

    await page.locator('#closure-reason').fill('짧은 사유');
    await expect(confirmButton).toBeDisabled();

    await page.locator('#closure-reason').fill(CLOSURE_REASON);
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    await expectToast(page, '프로젝트가 종결 처리되었습니다');

    // 기업정보 카드: 종결 배지 + 종결 정보 블록
    await expect(page.getByText('종결', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/상태에서 종결/)).toBeVisible();
    await expect(page.getByText(CLOSURE_REASON)).toBeVisible();

    // 같은 자리 버튼이 "종결 해제"로 전환
    await expect(page.getByRole('button', { name: '종결 해제' })).toBeVisible();
    await expect(page.getByRole('button', { name: '프로젝트 종결' })).toHaveCount(0);
  });

  // ─── 3단계: 목록에서 종결 배지 확인 ───────────────────────────────────────
  test('3단계: 프로젝트 목록에 종결 배지 표시', async ({ opsPage: page }) => {
    test.skip(!projectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');

    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 회사명 검색으로 대상 행만 노출
    await page.getByPlaceholder('회사명 또는 이메일 검색...').fill(E2E_COMPANY);
    await expect(page.getByText(E2E_COMPANY).first()).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('종결', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  // ─── 4단계: 종결 해제 → 이전 상태(NEW) 복원 ───────────────────────────────
  test('4단계: 종결 해제 → 이전 상태 복원 + 종결 버튼 복귀', async ({ opsPage: page }) => {
    test.skip(!projectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');

    await page.goto(`/ops/projects/${projectId!}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '종결 해제' }).click();
    await expect(page.getByText(/종결 전 상태로 복원/)).toBeVisible();
    await page.getByRole('button', { name: '해제 확정' }).click();

    await expectToast(page, '종결이 해제되었습니다');

    // NEW 복원: 상태 배지 "신규 등록 완료" + 종결 배지 소멸 + 종결 버튼 복귀
    await expect(page.getByText('신규 등록 완료')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('종결', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '프로젝트 종결' })).toBeVisible();
  });
});
