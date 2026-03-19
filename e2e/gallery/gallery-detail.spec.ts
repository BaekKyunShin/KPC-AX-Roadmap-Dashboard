// e2e/gallery/gallery-detail.spec.ts
// 갤러리 상세 페이지 E2E 테스트
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

// 목록에서 첫 항목의 상세 URL
let galleryDetailUrl: string | null = null;

// 좋아요 토글 복원용 정보
let likeToggled = false;

test.describe('갤러리 상세', () => {
  test('갤러리 상세 페이지 로드 + 로드맵 정보 표시', async ({ consultantPage: page }) => {
    const getErrors = setupConsoleErrorCheck(page);

    // 갤러리 목록에서 첫 항목 찾기
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    const href = await findFirstLinkHref(page, '/gallery/');
    // 갤러리에 공유된 로드맵이 없으면 상세 페이지 테스트 불가
    test.skip(!href, '테스트 데이터 없음: 갤러리 목록이 비어있습니다');
    galleryDetailUrl = href!;

    await page.locator(`main a[href="${href!}"]`).click();
    await page.waitForLoadState('networkidle');

    // 상세 페이지 URL 확인
    await expect(page).toHaveURL(/\/gallery\/[a-f0-9-]+/, { timeout: 10_000 });

    // 페이지 헤더 "로드맵 갤러리" 확인
    await expect(page.getByText('로드맵 갤러리')).toBeVisible();

    // "갤러리로 돌아가기" 뒤로가기 링크 확인
    await expect(page.getByRole('link', { name: /갤러리로 돌아가기/ })).toBeVisible();

    // 메인 콘텐츠 렌더링 확인
    await expect(page.locator('main')).toBeVisible();

    expect(getErrors()).toEqual([]);
  });

  test('3개 탭 (과정 체계도/과정 상세/PBL 과정) 전환', async ({
    consultantPage: page,
  }) => {
    // 선행 테스트에서 상세 URL을 추출하지 못하면 탭 전환 테스트 불가
    test.skip(!galleryDetailUrl, '테스트 데이터 없음: 갤러리 상세 URL이 없습니다');

    await page.goto(galleryDetailUrl!);
    await page.waitForLoadState('networkidle');

    // 탭 버튼들 확인 (GalleryDetailContent는 커스텀 탭을 사용, role="tab" 아님)
    const matrixTab = page.getByRole('button', { name: '과정 체계도' });
    const coursesTab = page.getByRole('button', { name: '과정 상세' });
    const pblTab = page.getByRole('button', { name: 'PBL 과정' });

    // "과정 체계도" 탭이 기본 활성
    await expect(matrixTab).toBeVisible();

    // "과정 상세" 탭 클릭 → 활성 스타일(border-primary) 적용 대기
    await coursesTab.click();
    await expect(coursesTab).toHaveClass(/border-primary/, { timeout: 5_000 });

    // "PBL 과정" 탭 클릭 → 활성 스타일 적용 대기
    await pblTab.click();
    await expect(pblTab).toHaveClass(/border-primary/, { timeout: 5_000 });

    // 다시 "과정 체계도" 탭 클릭 → 활성 스타일 적용 대기
    await matrixTab.click();
    await expect(matrixTab).toHaveClass(/border-primary/, { timeout: 5_000 });
  });

  test('좋아요 버튼 토글', async ({ consultantPage: page }) => {
    // 선행 테스트에서 상세 URL을 추출하지 못하면 좋아요 테스트 불가
    test.skip(!galleryDetailUrl, '테스트 데이터 없음: 갤러리 상세 URL이 없습니다');

    await page.goto(galleryDetailUrl!);
    await page.waitForLoadState('networkidle');

    // 좋아요 버튼 찾기 (Heart SVG + 카운트 span을 가진 rounded-full 버튼)
    const likeButton = page
      .locator('button.rounded-full')
      .filter({ has: page.locator('svg') })
      .first();
    const hasLikeButton = await likeButton.isVisible().catch(() => false);

    // 좋아요 버튼이 없으면 토글 테스트 불가
    test.skip(!hasLikeButton, '테스트 데이터 없음: 좋아요 버튼이 없습니다');

    // 현재 좋아요 카운트 기록
    const countBefore = await likeButton.locator('span').textContent();

    // 좋아요 클릭 → 카운트 변경 대기 (낙관적 업데이트)
    await likeButton.click();
    await expect(likeButton.locator('span')).not.toHaveText(countBefore!, { timeout: 5_000 });

    // 카운트가 변경되었는지 확인
    const countAfter = await likeButton.locator('span').textContent();
    expect(countAfter).not.toBe(countBefore);

    likeToggled = true;

    // 다시 클릭하여 원래 상태로 복원 → 카운트 복원 대기
    await likeButton.click();
    await expect(likeButton.locator('span')).toHaveText(countBefore!, { timeout: 5_000 });

    const countRestored = await likeButton.locator('span').textContent();
    expect(countRestored).toBe(countBefore);

    likeToggled = false;
  });

  test('"이 로드맵 사용하기" 버튼 컨설턴트에게 표시', async ({
    consultantPage: page,
  }) => {
    // 선행 테스트에서 상세 URL을 추출하지 못하면 버튼 표시 테스트 불가
    test.skip(!galleryDetailUrl, '테스트 데이터 없음: 갤러리 상세 URL이 없습니다');

    await page.goto(galleryDetailUrl!);
    await page.waitForLoadState('networkidle');

    // 컨설턴트에게 "이 로드맵 사용하기" 버튼이 표시되는지 확인
    const useButton = page.getByRole('button', { name: /이 로드맵 사용하기/ });
    await expect(useButton).toBeVisible({ timeout: 5_000 });
  });

  test('존재하지 않는 ID → notFound 처리', async ({ consultantPage: page }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await page.goto(`/gallery/${fakeId}`);
    await page.waitForLoadState('networkidle');

    // 404 페이지 또는 에러 처리 확인
    // Next.js notFound()는 404 상태 코드를 반환하거나 커스텀 not-found 페이지를 렌더링함
    const pageText = await page.locator('body').textContent();
    const is404 =
      pageText!.includes('404') ||
      pageText!.includes('찾을 수 없') ||
      pageText!.includes('not found') ||
      pageText!.includes('Not Found') ||
      pageText!.includes('존재하지 않');

    expect(is404).toBe(true);
  });

  // 좋아요 토글이 복원되지 않은 경우 정리
  test.afterAll(async ({ browser }) => {
    if (likeToggled && galleryDetailUrl) {
      const context = await browser.newContext({
        storageState: '.auth/consultant.json',
      });
      const page = await context.newPage();

      try {
        await page.goto(galleryDetailUrl);
        await page.waitForLoadState('networkidle');

        // 좋아요 버튼을 다시 클릭하여 원래 상태로 복원
        const likeButton = page
          .locator('button.rounded-full')
          .filter({ has: page.locator('svg') })
          .first();

        if (await likeButton.isVisible().catch(() => false)) {
          const countBeforeRestore = await likeButton.locator('span').textContent();
          await likeButton.click();
          await expect(likeButton.locator('span')).not.toHaveText(countBeforeRestore!, { timeout: 5_000 }).catch(() => {});
        }
      } finally {
        await context.close();
      }
    }
  });
});
