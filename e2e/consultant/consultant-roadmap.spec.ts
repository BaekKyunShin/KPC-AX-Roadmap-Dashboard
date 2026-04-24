// e2e/consultant/consultant-roadmap.spec.ts
// 컨설턴트 로드맵 페이지 E2E 테스트
import { test, expect } from '../fixtures/auth.fixture';

test.describe('컨설턴트 로드맵', () => {
  test('프로젝트 목록에서 로드맵 페이지 진입 (프로젝트가 있는 경우)', async ({
    consultantPage: page,
  }) => {
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    const mainContent = page.locator('main');

    // 프로젝트 링크 찾기
    const firstProjectLink = mainContent
      .locator('a[href*="/consultant/projects/"]')
      .first();

    const hasProject = await firstProjectLink.isVisible().catch(() => false);

    if (hasProject) {
      // 프로젝트 상세로 이동
      await firstProjectLink.click();
      await page.waitForLoadState('networkidle');

      // 로드맵 탭/링크 찾기
      const roadmapLink = page
        .locator('a[href*="/roadmap"]')
        .first();

      const hasRoadmapLink = await roadmapLink.isVisible().catch(() => false);

      if (hasRoadmapLink) {
        await roadmapLink.click();
        await page.waitForLoadState('networkidle');

        // 로드맵 페이지 URL 확인
        await expect(page).toHaveURL(/\/consultant\/projects\/.*\/roadmap/, {
          timeout: 10_000,
        });

        // 기본 요소 렌더링 확인
        await expect(page.locator('main')).toBeVisible();
      }
      // 로드맵 링크가 없으면 프로젝트 상태가 아직 로드맵 단계가 아닌 것
    }
    // 프로젝트가 없으면 스킵 (방어적 패턴)
  });

  test('로드맵 페이지 기본 요소 렌더링 (직접 접근)', async ({
    consultantPage: page,
  }) => {
    // 먼저 프로젝트 목록에서 프로젝트 ID를 획득
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    const mainContent = page.locator('main');
    const firstProjectLink = mainContent
      .locator('a[href*="/consultant/projects/"]')
      .first();

    const hasProject = await firstProjectLink.isVisible().catch(() => false);

    if (hasProject) {
      const href = await firstProjectLink.getAttribute('href');
      const roadmapUrl = `${href}/roadmap`;

      await page.goto(roadmapUrl);
      await page.waitForLoadState('networkidle');

      // 메인 콘텐츠 영역 렌더링 확인
      await expect(page.locator('main')).toBeVisible();

      // 로드맵 페이지에 관련 UI 요소가 있는지 확인
      // (로드맵이 생성되지 않았으면 생성 버튼, 생성되었으면 4섹션 탭)
      const pageText = await page.locator('main').textContent();
      expect(pageText!.length).toBeGreaterThan(0);

      // 산인공 양식 4섹션 또는 생성 버튼 중 하나는 반드시 표시되어야 함.
      // V2 에서 섹션은 TabTraining 내부의 SectionCard 제목으로 노출되고,
      // 생성 버튼은 versions=0 일 때 EmptyState("AI 로드맵 생성"),
      // versions>0 일 때 RegenerateAccordion("새 버전 생성") 로 노출된다.
      const hasRoadmapSection =
        pageText!.includes('역량 모델링') ||
        pageText!.includes('훈련체계도') ||
        pageText!.includes('연간 훈련계획') ||
        pageText!.includes('훈련과정 명세서');
      const hasGenerateButton =
        pageText!.includes('AI 로드맵 생성') ||
        pageText!.includes('새 버전 생성') ||
        pageText!.includes('로드맵 생성') ||
        pageText!.includes('새 버전 로드맵 생성');
      const hasEmptyState = pageText!.includes('아직 생성된 로드맵이 없습니다');
      expect(hasRoadmapSection || hasGenerateButton || hasEmptyState).toBe(true);

      // 구형 PBL 탭은 더 이상 노출되지 않아야 함
      expect(pageText).not.toContain('PBL 과정');

      // 로드맵이 생성된 상태라면 V2 결과 탭 (Ⅰ. 개요 / Ⅱ. 요구분석 / Ⅲ. 훈련체계) 이 노출되고
      // Ⅲ. 훈련체계 탭 내부에 "역량 모델링"·"훈련체계도" 섹션 + NCS / 수립 방법 블록이 표출된다.
      if (hasRoadmapSection) {
        // 결과 탭 트리거 — "Ⅲ. 훈련체계" 탭 선택
        const trainingTab = page.getByRole('tab', { name: /훈련체계/ });
        if (await trainingTab.count() > 0) {
          await trainingTab.click();
          // "NCS 능력단위 활용 방법" 또는 "역량별 도출 방법" 중 하나가 표시되어야 함
          const ncsBox = page
            .getByText(/NCS 능력단위 활용 방법|역량별 도출 방법/)
            .first();
          await expect(ncsBox).toBeVisible();

          // "훈련체계도 수립 방법" 블록
          const methodBox = page.getByText(/훈련체계도 수립 방법/).first();
          await expect(methodBox).toBeVisible();
        }
      }
    }
    // 프로젝트가 없으면 스킵 (방어적 패턴)
  });
});
