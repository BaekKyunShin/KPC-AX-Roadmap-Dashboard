// e2e/ops/projects.spec.ts
// TEST_PLAN Phase 2.4~2.8: 프로젝트 목록, 생성, 상세, 자가진단, 로드맵
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck, expectToast } from '../helpers/assertions.helper';
import { switchTab } from '../helpers/navigation.helper';
import { deleteProject, deleteProjectsByName } from '../helpers/cleanup.helper';
import { waitForDownload, expectDownloadFilename, expectDownloadSize } from '../helpers/download.helper';

test.describe.configure({ mode: 'serial' });

// 테스트 중 생성된 프로젝트 ID를 추적
let createdProjectId: string | null = null;

const E2E_COMPANY_NAME = 'E2E테스트기업';

test.afterAll(async () => {
  // 파괴적 액션 복원: ID로 삭제 + 이름으로 잔여 프로젝트도 정리 (retry 대비)
  if (createdProjectId) {
    await deleteProject(createdProjectId);
  }
  await deleteProjectsByName(E2E_COMPANY_NAME);
});

// ─── Phase 2.4: 프로젝트 목록 ────────────────────────────────────────────────

test.describe('Phase 2.4: 프로젝트 목록', () => {
  test.beforeEach(async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로딩 + 콘솔 에러 없음', async ({ opsPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);
    await page.goto('/ops/projects');
    await expect(page.getByRole('heading', { name: '프로젝트 관리' })).toBeVisible();
    expect(getErrors()).toEqual([]);
  });

  test('통계 요약 카드 7개 표시', async ({ opsPage: page }) => {
    // 전체/신규/진단/배정/인터뷰/초안/확정 7개 카드
    await expect(page.getByRole('button', { name: /전체 프로젝트/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /신규 등록/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /진단결과 입력/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /컨설턴트 배정/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /현장 인터뷰/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /로드맵 초안/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /로드맵 최종/ })).toBeVisible();
  });

  test('검색 필터 — 회사명 입력', async ({ opsPage: page }) => {
    const searchInput = page.getByPlaceholder('회사명 또는 이메일 검색...');
    await searchInput.fill('존재하지않는회사xyz');
    // 디바운스 후 검색 결과 반영 대기 (결과 카운터)
    await expect(page.getByText('총 0개의 프로젝트')).toBeVisible({ timeout: 5_000 });
  });

  test('테이블 컬럼 표시', async ({ opsPage: page }) => {
    await expect(page.getByRole('columnheader', { name: '기업명' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '업종' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '진행 상태' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '담당 컨설턴트' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '프로젝트 생성일' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '작업' })).toBeVisible();
  });

  test('"상세보기" 클릭 → 프로젝트 상세 이동', async ({ opsPage: page }) => {
    await page.getByRole('link', { name: '상세보기' }).first().click();
    await expect(page).toHaveURL(/\/ops\/projects\/[a-f0-9-]+/);
  });

  test('"새 프로젝트 생성" 버튼 → /ops/projects/new', async ({ opsPage: page }) => {
    await page.getByRole('link', { name: /새 프로젝트 생성/ }).click();
    await expect(page).toHaveURL('/ops/projects/new');
  });

  test('탭 전환 — 프로젝트 목록 / 진행 현황 대시보드', async ({ opsPage: page }) => {
    await switchTab(page, '진행 현황 대시보드');
    await switchTab(page, '프로젝트 목록');
  });
});

// ─── Phase 2.5: 프로젝트 생성 ────────────────────────────────────────────────

test.describe('Phase 2.5: 프로젝트 생성', () => {
  test('빈 폼 제출 → required 검사', async ({ opsPage: page }) => {
    await page.goto('/ops/projects/new');
    await page.getByRole('button', { name: /프로젝트 생성/ }).click();
    // HTML5 required (회사명 필드) 또는 클라이언트 검증(기업 규모 Select)으로 페이지 유지
    await expect(page).toHaveURL('/ops/projects/new');
  });

  test('정상 생성 → 성공 토스트 + 리다이렉트', async ({ opsPage: page }) => {
    await page.goto('/ops/projects/new');

    // 필수 필드 입력
    await page.locator('#company_name').fill(E2E_COMPANY_NAME);

    // 기업 규모 Select (첫 번째 combobox)
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /10~49명/ }).click();

    // 업종 Select (두 번째 combobox)
    await page.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: 'IT/소프트웨어' }).click();

    // 담당자명, 이메일
    await page.locator('#contact_name').fill('테스트담당자');
    await page.locator('#contact_email').fill('e2e-test@example.com');

    await page.getByRole('button', { name: /프로젝트 생성/ }).click();

    // 성공 토스트
    await expectToast(page, '프로젝트가 성공적으로 생성되었습니다');

    // 리다이렉트된 URL에서 프로젝트 ID 추출
    await expect(page).toHaveURL(/\/ops\/projects\/[a-f0-9-]+/, { timeout: 10_000 });
    const url = page.url();
    createdProjectId = url.split('/ops/projects/')[1]?.split('?')[0] ?? null;
  });
});

// ─── Phase 2.6: 프로젝트 상세 (기존) ─────────────────────────────────────────

test.describe('Phase 2.6: 프로젝트 상세 (기존)', () => {
  test('기업 정보 표시', async ({ opsPage: page }) => {
    // 기존 프로젝트의 상세 페이지 접근
    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: '상세보기' }).first().click();
    await expect(page).toHaveURL(/\/ops\/projects\/[a-f0-9-]+/);

    // 기업 정보 카드 확인
    await expect(page.getByText('기업 정보')).toBeVisible();
    // 기업명, 업종, 규모, 담당자 라벨 존재
    await expect(page.getByText('기업명')).toBeVisible();
    await expect(page.getByText('업종', { exact: false })).toBeVisible();
    await expect(page.getByText('담당자', { exact: true })).toBeVisible();
  });

  test('뒤로가기 버튼 → /ops/projects', async ({ opsPage: page }) => {
    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: '상세보기' }).first().click();
    await expect(page).toHaveURL(/\/ops\/projects\/[a-f0-9-]+/);

    await page.getByRole('button', { name: /프로젝트 목록/ }).click();
    await expect(page).toHaveURL('/ops/projects');
  });
});

// ─── Phase 2.7: 자가진단 + 매칭 (새 프로젝트) ────────────────────────────────

test.describe('Phase 2.7: 자가진단 + 매칭 (새 프로젝트)', () => {
  test('자가진단 폼 표시 + 전 문항 입력 + 제출', async ({ opsPage: page }) => {
    // 선행 테스트에서 프로젝트가 생성되지 않으면 자가진단 테스트 불가
    test.skip(!createdProjectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');
    await page.goto(`/ops/projects/${createdProjectId!}`);
    await page.waitForLoadState('networkidle');

    // 자가진단 결과 카드 헤더 (data-slot="card-title")
    await expect(page.locator('[data-slot="card-title"]').filter({ hasText: '자가진단 결과' })).toBeVisible();

    // 자가진단 폼 내 질문이 있는지 확인 (스텝 인디케이터 존재)
    // 각 스텝의 모든 질문에 "보통이다"(3점) 선택
    // 스텝을 순차적으로 진행하며 모든 문항 응답
    let stepCount = 0;
    const maxSteps = 10; // 안전 장치

    while (stepCount < maxSteps) {
      // 현재 스텝의 모든 질문에 3점("보통이다") 선택
      // QuestionInput은 5개 버튼(1~5)으로 구성, 3번째 버튼(3점)을 클릭
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
  });

  test('DIAGNOSED 상태 전환 확인', async ({ opsPage: page }) => {
    // 선행 테스트에서 프로젝트가 생성되지 않으면 상태 전환 테스트 불가
    test.skip(!createdProjectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');
    await page.goto(`/ops/projects/${createdProjectId!}`);
    await page.waitForLoadState('networkidle');

    // 자가진단 완료 후 상태가 DIAGNOSED로 변경
    await expect(page.getByText(/진단결과 입력 완료/)).toBeVisible({ timeout: 10_000 });
  });

  test('AI 매칭 버튼 존재 확인 (실행 skip — LLM)', async ({ opsPage: page }) => {
    // 선행 테스트에서 프로젝트가 생성되지 않으면 매칭 버튼 테스트 불가
    test.skip(!createdProjectId, '테스트 데이터 없음: 선행 프로젝트 생성 실패');
    await page.goto(`/ops/projects/${createdProjectId!}`);
    await page.waitForLoadState('networkidle');

    // 컨설턴트 배정 카드 확인 (card-title로 특정)
    await expect(page.locator('[data-slot="card-title"]').filter({ hasText: '컨설턴트 배정' })).toBeVisible();

    // 자동 매칭 탭 확인 (exact로 "컨설턴트 자동 매칭" 버튼과 구분)
    await expect(page.getByRole('button', { name: '자동 매칭', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '수동 매칭', exact: true })).toBeVisible();

    // "컨설턴트 자동 매칭" 버튼 존재 확인 (클릭하지 않음 — LLM 호출)
    await expect(page.getByRole('button', { name: /컨설턴트 자동 매칭/ })).toBeVisible();
  });
});

// ─── Phase 2.8: 로드맵 OPS 뷰 ────────────────────────────────────────────────

test.describe('Phase 2.8: 로드맵 OPS 뷰', () => {
  // 로드맵 페이지 URL을 공유하기 위한 변수
  let roadmapUrl: string | null = null;
  let hasRoadmapLink = false;

  test('로드맵 페이지 로딩 + 기본 요소 확인', async ({ opsPage: page }) => {
    // 로드맵이 존재하는 프로젝트를 찾기 위해 목록에서 상세 → 로드맵 보기 링크 확인
    await page.goto('/ops/projects');
    await page.waitForLoadState('networkidle');

    // 첫 번째 프로젝트 상세로 이동
    const detailLink = page.getByRole('link', { name: '상세보기' }).first();
    const hasDetailLink = await detailLink.isVisible().catch(() => false);
    // 프로젝트가 없으면 로드맵 뷰 테스트 불가
    test.skip(!hasDetailLink, '테스트 데이터 없음: 프로젝트 목록이 비어있습니다');

    await detailLink.click();
    await expect(page).toHaveURL(/\/ops\/projects\/[a-f0-9-]+/, { timeout: 10_000 });

    // "로드맵 보기" 링크가 있는 경우에만 테스트 진행
    const roadmapLink = page.getByRole('link', { name: '로드맵 보기' });
    const isRoadmapVisible = await roadmapLink.isVisible().catch(() => false);
    // 로드맵이 생성되지 않은 프로젝트이면 로드맵 뷰 테스트 불가
    test.skip(!isRoadmapVisible, '테스트 데이터 없음: 로드맵 보기 링크가 없습니다');

    hasRoadmapLink = true;
    await roadmapLink.click();
    await expect(page).toHaveURL(/\/ops\/projects\/[a-f0-9-]+\/roadmap/);
    roadmapUrl = page.url();

    // 로드맵 페이지 기본 요소 확인
    await expect(page.getByText('AI 교육 로드맵')).toBeVisible();

    // 뒤로가기 링크
    await expect(page.getByRole('link', { name: /프로젝트로 돌아가기/ })).toBeVisible();

    // 버전 히스토리 패널 존재
    await expect(page.getByText('버전 히스토리')).toBeVisible();
  });

  test('버전 히스토리 선택 → 콘텐츠 변경', async ({ opsPage: page }) => {
    test.skip(!hasRoadmapLink || !roadmapUrl, '로드맵 데이터 없음');

    await page.goto(roadmapUrl!);
    await page.waitForLoadState('networkidle');

    // 버전 히스토리 패널에서 버전 버튼 목록 확인
    const versionButtons = page.locator('button').filter({ hasText: /^버전 \d+/ });
    const versionCount = await versionButtons.count();

    if (versionCount < 2) {
      // 버전이 1개뿐이면 선택 전환 테스트 불가 — 단일 버전 선택 확인만
      await expect(versionButtons.first()).toBeVisible();
      // 이미 선택된 첫 번째 버전의 활성 스타일(border-purple-500) 확인
      await expect(versionButtons.first().locator('..')).toHaveClass(/border-purple-500/);
      return;
    }

    // 두 번째 버전 클릭
    await versionButtons.nth(1).click();
    // 클릭 후 두 번째 버전이 활성 상태(border-purple-500)가 되는지 확인
    await expect(versionButtons.nth(1).locator('..')).toHaveClass(/border-purple-500/, { timeout: 5_000 });

    // 우측 콘텐츠 영역에 버전 번호 헤더가 바뀌었는지 확인
    const versionHeader = page.locator('h2').filter({ hasText: /^버전 \d+$/ });
    await expect(versionHeader).toBeVisible();
  });

  test('탭 — 과정 체계도 (matrix) 기본 표시', async ({ opsPage: page }) => {
    test.skip(!hasRoadmapLink || !roadmapUrl, '로드맵 데이터 없음');

    await page.goto(roadmapUrl!);
    await page.waitForLoadState('networkidle');

    // 기본 활성 탭이 "과정 체계도"
    const matrixTab = page.getByRole('button', { name: '과정 체계도' });
    await expect(matrixTab).toBeVisible();
    await expect(matrixTab).toHaveClass(/border-purple-500/);

    // RoadmapMatrix 콘텐츠 영역: 테이블 또는 그리드가 표시되어야 함
    // RoadmapMatrix는 table 또는 데이터 셀을 렌더링
    const contentArea = page.locator('.lg\\:col-span-3');
    await expect(contentArea).toBeVisible();

    // 매트릭스 내에 데이터 행이 존재하거나, 빈 상태가 아닌지 확인
    const hasTable = await contentArea.locator('table').isVisible().catch(() => false);
    const hasGrid = await contentArea.locator('[class*="grid"]').isVisible().catch(() => false);
    const hasContent = hasTable || hasGrid;
    // 콘텐츠가 있거나 "로드맵이 없습니다" 메시지가 없어야 함
    expect(hasContent || !(await contentArea.getByText('로드맵이 없습니다').isVisible().catch(() => false))).toBeTruthy();
  });

  test('탭 — PBL 과정 클릭 → 콘텐츠 전환', async ({ opsPage: page }) => {
    test.skip(!hasRoadmapLink || !roadmapUrl, '로드맵 데이터 없음');

    await page.goto(roadmapUrl!);
    await page.waitForLoadState('networkidle');

    // "PBL 과정" 탭 클릭
    const pblTab = page.getByRole('button', { name: 'PBL 과정' });
    await expect(pblTab).toBeVisible();
    await pblTab.click();

    // 탭 활성화 확인 (border-purple-500 클래스)
    await expect(pblTab).toHaveClass(/border-purple-500/);

    // PBLCourseView 콘텐츠가 렌더링되었는지 확인
    // "과정 체계도" 탭의 콘텐츠가 아닌 PBL 관련 콘텐츠가 표시되어야 함
    const contentArea = page.locator('.lg\\:col-span-3 .p-4, .lg\\:col-span-3 .p-6').first();
    await expect(contentArea).toBeVisible();
  });

  test('탭 — 과정 상세 클릭 → 콘텐츠 전환', async ({ opsPage: page }) => {
    test.skip(!hasRoadmapLink || !roadmapUrl, '로드맵 데이터 없음');

    await page.goto(roadmapUrl!);
    await page.waitForLoadState('networkidle');

    // "과정 상세" 탭 클릭
    const coursesTab = page.getByRole('button', { name: '과정 상세' });
    await expect(coursesTab).toBeVisible();
    await coursesTab.click();

    // 탭 활성화 확인
    await expect(coursesTab).toHaveClass(/border-purple-500/);

    // CoursesList 콘텐츠가 렌더링되었는지 확인
    const contentArea = page.locator('.lg\\:col-span-3 .p-4, .lg\\:col-span-3 .p-6').first();
    await expect(contentArea).toBeVisible();
  });

  test('PDF 다운로드 버튼 클릭 → 파일 다운로드', async ({ opsPage: page }) => {
    test.skip(!hasRoadmapLink || !roadmapUrl, '로드맵 데이터 없음');

    await page.goto(roadmapUrl!);
    await page.waitForLoadState('networkidle');

    // PDF 다운로드 버튼 확인
    const pdfButton = page.getByRole('button', { name: 'PDF' });
    await expect(pdfButton).toBeVisible();
    await expect(pdfButton).toBeEnabled();

    // 다운로드 이벤트 대기 + 클릭
    const download = await waitForDownload(page, () => pdfButton.click());

    // 파일명에 .pdf 확장자 포함 확인
    expectDownloadFilename(download, /\.pdf$/i);

    // 최소 1KB 이상의 유효한 파일인지 확인
    await expectDownloadSize(download, 1024);
  });
});
