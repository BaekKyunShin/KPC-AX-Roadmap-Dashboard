// e2e/consultant/interview-roadmap.spec.ts
// ISSUE-04 (2026-04-21 담당자 확정안): 산인공 로드맵 인터뷰 7스텝 E2E
//   - Step 6 역량 모델링(Ⅲ-1) 신규 스텝 추가 ↔ 기존 확인/제출은 Step 7 로 이동
//   - Step 1 개요: `roadmap_summary` 입력란 제거 → "자동 생성 예정" 배지
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

let interviewUrl: string | null = null;

test.describe('컨설턴트 로드맵 인터뷰 (산인공 7스텝)', () => {
  test('로드맵 인터뷰 페이지 로드 + 7스텝 스테퍼 + 개요 스텝 렌더 (roadmap_summary 자동생성 배지 확인)', async ({ consultantPage: page }) => {
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

    // 분류 (c) 시나리오 재작성: roadmap_summary 입력란 제거 → "자동 생성 예정" 배지 확인
    await expect(page.getByLabel(/^수립 주요내용/)).toHaveCount(0);
    await expect(page.getByText(/자동 생성 예정/)).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('Step 2: 수행 시간 시작/종료 두 input 노출 (ISSUE-10 Step C-2)', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmap = await page.getByText('현장 인터뷰 (로드맵)').isVisible().catch(() => false);
    test.skip(!isRoadmap, '로드맵 트랙 아님');

    // Step 1 → Step 2
    await page.getByRole('button', { name: /^다음$/ }).click();

    await expect(page.getByRole('heading', { name: /주요 활동/ })).toBeVisible();
    // 단일 "수행 시간" → 시작/종료 두 input 으로 분리
    await expect(page.getByLabel(/수행 시간 \(시작\)/)).toBeVisible();
    await expect(page.getByLabel(/수행 시간 \(종료\)/)).toBeVisible();
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

  // 분류 (b) 시나리오 확장: Step 6 역량 모델링 신규 추가 (ISSUE-04 Ⅲ-1)
  test('Step 6: 역량 모델링 — 역량 추가/삭제 + NCS 활용 라디오', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmap = await page.getByText('현장 인터뷰 (로드맵)').isVisible().catch(() => false);
    test.skip(!isRoadmap, '로드맵 트랙 아님');

    // Step 1 → Step 6 (다음 5회)
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /^다음$/ }).click();
    }

    // 역량 모델링 스텝 제목 + 5필드 노출 (FormField required 시 label 끝에 * 가 붙음)
    await expect(page.getByRole('heading', { name: /역량 모델링/ })).toBeVisible();
    await expect(page.getByLabel(/역량명/).first()).toBeVisible();
    await expect(page.getByLabel(/역량 정의/).first()).toBeVisible();
    await expect(page.getByLabel(/필요 지식/).first()).toBeVisible();
    await expect(page.getByLabel(/필요 기술/).first()).toBeVisible();
    await expect(page.getByLabel(/필요 태도/).first()).toBeVisible();

    // NCS 활용 라디오
    await expect(page.getByRole('radiogroup', { name: /NCS 능력단위 활용 여부/ })).toBeVisible();

    // 역량 추가 버튼 동작 확인 — 역량이 1개일 땐 삭제 버튼이 숨겨지므로 역량
    // 필드(역량명 input) 개수 증가로 검증. 초기 1개 → 추가 후 2개.
    const addBtn = page.getByRole('button', { name: /역량 추가/ });
    await expect(addBtn).toBeVisible();
    const nameFields = page.getByLabel(/역량명/);
    const initialCount = await nameFields.count();
    await addBtn.click();
    await expect(nameFields).toHaveCount(initialCount + 1);
  });

  // 분류 (a) selector 업데이트: 스텝 개수 6→7, 확인은 Step 7
  test('Step 7: 확인·제출 화면 + 필수 미완료 시 경고', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmap = await page.getByText('현장 인터뷰 (로드맵)').isVisible().catch(() => false);
    test.skip(!isRoadmap, '로드맵 트랙 아님');

    // Step 1 → Step 7 (다음 6회)
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: /^다음$/ }).click();
    }

    await expect(page.getByRole('heading', { name: /확인.*제출/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^저장$/ })).toBeVisible();

    // 확인 화면에 Ⅲ-1 역량 모델링 섹션도 함께 노출되는지 확인 (분류 (b))
    await expect(page.getByRole('heading', { name: /6\.\s*역량 모델링/ })).toBeVisible();

    const warning = page.getByText(/필수 단계 미완료/);
    await expect(warning).toBeVisible();
  });

  // ISSUE-15 (Step C-3): 다음/이전 클릭 시 페이지 상단으로 자동 스크롤
  test('"다음" 클릭 시 페이지 상단으로 자동 스크롤된다 (ISSUE-15)', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmap = await page.getByText('현장 인터뷰 (로드맵)').isVisible().catch(() => false);
    test.skip(!isRoadmap, '로드맵 트랙 아님');

    // Step 1 → Step 2 진입 후 페이지 하단으로 강제 스크롤
    await page.getByRole('button', { name: /^다음$/ }).click();
    await expect(page.getByRole('heading', { name: /주요 활동/ })).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 800));
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    // 다음 클릭 → scrollToPageTop 트리거 (setTimeout 100ms + smooth scroll 여유)
    await page.getByRole('button', { name: /^다음$/ }).click();
    await page.waitForFunction(() => window.scrollY === 0, undefined, { timeout: 3000 });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});
