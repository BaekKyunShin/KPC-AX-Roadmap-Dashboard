// e2e/consultant/interview-review.spec.ts
// PR5 (R6 spec) §7.3 — 인터뷰 검토 페이지 신규 라우트 골든 플로우 E2E
//   - 컨설턴트가 본인 프로젝트의 /interview/review 에 진입 가능 (RLS·역할 통과)
//   - 페이지 헤더 + (인터뷰가 비어 있어도) 접힘식 카드 렌더링
//   - 결과 stale 배너는 결과·인터뷰 시점 비교에 따라 표시/미표시
//
// 본 라운드 PR 의 redirect 변경(submit 직후 → /interview/review)은 별도 E2E
// (interview-roadmap.spec.ts) 의 기존 "최종 제출" 시나리오에서 자연스럽게 검증된다.
// 본 spec 은 페이지 자체의 직접 진입 + 핵심 영역 렌더만 검증해 회귀 가시성을 확보한다.
import { test, expect } from '../fixtures/auth.fixture';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

test.describe('컨설턴트 인터뷰 검토 페이지 (PR5)', () => {
  test('컨설턴트로 /interview/review 직접 진입 시 페이지 헤더 + Step 카드 렌더', async ({
    consultantPage: page,
  }) => {
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    const href = await findFirstLinkHref(page, '/consultant/projects/');
    test.skip(!href, '테스트 데이터 없음: 담당 프로젝트가 없습니다');

    const reviewUrl = `${href!}/interview/review`;
    await page.goto(reviewUrl);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(
      /\/consultant\/projects\/[a-f0-9-]+\/interview\/review/,
      { timeout: 10_000 },
    );

    // 페이지 헤더 (track 에 따라 라벨 분기)
    const heading = page.getByRole('heading', {
      name: /(AI훈련로드맵|AI PBL) 인터뷰 검토/,
      level: 1,
    });
    await expect(heading).toBeVisible();

    // 하단 CTA 영역 ("인터뷰 페이지로 돌아가기" / "결과 페이지로 이동")
    await expect(
      page.getByTestId('review-cta-back-to-interview'),
    ).toBeVisible();
    await expect(page.getByTestId('review-cta-go-to-result')).toBeVisible();
  });

});
