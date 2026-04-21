// e2e/consultant/interview-roadmap.spec.ts
// OFA-06.5: 산인공 AI 훈련 로드맵 인터뷰 6스텝 E2E (개요 스텝 추가)
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

let interviewUrl: string | null = null;

test.describe('컨설턴트 로드맵 인터뷰 (산인공 6스텝)', () => {
  test('로드맵 인터뷰 페이지 로드 + 6스텝 스테퍼 + 개요 스텝 렌더', async ({ consultantPage: page }) => {
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

    const heading = page.getByRole('heading', { name: /현장 인터뷰|PBL/ });
    await expect(heading).toBeVisible();

    const isRoadmap = await page.getByText('현장 인터뷰 (로드맵)').isVisible().catch(() => false);
    test.skip(!isRoadmap, '로드맵 트랙 프로젝트가 아닙니다');

    // 스테퍼 노출
    const stepper = page.locator('nav[aria-label="Progress"]');
    await expect(stepper).toBeVisible();

    // Step 1 = 개요 (heading은 "Ⅰ. 개요" 형식 — 산인공 양식 번호 접두사 포함)
    await expect(page.getByRole('heading', { name: /개요/ })).toBeVisible();
    await expect(page.getByLabel(/수립 필요성/)).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: /AI 역량 수준/ })).toBeVisible();
    await expect(page.getByLabel(/선정 과업/)).toBeVisible();
    await expect(page.getByLabel(/수립 주요내용/)).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('Step 3: 기업 요구분석 4 textarea 노출 (개요 + 기본 정보 이후)', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmap = await page.getByText('현장 인터뷰 (로드맵)').isVisible().catch(() => false);
    test.skip(!isRoadmap, '로드맵 트랙 아님');

    // Step 1(개요) → Step 2(기본) → Step 3(기업 요구분석)
    await page.getByRole('button', { name: /^다음$/ }).click();
    await page.getByRole('button', { name: /^다음$/ }).click();

    await expect(page.getByRole('heading', { name: /기업 요구분석/ })).toBeVisible();
    await expect(page.getByLabel(/기업 현황/)).toBeVisible();
    await expect(page.getByLabel(/주요 문제/)).toBeVisible();
    await expect(page.getByLabel(/추진 의지/)).toBeVisible();
    await expect(page.getByLabel(/기대 성과/)).toBeVisible();
  });

  test('Step 4: 과업·워크플로우 분석 — 행 추가/AI필요도 라디오', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmap = await page.getByText('현장 인터뷰 (로드맵)').isVisible().catch(() => false);
    test.skip(!isRoadmap, '로드맵 트랙 아님');

    // Step 1 → Step 4 (다음 3회)
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /^다음$/ }).click();
    }

    await expect(page.getByRole('heading', { name: /과업.*분석/ })).toBeVisible();

    // aria-label="AI도입·활용 필요도" (중점 `·`, 공백 없음) — 실제 UI 기준
    await expect(page.getByRole('radiogroup', { name: 'AI도입·활용 필요도' }).first()).toBeVisible();

    const addBtn = page.getByRole('button', { name: /과업 추가/ });
    await expect(addBtn).toBeVisible();

    // 현재 행 수 파악 후 추가 → 한 개 증가 확인 (자동저장된 데이터로 1개 이상일 수 있음)
    const removeButtonSelector = page.getByRole('button', { name: /행 삭제/ });
    const initialCount = await removeButtonSelector.count();
    await addBtn.click();
    await expect(removeButtonSelector).toHaveCount(initialCount + 1);
  });

  test('Step 6: 확인·제출 화면 + 필수 미완료 시 경고', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmap = await page.getByText('현장 인터뷰 (로드맵)').isVisible().catch(() => false);
    test.skip(!isRoadmap, '로드맵 트랙 아님');

    // Step 1 → Step 6 (다음 5회)
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /^다음$/ }).click();
    }

    await expect(page.getByRole('heading', { name: /확인.*제출/ })).toBeVisible();

    await expect(page.getByRole('button', { name: /^저장$/ })).toBeVisible();

    const warning = page.getByText(/필수 단계 미완료/);
    await expect(warning).toBeVisible();
  });
});
