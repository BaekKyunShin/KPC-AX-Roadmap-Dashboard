// e2e/consultant/interview-auto-save.spec.ts
// PR #4: 인터뷰 화면 자동 저장 회귀 (DoD #8 마무리)
//
// 시나리오 (의미적 검증):
//   1) 컨설턴트가 인터뷰 화면 진입
//   2) Ⅰ-1 수립 필요성 textarea 에 입력
//   3) 자동 저장 debounce + 서버 round-trip 대기
//   4) 페이지 새로고침
//   5) 입력 값이 보존되는지 확인 (= 자동 저장이 영속화됨을 입증)
//
// 인디케이터 (`자동 저장됨` / `저장 중…`) 는 timing-sensitive UI detail 이라 검증하지 않는다.
// reload 후 값 보존이 자동 저장의 의미적 outcome 이며, 이것이 안정적 검증 포인트.
//
// LLM 호출 없음 — 인터뷰 자동 저장은 saveRoadmapInterviewV2 Server Action 만 호출.
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

const SAMPLE_INPUT = `E2E 자동저장 회귀 ${new Date().toISOString()}`;

test.describe('컨설턴트 인터뷰 자동 저장 회귀 (DoD #8)', () => {
  test('Ⅰ-1 수립 필요성 입력 → 새로고침 후 값 보존', async ({
    consultantPage: page,
  }) => {
    const getErrors = setupConsoleErrorCheck(page);

    // 첫 담당 프로젝트 진입
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    const href = await findFirstLinkHref(page, '/consultant/projects/');
    test.skip(!href, '테스트 데이터 없음: 담당 프로젝트가 없습니다');
    const interviewUrl = `${href!}/interview`;

    await page.goto(interviewUrl);
    await page.waitForLoadState('networkidle');

    // 로드맵 V2 트랙만 (PBL 은 별도 spec)
    const isRoadmapV2 = await page
      .getByRole('heading', { name: /AI훈련로드맵 인터뷰/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmapV2, 'PBL 트랙 — 로드맵 V2 자동 저장 spec 아님');

    // Ⅰ-1 textarea 입력
    const textarea = page.getByLabel('수립 필요성');
    await expect(textarea).toBeVisible();
    await textarea.fill(SAMPLE_INPUT);

    // 500ms debounce + 서버 round-trip 충분히 대기
    // (이 동안 RoadmapInterviewClient 의 useEffect 가 saveRoadmapInterviewV2 호출)
    await page.waitForTimeout(3_000);

    // 페이지 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Ⅰ-1 textarea 의 값이 보존됨 — 자동 저장이 영속화됨을 입증
    const textareaAfter = page.getByLabel('수립 필요성');
    await expect(textareaAfter).toBeVisible();
    await expect(textareaAfter).toHaveValue(SAMPLE_INPUT);

    expect(getErrors()).toEqual([]);
  });
});
