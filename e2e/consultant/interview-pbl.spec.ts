// e2e/consultant/interview-pbl.spec.ts
// PBL V2 인터뷰 10 스텝 골든 플로우 E2E (양식 2:1 정합 9 + STT 첨부 선택 1)
//   - V2 Client (camelCase 스키마 + 양식 2 Ⅰ·Ⅱ·Ⅲ 장 9 스텝 + STT 인사이트 추출 선택 1)
//   - 스텝 순서(단일 출처: pbl/PBLInterviewClient.tsx 의 PBL_STEPS):
//       1 Ⅰ 훈련과정 개요            2 Ⅱ-1 기업 경영 이슈
//       3 Ⅱ-1-가 기업HRD이음컨설팅 결과  4 Ⅱ-1-다 AI훈련과정 개발 필요성
//       5 Ⅱ-3-a 기업 훈련환경 분석     6 Ⅱ-3-b 기대효과·요구분석
//       7 Ⅲ-1 훈련과제 도출 수행활동    8 Ⅲ-2 문제 정의서
//       9 Ⅲ-3 훈련대상 업무           10 인터뷰 녹취 STT 첨부 (선택)
//   ⚠️ v1 의 "Ⅱ-1-나 조직 및 주요 업무" 스텝과 "현재/예상 AI역량 수준" radiogroup 은 삭제됐다.
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

let interviewUrl: string | null = null;
let isPblAvailable = false;

async function findPBLProjectInterviewUrl(
  page: import('@playwright/test').Page
): Promise<string | null> {
  await page.goto('/consultant/projects');
  await page.waitForLoadState('networkidle');

  const href = await findFirstLinkHref(page, '/consultant/projects/');
  if (!href) return null;

  await page.goto(href);
  await page.waitForLoadState('networkidle');
  const isPBL =
    (await page
      .getByText(/PBL/)
      .first()
      .isVisible()
      .catch(() => false)) ?? false;
  if (!isPBL) return null;
  return `${href}/interview`;
}

test.describe('컨설턴트 PBL 인터뷰 V2 (양식 2:1 정합 9 스텝 + STT 첨부 1)', () => {
  test('V2 Client 로드 + 첫 스텝(Ⅰ 훈련과정 개요) 렌더', async ({ consultantPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    interviewUrl = await findPBLProjectInterviewUrl(page);
    test.skip(!interviewUrl, '테스트 데이터 없음: 담당 PBL 프로젝트 없음');
    isPblAvailable = Boolean(interviewUrl);

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/consultant\/projects\/[a-f0-9-]+\/interview/, {
      timeout: 10_000,
    });

    // V2 PageHeader (h1 "AI PBL 인터뷰")
    await expect(page.getByRole('heading', { name: /AI PBL 인터뷰/, level: 1 })).toBeVisible();

    // 스테퍼 노출 + Ⅰ StepOverview 기본 활성화
    const stepper = page.locator('nav[aria-label="Progress"]');
    await expect(stepper).toBeVisible();
    await expect(page.getByRole('heading', { name: '훈련과정 개요', level: 2 })).toBeVisible();

    // Ⅰ overview 의 기업명 input
    await expect(page.getByLabel('기업명')).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('Ⅱ-1 기업 경영 이슈 스텝 이동 및 textarea 편집', async ({ consultantPage: page }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: '다음 스텝' }).click();
    await expect(page.getByRole('heading', { name: '기업 경영 이슈', level: 2 })).toBeVisible();
    await expect(page.getByLabel('기업 경영 이슈')).toBeVisible();
  });

  test('Ⅱ-1-가 HRD이음 PDF 업로드 UI 렌더 (accept=pdf) — 3번째 스텝', async ({
    consultantPage: page,
  }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    // hrdReport 는 3번째 스텝 (overview → companyIssues → hrdReport)
    for (let i = 0; i < 2; i += 1) {
      await page.getByRole('button', { name: '다음 스텝' }).click();
    }
    // R3 #10(PBL) — 양식 정확 명칭으로 정정
    await expect(
      page.getByRole('heading', {
        name: /기업HRD이음컨설팅 결과 \(PDF 첨부\)/,
        level: 2,
      })
    ).toBeVisible();

    // 업로드 input (accept=pdf)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);
    await expect(fileInput).toHaveAttribute('accept', /pdf/);

    expect(getErrors()).toEqual([]);
  });

  test('Ⅱ-3-a 기업 훈련환경 분석 — 5번째 스텝', async ({ consultantPage: page }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    // trainingEnv 는 5번째 스텝. 스테퍼 라벨은 "훈련환경" 으로 축약되나
    // 본문 h2 는 정본 그대로 "기업 훈련환경 분석".
    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('button', { name: '다음 스텝' }).click();
    }
    await expect(page.getByRole('heading', { name: '기업 훈련환경 분석', level: 2 })).toBeVisible();
  });

  test('Ⅲ-1 훈련과제 도출 수행활동 — 기본 3차수 프리필', async ({ consultantPage: page }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    // Ⅲ-1 은 7번째 스텝 (overview → companyIssues → hrdReport → courseNecessity →
    // trainingEnv → expectations → performanceActivities)
    for (let i = 0; i < 6; i += 1) {
      await page.getByRole('button', { name: '다음 스텝' }).click();
    }
    await expect(
      page.getByRole('heading', { name: '훈련과제 도출 수행활동', level: 2 })
    ).toBeVisible();
    await expect(page.getByLabel('1차 수행 일자')).toBeVisible();
    await expect(page.getByLabel('2차 수행 일자')).toBeVisible();
    await expect(page.getByLabel('3차 수행 일자')).toBeVisible();
    // 정본 참석자 4역할 (로드맵 Ⅰ-2 는 2역할 — 서로 다른 표)
    await expect(page.getByLabel('1차 PM 성명')).toBeVisible();
    await expect(page.getByLabel('1차 외부전문가 성명')).toBeVisible();
    await expect(page.getByLabel('1차 기업내부전문가 성명')).toBeVisible();
    await expect(page.getByLabel('1차 능력개발전담주치의 성명')).toBeVisible();
  });

  test('Ⅲ-2 문제 정의서 — 8번째 스텝', async ({ consultantPage: page }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 7; i += 1) {
      await page.getByRole('button', { name: '다음 스텝' }).click();
    }
    await expect(page.getByRole('heading', { name: '문제 정의서', level: 2 })).toBeVisible();
  });

  test('Ⅲ-3 훈련대상 업무 — 9번째 스텝 (v1 AI수준 radiogroup 2조는 삭제됨)', async ({
    consultantPage: page,
  }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 8; i += 1) {
      await page.getByRole('button', { name: '다음 스텝' }).click();
    }
    // v2 정본 정합 — 제목이 "훈련대상 업무 + AI 수준 진단" → "훈련대상 업무"
    await expect(page.getByRole('heading', { name: '훈련대상 업무', level: 2 })).toBeVisible();
    // Ⅲ-3-나·다 는 로드맵 연계 여부와 무관하게 항상 렌더된다.
    await expect(page.getByLabel('훈련대상 업무 선정 사유')).toBeVisible();
    await expect(page.getByLabel('세부내용 1 업무명')).toBeVisible();

    // Ⅲ-3-가 표는 선행 로드맵 과업 연계 시에만 렌더 (미연계 시 안내 문구) —
    // 시드 프로젝트의 연계 유무에 따라 갈리므로 둘 중 하나는 반드시 보여야 한다.
    const hasLinkedTasks = await page
      .getByLabel('과업 1 AI 도입·활용 필요도')
      .isVisible()
      .catch(() => false);
    if (hasLinkedTasks) {
      await expect(page.getByLabel('과업 1 훈련 선정')).toBeVisible();
    } else {
      await expect(page.getByText('선행 로드맵 과업이 연결되지 않았습니다.')).toBeVisible();
    }

    // v1 에서 삭제된 Ⅲ-4 AI역량 수준 4등급 radio 2조 — 되살아나면 즉시 실패.
    await expect(page.getByRole('radiogroup', { name: '현재 AI역량 수준' })).toHaveCount(0);
    await expect(page.getByRole('radiogroup', { name: '예상 AI역량 수준' })).toHaveCount(0);
  });

  test('마지막 스텝(STT 첨부 — 선택)에서 "최종 제출" 버튼이 노출되고 STT 원문 textarea 가 렌더된다', async ({
    consultantPage: page,
  }) => {
    test.skip(!isPblAvailable || !interviewUrl, 'PBL 인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    // 9회 다음 클릭 → 10번째 step (STT 첨부) 도달
    for (let i = 0; i < 9; i += 1) {
      await page.getByRole('button', { name: '다음 스텝' }).click();
    }
    await expect(
      page.getByRole('heading', { name: '인터뷰 녹취 STT 첨부', level: 2 })
    ).toBeVisible();
    await expect(page.getByLabel('STT 파일', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '최종 제출' })).toBeVisible();
  });
});
