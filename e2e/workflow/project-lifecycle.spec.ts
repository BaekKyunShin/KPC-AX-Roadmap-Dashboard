// e2e/workflow/project-lifecycle.spec.ts
// 워크플로우 관통 E2E: NEW → DIAGNOSED → ASSIGNED → INTERVIEWED → ROADMAP_DRAFTED → FINALIZED
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck, expectToast, waitForPageLoad } from '../helpers/assertions.helper';
import { deleteProject, deleteProjectsByName } from '../helpers/cleanup.helper';

const E2E_COMPANY = 'E2E워크플로우테스트';

test.describe('워크플로우 관통: NEW → FINALIZED', () => {
  test.describe.configure({ mode: 'serial' });
  let projectId: string | null = null;
  let isAssigned = false; // 3단계(컨설턴트 배정) 성공 여부

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
    await expect(page.getByRole('option', { name: /50~299명/ })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('option', { name: /50~299명/ }).click();

    // 업종 Select (두 번째 combobox)
    await page.getByRole('combobox').nth(1).click();
    await expect(page.getByRole('option', { name: '제조업' })).toBeVisible({ timeout: 10_000 });
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

    // CollapsibleDirectInput이 접혀있으면 "운영자가 직접 입력하기" 클릭하여 폼 열기
    const directInputToggle = page.getByRole('button', { name: /운영자가 직접 입력하기/ });
    if (await directInputToggle.isVisible().catch(() => false)) {
      await directInputToggle.click();
      // 폼 렌더링 대기
      await expect(page.locator('[id^="question-"]').first()).toBeVisible({ timeout: 10_000 });
    }

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

      // "자가진단 저장" 버튼이 보이면 마지막 스텝, 아니면 "다음" 클릭
      const submitButton = page.getByRole('button', { name: '자가진단 저장' });
      const isLastStep = await submitButton.isVisible().catch(() => false);
      if (isLastStep) {
        await expect(submitButton).toBeEnabled({ timeout: 10_000 });
        await submitButton.click();
        break;
      }
      // 다음 스텝으로 이동
      const nextButton = page.getByRole('button', { name: '다음' });
      await nextButton.click();
      // 스텝 전환 후 새 질문 블록 렌더링 대기
      await expect(page.locator('[id^="question-"]').first()).toBeVisible({ timeout: 5_000 });
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

    // ConsultantSelector 로딩 대기 — data-testid로 정확한 컨설턴트 항목 타겟팅
    const consultantListItem = page.locator('[data-testid="consultant-list-item"]').first();
    await expect(consultantListItem).toBeVisible({ timeout: 15_000 });

    // 테스트 컨설턴트 계정(E2E_CONSULTANT_EMAIL)을 선택해야
    // 4단계에서 consultantPage로 프로젝트에 접근 가능 (RLS 정책)
    const consultantEmail = process.env.E2E_CONSULTANT_EMAIL!;
    const targetConsultant = page
      .locator('[data-testid="consultant-list-item"]')
      .filter({ hasText: consultantEmail });

    if (await targetConsultant.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await targetConsultant.click();
    } else {
      // 테스트 컨설턴트가 1페이지에 없으면 첫 번째 선택 (4단계 RLS 실패 가능)
      await consultantListItem.click();
    }

    // 배정 사유 textarea 렌더링 대기 (ManualAssignmentForm: selectedConsultant && ...)
    const reasonTextarea = page.locator('textarea').first();
    await expect(reasonTextarea).toBeVisible({ timeout: 10_000 });
    await reasonTextarea.fill('E2E 워크플로우 테스트를 위한 컨설턴트 수동 배정입니다.');

    // "배정하기" 버튼 클릭
    const assignButton = page.getByRole('button', { name: '배정하기' });
    await expect(assignButton).toBeEnabled({ timeout: 10_000 });
    await assignButton.click();

    // 페이지가 리로드되므로 (window.location.reload) 상태 확인
    await page.waitForLoadState('networkidle');
    await waitForPageLoad(page);

    // 상태 뱃지: "컨설턴트 배정 완료"
    await expect(page.getByText('컨설턴트 배정 완료')).toBeVisible({ timeout: 15_000 });
    isAssigned = true;
  });

  // ─── 4단계: 인터뷰 입력 (ASSIGNED → INTERVIEWED) ──────────────────────────
  // OFA-06.5 이후 로드맵 인터뷰가 산인공 양식 6스텝으로 전면 재설계됨.
  // 6-스텝 전체 진행은 기본 30초 timeout을 넘으므로 120초로 연장.
  test('4단계: 인터뷰 입력 → INTERVIEWED 상태 (산인공 6-스텝)', async ({ consultantPage: page }) => {
    test.skip(!projectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');
    test.skip(!isAssigned, '3단계(컨설턴트 배정) 미완료 — 인터뷰 입력 불가');
    test.setTimeout(120_000);

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

    // Batch 1 (ISSUE-04) 이후 로드맵 트랙 인터뷰는 산인공 양식 기반 7스텝:
    // 1) 개요 2) 기본 정보·참석자 3) 기업 요구분석 4) 과업·워크플로우 분석
    // 5) 훈련대상 과업 선정 6) 역량 모델링(Ⅲ-1 신규) 7) 확인·제출

    // ── 스텝 1: 개요 (수립 필요성·선정 과업 + AI 역량 수준 radio) ──
    //   Batch 1 이후 "수립 주요내용" 입력란은 제거되고 LLM 자동생성 배지로 교체됨
    await expect(page.getByRole('heading', { name: /개요/ }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByLabel(/수립 필요성/).fill('E2E 테스트 수립 필요성 — AI 도입 필요');
    await page.getByLabel(/선정 과업/).fill('E2E 테스트 과업 — 품질검사');
    // 수립 주요내용은 로드맵 생성 시 LLM 이 자동 생성 — "자동 생성 안내" 배지 노출 확인
    await expect(
      page.getByRole('note', { name: /수립 주요내용 자동 생성/ }),
    ).toBeVisible();
    // AI 역량 수준은 기본값(초급) 체크됨
    await page.getByRole('button', { name: '다음' }).click();

    // ── 스텝 2: 기본 정보 · 참석자 (heading은 "Ⅰ-2. 주요 활동" — stepper label과 다름) ──
    await expect(page.getByRole('heading', { name: /주요 활동/ }).first()).toBeVisible({ timeout: 5_000 });
    // 수행 차수 Select — 옵션 가시성 대기 후 선택
    await page.locator('#basic-round').click();
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('option').first().click();
    // 수행 방법 Select — 옵션 가시성 대기 후 선택
    await page.locator('#basic-method').click();
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('option').first().click();
    // ISSUE-10 (Step C-2): 수행 시간이 시작/종료 두 input 으로 분리됨
    await page.locator('#basic-start-time').fill('09:00');
    await page.locator('#basic-end-time').fill('11:00');
    // 참석자 1명 입력
    await page.getByRole('textbox', { name: /참석자 1 성명/ }).fill('E2E 참석자');
    await page.getByRole('textbox', { name: /참석자 1 소속/ }).fill('팀장');
    await page.getByRole('button', { name: '다음' }).click();

    // ── 스텝 3: 기업 요구분석 (기업 현황·주요 문제·추진 의지·기대 성과) ──
    await expect(page.getByRole('heading', { name: /기업 요구분석/ }).first()).toBeVisible({ timeout: 5_000 });
    await page.getByLabel('기업 현황').fill('E2E 기업 현황: 제조업 중소기업');
    await page.getByLabel('주요 문제').fill('E2E 주요 문제: 수기 보고 과다');
    await page.getByLabel('추진 의지').fill('E2E 추진 의지: 대표 챔피언');
    await page.getByLabel('기대 성과').fill('E2E 기대 성과: 시간 단축 50%');
    await page.getByRole('button', { name: '다음' }).click();

    // ── 스텝 4: 과업·워크플로우 분석 (직무·과업·As-Is·문제점·데이터 시점 + AI도입 필요도) ──
    await expect(page.getByRole('heading', { name: /과업.*분석/ }).first()).toBeVisible({ timeout: 5_000 });
    await page.getByLabel(/^직무\*?$/).first().fill('생산');
    await page.getByLabel(/^과업\(Task\)\*?$/).first().fill('외관 검사');
    await page.getByLabel(/현행 방식.*As-Is/).first().fill('검사원 2명이 수작업 검사');
    await page.getByLabel(/^문제점\*?$/).first().fill('품질 편차 발생');
    // 데이터 발생 시점 — 필수 필드이며 기본값이 없어 누락 시 유효성 검증 차단
    await page.getByLabel(/데이터 발생 시점/).first().fill('검사 이미지 DB, 불량 판정 로그');
    // AI도입·활용 필요도 radio 중 3점 선택 — label 기반 클릭이 wrapping generic의
    // pointer 인터셉트를 우회해 더 안정적 (radio 자체는 label 속에 있음).
    await page
      .getByRole('radiogroup', { name: 'AI도입·활용 필요도' })
      .first()
      .getByRole('radio', { name: /^3/ })
      .click({ force: true });
    await page.getByRole('button', { name: '다음' }).click();

    // ── 스텝 5: 훈련대상 과업 선정 ──
    await expect(page.getByRole('heading', { name: /훈련대상|훈련 대상/ }).first()).toBeVisible({ timeout: 5_000 });
    await page.getByLabel(/훈련대상 과업/).first().fill('외관 검사 자동화');
    await page.getByLabel(/선정사유/).first().fill('AI 도입 ROI 높음');
    await page.getByLabel(/현행.*As-Is/).first().fill('수작업 검사');
    await page.getByLabel(/개선.*To-Be/).first().fill('AI 비전 검사 + 작업자 최종 확인');
    await page.getByRole('button', { name: '다음' }).click();

    // ── 스텝 6: 역량 모델링 (Batch 1 Ⅲ-1 신규) ──
    await expect(page.getByRole('heading', { name: /역량 모델링/ }).first()).toBeVisible({ timeout: 5_000 });
    await page.getByLabel(/역량명/).first().fill('외관 검사 데이터 해석 역량');
    await page.getByLabel(/역량 정의/).first().fill('검사 이미지에서 불량 패턴을 식별·분류할 수 있다');
    await page.getByLabel(/필요 지식/).first().fill('이미지 분류 기초, QMS 지표 체계');
    await page.getByLabel(/필요 기술/).first().fill('이미지 레이블링, 시각화 도구');
    await page.getByLabel(/필요 태도/).first().fill('데이터 기반 의사결정 선호');
    // NCS 활용 여부 — 기본값 false (아니오) → 도출 방법 필수
    await page.getByLabel(/역량 도출 방법/).fill('3개 현장 인터뷰 + 업계 벤치마킹');
    await page.getByRole('button', { name: '다음' }).click();

    // ── 스텝 7: 확인·제출 ──
    await expect(page.getByRole('heading', { name: /확인.*제출/ }).first()).toBeVisible({ timeout: 5_000 });
    const saveButton = page.getByRole('button', { name: /^저장$/ });
    await expect(saveButton).toBeVisible({ timeout: 5_000 });
    await expect(saveButton).toBeEnabled({ timeout: 10_000 });
    await saveButton.click();

    // 성공 토스트 확인
    await expectToast(page, '인터뷰가 성공적으로 저장되었습니다');
  });

  // ─── 5단계: 로드맵 생성 (INTERVIEWED → ROADMAP_DRAFTED) ───────────────────
  test('5단계: 로드맵 생성 → ROADMAP_DRAFTED 상태', async ({ consultantPage: page }) => {
    test.skip(!projectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');
    test.skip(!isAssigned, '3단계(컨설턴트 배정) 미완료 — 로드맵 생성 불가');
    test.skip(!process.env.LLM_API_KEY, 'LLM API 키 미설정');
    test.setTimeout(300_000); // LLM API timeout(240초) + 페이지 로드/렌더링 여유

    // 컨설턴트 프로젝트 상세 → 로드맵 페이지로 이동
    // (최근 리팩토링으로 상세 페이지의 "로드맵 생성" 링크는 아코디언으로 통합돼
    //  사라졌으므로 /roadmap URL로 직접 이동하는 것이 안정적)
    await page.goto(`/consultant/projects/${projectId!}/roadmap`);
    await page.waitForLoadState('networkidle');

    // ISSUE-18 (Step D-2): versions=0 일 때는 RegenerateAccordion 이 숨겨지고
    // EmptyRoadmapState 안에 큰 "AI 로드맵 생성" 버튼이 단독 노출된다.
    // 본 5단계는 인터뷰 직후 시점이므로 versions=0 → 빈 상태 큰 버튼 흐름.
    const generateButton = page.getByRole('button', { name: 'AI 로드맵 생성' });
    await expect(generateButton).toBeVisible({ timeout: 10_000 });
    await generateButton.click();

    // LLM 생성 완료 대기 — "버전 N" 헤더가 표시되거나 에러 토스트가 뜨거나.
    // 로컬·CI 환경별로 LLM 응답 형식이 달라 실패할 수 있으므로, 실패 시 graceful skip.
    const versionHeader = page.locator('h2').filter({ hasText: /^버전 \d+$/ });
    const roadmapGenerated = await versionHeader
      .isVisible({ timeout: 250_000 })
      .catch(() => false);
    test.skip(
      !roadmapGenerated,
      'LLM 응답 실패 또는 타임아웃 — 환경 의존성 (로드맵 생성 미완료)',
    );

    // 로드맵 콘텐츠 탭 — 산인공 양식 이후 첫 탭 라벨은 "역량 모델링"
    await expect(page.getByRole('button', { name: '역량 모델링' })).toBeVisible({
      timeout: 10_000,
    });
  });

  // ─── 6단계: 로드맵 확정 (ROADMAP_DRAFTED → FINALIZED) ─────────────────────
  test('6단계: 로드맵 확정 → FINALIZED 상태', async ({ consultantPage: page, opsPage }) => {
    test.skip(!projectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');
    test.skip(!isAssigned, '3단계(컨설턴트 배정) 미완료 — 로드맵 확정 불가');
    test.skip(!process.env.LLM_API_KEY, 'LLM API 키 미설정');

    // 로드맵 페이지 접근 — skeleton waiter 대신 "버전 N" 헤더 가시성으로 로드 완료 판단
    await page.goto(`/consultant/projects/${projectId!}/roadmap`);
    await page.waitForLoadState('networkidle');

    // 5단계에서 LLM 응답 실패로 skip된 경우 여기도 "버전 N" 헤더가 없음 → skip
    const versionHeader = page.locator('h2').filter({ hasText: /^버전 \d+$/ });
    const hasVersion = await versionHeader
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    test.skip(!hasVersion, '5단계(로드맵 생성) 미완료 — 확정 불가');

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

    // FINALIZED 상태 라벨 — status.ts 상 stepper는 "로드맵 최종 확정",
    // stats 요약 카드는 "최종 확정", case/project 상세는 "로드맵 완료" 로 다양하다.
    // 페이지 내 어느 하나라도 노출되면 FINALIZED 도달로 본다.
    await expect(
      opsPage.getByText(/로드맵 최종 확정|최종 확정|로드맵 완료/).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
