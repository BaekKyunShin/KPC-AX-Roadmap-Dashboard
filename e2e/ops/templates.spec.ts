// e2e/ops/templates.spec.ts
// Phase C-10: 자가진단 템플릿 목록, 생성, 상세, 드롭다운 메뉴, 삭제 다이얼로그
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck, expectToast } from '../helpers/assertions.helper';
import { deleteTemplate } from '../helpers/cleanup.helper';

test.describe.configure({ mode: 'serial' });

// 테스트 중 생성된 템플릿 ID를 추적
let createdTemplateId: string | null = null;

test.afterAll(async () => {
  if (createdTemplateId) {
    await deleteTemplate(createdTemplateId);
  }
});

// ─── 템플릿 목록 페이지 ─────────────────────────────────────────────────────

test.describe('템플릿 목록 페이지', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/ops/templates');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 + 테이블/카드 표시 — 콘솔 에러 없음', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/ops/templates');
    await page.waitForLoadState('networkidle');

    // 페이지 헤더 확인
    await expect(page.getByRole('heading', { name: '자가진단 템플릿' })).toBeVisible();

    // 테이블 또는 빈 상태 메시지 중 하나가 존재
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmptyState = await page.getByText('템플릿 없음').isVisible().catch(() => false);
    expect(hasTable || hasEmptyState).toBeTruthy();

    expect(getErrors()).toEqual([]);
  });

  test('"새 템플릿 생성" 버튼 → /ops/templates/new 이동', async ({ opsPage: page }) => {
    await page.getByRole('link', { name: /새 템플릿 생성/ }).click();
    await expect(page).toHaveURL('/ops/templates/new');
  });
});

// ─── 템플릿 생성 페이지 ─────────────────────────────────────────────────────

test.describe('템플릿 생성 페이지', () => {
  test('생성 페이지 로드 + 폼 표시 — 필수 필드 확인', async ({ opsPage: page }) => {
    await page.goto('/ops/templates/new');
    await page.waitForLoadState('networkidle');

    // 페이지 헤더
    await expect(page.getByRole('heading', { name: '새 템플릿 생성' })).toBeVisible();

    // 기본 정보 섹션
    await expect(page.getByText('기본 정보')).toBeVisible();
    await expect(page.getByLabel(/템플릿 이름/)).toBeVisible();
    await expect(page.getByLabel('설명')).toBeVisible();

    // 질문 목록 섹션
    await expect(page.getByText(/질문 목록/)).toBeVisible();
    await expect(page.getByText('+ 질문 추가')).toBeVisible();

    // 생성/취소 버튼
    await expect(page.getByRole('button', { name: '생성' })).toBeVisible();
    await expect(page.getByRole('link', { name: '취소' })).toBeVisible();
  });

  test('템플릿 생성 → 성공 토스트 + 리다이렉트', async ({ opsPage: page }) => {
    await page.goto('/ops/templates/new');
    await page.waitForLoadState('networkidle');

    // 템플릿 이름 입력
    await page.getByLabel(/템플릿 이름/).fill('E2E 테스트 템플릿');

    // 설명 입력
    await page.getByLabel('설명').fill('E2E 테스트용 템플릿입니다.');

    // 기본 질문 내용 입력 (첫 번째 질문이 이미 존재)
    await page.locator('textarea').first().fill('테스트 질문입니다.');

    // 생성 버튼 클릭
    await page.getByRole('button', { name: '생성' }).click();

    // 성공 토스트
    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: '템플릿 생성 완료' }),
    ).toBeVisible({ timeout: 30_000 });

    // 리다이렉트된 URL에서 템플릿 ID 추출
    await expect(page).toHaveURL(/\/ops\/templates\/[a-f0-9-]+/, { timeout: 30_000 });
    const url = page.url();
    createdTemplateId = url.split('/ops/templates/')[1]?.split('?')[0] ?? null;
  });
});

// ─── 템플릿 상세 페이지 ─────────────────────────────────────────────────────

test.describe('템플릿 상세 페이지', () => {
  test('기존 템플릿 클릭 → 상세 페이지 로드', async ({ opsPage: page }) => {
    await page.goto('/ops/templates');
    await page.waitForLoadState('networkidle');

    // 템플릿 목록에서 첫 번째 링크 클릭
    const templateLink = page.locator('table a[href*="/ops/templates/"]').first();
    const hasTemplateLink = await templateLink.isVisible().catch(() => false);
    // 템플릿 데이터가 없으면 상세 페이지 테스트 불가
    test.skip(!hasTemplateLink, '테스트 데이터 없음: 템플릿 목록이 비어있습니다');

    await templateLink.click();
    await expect(page).toHaveURL(/\/ops\/templates\/[a-f0-9-]+/);

    // 상세 페이지 요소 확인
    await expect(page.getByText('템플릿 편집')).toBeVisible();
    await expect(page.getByText('미리보기')).toBeVisible();
    await expect(page.getByRole('link', { name: /템플릿 목록으로/ })).toBeVisible();
  });
});

// ─── 템플릿 편집 ─────────────────────────────────────────────────────────────

test.describe('템플릿 편집', () => {
  test('이름/설명 변경 → 저장 → 성공 토스트', async ({ opsPage: page }) => {
    test.skip(!createdTemplateId, '선행 생성 테스트 미완료: createdTemplateId 없음');

    await page.goto(`/ops/templates/${createdTemplateId}`);
    await page.waitForLoadState('networkidle');

    // 편집 폼이 로드되었는지 확인
    await expect(page.getByText('템플릿 편집')).toBeVisible();

    // 이름 수정
    const nameInput = page.getByLabel(/템플릿 이름/);
    await nameInput.clear();
    await nameInput.fill('E2E 수정된 템플릿');

    // 설명 수정
    const descInput = page.getByLabel('설명');
    await descInput.clear();
    await descInput.fill('E2E 수정된 설명입니다.');

    // 저장 버튼 클릭
    await page.getByRole('button', { name: '저장' }).click();

    // 성공 토스트 확인
    await expectToast(page, '템플릿 수정 완료');
  });

  test('질문 추가 → 저장 → 질문 수 증가 확인', async ({ opsPage: page }) => {
    test.skip(!createdTemplateId, '선행 생성 테스트 미완료: createdTemplateId 없음');

    await page.goto(`/ops/templates/${createdTemplateId}`);
    await page.waitForLoadState('networkidle');

    // 현재 질문 수 파악 (질문 목록 헤더에서 "질문 목록 (N개)" 텍스트 확인)
    const questionHeader = page.getByText(/질문 목록 \(\d+개\)/);
    await expect(questionHeader).toBeVisible();
    const headerText = await questionHeader.textContent();
    const initialCount = parseInt(headerText?.match(/\((\d+)개\)/)?.[1] || '0', 10);

    // "질문 추가" 버튼 클릭
    await page.getByText('+ 질문 추가').click();

    // 새로 추가된 질문의 textarea에 내용 입력 (마지막 textarea)
    const textareas = page.locator('textarea');
    const lastTextarea = textareas.last();
    await lastTextarea.fill('E2E 추가된 질문입니다.');

    // 저장
    await page.getByRole('button', { name: '저장' }).click();
    await expectToast(page, '템플릿 수정 완료');

    // 페이지 새로고침 후 질문 수 증가 확인
    await page.goto(`/ops/templates/${createdTemplateId}`);
    await page.waitForLoadState('networkidle');

    const updatedHeader = page.getByText(/질문 목록 \(\d+개\)/);
    await expect(updatedHeader).toBeVisible();
    const updatedText = await updatedHeader.textContent();
    const updatedCount = parseInt(updatedText?.match(/\((\d+)개\)/)?.[1] || '0', 10);

    expect(updatedCount).toBe(initialCount + 1);
  });

  test('미리보기 영역에 질문 목록 표시', async ({ opsPage: page }) => {
    test.skip(!createdTemplateId, '선행 생성 테스트 미완료: createdTemplateId 없음');

    await page.goto(`/ops/templates/${createdTemplateId}`);
    await page.waitForLoadState('networkidle');

    // 미리보기 섹션 확인
    await expect(page.getByText('미리보기')).toBeVisible();

    // 미리보기 영역 내 총 문항 수 표시 확인
    await expect(page.getByText(/총 \d+문항/)).toBeVisible();

    // 미리보기 영역 내 최대 점수 표시 확인
    await expect(page.getByText(/최대 점수:/)).toBeVisible();

    // 미리보기 영역 내 차원 수 표시 확인
    await expect(page.getByText(/\d+개 차원/)).toBeVisible();

    // 질문 텍스트가 미리보기에 표시되는지 확인 (5점 척도 라벨)
    await expect(page.getByText('(5점 척도)').first()).toBeVisible();
  });
});

// ─── 생성 유효성 검사 ────────────────────────────────────────────────────────

test.describe('생성 유효성 검사', () => {
  test('빈 이름으로 생성 시도 → 저장 버튼 비활성화 + 경고 메시지', async ({ opsPage: page }) => {
    await page.goto('/ops/templates/new');
    await page.waitForLoadState('networkidle');

    // 이름 필드를 빈 상태로 둠 (기본값이 빈 문자열)
    const nameInput = page.getByLabel(/템플릿 이름/);
    await nameInput.clear();

    // 생성 버튼이 비활성화 상태인지 확인 (name.trim()이 빈 문자열이면 disabled)
    const submitButton = page.getByRole('button', { name: '생성' });
    await expect(submitButton).toBeDisabled();

    // "템플릿 이름을 입력해주세요" 인라인 경고 메시지 확인
    await expect(page.getByText('템플릿 이름을 입력해주세요')).toBeVisible();
  });
});

// ─── 활성 템플릿 편집 제한 ───────────────────────────────────────────────────

test.describe('활성 템플릿 편집 제한', () => {
  test('사용 중인 템플릿 편집 시 경고 메시지 표시', async ({ opsPage: page }) => {
    test.skip(!createdTemplateId, '선행 생성 테스트 미완료: createdTemplateId 없음');

    await page.goto(`/ops/templates/${createdTemplateId}`);
    await page.waitForLoadState('networkidle');

    // 사용 중인 템플릿일 경우 경고 배너가 표시됨
    const warningBanner = page.getByText('이 템플릿은 이미 사용 중입니다');
    const isInUse = await warningBanner.isVisible().catch(() => false);

    // 사용 중이 아니면 이 테스트를 건너뜀
    test.skip(!isInUse, '이 템플릿은 사용 중이 아님: 경고 메시지 테스트 불가');

    // 경고 메시지 전문 확인
    await expect(
      page.getByText(/질문을 수정하면 새 버전으로 저장되며/),
    ).toBeVisible();

    // 사용 현황 카운트가 0보다 큰지 확인
    await expect(page.getByText(/사용 현황:.*[1-9]\d*건/)).toBeVisible();
  });
});

// ─── 드롭다운 메뉴 동작 ─────────────────────────────────────────────────────

test.describe('드롭다운 메뉴 동작', () => {
  test('목록에서 드롭다운 열기 — 복제 항목 표시', async ({ opsPage: page }) => {
    await page.goto('/ops/templates');
    await page.waitForLoadState('networkidle');

    // 작업 메뉴 버튼 확인
    const actionButton = page.getByRole('button', { name: '작업 메뉴' }).first();
    const hasActionButton = await actionButton.isVisible().catch(() => false);
    // 작업 메뉴 버튼이 없으면 드롭다운 테스트 불가
    test.skip(!hasActionButton, '테스트 데이터 없음: 작업 메뉴 버튼이 없습니다');

    await actionButton.click();

    // 드롭다운 메뉴 내 "복제" 항목 확인
    await expect(page.getByRole('menuitem', { name: '복제' })).toBeVisible();
  });

  test('삭제 확인 다이얼로그 — 취소만 수행', async ({ opsPage: page }) => {
    await page.goto('/ops/templates');
    await page.waitForLoadState('networkidle');

    // 작업 메뉴 버튼 클릭
    const actionButton = page.getByRole('button', { name: '작업 메뉴' }).first();
    const hasActionBtn = await actionButton.isVisible().catch(() => false);
    // 작업 메뉴 버튼이 없으면 삭제 다이얼로그 테스트 불가
    test.skip(!hasActionBtn, '테스트 데이터 없음: 작업 메뉴 버튼이 없습니다');

    await actionButton.click();

    // "삭제" 메뉴 항목이 있는지 확인 (비활성 + 미사용 템플릿만 삭제 가능)
    const deleteItem = page.getByRole('menuitem', { name: '삭제' });
    const hasDeleteItem = await deleteItem.isVisible().catch(() => false);
    // 삭제 불가 템플릿 → confirm 다이얼로그 테스트 스킵
    test.skip(!hasDeleteItem, '삭제 불가 템플릿: 삭제 메뉴 항목이 없습니다');

    // confirm 다이얼로그를 가로채서 취소 (confirm → false)
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    await deleteItem.click();
  });
});
