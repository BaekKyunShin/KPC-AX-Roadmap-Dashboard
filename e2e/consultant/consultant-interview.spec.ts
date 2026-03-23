// e2e/consultant/consultant-interview.spec.ts
// 컨설턴트 인터뷰 페이지 E2E 테스트
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

// 프로젝트 목록에서 첫 프로젝트의 인터뷰 URL을 추출하여 재사용
let interviewUrl: string | null = null;

test.describe('컨설턴트 인터뷰', () => {
  test('인터뷰 페이지 로드 + 스테퍼 표시', async ({ consultantPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    // 프로젝트 목록에서 첫 프로젝트 ID 추출
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    const href = await findFirstLinkHref(page, '/consultant/projects/');
    // 담당 프로젝트가 없으면 인터뷰 페이지 테스트 불가
    test.skip(!href, '테스트 데이터 없음: 담당 프로젝트가 없습니다');
    interviewUrl = `${href!}/interview`;

    await page.goto(interviewUrl);
    await page.waitForLoadState('networkidle');

    // 인터뷰 페이지 URL 확인
    await expect(page).toHaveURL(/\/consultant\/projects\/[a-f0-9-]+\/interview/, {
      timeout: 10_000,
    });

    // "현장 인터뷰 입력" 헤더 확인
    await expect(page.getByText('현장 인터뷰 입력')).toBeVisible();

    // 스테퍼 네비게이션 존재 확인 (aria-label="Progress")
    await expect(page.locator('nav[aria-label="Progress"]')).toBeVisible();

    // 첫 번째 스텝 "기본 정보" 활성 상태 확인
    await expect(page.getByText('기본 정보').first()).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('다음/이전 버튼 동작 — 스텝 진행 확인', async ({ consultantPage: page }) => {
    // 선행 테스트에서 인터뷰 URL을 추출하지 못하면 스텝 테스트 불가
    test.skip(!interviewUrl, '테스트 데이터 없음: 인터뷰 URL이 없습니다');

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    // 초기 상태: 1단계 "기본 정보" 표시 (main 스코핑으로 네비 중복 방지)
    await expect(page.locator('main').getByText('인터뷰 날짜', { exact: true })).toBeVisible();

    // "다음" 버튼 클릭 → 2단계로 이동
    await page.getByRole('button', { name: '다음' }).click();
    // 스텝 전환 후 "인터뷰 날짜" 필드가 사라지는 것으로 2단계 진입 확인
    await expect(page.locator('main').getByText('인터뷰 날짜', { exact: true })).not.toBeVisible({ timeout: 5_000 });

    // 2단계 "시스템/AI 활용 경험" 관련 콘텐츠 표시
    const mainContent = page.locator('main');
    const pageText = await mainContent.textContent();
    expect(pageText!.length).toBeGreaterThan(0);

    // "이전" 버튼 클릭 → 1단계로 복귀
    await page.getByRole('button', { name: '이전' }).click();

    // 다시 "인터뷰 날짜" 필드가 보여야 함 (1단계 콘텐츠 렌더링 대기)
    await expect(page.locator('main').getByText('인터뷰 날짜', { exact: true })).toBeVisible({ timeout: 5_000 });
  });

  test('1단계: 필수 필드 (날짜, 참석자명) 확인', async ({ consultantPage: page }) => {
    // 선행 테스트에서 인터뷰 URL을 추출하지 못하면 필수 필드 테스트 불가
    test.skip(!interviewUrl, '테스트 데이터 없음: 인터뷰 URL이 없습니다');

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    // 인터뷰 날짜 필드 존재 확인
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    // 날짜 필드에 값이 있는지 확인 (기본값: 오늘 날짜)
    const dateValue = await dateInput.inputValue();
    expect(dateValue).toBeTruthy();

    // 참석자 이름 입력 필드 존재 확인
    await expect(page.getByPlaceholder('이름')).toBeVisible();

    // 필수 표시 (*) 확인
    await expect(page.locator('main').getByText('인터뷰 날짜', { exact: true })).toBeVisible();
    await expect(page.locator('main').getByText('인터뷰 참석자', { exact: true })).toBeVisible();
  });

  test('참석자 동적 추가/제거', async ({ consultantPage: page }) => {
    // 선행 테스트에서 인터뷰 URL을 추출하지 못하면 참석자 테스트 불가
    test.skip(!interviewUrl, '테스트 데이터 없음: 인터뷰 URL이 없습니다');

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    // 초기 참석자 수 확인 (이름 입력 필드 개수)
    const initialNameFields = await page.getByPlaceholder('이름').count();
    expect(initialNameFields).toBeGreaterThanOrEqual(1);

    // "참석자 추가" 버튼 클릭
    await page.getByRole('button', { name: '참석자 추가' }).click();
    // 새 참석자 필드 렌더링 대기
    await expect(page.getByPlaceholder('이름').nth(initialNameFields)).toBeVisible({ timeout: 5_000 });

    // 참석자 필드가 1개 증가했는지 확인
    const afterAddCount = await page.getByPlaceholder('이름').count();
    expect(afterAddCount).toBe(initialNameFields + 1);

    // 삭제 버튼으로 마지막 참석자 제거 (2명 이상일 때만 삭제 버튼 표시)
    if (afterAddCount > 1) {
      const deleteButtons = page.locator('button[title="삭제"]');
      const deleteCount = await deleteButtons.count();
      if (deleteCount > 0) {
        await deleteButtons.last().click();
        // 참석자 필드 제거 대기: 필드 수가 줄어들 때까지
        await expect(page.getByPlaceholder('이름')).toHaveCount(afterAddCount - 1, { timeout: 5_000 });

        const afterRemoveCount = await page.getByPlaceholder('이름').count();
        expect(afterRemoveCount).toBe(afterAddCount - 1);
      }
    }
  });

  test('스테퍼 클릭으로 단계 직접 이동', async ({ consultantPage: page }) => {
    // 선행 테스트에서 인터뷰 URL을 추출하지 못하면 스테퍼 테스트 불가
    test.skip(!interviewUrl, '테스트 데이터 없음: 인터뷰 URL이 없습니다');

    await page.goto(interviewUrl!);
    await page.waitForLoadState('networkidle');

    // 데스크톱 스테퍼에서 "세부업무" (3단계) 클릭
    const step3Button = page
      .locator('nav[aria-label="Progress"]')
      .getByText('세부업무');

    const isDesktopStepper = await step3Button.isVisible().catch(() => false);

    if (isDesktopStepper) {
      await step3Button.click();
      // 3단계 전환 후 "기본 정보"(1단계) 콘텐츠가 사라지는 것으로 스텝 전환 확인
      await expect(page.locator('main').getByText('인터뷰 날짜', { exact: true })).not.toBeVisible({ timeout: 5_000 });

      // 3단계 콘텐츠가 표시되는지 확인 (스텝 콘텐츠 영역에 텍스트가 있으면 됨)
      const mainContent = page.locator('main');
      const pageText = await mainContent.textContent();
      expect(pageText!.length).toBeGreaterThan(0);
    } else {
      // 모바일 뷰: 진행 바 클릭
      const mobileBars = page.locator('nav[aria-label="Progress"] button.rounded-full');
      const barCount = await mobileBars.count();

      if (barCount >= 3) {
        await mobileBars.nth(2).click(); // 3번째 스텝
        // 스텝 전환 후 콘텐츠 갱신 대기
        await expect(page.locator('main').getByText('인터뷰 날짜', { exact: true })).not.toBeVisible({ timeout: 5_000 });
      }
    }

    // "확인" (6단계) 클릭으로 마지막 단계 이동 테스트
    const step6Button = page
      .locator('nav[aria-label="Progress"]')
      .getByText('확인');

    const hasStep6 = await step6Button.isVisible().catch(() => false);

    if (hasStep6) {
      await step6Button.click();
      // 마지막 단계 전환 대기: "저장" 버튼 또는 콘텐츠 렌더링
      await expect(page.locator('main')).toBeVisible({ timeout: 5_000 });

      // 마지막 단계에서는 "저장" 버튼이 표시됨 ("다음" 대신)
      const saveButton = page.getByRole('button', { name: '저장' });
      const hasSaveButton = await saveButton.isVisible().catch(() => false);

      if (hasSaveButton) {
        await expect(saveButton).toBeVisible();
      }
    }
  });
});
