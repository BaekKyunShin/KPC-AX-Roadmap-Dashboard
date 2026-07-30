// e2e/scroll-ux/pbl-result-regenerate.spec.ts
// PR1 P0 회귀 — PBLResultClient 가 `?regenerate=open` 쿼리를 정리할 때의 화면 상태.
// 로드맵 쪽(`roadmap-result-regenerate.spec.ts`)과 동일 패턴이며, 그 파일의 주석에 이
// 감시가 세션 3까지 한 번도 실행되지 않았던 두 가지 원인이 정리돼 있다.
//
// ⚠️ **이 spec 이 잡는 것과 못 잡는 것을 구분할 것** (2026-07-30 결함 주입으로 확인).
//
// | 회귀 | 잡는가 |
// |---|---|
// | 입력창(아코디언)이 렌더되지 않음 | ✅ |
// | `?regenerate=open` 인데 패널이 자동으로 펼쳐지지 않음 | ✅ |
// | `router.replace` 가 쿼리를 정리하지 않음 (새로고침 시 재펼침·히스토리 누적) | ✅ |
// | `scrollIntoView` 가 아예 실행되지 않음 | ✅ |
// | **`{ scroll: false }` 누락으로 스크롤 위치가 흐트러짐** | ❌ **못 잡는다** |
//
// 마지막 항목을 못 잡는 이유: PBL 결과 페이지는 아코디언이 문서상 top 269 에 있어
// `block:'center'` 정렬에 필요한 스크롤이 **49px 뿐**이다. 그 거리의 smooth 애니메이션은
// `router.replace` 가 호출되기 전에 이미 끝나므로, `{ scroll: false }` 를 제거해도 값이
// 49 → 49 로 변하지 않는다. 같은 코드의 로드맵 쪽은 거리가 99px 로 길어 애니메이션이
// 진행 중에 replace 가 끼어들고, 그래서 99 → 25 로 떨어지며 **그쪽 spec 이 이 회귀를 지킨다**.
// 즉 `{ scroll: false }` 감시는 로드맵 spec 에 위임하고, 여기서는 나머지 4가지를 지킨다.
//
// 실측 근거 (1280×720, 시드 PBL 프로젝트 — 아코디언 문서상 top 269 · height 343):
// scrollY 49 · 아코디언 중심이 화면중앙에서 31px 벗어남 (정상·결함 주입 모두 동일).
import { test, expect } from '../fixtures/auth.fixture';
import {
  fetchUserIdByEmail,
  purgeSeededProjects,
  seedPblRegenerateTarget,
} from '../helpers/bulk-seed.helper';

/** `scrollIntoView` 가 실행됐다고 볼 최소치. 실측 49 — 미실행이면 0 이 된다. */
const MIN_SCROLL_Y = 40;

/** `block:'center'` 정렬을 유지했다고 볼 허용 오차. 실측 31. */
const CENTER_TOLERANCE_PX = 60;

/**
 * `supabase/seed.sql` 에는 `pbl_reports` 가 한 건도 없어 PBL 결과 페이지가 늘 EmptyState 였다.
 * 기존 시드기업C 에 붙이지 않고 전용 프로젝트를 만드는 이유는 헬퍼 주석에 적어 뒀다.
 */
let pblProjectId: string;

test.beforeAll(async () => {
  const [consultantId, createdById] = await Promise.all([
    fetchUserIdByEmail(process.env.E2E_CONSULTANT_EMAIL),
    fetchUserIdByEmail(process.env.E2E_OPS_ADMIN_EMAIL),
  ]);
  pblProjectId = await seedPblRegenerateTarget(consultantId, createdById);
});

test.afterAll(async () => {
  await purgeSeededProjects();
});

test.describe('스크롤 위치 유지 — PBLResultClient regenerate', () => {
  test('?regenerate=open 진입 후 아코디언 펼침·URL 정리·스크롤 실행', async ({
    consultantPage: page,
  }) => {
    await page.goto(`/consultant/projects/${pblProjectId}/pbl?regenerate=open`);
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

    // 시드가 실패했거나 마크업이 바뀌면 **조용히 skip 하지 않고 실패**시킨다.
    expect(
      measured.found,
      '「새 버전 생성」 아코디언을 찾지 못했다 — PBL 보고서 시드가 실패했거나 마크업이 바뀌었다'
    ).toBe(true);
    expect(measured.panelOpen, '?regenerate=open 인데 패널이 펼쳐지지 않았다').toBe(true);
    expect(measured.search, 'router.replace 가 regenerate 쿼리를 정리하지 않았다').toBe('');

    expect(
      measured.scrollY,
      `scrollIntoView 가 실행되지 않았다 (scrollY=${measured.scrollY} · 실측 49)`
    ).toBeGreaterThanOrEqual(MIN_SCROLL_Y);

    expect(
      measured.centerOffset,
      `아코디언이 화면 중앙 정렬을 잃었다 (오차 ${measured.centerOffset}px · 실측 31)`
    ).toBeLessThanOrEqual(CENTER_TOLERANCE_PX);
  });
});
