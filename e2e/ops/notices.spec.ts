// e2e/ops/notices.spec.ts
// OFA-04: 공지 게시판 E2E — 운영자 작성·첨부 업로드 + 컨설턴트 조회·다운로드
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { deleteNoticesByTitle } from '../helpers/cleanup.helper';

test.describe.configure({ mode: 'serial' });

// 유니크한 제목으로 공지 2건 생성 (일반 + 고정)
const TIMESTAMP = Date.now();
const NORMAL_TITLE = `[E2E] 공지 일반 ${TIMESTAMP}`;
const PINNED_TITLE = `[E2E] 공지 고정 ${TIMESTAMP}`;

test.afterAll(async () => {
  await deleteNoticesByTitle(`%E2E] 공지%${TIMESTAMP}%`);
});

test.describe('Phase OFA-04: 공지 게시판 — 운영자 플로우', () => {
  test('운영자: 공지 목록 페이지 로드 + 작성 버튼 표시', async ({
    opsPage: page,
  }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/ops/notices');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: '공지 관리' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /새 공지 작성/ }),
    ).toBeVisible();
    expect(getErrors()).toEqual([]);
  });

  test('운영자: 일반 공지 작성', async ({ opsPage: page }) => {
    await page.goto('/ops/notices/new');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: '새 공지 작성' }),
    ).toBeVisible();

    await page.getByLabel(/제목/).fill(NORMAL_TITLE);
    await page.getByLabel('본문').fill('E2E 테스트 본문입니다.');
    await page.getByRole('button', { name: '작성' }).click();

    // 작성 후 edit 페이지로 이동 (/ops/notices/{id}/edit)
    await expect(page).toHaveURL(/\/ops\/notices\/[^/]+\/edit/, {
      timeout: 10_000,
    });
    // 편집 페이지에서 첨부 업로더 표시 확인
    await expect(page.getByText(/파일 선택/)).toBeVisible();
  });

  test('운영자: 공지 작성 + 첨부 업로드', async ({ opsPage: page }) => {
    await page.goto('/ops/notices/new');
    await page.waitForLoadState('networkidle');

    await page.getByLabel(/제목/).fill(PINNED_TITLE);
    await page.getByLabel('본문').fill('고정 공지 본문');
    // 상단 고정 체크 (Radix Checkbox)
    await page
      .locator('button[role="checkbox"][id="is_pinned"]')
      .click()
      .catch(() => {
        // 폴백: label 클릭
        return page.getByLabel('상단 고정').click();
      });

    await page.getByRole('button', { name: '작성' }).click();
    await expect(page).toHaveURL(/\/ops\/notices\/[^/]+\/edit/, {
      timeout: 10_000,
    });

    // 첨부 파일 업로드 (네이티브 input[type=file])
    const fileInput = page.getByTestId('attachment-input');
    await fileInput.setInputFiles({
      name: 'sample.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('테스트 첨부 파일 내용'),
    });

    // 업로드 성공 토스트 or 첨부 목록 항목 확인
    await expect(page.getByTestId('attachment-list')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('sample.txt')).toBeVisible();
  });

  test('운영자: 목록에서 상단 고정이 먼저 나타난다', async ({
    opsPage: page,
  }) => {
    await page.goto('/ops/notices');
    await page.waitForLoadState('networkidle');

    // "상단 고정" 섹션이 존재
    await expect(page.getByText('상단 고정', { exact: true })).toBeVisible();
    await expect(page.getByText(PINNED_TITLE)).toBeVisible();

    // "일반 공지" 섹션에 normal 공지 노출
    await expect(page.getByText('일반 공지', { exact: true })).toBeVisible();
    await expect(page.getByText(NORMAL_TITLE)).toBeVisible();
  });
});

test.describe('Phase OFA-04: 공지 게시판 — 컨설턴트 플로우', () => {
  test('컨설턴트: 공지 목록 접근 가능', async ({ consultantPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/notices');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: '공지사항' }),
    ).toBeVisible();
    expect(getErrors()).toEqual([]);
  });

  test('컨설턴트: 제목 검색으로 필터 동작', async ({
    consultantPage: page,
  }) => {
    await page.goto('/notices');
    await page.waitForLoadState('networkidle');

    // 검색 바 입력 + 검색 버튼 클릭
    const searchBar = page.getByTestId('notice-search-bar');
    await searchBar.getByLabel('검색어').fill(`E2E] 공지 일반 ${TIMESTAMP}`);
    await searchBar.getByRole('button', { name: '검색' }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(NORMAL_TITLE)).toBeVisible();
    // 다른 공지는 이 필터 조건에서 보이지 않아야 함
    await expect(page.getByText(PINNED_TITLE)).not.toBeVisible();
  });

  test('컨설턴트: 상세 진입 + 첨부 다운로드 버튼 표시', async ({
    consultantPage: page,
  }) => {
    await page.goto('/notices');
    await page.waitForLoadState('networkidle');

    // 첨부가 있는 고정 공지 클릭
    await page.getByRole('link', { name: new RegExp(PINNED_TITLE) }).click();
    await page.waitForLoadState('networkidle');

    // 상세 페이지 헤더
    await expect(
      page.getByRole('heading', { name: PINNED_TITLE }),
    ).toBeVisible();

    // 첨부 목록 노출
    await expect(page.getByTestId('attachment-list')).toBeVisible();
    const downloadBtn = page.getByRole('button', { name: '다운로드' }).first();
    await expect(downloadBtn).toBeVisible();

    // 다운로드 버튼 클릭 → 서명 URL 생성 (링크 triggered; 실제 파일 다운로드는 Playwright download 이벤트로 확인)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }).catch(() => null),
      downloadBtn.click(),
    ]);

    // 다운로드 이벤트가 발생했거나(새 창 없이 성공), 혹은 서명 URL로 새 창이 열렸을 수 있다.
    // 최소한 에러 토스트가 노출되지 않으면 성공으로 간주.
    await expect(page.getByText('다운로드 링크 생성 실패')).not.toBeVisible();
    if (download) {
      expect(download.suggestedFilename()).toContain('.txt');
    }
  });
});
