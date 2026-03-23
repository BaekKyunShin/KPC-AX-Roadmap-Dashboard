// e2e/workflow/project-lifecycle.spec.ts
// 워크플로우 관통 E2E: NEW → DIAGNOSED → ASSIGNED → INTERVIEWED → ROADMAP_DRAFTED → FINALIZED
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck, expectToast, waitForPageLoad } from '../helpers/assertions.helper';
import { deleteProject, deleteProjectsByName } from '../helpers/cleanup.helper';

const E2E_COMPANY = 'E2E워크플로우테스트';

test.describe('워크플로우 관통: NEW → FINALIZED', () => {
  test.describe.configure({ mode: 'serial' });
  let projectId: string | null = null;

  test.afterAll(async () => {
    if (projectId) await deleteProject(projectId);
    await deleteProjectsByName(E2E_COMPANY);
  });

  // ─── 1단계: 프로젝트 생성 (NEW) ───────────────────────────────────────────
  test('1단계: 프로젝트 생성 → NEW 상태', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/ops/projects/new');
    await page.waitForLoadState('networkidle');

    // 필수 필드 입력
    await page.locator('#company_name').fill(E2E_COMPANY);

    // 기업 규모 Select (첫 번째 combobox)
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /100~299명/ }).click();

    // 업종 Select (두 번째 combobox)
    await page.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: '제조업' }).click();

    // 담당자명, 이메일
    await page.locator('#contact_name').fill('워크플로우테스트담당자');
    await page.locator('#contact_email').fill('e2e-workflow@example.com');

    // 제출
    await page.getByRole('button', { name: /프로젝트 생성/ }).click();

    // 성공 토스트
    await expectToast(page, '프로젝트가 성공적으로 생성되었습니다');

    // 리다이렉트된 URL에서 프로젝트 ID 추출
    await expect(page).toHaveURL(/\/ops\/projects\/[a-f0-9-]+/, { timeout: 10_000 });
    const url = page.url();
    projectId = url.split('/ops/projects/')[1]?.split('?')[0] ?? null;

    expect(projectId).toBeTruthy();

    // 상태 뱃지 확인: "신규 등록 완료"
    await expect(page.getByText('신규 등록 완료')).toBeVisible({ timeout: 5_000 });

    expect(getErrors()).toEqual([]);
  });

  // ─── 2단계: 자가진단 입력 (NEW → DIAGNOSED) ────────────────────────────────
  test('2단계: 자가진단 입력 → DIAGNOSED 상태', async ({ opsPage: page }) => {
    test.skip(!projectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');

    await page.goto(`/ops/projects/${projectId!}`);
    await page.waitForLoadState('networkidle');

    // 자가진단 결과 카드 헤더 확인
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: '자가진단 결과' }),
    ).toBeVisible();

    // 각 스텝의 모든 질문에 3점("보통이다") 선택
    let stepCount = 0;
    const maxSteps = 10; // 안전 장치

    while (stepCount < maxSteps) {
      // 현재 스텝의 모든 질문에 3점 선택
      const questionBlocks = page.locator('[id^="question-"]');
      const count = await questionBlocks.count();

      for (let i = 0; i < count; i++) {
        const block = questionBlocks.nth(i);
        // 5개 점수 버튼 중 3번째 (인덱스 2) = "보통이다" (3점)
        const scoreButton = block.getByRole('button').nth(2);
        await scoreButton.click();
      }

      stepCount++;

      // "다음" 버튼이 있으면 클릭, 없으면 (마지막 스텝) "자가진단 저장" 버튼
      const nextButton = page.getByRole('button', { name: '다음' });
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
        // 스텝 전환 후 새 질문 블록 렌더링 대기
        await expect(page.locator('[id^="question-"]').first()).toBeVisible({ timeout: 5_000 });
      } else {
        // 마지막 스텝 — "자가진단 저장" 버튼 클릭
        const submitButton = page.getByRole('button', { name: '자가진단 저장' });
        await expect(submitButton).toBeEnabled({ timeout: 3_000 });
        await submitButton.click();
        break;
      }
    }

    // 성공 토스트
    await expectToast(page, '자가진단이 성공적으로 저장되었습니다');

    // 페이지 리로드 후 상태 확인
    await page.goto(`/ops/projects/${projectId!}`);
    await page.waitForLoadState('networkidle');

    // 상태 뱃지: "진단결과 입력 완료"
    await expect(page.getByText('진단결과 입력 완료')).toBeVisible({ timeout: 10_000 });
  });

  // ─── 3단계: 컨설턴트 수동 배정 (DIAGNOSED → ASSIGNED) ─────────────────────
  test('3단계: 컨설턴트 수동 배정 → ASSIGNED 상태', async ({ opsPage: page }) => {
    test.skip(!projectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');

    await page.goto(`/ops/projects/${projectId!}`);
    await page.waitForLoadState('networkidle');

    // 컨설턴트 배정 카드 확인
    await expect(
      page.locator('[data-slot="card-title"]').filter({ hasText: '컨설턴트 배정' }),
    ).toBeVisible();

    // "수동 매칭" 탭 클릭
    await page.getByRole('button', { name: '수동 매칭', exact: true }).click();

    // 컨설턴트 목록 로딩 대기 — ConsultantSelector가 데이터를 불러올 때까지
    // 첫 번째 컨설턴트 카드/항목이 표시될 때까지 대기
    const consultantItem = page.locator('button').filter({ hasText: /컨설턴트|전문가/ }).first();
    const consultantListLoaded = await consultantItem.isVisible({ timeout: 10_000 }).catch(() => false);

    if (!consultantListLoaded) {
      // 리스트 형태로 이름이 표시되는 경우 — 첫 번째 클릭 가능한 컨설턴트
      // ConsultantSelector는 각 컨설턴트를 클릭 가능한 div/button으로 렌더링
      await expect(page.locator('[class*="cursor-pointer"]').first()).toBeVisible({ timeout: 10_000 });
    }

    // 첫 번째 컨설턴트 선택 (클릭 가능한 요소)
    const selectableItems = page.locator('[class*="cursor-pointer"]');
    const itemCount = await selectableItems.count();

    if (itemCount > 0) {
      await selectableItems.first().click();
    } else {
      // 대안: 이름이 있는 버튼 클릭
      await consultantItem.click();
    }

    // 배정 사유 입력 (10자 이상)
    const reasonTextarea = page.locator('textarea').filter({ hasText: '' });
    await expect(reasonTextarea.first()).toBeVisible({ timeout: 5_000 });
    await reasonTextarea.first().fill('E2E 워크플로우 테스트를 위한 컨설턴트 수동 배정입니다.');

    // "배정하기" 버튼 클릭
    const assignButton = page.getByRole('button', { name: '배정하기' });
    await expect(assignButton).toBeEnabled({ timeout: 3_000 });
    await assignButton.click();

    // 페이지가 리로드되므로 (window.location.reload) 상태 확인
    await page.waitForLoadState('networkidle');
    await waitForPageLoad(page);

    // 상태 뱃지: "컨설턴트 배정 완료"
    await expect(page.getByText('컨설턴트 배정 완료')).toBeVisible({ timeout: 15_000 });
  });

  // ─── 4단계: 인터뷰 입력 (ASSIGNED → INTERVIEWED) ──────────────────────────
  test('4단계: 인터뷰 입력 → INTERVIEWED 상태', async ({ consultantPage: page }) => {
    test.skip(!projectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');

    // 컨설턴트 프로젝트 상세 → 인터뷰 입력
    await page.goto(`/consultant/projects/${projectId!}`);
    await page.waitForLoadState('networkidle');

    // "인터뷰 입력" 링크 클릭
    const interviewLink = page.getByRole('link', { name: '인터뷰 입력' });
    const hasInterviewLink = await interviewLink.isVisible().catch(() => false);

    if (hasInterviewLink) {
      await interviewLink.click();
    } else {
      // "인터뷰 수정" 링크가 있을 수도 있음 (이미 자동저장된 경우)
      await page.getByRole('link', { name: '인터뷰 수정' }).click();
    }

    await expect(page).toHaveURL(/\/consultant\/projects\/[a-f0-9-]+\/interview/, { timeout: 10_000 });
    await page.waitForLoadState('networkidle');

    // ── 스텝 1: 기본 정보 (날짜 + 참석자 이름) ──
    // 날짜는 기본값(오늘)이 채워져 있으므로 참석자 이름만 입력
    await expect(page.getByText('기본 정보').first()).toBeVisible();
    const nameInput = page.getByPlaceholder('이름');
    await nameInput.first().fill('테스트참석자');

    // 다음 → 스텝 2 (시스템/AI 활용 경험 — 필수 아님, 스킵 가능하나 입력)
    await page.getByRole('button', { name: '다음' }).click();
    await expect(page.getByText('인터뷰 날짜', { exact: true })).not.toBeVisible({ timeout: 5_000 });

    // ── 스텝 2: AI 활용 경험 (필수 아님이지만 다음으로 넘어감) ──
    // 다음 → 스텝 3
    await page.getByRole('button', { name: '다음' }).click();

    // ── 스텝 3: 세부업무 (업무명 + 업무 설명 필수) ──
    await expect(page.getByText('세부업무').first()).toBeVisible({ timeout: 5_000 });

    // "예시 채우기" 버튼으로 데이터 빠르게 채우기
    const fillExampleBtn = page.getByRole('button', { name: '예시 채우기' }).first();
    const hasFillExample = await fillExampleBtn.isVisible().catch(() => false);
    if (hasFillExample) {
      await fillExampleBtn.click();
    } else {
      // 수동 입력
      await page.locator('input[placeholder*="고객 문의"]').first().fill('테스트 업무');
      await page.locator('textarea').first().fill('테스트 업무 설명입니다. AI 교육으로 개선하고자 합니다.');
    }

    // 다음 → 스텝 4
    await page.getByRole('button', { name: '다음' }).click();

    // ── 스텝 4: 페인포인트 (설명 필수) ──
    await expect(page.getByText('페인포인트').first()).toBeVisible({ timeout: 5_000 });

    const painFillBtn = page.getByRole('button', { name: '예시 채우기' }).first();
    const hasPainFill = await painFillBtn.isVisible().catch(() => false);
    if (hasPainFill) {
      await painFillBtn.click();
    } else {
      await page.locator('textarea').first().fill('반복 업무에 시간이 너무 많이 소요됩니다. 자동화가 필요합니다.');
    }

    // 다음 → 스텝 5
    await page.getByRole('button', { name: '다음' }).click();

    // ── 스텝 5: 목표/제약 (개선 목표 필수) ──
    await expect(page.getByText('개선 목표').first()).toBeVisible({ timeout: 5_000 });

    const goalFillBtn = page.getByRole('button', { name: '예시 채우기' }).first();
    const hasGoalFill = await goalFillBtn.isVisible().catch(() => false);
    if (hasGoalFill) {
      await goalFillBtn.click();
    } else {
      await page.locator('textarea').first().fill('업무 시간 50% 단축을 목표로 합니다. AI 도구를 활용한 자동화 추진.');
    }

    // 다음 → 스텝 6 (확인)
    await page.getByRole('button', { name: '다음' }).click();

    // ── 스텝 6: 확인 → 저장 ──
    // 마지막 스텝에서 "저장" 버튼 클릭
    const saveButton = page.getByRole('button', { name: '저장' });
    await expect(saveButton).toBeVisible({ timeout: 5_000 });
    await expect(saveButton).toBeEnabled({ timeout: 5_000 });
    await saveButton.click();

    // 성공 토스트
    await expectToast(page, '인터뷰가 성공적으로 저장되었습니다');

    // 프로젝트 상세로 리다이렉트 확인
    await expect(page).toHaveURL(/\/consultant\/projects\/[a-f0-9-]+$/, { timeout: 15_000 });
  });

  // ─── 5단계: 로드맵 생성 (INTERVIEWED → ROADMAP_DRAFTED) ───────────────────
  test('5단계: 로드맵 생성 → ROADMAP_DRAFTED 상태', async ({ consultantPage: page }) => {
    test.skip(!projectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');
    test.skip(!process.env.LLM_API_KEY, 'LLM API 키 미설정');
    test.setTimeout(120_000); // LLM 응답 대기

    // 컨설턴트 프로젝트 상세
    await page.goto(`/consultant/projects/${projectId!}`);
    await page.waitForLoadState('networkidle');

    // "로드맵 생성" 링크 클릭
    const roadmapLink = page.getByRole('link', { name: '로드맵 생성' });
    await expect(roadmapLink).toBeVisible({ timeout: 10_000 });
    await roadmapLink.click();

    // 로드맵 페이지 로딩
    await expect(page).toHaveURL(/\/consultant\/projects\/[a-f0-9-]+\/roadmap/, { timeout: 10_000 });
    await page.waitForLoadState('networkidle');

    // "로드맵 생성" 버튼 클릭 (왼쪽 패널)
    const generateButton = page.getByRole('button', { name: '로드맵 생성' });
    await expect(generateButton).toBeVisible({ timeout: 5_000 });
    await generateButton.click();

    // LLM 생성 완료 대기 — 성공 토스트 또는 버전 헤더 표시
    // 오버레이가 사라지고 "버전 1" 헤더가 표시될 때까지 대기
    await expect(page.locator('h2').filter({ hasText: /^버전 \d+$/ })).toBeVisible({ timeout: 100_000 });

    // 로드맵 콘텐츠가 렌더링되었는지 확인
    await expect(page.locator('.lg\\:col-span-3')).toBeVisible();

    // 컨설턴트 페이지에서 로드맵 콘텐츠(과정 체계도 탭) 확인
    await expect(page.getByText('과정 체계도')).toBeVisible({ timeout: 10_000 });
  });

  // ─── 6단계: 로드맵 확정 (ROADMAP_DRAFTED → FINALIZED) ─────────────────────
  test('6단계: 로드맵 확정 → FINALIZED 상태', async ({ consultantPage: page, opsPage }) => {
    test.skip(!projectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');
    test.skip(!process.env.LLM_API_KEY, 'LLM API 키 미설정');

    // 로드맵 페이지 접근
    await page.goto(`/consultant/projects/${projectId!}/roadmap`);
    await page.waitForLoadState('networkidle');
    await waitForPageLoad(page);

    // 버전 선택 확인 (버전 1 이상)
    await expect(page.locator('h2').filter({ hasText: /^버전 \d+$/ })).toBeVisible({ timeout: 10_000 });

    // "최종 확정" 버튼 클릭
    const finalizeButton = page.getByRole('button', { name: '최종 확정' });
    await expect(finalizeButton).toBeVisible({ timeout: 5_000 });
    await expect(finalizeButton).toBeEnabled();

    // confirm 다이얼로그 자동 수락
    page.on('dialog', (dialog) => dialog.accept());

    await finalizeButton.click();

    // 성공 토스트
    await expectToast(page, '로드맵이 최종 확정되었습니다');

    // OPS 페이지에서 최종 상태 확인
    await opsPage.goto(`/ops/projects/${projectId!}`);
    await opsPage.waitForLoadState('networkidle');

    // 상태 뱃지: "로드맵 최종 확정"
    await expect(opsPage.getByText('로드맵 최종 확정')).toBeVisible({ timeout: 10_000 });
  });
});
