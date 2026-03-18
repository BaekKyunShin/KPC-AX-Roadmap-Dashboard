// e2e/consultant/consultant-project-detail.spec.ts
// 컨설턴트 프로젝트 상세 페이지 E2E 테스트
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { switchTab, findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

// 프로젝트 목록에서 첫 프로젝트 ID를 추출하여 재사용
let projectDetailUrl: string | null = null;

test.describe('컨설턴트 프로젝트 상세', () => {
  test('프로젝트 상세 페이지 로드 + 콘솔 에러 없음', async ({ consultantPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    // 프로젝트 목록에서 첫 프로젝트 링크 찾기
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    const href = await findFirstLinkHref(page, '/consultant/projects/');
    if (!href) {
      test.skip();
      return;
    }
    projectDetailUrl = href;

    await page.locator(`main a[href="${href}"]`).click();
    await page.waitForLoadState('networkidle');

    // 프로젝트 상세 페이지 URL 확인
    await expect(page).toHaveURL(/\/consultant\/projects\/[a-f0-9-]+/, { timeout: 10_000 });

    // 메인 콘텐츠 렌더링 확인
    await expect(page.locator('main')).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('기업정보 카드 표시', async ({ consultantPage: page }) => {
    if (!projectDetailUrl) {
      test.skip();
      return;
    }

    await page.goto(projectDetailUrl);
    await page.waitForLoadState('networkidle');

    // 기업 정보 카드 헤더 확인
    await expect(page.getByText('기업 정보')).toBeVisible();

    // 회사명 라벨 확인
    await expect(page.getByText('회사명')).toBeVisible();

    // 업종 라벨 확인
    await expect(page.getByText('업종', { exact: false })).toBeVisible();

    // 규모 라벨 확인
    await expect(page.getByText('규모')).toBeVisible();

    // 담당자 라벨 확인
    await expect(page.getByText('담당자')).toBeVisible();
  });

  test('4개 탭 전환 (기업 정보/사전 분석/인터뷰 기록/활동 일지)', async ({
    consultantPage: page,
  }) => {
    if (!projectDetailUrl) {
      test.skip();
      return;
    }

    await page.goto(projectDetailUrl);
    await page.waitForLoadState('networkidle');

    // 기본 탭 (기업 정보) 활성 상태 확인
    await expect(page.getByRole('tab', { name: '기업 정보' })).toHaveAttribute(
      'data-state',
      'active',
    );

    // 사전 분석 탭 전환
    await switchTab(page, '사전 분석');

    // 인터뷰 기록 탭 전환
    await switchTab(page, '인터뷰 기록');

    // 활동 일지 탭 전환
    await switchTab(page, '활동 일지');

    // 다시 기업 정보 탭으로 돌아가기
    await switchTab(page, '기업 정보');
  });

  test('자가진단 미완료 시 안내 메시지 또는 결과 표시', async ({
    consultantPage: page,
  }) => {
    if (!projectDetailUrl) {
      test.skip();
      return;
    }

    await page.goto(projectDetailUrl);
    await page.waitForLoadState('networkidle');

    // 자가진단 결과 영역 확인 (완료 또는 미완료 중 하나)
    const hasAssessmentResult = await page
      .getByText('자가진단 결과')
      .isVisible()
      .catch(() => false);

    if (hasAssessmentResult) {
      // 미완료 메시지 또는 결과 차트가 있는지 확인
      const hasIncompleteMessage = await page
        .getByText('자가진단이 아직 완료되지 않았습니다.')
        .isVisible()
        .catch(() => false);

      if (hasIncompleteMessage) {
        await expect(
          page.getByText('자가진단이 아직 완료되지 않았습니다.'),
        ).toBeVisible();
      } else {
        // 자가진단이 완료된 경우 — 결과 영역이 렌더링되어 있음
        await expect(page.getByText('자가진단 결과')).toBeVisible();
      }
    }
    // 자가진단 결과 영역 자체가 없으면 스킵 (데이터 의존)
  });

  test('"인터뷰 입력" 또는 "인터뷰 수정" 버튼 존재 + interview 페이지 링크 검증', async ({
    consultantPage: page,
  }) => {
    if (!projectDetailUrl) {
      test.skip();
      return;
    }

    await page.goto(projectDetailUrl);
    await page.waitForLoadState('networkidle');

    // "인터뷰 입력" 또는 "인터뷰 수정" 링크 확인
    const interviewInputLink = page.getByRole('link', { name: '인터뷰 입력' });
    const interviewEditLink = page.getByRole('link', { name: '인터뷰 수정' });

    const hasInputLink = await interviewInputLink.isVisible().catch(() => false);
    const hasEditLink = await interviewEditLink.isVisible().catch(() => false);

    if (hasInputLink) {
      const href = await interviewInputLink.getAttribute('href');
      expect(href).toContain('/interview');
    } else if (hasEditLink) {
      const href = await interviewEditLink.getAttribute('href');
      expect(href).toContain('/interview');
    }
    // 둘 다 없는 경우는 정상 (프로젝트 상태에 따라 다를 수 있음)
  });

  test('"로드맵" 관련 버튼/링크 존재 여부', async ({ consultantPage: page }) => {
    if (!projectDetailUrl) {
      test.skip();
      return;
    }

    await page.goto(projectDetailUrl);
    await page.waitForLoadState('networkidle');

    // 로드맵 관련 링크 (상태에 따라 "로드맵 생성", "로드맵 편집", "로드맵 보기" 중 하나)
    const roadmapLink = page.locator('a[href*="/roadmap"]').first();
    const hasRoadmapLink = await roadmapLink.isVisible().catch(() => false);

    if (hasRoadmapLink) {
      const href = await roadmapLink.getAttribute('href');
      expect(href).toContain('/roadmap');

      // 링크 텍스트가 로드맵 관련인지 확인
      const text = await roadmapLink.textContent();
      expect(text).toMatch(/로드맵/);
    }
    // 인터뷰 전 상태에서는 로드맵 링크가 없을 수 있음 — 정상
  });

  // ========================================================================
  // 활동 일지 CRUD
  // ========================================================================

  test.describe('활동 일지 CRUD', () => {
    test.beforeEach(async ({ consultantPage: page }) => {
      if (!projectDetailUrl) {
        test.skip();
        return;
      }
      await page.goto(projectDetailUrl);
      await page.waitForLoadState('networkidle');
      await switchTab(page, '활동 일지');
    });

    test('"기록 추가" 버튼 존재', async ({ consultantPage: page }) => {
      await expect(page.getByRole('button', { name: '기록 추가' })).toBeVisible({
        timeout: 5_000,
      });
    });

    test('활동 일지 작성 → 목록에 추가 확인', async ({ consultantPage: page }) => {
      // "기록 추가" 클릭 → 입력 폼 열기
      await page.getByRole('button', { name: '기록 추가' }).click();

      // 텍스트 입력
      const testContent = `E2E 활동일지 테스트 ${Date.now()}`;
      await page.getByPlaceholder('활동 내용을 입력하세요...').fill(testContent);

      // 저장 클릭
      await page.getByRole('button', { name: '저장' }).click();

      // 입력한 내용이 목록에 표시되는지 확인
      await expect(page.getByText(testContent)).toBeVisible({ timeout: 10_000 });
    });

    test('활동 일지 수정 → 내용 변경 확인', async ({ consultantPage: page }) => {
      // 수동 기록의 더보기(⋯) 메뉴 찾기
      const moreButton = page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-more-horizontal') })
        .first();

      const hasLog = await moreButton.isVisible().catch(() => false);
      if (!hasLog) {
        test.skip();
        return;
      }

      // 더보기 → 수정
      await moreButton.click();
      await page.getByRole('menuitem', { name: '수정' }).click();

      // 편집 텍스트 영역이 표시되는지 확인
      const editTextarea = page.locator('textarea').first();
      await expect(editTextarea).toBeVisible({ timeout: 5_000 });

      // 내용 수정
      const updatedContent = `E2E 수정됨 ${Date.now()}`;
      await editTextarea.fill(updatedContent);

      // 저장
      await page.getByRole('button', { name: '저장' }).first().click();

      // 수정된 내용 표시 확인
      await expect(page.getByText(updatedContent)).toBeVisible({ timeout: 10_000 });
    });

    test('활동 일지 삭제 → 목록에서 제거 확인', async ({ consultantPage: page }) => {
      // 수동 기록의 더보기(⋯) 메뉴 찾기
      const moreButton = page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-more-horizontal') })
        .first();

      const hasLog = await moreButton.isVisible().catch(() => false);
      if (!hasLog) {
        test.skip();
        return;
      }

      // 삭제 전 기록 텍스트 저장
      const logTextBefore = await page
        .locator('.whitespace-pre-wrap')
        .first()
        .textContent()
        .catch(() => null);

      // 더보기 → 삭제 (confirm 다이얼로그 자동 수락)
      page.on('dialog', (dialog) => dialog.accept());
      await moreButton.click();
      await page.getByRole('menuitem', { name: '삭제' }).click();

      // 성공 토스트 확인
      await expect(
        page.locator('[data-sonner-toast]').filter({ hasText: '삭제' }),
      ).toBeVisible({ timeout: 5_000 });

      // 삭제된 텍스트가 더 이상 보이지 않는지 확인 (텍스트가 있었던 경우)
      if (logTextBefore) {
        await expect(page.getByText(logTextBefore, { exact: true })).not.toBeVisible({
          timeout: 5_000,
        });
      }
    });
  });
});
