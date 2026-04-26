// e2e/consultant/regenerate-roadmap.spec.ts
// PR #4: 로드맵 결과 화면 재생성 아코디언 회귀 (DoD #8)
//
// 시나리오 (LLM 호출 없음 — UI 흐름만 검증):
//   1) 컨설턴트가 결과 화면 진입 (DRAFT 버전 존재 가정)
//   2) `새 버전 생성` 버튼 클릭 → 아코디언 펼침 + textarea 노출
//   3) 프롬프트 입력 → textarea 값 반영
//   4) `취소` 클릭 → 아코디언 접힘
//
// 실제 LLM 호출 후 새 DRAFT 생성 검증은 별도 통합 테스트 영역 (LLM mock 필요).
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

test.describe.configure({ mode: 'serial' });

const PROMPT_INPUT = `E2E 재생성 회귀 — 역량별 초급 과정 1개 추가해주세요. ${new Date().toISOString()}`;

test.describe('컨설턴트 로드맵 재생성 아코디언 회귀 (DoD #8)', () => {
  test('새 버전 생성 버튼 → 아코디언 펼침 → 프롬프트 입력 → 취소', async ({
    consultantPage: page,
  }) => {
    const getErrors = setupConsoleErrorCheck(page);

    // 첫 담당 프로젝트 진입 후 결과(/roadmap) 화면으로 이동
    await page.goto('/consultant/projects');
    await page.waitForLoadState('networkidle');

    const href = await findFirstLinkHref(page, '/consultant/projects/');
    test.skip(!href, '테스트 데이터 없음: 담당 프로젝트가 없습니다');
    const roadmapUrl = `${href!}/roadmap`;

    await page.goto(roadmapUrl);
    await page.waitForLoadState('networkidle');

    // PBL 트랙 또는 DRAFT 버전 부재 시 skip
    const isRoadmap = await page
      .getByRole('heading', { name: /AI훈련로드맵/, level: 1 })
      .isVisible()
      .catch(() => false);
    test.skip(!isRoadmap, 'PBL 또는 결과 화면 미진입 — 로드맵 재생성 spec 아님');

    // `새 버전 생성` 버튼 노출 — DRAFT 상태일 때만 보임
    const openButton = page.getByRole('button', { name: /새 버전 생성/ });
    const buttonVisible = await openButton.isVisible().catch(() => false);
    test.skip(!buttonVisible, 'DRAFT 버전 부재 — 재생성 버튼 미노출');

    // 펼침
    await openButton.click();
    const panel = page.locator('#regenerate-panel');
    await expect(panel).toBeVisible();

    // 프롬프트 입력
    const textarea = panel.getByLabel('수정 요청 사항 (선택)');
    await expect(textarea).toBeVisible();
    await textarea.fill(PROMPT_INPUT);
    await expect(textarea).toHaveValue(PROMPT_INPUT);

    // 취소 → 아코디언 접힘
    await panel.getByRole('button', { name: '취소' }).click();
    await expect(panel).not.toBeVisible();

    expect(getErrors()).toEqual([]);
  });
});
