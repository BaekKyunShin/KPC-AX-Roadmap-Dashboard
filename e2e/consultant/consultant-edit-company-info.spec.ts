// e2e/consultant/consultant-edit-company-info.spec.ts
// 컨설턴트가 담당 프로젝트의 기업 정보를 직접 편집할 수 있는지 검증.
// 마이그 073 — projects_update_consultant_assigned RLS + 시스템 필드 불변 트리거.
import { test, expect } from '../fixtures/auth.fixture';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

let projectDetailUrl: string | null = null;
const ORIGINAL_NOTE = `e2e 자동테스트 마커-${Date.now()}`;
const UPDATED_NOTE = `${ORIGINAL_NOTE} (수정됨)`;

test.describe('컨설턴트 — 기업 정보 직접 편집', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: '.auth/consultant.json',
    });
    const page = await context.newPage();
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');
    const href = await findFirstLinkHref(page, '/consultant/projects/');
    if (href) projectDetailUrl = href;
    await context.close();
  });

  test('수정 토글 → 내부 메모 변경 → 저장 → 영속', async ({ consultantPage: page }) => {
    test.skip(!projectDetailUrl, '담당 프로젝트가 없음');

    await page.goto(projectDetailUrl!);
    await page.waitForLoadState('networkidle');

    // view 모드 — 수정 버튼 보임
    const editBtn = page.getByTestId('company-info-edit-button');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // edit 모드 — 내부 메모 textarea
    const noteTextarea = page.getByLabel('컨설턴트 내부 메모');
    await expect(noteTextarea).toBeVisible();
    await noteTextarea.fill(ORIGINAL_NOTE);

    // 저장
    const saveBtn = page.getByTestId('company-info-save-button');
    await saveBtn.click();

    // view 모드 복귀 + 메모 표시
    await expect(page.getByTestId('company-info-edit-button')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(ORIGINAL_NOTE)).toBeVisible();

    // 새로고침 후 영속 확인
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(ORIGINAL_NOTE)).toBeVisible();
  });

  test('미저장 상태 취소 → AlertDialog → 변경 폐기', async ({ consultantPage: page }) => {
    test.skip(!projectDetailUrl, '담당 프로젝트가 없음');

    await page.goto(projectDetailUrl!);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('company-info-edit-button').click();
    await page.getByLabel('컨설턴트 내부 메모').fill('임시 변경 — 폐기 예정');

    await page.getByRole('button', { name: '취소' }).click();

    // AlertDialog 노출
    await expect(page.getByText('변경사항을 취소하시겠습니까?')).toBeVisible();
    await page.getByRole('button', { name: '취소하기' }).click();

    // view 모드, 원래 메모 그대로
    await expect(page.getByTestId('company-info-edit-button')).toBeVisible();
    await expect(page.getByText(ORIGINAL_NOTE)).toBeVisible();
    await expect(page.getByText('임시 변경 — 폐기 예정')).not.toBeVisible();
  });

  test('빈 회사명 저장 시도 → 인라인 에러 노출', async ({ consultantPage: page }) => {
    test.skip(!projectDetailUrl, '담당 프로젝트가 없음');

    await page.goto(projectDetailUrl!);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('company-info-edit-button').click();

    const nameInput = page.getByLabel('회사명');
    await nameInput.fill('');
    await page.getByTestId('company-info-save-button').click();

    // 인라인 에러 노출
    await expect(page.getByText('회사명을 입력하세요.')).toBeVisible();
    // edit 모드 유지
    await expect(page.getByTestId('company-info-edit-form')).toBeVisible();
  });

  test('정리 — 메모 원복', async ({ consultantPage: page }) => {
    test.skip(!projectDetailUrl, '담당 프로젝트가 없음');

    await page.goto(projectDetailUrl!);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('company-info-edit-button').click();
    await page.getByLabel('컨설턴트 내부 메모').fill(UPDATED_NOTE);
    await page.getByTestId('company-info-save-button').click();
    await expect(page.getByTestId('company-info-edit-button')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(UPDATED_NOTE)).toBeVisible();
  });
});
