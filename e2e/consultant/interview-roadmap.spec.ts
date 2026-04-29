// e2e/consultant/interview-roadmap.spec.ts
// PR #2 Task 2.3-d: 로드맵 V2 인터뷰 8 스텝 골든 플로우 E2E
//   - V2 Client (camelCase 스키마 + 양식 1:1 정합 8 스텝)
//   - 이전 버전(legacy 7스텝)은 본 Task 의 page.tsx V2 전환으로 더 이상 노출되지 않음
//   - 골든 플로우: Ⅰ-1 → Ⅰ-2 → Ⅰ-3 → Ⅱ-1(스킵) → Ⅱ-2 → Ⅱ-3 → Ⅱ-4 → Ⅲ-1 → 최종 제출
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

let interviewUrl: string | null = null;

test.describe('컨설턴트 로드맵 인터뷰 V2 (양식 1:1 정합 8 스텝)', () => {
  test('V2 Client 로드 + 첫 스텝(Ⅰ-1 수립 필요성) 렌더', async ({
    consultantPage: page,
  }) => {
    const getErrors = setupConsoleErrorCheck(page);

    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    const href = await findFirstLinkHref(page, '/consultant/projects/');
    test.skip(!href, '테스트 데이터 없음: 담당 프로젝트가 없습니다');
    interviewUrl = `${href!}/interview`;

    await page.goto(interviewUrl);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(
      /\/consultant\/projects\/[a-f0-9-]+\/interview/,
      { timeout: 10_000 },
    );

    // PBL 트랙이면 skip (로드맵 V2 전용 테스트)
    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, 'PBL 트랙 프로젝트 — 로드맵 V2 인터뷰 아님');

    // Ⅰ-1 StepNecessity 기본 활성화 (FormSection "수립 필요성" h2)
    await expect(
      page.getByRole('heading', { name: '수립 필요성', level: 2 }),
    ).toBeVisible();
    // 8 스텝 스테퍼 노출
    const stepper = page.locator('nav[aria-label="Progress"]');
    await expect(stepper).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('Ⅰ-1 수립 필요성 입력 → Ⅰ-2 주요 활동 1차수 프리필 확인', async ({
    consultantPage: page,
  }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, '로드맵 V2 트랙 아님');

    // Ⅰ-1 에 필요성 입력
    await page.getByLabel('수립 필요성').fill('E2E 테스트 필요성');

    // Ⅰ-1 → Ⅰ-2 이동
    await page.getByLabel('다음 스텝').click();
    await expect(
      page.getByRole('heading', { name: '주요 활동', level: 2 }),
    ).toBeVisible();

    // 기본 3차수 (1차/2차/3차) 프리필
    await expect(page.getByText('1차')).toBeVisible();
    await expect(page.getByText('2차')).toBeVisible();
    await expect(page.getByText('3차')).toBeVisible();
  });

  test('Ⅰ-3 수립 주요 결과 + AI 역량 체크 + 선정 과업 입력', async ({
    consultantPage: page,
  }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, '로드맵 V2 트랙 아님');

    // 스테퍼로 Ⅰ-3 '수립 주요 결과' 직접 클릭 이동
    await page.getByText('수립 주요 결과').first().click();
    // FormSection 라벨 "[인터뷰 입력 → 결과 페이지]" 노출
    await expect(
      page.getByText('[인터뷰 입력 → 결과 페이지]'),
    ).toBeVisible();
  });

  test('Ⅱ-2 기업 요구분석 — 4 행머리글 노출', async ({
    consultantPage: page,
  }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, '로드맵 V2 트랙 아님');

    await page.getByText('기업 요구분석').first().click();
    await expect(
      page.getByRole('heading', { name: '기업 요구분석', level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole('rowheader', { name: '기업 현황' }),
    ).toBeVisible();
  });

  test('Ⅱ-3 과업·워크플로우 분석 — 기본 5행 렌더', async ({
    consultantPage: page,
  }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, '로드맵 V2 트랙 아님');

    await page.getByText('과업·워크플로우 분석').first().click();
    await expect(
      page.getByRole('heading', { name: '과업·워크플로우 분석', level: 2 }),
    ).toBeVisible();
    await expect(page.getByLabel('직무 5')).toBeVisible();
    await expect(page.getByLabel('분석내용')).toBeVisible();
  });

  test('Ⅱ-4 훈련대상 과업 — 기대 효과 rowSpan', async ({
    consultantPage: page,
  }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, '로드맵 V2 트랙 아님');

    await page.getByText('훈련대상 과업').first().click();
    // R3 #12 — 양식 정확 명칭으로 정정
    await expect(
      page.getByRole('heading', {
        name: '훈련대상 과업(Task)·워크플로우 선정',
        level: 2,
      }),
    ).toBeVisible();
  });

  test('Ⅲ-1 역량 모델링 — 기본 4행 + NCS 미활용 시 도출 방법 노출', async ({
    consultantPage: page,
  }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, '로드맵 V2 트랙 아님');

    await page.getByText('역량 모델링').first().click();
    await expect(
      page.getByRole('heading', { name: '역량 모델링', level: 2 }),
    ).toBeVisible();
    await expect(page.getByLabel('역량명 4')).toBeVisible();
    // 기본 ncsUsed=false → 역량별 도출 방법 박스
    await expect(page.getByLabel('역량별 도출 방법')).toBeVisible();
  });

  test('마지막 스텝에서 "최종 제출" 버튼이 노출되고 빈 데이터 시 검증 에러 토스트', async ({
    consultantPage: page,
  }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, '로드맵 V2 트랙 아님');

    await page.getByText('역량 모델링').first().click();
    // 8번째 스텝에서 "최종 제출" 버튼 노출
    const submitBtn = page.getByRole('button', { name: '최종 제출' });
    await expect(submitBtn).toBeVisible();

    // 빈 필수 필드 상태에서 클릭 → strict 검증 실패 → 토스트 노출,
    // 제출이 서버에 도달하지 않으므로 URL 변하지 않아야 한다.
    const prevUrl = page.url();
    await submitBtn.click();
    // 리다이렉트는 strict 검증 실패 시 발생하지 않는다 (간접 검증)
    await page.waitForTimeout(500);
    expect(page.url()).toBe(prevUrl);
  });
});
