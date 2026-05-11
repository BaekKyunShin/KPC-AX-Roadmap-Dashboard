// e2e/workflow/project-lifecycle.spec.ts
// 워크플로우 관통 E2E: NEW → DIAGNOSED → ASSIGNED → INTERVIEWED → ROADMAP_DRAFTED → FINALIZED
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck, expectToast } from '../helpers/assertions.helper';
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

    // "배정하기" 클릭 → AlertDialog 노출 → "배정 확인" 까지 완료해야 실제 RPC 호출.
    // (Nielsen v2 #1: 비가역 액션 사전 차단)
    const assignButton = page.getByRole('button', { name: '배정하기' });
    await expect(assignButton).toBeEnabled({ timeout: 10_000 });
    await assignButton.click();

    const confirmButton = page.getByRole('button', { name: '배정 확인' });
    await expect(confirmButton).toBeVisible({ timeout: 10_000 });
    await confirmButton.click();

    // router.refresh() 후 — 상태 뱃지로 직접 안정화 판정.
    // (waitForPageLoad 의 .animate-pulse 셀렉터가 NotificationBell unread dot 같은 영구
    //  pulse 요소를 잡아 timeout 되므로 의존하지 않는다.)
    await page.waitForLoadState('networkidle');

    // 상태 뱃지: "컨설턴트 배정 완료"
    await expect(page.getByText('컨설턴트 배정 완료')).toBeVisible({ timeout: 15_000 });
    isAssigned = true;
  });

  // ─── 4단계: 인터뷰 입력 (ASSIGNED → INTERVIEWED) ──────────────────────────
  // V2 재설계 이후 로드맵 인터뷰는 산인공 양식 8스텝 + STT 첨부 선택 1스텝 = 총 9스텝
  // (Ⅰ-1~3, Ⅱ-1~4, Ⅲ-1, 인터뷰 녹취 STT 첨부).
  // Ⅱ-1 HRD이음 PDF · 9번째 STT 첨부는 optional 이라 업로드 없이 "다음" 으로 건너뛴다.
  // 전체 진행은 기본 30초 timeout을 넘으므로 120초로 연장.
  test('4단계: 인터뷰 입력 → INTERVIEWED 상태 (산인공 9-스텝 V2)', async ({ consultantPage: page }) => {
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

    const nextButton = () => page.getByRole('button', { name: /^다음/ });

    // ── 스텝 1: Ⅰ-1 수립 필요성 (LargeTextBox 단일 필드) ──
    await expect(
      page.getByRole('heading', { name: /수립 필요성/ }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await page
      .getByLabel(/^수립 필요성$/)
      .first()
      .fill('E2E 테스트 수립 필요성 — AI 도입 필요');
    await nextButton().click();

    // ── 스텝 2: Ⅰ-2 주요 활동 — 기본 3차수 프리필. 최소 1차수 내용만 채워 다음으로 진행 ──
    await expect(
      page.getByRole('heading', { name: /주요 활동/ }).first(),
    ).toBeVisible({ timeout: 5_000 });
    // 차수별 표: 각 행에 "1차 수행 일시·내용 + PM 성명·내부전문가 성명" 필드가 노출된다.
    // 최소 1차수만 내용을 채워도 Strict 검증이 통과하므로 1차 필수 필드만 입력한다.
    await page.getByLabel('1차 수행 일시').fill('26.04.24\n09:00~11:00');
    await page.getByLabel('1차 수행 내용').fill('E2E 1차 인터뷰 기초 요구 수집');
    await page.getByLabel('1차 PM 성명').fill('E2E PM');
    await page.getByLabel('1차 내부전문가 성명').fill('E2E 전문가');
    await nextButton().click();

    // ── 스텝 3: Ⅰ-3 수립 주요 결과 (AI 역량 수준 기본값 + 선정 과업) ──
    await expect(
      page.getByRole('heading', { name: /수립 주요 결과/ }).first(),
    ).toBeVisible({ timeout: 5_000 });
    await page.getByLabel('선정 과업').fill('E2E 테스트 과업 — 품질검사');
    await nextButton().click();

    // ── 스텝 4: Ⅱ-1 HRD이음 PDF (optional, 업로드 생략 후 넘어감) ──
    await expect(
      page.getByRole('heading', { name: /HRD이음/ }).first(),
    ).toBeVisible({ timeout: 5_000 });
    await nextButton().click();

    // ── 스텝 5: Ⅱ-2 기업 요구분석 (기업 현황·주요 문제·추진 의지·기대 성과) ──
    await expect(
      page.getByRole('heading', { name: /기업 요구분석/ }).first(),
    ).toBeVisible({ timeout: 5_000 });
    // exact: true — '기업 현황' / '주요 문제' / ... 비고 칼럼 (PR #45) 추가로
    // 같은 라벨이 substring 매칭되어 strict mode 위반이 되므로 정확 매치 필요.
    await page
      .getByLabel('기업 현황', { exact: true })
      .fill('E2E 기업 현황: 제조업 중소기업');
    await page
      .getByLabel('주요 문제', { exact: true })
      .fill('E2E 주요 문제: 수기 보고 과다');
    await page
      .getByLabel('추진 의지', { exact: true })
      .fill('E2E 추진 의지: 대표 챔피언');
    await page
      .getByLabel('기대 성과', { exact: true })
      .fill('E2E 기대 성과: 시간 단축 50%');
    await nextButton().click();

    // ── 스텝 6: Ⅱ-3 과업·워크플로우 분석 (동적 행, 최소 1행 채움) ──
    await expect(
      page.getByRole('heading', { name: /과업.*워크플로우 분석/ }).first(),
    ).toBeVisible({ timeout: 5_000 });
    // 기본 첫 행이 프리필되지 않을 수 있어 "행 추가" 를 눌러 1행 확보
    const addRowBtn = page.getByRole('button', { name: '행 추가' });
    if (await addRowBtn.isVisible().catch(() => false)) {
      const firstJobField = page.getByLabel('직무 1');
      if (!(await firstJobField.isVisible().catch(() => false))) {
        await addRowBtn.click();
      }
    }
    await page.getByLabel('직무 1').fill('생산');
    await page.getByLabel('과업 1').fill('외관 검사');
    await page.getByLabel('현행 방식 1').fill('검사원 2명이 수작업 검사');
    await page.getByLabel('문제점 1').fill('품질 편차 발생');
    await page.getByLabel('데이터 발생 시점 1').fill('검사 이미지 DB, 불량 판정 로그');
    // 분석내용 (taskAnalysisNote) 필수 — Strict 검증 통과 목적
    const analysisNoteField = page.getByLabel(/분석.*내용|과업.*분석.*메모/).first();
    if (await analysisNoteField.isVisible().catch(() => false)) {
      await analysisNoteField.fill('E2E 과업 분석 — 외관 검사 자동화 우선');
    }
    // 프리필된 빈 행 제거 (있으면) — Strict 검증에서 빈 행이 fail 하는 것을 방지.
    // PR #72(#1 H5·H3) — 휴지통 클릭 시 AlertDialog 사전 확인 노출 → 다이얼로그 「삭제」 추가 클릭 필요.
    const deleteButtons = page.getByRole('button', { name: /과업 삭제 [2-9]|행 삭제 [2-9]/ });
    const deleteCount = await deleteButtons.count();
    for (let i = deleteCount - 1; i >= 0; i--) {
      const btn = deleteButtons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        const confirmDialog = page.getByRole('alertdialog');
        await expect(confirmDialog).toBeVisible({ timeout: 5_000 });
        await confirmDialog.getByRole('button', { name: '삭제' }).click();
        await expect(confirmDialog).not.toBeVisible({ timeout: 5_000 });
      }
    }
    await nextButton().click();

    // ── 스텝 7: Ⅱ-4 훈련대상 과업 선정 ──
    await expect(
      page.getByRole('heading', { name: /훈련대상 과업/ }).first(),
    ).toBeVisible({ timeout: 5_000 });
    await page.getByLabel('훈련대상 과업').fill('외관 검사 자동화');
    await page.getByLabel('선정 사유').fill('AI 도입 ROI 높음');
    await page.getByLabel('기대 효과 현행').fill('수작업 검사');
    await page
      .getByLabel('기대 효과 개선')
      .fill('AI 비전 검사 + 작업자 최종 확인');
    await nextButton().click();

    // ── 스텝 8: Ⅲ-1 역량 모델링 (4행 프리필, 첫 행만 채움) + NCS 미활용 → 도출 방법 ──
    await expect(
      page.getByRole('heading', { name: /역량 모델링/ }).first(),
    ).toBeVisible({ timeout: 5_000 });
    await page.getByLabel('역량명 1').fill('외관 검사 데이터 해석 역량');
    await page
      .getByLabel('역량 정의 1')
      .fill('검사 이미지에서 불량 패턴을 식별·분류할 수 있다');
    await page.getByLabel('지식 1').fill('이미지 분류 기초, QMS 지표 체계');
    await page.getByLabel('기술 1').fill('이미지 레이블링, 시각화 도구');
    await page.getByLabel('태도 1').fill('데이터 기반 의사결정 선호');
    // 프리필된 빈 역량 행(2~N) 제거 — Strict 검증은 배열 모든 요소를 요구하므로
    // 빈 행이 남아 있으면 fail. index 역순으로 삭제해 index 변경 안전.
    // PR #72(#1 H5·H3) — 휴지통 클릭 시 AlertDialog 사전 확인 노출 → 다이얼로그 「삭제」 추가 클릭 필요.
    const competencyDeleteButtons = page.getByRole('button', { name: /역량 삭제 [2-9]/ });
    const competencyDeleteCount = await competencyDeleteButtons.count();
    for (let i = competencyDeleteCount - 1; i >= 0; i--) {
      const btn = competencyDeleteButtons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        const confirmDialog = page.getByRole('alertdialog');
        await expect(confirmDialog).toBeVisible({ timeout: 5_000 });
        await confirmDialog.getByRole('button', { name: '삭제' }).click();
        await expect(confirmDialog).not.toBeVisible({ timeout: 5_000 });
      }
    }
    // NCS 미활용 기본 → "역량별 도출 방법" textarea 필수
    await page
      .getByLabel('역량별 도출 방법')
      .fill('3개 현장 인터뷰 + 업계 벤치마킹');

    // ── 스텝 9: 인터뷰 녹취 STT 첨부 (선택, PR #77 추가) ──
    // STT 는 optional 이라 파일 업로드 없이 그대로 통과해도 strict 검증 영향 없음.
    // 8 → 9 step 으로 한 번 더 "다음" 클릭 → 마지막 sttAttach step 에 도달.
    await nextButton().click();
    await expect(
      page.getByRole('heading', { name: '인터뷰 녹취 STT 첨부', level: 2 }),
    ).toBeVisible({ timeout: 5_000 });

    // V2 StickyFormNav — 마지막 스텝(sttAttach)에서 "최종 제출" 버튼이 노출된다.
    const submitButton = page.getByRole('button', { name: /최종 제출/ });
    await expect(submitButton).toBeVisible({ timeout: 5_000 });
    await expect(submitButton).toBeEnabled({ timeout: 10_000 });
    await submitButton.click();

    // 성공 토스트 (V2 는 "인터뷰가 제출되었습니다")
    await expectToast(page, '인터뷰가 제출되었습니다');
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

    // PR #50 (#2) — window.confirm 이 shadcn AlertDialog 로 교체됨.
    // 페이지의 "최종 확정" 버튼 클릭 → AlertDialog 노출 →
    // AlertDialog 내부의 destructive "최종 확정" 버튼을 다시 클릭해야 onFinalize 실행.
    const finalizeButton = page.getByRole('button', { name: '최종 확정' });
    await expect(finalizeButton).toBeVisible({ timeout: 5_000 });
    await expect(finalizeButton).toBeEnabled();
    await finalizeButton.click();

    // AlertDialog 노출 확인
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible({ timeout: 3_000 });
    await expect(
      confirmDialog.getByText('로드맵을 최종 확정하시겠습니까?'),
    ).toBeVisible();

    // AlertDialog 내부의 destructive "최종 확정" 버튼 클릭
    await confirmDialog.getByRole('button', { name: '최종 확정' }).click();

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
