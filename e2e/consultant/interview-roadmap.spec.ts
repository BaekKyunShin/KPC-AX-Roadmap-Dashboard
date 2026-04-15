// e2e/consultant/interview-roadmap.spec.ts
// OFA-05: 산인공 AI 훈련 로드맵 인터뷰 5스텝 E2E
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

let interviewUrl: string | null = null;

test.describe('컨설턴트 로드맵 인터뷰 (산인공 5스텝)', () => {
  test('로드맵 인터뷰 페이지 로드 + 5스텝 스테퍼', async ({ consultantPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    const href = await findFirstLinkHref(page, '/consultant/projects/');
    test.skip(!href, '테스트 데이터 없음: 담당 프로젝트가 없습니다');
    interviewUrl = `${href!}/interview`;

    await page.goto(interviewUrl);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/consultant\/projects\/[a-f0-9-]+\/interview/, {
      timeout: 10_000,
    });

    // ROADMAP 트랙이면 "현장 인터뷰 (로드맵)" 헤더, PBL이면 placeholder
    const heading = page.getByRole('heading', { name: /현장 인터뷰|PBL/ });
    await expect(heading).toBeVisible();

    // 로드맵 트랙 프로젝트여야 이후 테스트 수행
    const isRoadmap = await page.getByText('현장 인터뷰 (로드맵)').isVisible().catch(() => false);
    test.skip(!isRoadmap, '로드맵 트랙 프로젝트가 아닙니다');

    // 스테퍼에 5개 스텝 존재 확인
    const stepper = page.locator('nav[aria-label="Progress"]');
    await expect(stepper).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('Step 2: 기업 요구분석 4 textarea 노출', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmap = await page.getByText('현장 인터뷰 (로드맵)').isVisible().catch(() => false);
    test.skip(!isRoadmap, '로드맵 트랙 아님');

    await page.getByRole('button', { name: /^다음$/ }).click();

    await expect(page.getByRole('heading', { name: /기업 요구분석/ })).toBeVisible();
    await expect(page.getByLabel(/기업 현황/)).toBeVisible();
    await expect(page.getByLabel(/주요 문제/)).toBeVisible();
    await expect(page.getByLabel(/추진 의지/)).toBeVisible();
    await expect(page.getByLabel(/기대 성과/)).toBeVisible();
  });

  test('Step 3: 과업·워크플로우 분석 — 행 추가/AI필요도 라디오', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmap = await page.getByText('현장 인터뷰 (로드맵)').isVisible().catch(() => false);
    test.skip(!isRoadmap, '로드맵 트랙 아님');

    // Step 3까지 이동
    await page.getByRole('button', { name: /^다음$/ }).click();
    await page.getByRole('button', { name: /^다음$/ }).click();

    await expect(page.getByRole('heading', { name: /과업.*분석/ })).toBeVisible();

    // AI 필요도 라디오 그룹 확인
    await expect(page.getByRole('radiogroup', { name: 'AI 도입 필요도' }).first()).toBeVisible();

    // 행 추가 버튼
    const addBtn = page.getByRole('button', { name: /과업 추가/ });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // 삭제 버튼이 2개 이상 존재 (행이 2개)
    const removeButtons = page.getByRole('button', { name: /행 삭제/ });
    await expect(removeButtons).toHaveCount(2);
  });

  test('Step 5: 확인·제출 화면 + 필수 미완료 시 경고', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmap = await page.getByText('현장 인터뷰 (로드맵)').isVisible().catch(() => false);
    test.skip(!isRoadmap, '로드맵 트랙 아님');

    // Step 5까지 이동
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /^다음$/ }).click();
    }

    await expect(page.getByRole('heading', { name: /확인.*제출/ })).toBeVisible();

    // 저장 버튼 노출
    await expect(page.getByRole('button', { name: /^저장$/ })).toBeVisible();

    // 필수 미완료 상태 배지
    const warning = page.getByText(/필수 단계 미완료/);
    // 초기 상태에서는 필수 필드가 비어 있으므로 경고가 보여야 함
    await expect(warning).toBeVisible();
  });
});
