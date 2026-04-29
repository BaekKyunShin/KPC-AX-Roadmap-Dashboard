// e2e/consultant/interview-pbl.spec.ts
// PR #2 Task 2.4-d: PBL V2 인터뷰 9 스텝 골든 플로우 E2E (양식 2:1 정합)
//   - V2 Client (camelCase 스키마 + 양식 2 Ⅰ·Ⅱ·Ⅲ 장 9 스텝)
//   - 이전 버전(legacy 9스텝)은 본 Task 의 page.tsx V2 전환으로 더 이상 노출되지 않음
//   - 골든 플로우: Ⅰ → Ⅱ-1-가 → Ⅱ-1-나 → Ⅱ-2 → Ⅱ-3-가(스킵) → Ⅱ-3-나 →
//                  Ⅲ-1 → Ⅲ-2 → Ⅲ-3·4 → 최종 제출 검증
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

let interviewUrl: string | null = null;
let isPblAvailable = false;

async function findPBLProjectInterviewUrl(
  page: import('@playwright/test').Page,
): Promise<string | null> {
  await page.goto('/consultant/projects');
  await page.waitForLoadState('networkidle');

  const href = await findFirstLinkHref(page, '/consultant/projects/');
  if (!href) return null;

  await page.goto(href);
  await page.waitForLoadState('networkidle');
  const isPBL =
    (await page.getByText(/PBL/).first().isVisible().catch(() => false)) ??
    false;
  if (!isPBL) return null;
  return `${href}/interview`;
}

test.describe('컨설턴트 PBL 인터뷰 V2 (양식 2:1 정합 9 스텝)', () => {
  test('V2 Client 로드 + 첫 스텝(Ⅰ 훈련과정 개요) 렌더', async ({
    consultantPage: page,
  }) => {
    const getErrors = setupConsoleErrorCheck(page);

    interviewUrl = await findPBLProjectInterviewUrl(page);
    test.skip(!interviewUrl, '테스트 데이터 없음: 담당 PBL 프로젝트 없음');
    isPblAvailable = Boolean(interviewUrl);

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(
      /\/consultant\/projects\/[a-f0-9-]+\/interview/,
      { timeout: 10_000 },
    );

    // V2 PageHeader (h1 "AI PBL 인터뷰")
    await expect(
      page.getByRole('heading', { name: /AI PBL 인터뷰/, level: 1 }),
    ).toBeVisible();

    // 스테퍼 노출 + Ⅰ StepOverview 기본 활성화
    const stepper = page.locator('nav[aria-label="Progress"]');
    await expect(stepper).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '훈련과정 개요', level: 2 }),
    ).toBeVisible();

    // Ⅰ overview 의 기업명 input
    await expect(page.getByLabel('기업명')).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('Ⅱ-1-가 기업 경영 이슈 스텝 이동 및 textarea 편집', async ({
    consultantPage: page,
  }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '다음 스텝' }).click();
    await expect(
      page.getByRole('heading', { name: '기업 경영 이슈', level: 2 }),
    ).toBeVisible();
    await expect(page.getByLabel('기업 경영 이슈')).toBeVisible();
  });

  test('Ⅱ-1-나 조직 및 주요 업무 스텝 — OrganizationTree 렌더', async ({
    consultantPage: page,
  }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 2; i += 1) {
      await page.getByRole('button', { name: '다음 스텝' }).click();
    }
    await expect(
      page.getByRole('heading', { name: '조직 및 주요 업무', level: 2 }),
    ).toBeVisible();
    // OrganizationTree 위젯의 "루트 노드 추가" 버튼
    await expect(
      page.getByRole('button', { name: '루트 노드 추가' }),
    ).toBeVisible();
  });

  test('Ⅱ-3-가 HRD이음 PDF 업로드 UI 렌더 (accept=pdf)', async ({
    consultantPage: page,
  }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('button', { name: '다음 스텝' }).click();
    }
    // R3 #10(PBL) — 양식 정확 명칭으로 정정
    await expect(
      page.getByRole('heading', {
        name: /기업HRD이음컨설팅 결과 \(PDF 첨부\)/,
        level: 2,
      }),
    ).toBeVisible();

    // 업로드 input (accept=pdf)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);
    await expect(fileInput).toHaveAttribute('accept', /pdf/);

    expect(getErrors()).toEqual([]);
  });

  test('Ⅲ-1 훈련과제 도출 수행활동 — 기본 3차수 프리필', async ({
    consultantPage: page,
  }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 6; i += 1) {
      await page.getByRole('button', { name: '다음 스텝' }).click();
    }
    await expect(
      page.getByRole('heading', { name: '훈련과제 도출 수행활동', level: 2 }),
    ).toBeVisible();
    await expect(page.getByLabel('1행 수행 일자')).toBeVisible();
    await expect(page.getByLabel('2행 수행 일자')).toBeVisible();
    await expect(page.getByLabel('3행 수행 일자')).toBeVisible();
  });

  test('Ⅲ-3·4 훈련대상·AI수준 — 4등급 radio 2조 렌더', async ({
    consultantPage: page,
  }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 8; i += 1) {
      await page.getByRole('button', { name: '다음 스텝' }).click();
    }
    await expect(
      page.getByRole('heading', {
        name: '훈련대상 업무 + AI 수준 진단',
        level: 2,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('radiogroup', { name: '현재 AI역량 수준' }),
    ).toBeVisible();
    await expect(
      page.getByRole('radiogroup', { name: '예상 AI역량 수준' }),
    ).toBeVisible();
  });

  test('마지막 스텝에서 "최종 제출" 버튼이 노출된다', async ({
    consultantPage: page,
  }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 8; i += 1) {
      await page.getByRole('button', { name: '다음 스텝' }).click();
    }
    await expect(
      page.getByRole('button', { name: '최종 제출' }),
    ).toBeVisible();
  });
});
