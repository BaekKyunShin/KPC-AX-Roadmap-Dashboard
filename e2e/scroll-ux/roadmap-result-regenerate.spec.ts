// e2e/scroll-ux/roadmap-result-regenerate.spec.ts
// PR1 P0 회귀 — RoadmapResultClient 가 `?regenerate=open` 쿼리를 정리할 때 스크롤 보존.
//
// 사용자 시나리오: 인터뷰 검토 페이지에서 「새 버전 생성」을 누르면 결과 페이지로 이동하며
// 입력창(RegenerateAccordion)이 펼쳐지고 그 위치로 부드럽게 스크롤된다. 그 직후 주소창의
// `?regenerate=open` 이 지워지는데(`router.replace`), 이때 `{ scroll: false }` 가 빠지면
// 방금 맞춘 위치가 흐트러져 입력창이 화면 위로 밀려난다.
// (`RoadmapResultClient.tsx:159-170` — scrollIntoView 자체는 의도된 동작이라 검증 대상이 아니다.)
//
// ⚠️ **2026-07-30 — 이 감시는 그때까지 한 번도 실행된 적이 없었다.** 두 가지가 겹쳐 있었다:
//
//  1) **대상 프로젝트가 틀렸다.** `findFirstLinkHref` 로 목록의 첫 프로젝트를 집었는데 그
//     프로젝트(시드기업B)에는 `roadmap_versions` 가 0건이다. 아코디언은 `hasVersions` 조건부라
//     DOM 에 **아예 없었고**, `accordionRef.current` 가 null 이라 scrollIntoView 를 호출하는
//     useEffect 가 조기 return → 스크롤이 0 → 자체 가드에 걸려 skip.
//     → **FINAL 로드맵을 이미 가진 시드기업D 를 직접 지정한다.**
//
//  2) **가드가 안전망을 거꾸로 만들고 있었다.** 옛 spec 은 `afterScrollInto < 50` 이면 skip
//     했다. 그런데 결함을 주입하면(`{ scroll: false }` 제거) 스크롤이 99 → 25 로 떨어져
//     **바로 그 가드에 걸려 skip 된다.** 결함이 있을 때 조용히 건너뛰는 구조였다.
//     → **skip 가드를 단언으로 승격한다.** 시드나 마크업이 바뀌어도 skip 이 아니라 실패한다.
//
// 실측 근거 (1280×720, 시드기업D — 아코디언 문서상 top 319 · height 343):
//   | | scrollY | 아코디언 중심이 화면중앙에서 벗어난 폭 |
//   |---|---|---|
//   | 정상 | 99 | 31px |
//   | `{scroll:false}` 제거 | 25 | 105px |
//
// 참고: 같은 패턴의 PBL 쪽(`PBLResultClient`)은 스크롤 거리가 49px 로 짧아 smooth 애니메이션이
// `router.replace` 전에 이미 끝난다 → 결함을 주입해도 값이 변하지 않아 감시가 성립하지 않는다.
import { test, expect } from '../fixtures/auth.fixture';

/** 시드기업D — `supabase/seed.sql:211-291` 이 FINAL 로드맵 1건과 함께 kpc 컨설턴트에게 배정해 둔다. */
const SEED_D_PROJECT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

/** `scrollIntoView` 가 실제로 스크롤을 만들었다고 볼 최소치. 정상 99 · 결함 25 사이. */
const MIN_SCROLL_Y = 50;

/** `block:'center'` 정렬을 유지했다고 볼 허용 오차. 정상 31 · 결함 105 사이. */
const CENTER_TOLERANCE_PX = 60;

test.describe('스크롤 위치 유지 — RoadmapResultClient regenerate', () => {
  test('?regenerate=open 진입 후 URL 정리될 때 아코디언 정렬 위치 보존', async ({
    consultantPage: page,
  }) => {
    await page.goto(`/consultant/projects/${SEED_D_PROJECT_ID}/roadmap?regenerate=open`);
    await page.waitForLoadState('networkidle');

    // rAF → scrollIntoView(smooth) → router.replace 가 모두 끝날 때까지 대기.
    await page.waitForTimeout(800);

    const measured = await page.evaluate(() => {
      const trigger = document.querySelector('button[aria-controls="regenerate-panel"]');
      // accordionRef 가 붙은 래퍼 = 아코디언 카드(div.rounded-lg)의 부모.
      const wrapper = trigger?.closest('div.rounded-lg')?.parentElement ?? null;
      const rect = wrapper?.getBoundingClientRect();
      return {
        found: !!rect,
        panelOpen: !!document.getElementById('regenerate-panel'),
        scrollY: Math.round(window.scrollY),
        centerOffset: rect
          ? Math.round(Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2))
          : -1,
        search: window.location.search,
      };
    });

    // 시드가 사라졌거나 마크업이 바뀌면 **조용히 skip 하지 않고 실패**시킨다.
    expect(
      measured.found,
      '「새 버전 생성」 아코디언을 찾지 못했다 — 시드기업D 의 로드맵 버전이 사라졌거나 마크업이 바뀌었다'
    ).toBe(true);
    expect(measured.panelOpen, '?regenerate=open 인데 패널이 펼쳐지지 않았다').toBe(true);
    expect(measured.search, 'router.replace 가 regenerate 쿼리를 정리하지 않았다').toBe('');

    expect(
      measured.scrollY,
      `scrollIntoView 가 잡은 위치가 유실됐다 (scrollY=${measured.scrollY} · 정상 실측 99 · 결함 주입 시 25)`
    ).toBeGreaterThanOrEqual(MIN_SCROLL_Y);

    expect(
      measured.centerOffset,
      `아코디언이 화면 중앙 정렬을 잃었다 (오차 ${measured.centerOffset}px · 정상 실측 31 · 결함 주입 시 105)`
    ).toBeLessThanOrEqual(CENTER_TOLERANCE_PX);
  });
});
