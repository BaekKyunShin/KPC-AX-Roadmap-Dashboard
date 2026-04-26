// e2e/consultant/interview-auto-save.spec.ts
// PR #4: 인터뷰 화면 자동 저장 회귀 sanity 체크 (DoD #8 보강)
//
// 본 spec 은 "자동 저장 비동기 처리가 silently 실패하지 않는다" 만 검증한다.
//
// 시나리오:
//   1) 컨설턴트가 인터뷰 화면 진입
//   2) Ⅰ-1 수립 필요성 textarea 에 입력
//   3) 입력 직후 textarea 값이 즉시 반영됨 (UI 상호작용 정상)
//   4) 3 초간 자동 저장 debounce + 서버 round-trip 흐름이 진행됨
//   5) 콘솔 에러 0 건 (auto-save 가 silently 실패하지 않음)
//
// 인디케이터·persistence 어설션은 환경 의존 timing 으로 flaky — vitest 단위 테스트
// (useInterviewAutoSave.test.ts + RoadmapInterviewClient.test.tsx:229) 가 이를 견고하게 커버.
// 본 E2E 는 통합 환경에서의 sanity 보장 역할만 수행 (DoD #8 의 보조 회귀).
import { test, expect } from '../fixtures/auth.fixture';
import { setupConsoleErrorCheck } from '../helpers/assertions.helper';
import { findFirstLinkHref } from '../helpers/navigation.helper';

const SAMPLE_INPUT = `E2E 자동저장 sanity ${new Date().toISOString()}`;

test.describe('컨설턴트 인터뷰 자동 저장 sanity (DoD #8)', () => {
  test('Ⅰ-1 수립 필요성 입력 → 3 초간 비동기 처리 콘솔 에러 0 건', async ({
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

    // 입력 직후 textarea 값이 즉시 반영됨 (UI 상호작용 정상)
    await expect(textarea).toHaveValue(SAMPLE_INPUT);

    // 500ms debounce + 서버 round-trip + saved/idle 전이 충분히 대기
    // 이 구간에서 useEffect → saveRoadmapInterviewV2 가 silently fail 하면 console.error 발생
    await page.waitForTimeout(3_000);

    // 콘솔 에러 0 건 — auto-save 비동기 처리 sanity
    expect(getErrors()).toEqual([]);
  });
});
