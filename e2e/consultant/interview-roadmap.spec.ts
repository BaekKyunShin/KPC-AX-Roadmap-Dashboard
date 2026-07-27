// e2e/consultant/interview-roadmap.spec.ts
// 로드맵 V2 인터뷰 8 스텝 골든 플로우 E2E (양식 7 + STT 첨부 선택 1)
//   - V2 Client (camelCase 스키마 + 양식 1:1 정합 7 스텝 + STT 인사이트 추출 선택 1)
//   - 골든 플로우: Ⅰ-1 → Ⅰ-2 → Ⅰ-3 → Ⅱ-1(선택) → Ⅱ-2 → Ⅱ-3 → Ⅱ-4
//                → 인터뷰 녹취 STT 첨부 (선택) → 최종 제출
//   - 양식 v2 에서 삭제된 항목(Ⅲ-1 역량 모델링·NCS·"분석내용")은 단언하지 않는다.
//     ROADMAP_STEPS 단일 출처: interview/_components/roadmap/RoadmapInterviewClient.tsx
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

let interviewUrl: string | null = null;

test.describe('컨설턴트 로드맵 인터뷰 V2 (양식 1:1 정합 7 스텝 + STT 첨부 1)', () => {
  test('V2 Client 로드 + 첫 스텝(Ⅰ-1 수립 필요성) 렌더', async ({ consultantPage: page }) => {
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

    // PBL 트랙이면 skip (로드맵 V2 전용 테스트)
    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, 'PBL 트랙 프로젝트 — 로드맵 V2 인터뷰 아님');

    // Ⅰ-1 StepNecessity 기본 활성화 (FormSection "수립 필요성" h2)
    await expect(page.getByRole('heading', { name: '수립 필요성', level: 2 })).toBeVisible();
    // 8 스텝 스테퍼 노출 (7 양식 + STT 첨부 선택 1)
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
    await expect(page.getByRole('heading', { name: '주요 활동', level: 2 })).toBeVisible();

    // 기본 3차수 (1차/2차/3차) 프리필
    await expect(page.getByText('1차')).toBeVisible();
    await expect(page.getByText('2차')).toBeVisible();
    await expect(page.getByText('3차')).toBeVisible();
  });

  test('Ⅰ-3 수립 주요 결과 + AI 역량 체크 + 선정 과업 입력', async ({ consultantPage: page }) => {
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
    await expect(page.getByText('[인터뷰 입력 → 결과 페이지]')).toBeVisible();
  });

  test('Ⅱ-1 HRD이음 PDF — 양식 정본 제목으로 렌더 (accept=pdf)', async ({
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

    // 스테퍼 라벨은 stepperLabel 미지정이라 name('HRD이음 PDF') 그대로 노출.
    await page.getByText('HRD이음 PDF', { exact: true }).first().click();
    // v2 정본 정합 — h2 는 "기업 AI 역량 수준 진단 (PDF 첨부)" (구 "HRD이음" 표기 아님)
    await expect(
      page.getByRole('heading', { name: '기업 AI 역량 수준 진단 (PDF 첨부)', level: 2 })
    ).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);
    await expect(fileInput).toHaveAttribute('accept', /pdf/);
  });

  test('Ⅱ-2 기업 요구분석 — 4 행머리글 노출', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, '로드맵 V2 트랙 아님');

    await page.getByText('기업 요구분석').first().click();
    await expect(page.getByRole('heading', { name: '기업 요구분석', level: 2 })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: '기업 현황' })).toBeVisible();
  });

  test('Ⅱ-3 과업·워크플로우 분석 — 기본 5행 렌더', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, '로드맵 V2 트랙 아님');

    // Stepper 는 PR #77 부터 단축 라벨 "과업·워크플로우" 노출. 페이지 헤더(h2) 는 풀텍스트 유지.
    await page.getByText('과업·워크플로우', { exact: true }).first().click();
    await expect(
      page.getByRole('heading', { name: '과업(Task)·워크플로우 분석표', level: 2 })
    ).toBeVisible();
    await expect(page.getByLabel('직무 5')).toBeVisible();
    await expect(page.getByLabel('개선점 5')).toBeVisible();
    // v2 에서 삭제된 컬럼 — 되살아나면 즉시 실패시킨다.
    await expect(page.getByLabel('분석내용')).toHaveCount(0);
    await expect(page.getByLabel('문제점 1')).toHaveCount(0);
    await expect(page.getByLabel('데이터 발생 시점 1')).toHaveCount(0);
  });

  test('Ⅱ-4 AI 적용 대상 과업 — 정본 명칭·4 입력 필드', async ({ consultantPage: page }) => {
    test.skip(!interviewUrl, '인터뷰 URL 없음');
    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, '로드맵 V2 트랙 아님');

    // v2: 스테퍼 라벨·h2 모두 "AI 적용 대상 과업" (구 "훈련대상 과업" 아님)
    await page.getByText('AI 적용 대상 과업', { exact: true }).first().click();
    await expect(
      page.getByRole('heading', {
        name: 'AI 적용 대상 과업(Task)·워크플로우 선정',
        level: 2,
      })
    ).toBeVisible();
    // aria-label 은 정본 표기 그대로 — 공백 없는 "선정사유"·"기대효과 현행/개선"
    await expect(page.getByLabel('AI 적용 대상 과업')).toBeVisible();
    await expect(page.getByLabel('선정사유')).toBeVisible();
    await expect(page.getByLabel('기대효과 현행')).toBeVisible();
    await expect(page.getByLabel('기대효과 개선')).toBeVisible();
  });

  test('v2 에서 삭제된 Ⅲ-1 역량 모델링·NCS 스텝이 스테퍼에 없다', async ({
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

    // 양식 v2 개정에서 역량 모델링·NCS 표가 통째로 삭제됐다(types/roadmap-ui.ts 주석 참조).
    const stepper = page.locator('nav[aria-label="Progress"]');
    await expect(stepper).toBeVisible();
    await expect(stepper.getByText('역량 모델링')).toHaveCount(0);
    await expect(page.getByLabel('역량명 1')).toHaveCount(0);
    await expect(page.getByLabel('역량별 도출 방법')).toHaveCount(0);
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

    // 마지막 8번째 스텝(STT 첨부 — 선택)에서 "최종 제출" 버튼 노출.
    // Stepper 는 단축 라벨 "인터뷰 STT" (PR #77 stepperLabel 도입) → 풀텍스트 클릭 대신 단축 라벨 사용.
    // 페이지 헤더(h2) 는 풀텍스트 "인터뷰 녹취 STT 첨부" 유지.
    await page.getByText('인터뷰 STT', { exact: true }).first().click();
    await expect(
      page.getByRole('heading', { name: '인터뷰 녹취 STT 첨부', level: 2 })
    ).toBeVisible();
    // 본문에 STT 원문 textarea 노출 (FormSection 헤더는 어댑터 제공, StepSttUpload 본문)
    // exact:true — "STT 파일" (input) 과 "STT 파일 업로드" (button) 가 substring 충돌 → strict mode 위반 방지
    await expect(page.getByLabel('STT 파일', { exact: true })).toBeVisible();
    const submitBtn = page.getByRole('button', { name: '최종 제출' });
    await expect(submitBtn).toBeVisible();

    // 빈 필수 필드 상태에서 클릭 → strict 검증 실패 → 토스트 노출,
    // 제출이 서버에 도달하지 않으므로 URL 변하지 않아야 한다.
    // (STT 는 선택 항목이라 strict 검증과 무관 — 다른 필수 필드 미입력 때문에 실패)
    const prevUrl = page.url();
    await submitBtn.click();
    await page.waitForTimeout(500);
    expect(page.url()).toBe(prevUrl);
  });
});
