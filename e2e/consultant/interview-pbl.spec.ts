// e2e/consultant/interview-pbl.spec.ts
// OFA-08: 산인공 AI PBL 인터뷰 9스텝 E2E (양식 2번 Ⅰ·Ⅱ·Ⅲ장)
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

let interviewUrl: string | null = null;
let isPblAvailable = false;

async function findPBLProjectInterviewUrl(page: import('@playwright/test').Page): Promise<string | null> {
  await page.goto('/consultant/projects');
  await page.waitForLoadState('networkidle');

  const href = await findFirstLinkHref(page, '/consultant/projects/');
  if (!href) return null;

  await page.goto(href);
  await page.waitForLoadState('networkidle');
  // PBL 트랙 뱃지/텍스트 확인 — 없으면 로드맵 프로젝트이므로 스킵 처리 가능
  const isPBL =
    (await page.getByText(/PBL/).first().isVisible().catch(() => false)) ?? false;
  if (!isPBL) return null;
  return `${href}/interview`;
}

test.describe('컨설턴트 PBL 인터뷰 (산인공 9스텝)', () => {
  test('PBL 인터뷰 페이지 로드 + 9스텝 스테퍼 + 훈련과정 개요 렌더', async ({
    consultantPage: page,
  }) => {
    const getErrors = setupConsoleErrorCheck(page);

    interviewUrl = await findPBLProjectInterviewUrl(page);
    test.skip(!interviewUrl, '테스트 데이터 없음: 담당 PBL 프로젝트 없음');
    isPblAvailable = Boolean(interviewUrl);

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/consultant\/projects\/[a-f0-9-]+\/interview/, {
      timeout: 10_000,
    });

    await expect(page.getByText('현장 인터뷰 (PBL)')).toBeVisible();

    const stepper = page.locator('nav[aria-label="Progress"]');
    await expect(stepper).toBeVisible();

    // Step 1 — Ⅰ. 훈련과정 개요
    await expect(page.getByRole('heading', { name: /Ⅰ\. 훈련과정 개요/ })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: /AI역량 수준/ })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: '불량률 감소' })).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('Step 2 — Ⅱ-1 기업 현황 분석 (경영 이슈 + 조직도)', async ({ consultantPage: page }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /^다음$/ }).click();
    await expect(page.getByRole('heading', { name: /Ⅱ-1\. 기업 현황 분석/ })).toBeVisible();
    await expect(page.getByLabel(/경영 이슈/)).toBeVisible();
  });

  test('Step 3 — Ⅱ-2 기업 훈련환경 분석 (적정 훈련시간·장소 라디오·AI인프라)', async ({
    consultantPage: page,
  }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: /^다음$/ }).click();
    }
    await expect(page.getByRole('heading', { name: /Ⅱ-2\. 기업 훈련환경 분석/ })).toBeVisible();
  });

  test('Step 4 — Ⅱ-3 AI 과정개발의 필요성', async ({ consultantPage: page }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /^다음$/ }).click();
    }
    await expect(page.getByRole('heading', { name: /Ⅱ-3\. AI 과정개발의 필요성/ })).toBeVisible();
  });

  // ISSUE-14 PBL 확장: Ⅱ-3-가. 기업HRD이음컨설팅 결과 PDF 단일 첨부 UI
  test('Step 4 — Ⅱ-3-가 HRD이음 보고서 PDF 업로드 UI 렌더', async ({
    consultantPage: page,
  }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /^다음$/ }).click();
    }

    // 섹션 제목 (전산 자동 표출)
    await expect(
      page.getByRole('heading', { name: /Ⅱ-3-가\. 기업HRD이음컨설팅 결과/ }),
    ).toBeVisible();

    // PDF 단일 첨부 안내 문구
    await expect(page.getByText(/PDF \(최대 10MB\)/)).toBeVisible();

    // 업로드 트리거 버튼 — 파일이 첨부되지 않은 초기 상태
    await expect(page.getByRole('button', { name: /파일 선택/ })).toBeEnabled();

    // 숨겨진 input 이 sr-only 로 존재하고 accept=PDF 로 제한
    const fileInput = page.locator(
      'input[type="file"][aria-label="HRD이음컨설팅 결과 보고서 첨부"]',
    );
    await expect(fileInput).toHaveCount(1);
    await expect(fileInput).toHaveAttribute('accept', /pdf/);

    expect(getErrors()).toEqual([]);
  });

  test('Step 5 — Ⅲ-1 수행활동 (참석자 4역할)', async ({ consultantPage: page }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /^다음$/ }).click();
    }
    await expect(page.getByRole('heading', { name: /Ⅲ-1\. 훈련과제 도출 수행활동/ })).toBeVisible();
    await expect(page.getByText(/컨설팅책임자|PM/)).toBeVisible();
    await expect(page.getByText(/외부전문가/)).toBeVisible();
    await expect(page.getByText(/기업내부전문가/)).toBeVisible();
    await expect(page.getByText(/능력개발전담주치의/)).toBeVisible();
  });

  test('Step 8 — Ⅲ-4 AI 수준 진단 (등급 병기)', async ({ consultantPage: page }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 7; i++) {
      await page.getByRole('button', { name: /^다음$/ }).click();
    }
    await expect(page.getByRole('heading', { name: /Ⅲ-4\. AI 수준 진단/ })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: '현재 AI역량 수준' })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: '향후 AI역량 수준' })).toBeVisible();
  });

  test('Step 9 — 확인·제출 섹션이 8개 렌더', async ({ consultantPage: page }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 8; i++) {
      await page.getByRole('button', { name: /^다음$/ }).click();
    }
    await expect(page.getByRole('heading', { name: '확인 · 제출' })).toBeVisible();
    const editButtons = page.getByRole('button', { name: /수정/ });
    await expect(editButtons).toHaveCount(8);
  });
});
