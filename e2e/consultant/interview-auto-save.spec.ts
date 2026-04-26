// e2e/consultant/interview-auto-save.spec.ts
// PR #4: 인터뷰 화면 자동 저장 회귀 (DoD #8 마무리)
//
// 시나리오:
//   1) 컨설턴트가 인터뷰 화면 진입
//   2) Ⅰ-1 수립 필요성 textarea 에 입력
//   3) `자동 저장됨` 인디케이터 노출 확인 (debounce 500ms)
//   4) 페이지 새로고침
//   5) 입력 값 보존 확인
//
// LLM 호출 없음 — 인터뷰 자동 저장은 saveRoadmapInterviewV2 Server Action 만 호출.
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

const SAMPLE_INPUT = `E2E 자동저장 회귀 ${new Date().toISOString()}`;

test.describe('컨설턴트 인터뷰 자동 저장 회귀 (DoD #8)', () => {
  test('Ⅰ-1 수립 필요성 입력 → 인디케이터 노출 → 새로고침 후 값 보존', async ({
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

    // 자동 저장 인디케이터 노출 (500ms debounce + 서버 round-trip)
    // 인디케이터는 saveState='saved' 일 때 '자동 저장됨' 또는 saving '저장 중…' 표출.
    // 둘 중 하나가 timeout 안에 보이면 통과.
    const savedIndicator = page.getByText(/자동 저장됨|저장 중…/);
    await expect(savedIndicator).toBeVisible({ timeout: 5_000 });

    // 페이지 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Ⅰ-1 textarea 의 값이 보존됨
    const textareaAfter = page.getByLabel('수립 필요성');
    await expect(textareaAfter).toBeVisible();
    await expect(textareaAfter).toHaveValue(SAMPLE_INPUT);

    expect(getErrors()).toEqual([]);
  });
});
