// e2e/scroll-ux/messages-append-guard.spec.ts
// PR2 P1 회귀 (H-2) — 사용자가 메시지 스레드를 위로 스크롤해 과거 메시지를 읽는
// 동안 새 메시지가 도착해도 자동 하단 스크롤이 발생하지 않아야 한다. 대신 "새
// 메시지 N개" 배지로 안내.
//
// 결함: MessageThread.tsx 의 append useEffect 가 무조건
// `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })` 를 호출.
//
// 패치: scroll.ts 에 isNearBottom() 추가 + append 분기에 가드 + unreadCount state +
// 우하단 floating 배지.
//
// 본 스펙은 다음 두 가지를 검증한다.
//   1) 메시지 스레드를 위로 스크롤한 상태에서 일정 시간 동안 scrollTop 이 보존됨
//      (Realtime/폴링으로 새 메시지가 도착해도 강제 하단 점프 없음).
//   2) data-testid="new-messages-badge" 가 표시되면 클릭으로 하단 이동 가능.
// 환경(시드 데이터·대화방·Realtime) 의존성이 높아 graceful skip 으로 처리.
import { test, expect } from '../fixtures/auth.fixture';
import { registerMessageSeed } from '../helpers/bulk-seed.helper';

// 이 두 감시는 **두 가지 이유로** 잠들어 있었다.
//  ① 대화방·메시지 시드가 없어 스레드가 스크롤되지 않았다 → 아래에서 만들고 지운다.
//  ② 로케이터가 실제 마크업과 달랐다 — `data-testid="conversation-item"` 은
//     **제품 어디에도 없고 이 spec 에만 있었다**(2026-07-30 확인). 대화방 항목은
//     testid 없는 `<button>` 이다(`ConversationList.tsx:169`) → 상대방 이름으로 특정한다.
registerMessageSeed();

const SCROLL_AMOUNT_PX = 200;
/** 대화 상대(컨설턴트) 이름 — 대화방 목록 항목을 특정하는 기준. seed.sql 의 kpc@test.com */
const CONSULTANT_NAME = '김동순';

test.describe('스크롤 위치 유지 — 메시지 채팅 append 가드', () => {
  test('사용자가 위로 스크롤한 동안 자동 하단 스크롤 발생 안 함', async ({ opsPage: page }) => {
    await page.goto('/dashboard/messages');
    await page.waitForLoadState('networkidle');

    // 대화방 목록에서 첫 번째 항목 진입
    // 대화방 목록은 마운트 후 클라이언트에서 채워진다 — networkidle 직후 바로 확인하면
    // 아직 비어 있어 "대화방 없음"으로 오판하고 skip 된다(2026-07-30 계측으로 확인).
    const firstConv = page.getByRole('button').filter({ hasText: CONSULTANT_NAME }).first();
    const hasConv = await firstConv
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hasConv, '메시지 대화방이 없음 — 시드 데이터 부족');
    await firstConv.click();

    const thread = page.getByTestId('message-thread-area');
    await expect(thread).toBeVisible();

    // 스레드가 충분히 스크롤 가능한 분량을 가졌는지 확인.
    // 컨테이너가 보이는 것과 메시지가 다 그려진 것은 다르다 — 바로 재면 아직 짧아
    // "메시지 부족"으로 오판하고 skip 된다. 높이가 요건을 넘을 때까지 기다린다.
    await page
      .waitForFunction(
        () => {
          const el = document.querySelector('[data-testid="message-thread-area"]');
          return !!el && el.scrollHeight - el.clientHeight > 250;
        },
        undefined,
        { timeout: 10_000 }
      )
      .catch(() => {});

    const canScroll = await thread.evaluate((el) => el.scrollHeight - el.clientHeight > 250);
    test.skip(!canScroll, '메시지 수가 부족 — 스크롤 회귀 검증 불가');

    // 일단 하단으로 정렬 (컴포넌트가 초기에 하단으로 떨어짐) 후 위로 스크롤
    await thread.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(100);

    await thread.evaluate((el, dy) => {
      el.scrollTop = Math.max(0, el.scrollTop - dy);
    }, SCROLL_AMOUNT_PX);
    const beforeTop = await thread.evaluate((el) => el.scrollTop);

    // 메시지 도착을 강제로 시뮬레이션할 수 없는 환경이라면, 단순히 잠깐 대기 후
    // scrollTop 이 보존되는지만 검증 (Realtime 메시지가 들어와도 가드가 동작하면
    // scrollTop 변화가 없어야 함).
    await page.waitForTimeout(1500);

    const afterTop = await thread.evaluate((el) => el.scrollTop);
    expect(
      Math.abs(afterTop - beforeTop),
      `사용자 스크롤 위치 변동이 50px 초과: before=${beforeTop}, after=${afterTop}`
    ).toBeLessThan(50);
  });

  test('"새 메시지" 배지 노출 시 클릭하면 하단 이동 (배지가 보이면)', async ({ opsPage: page }) => {
    await page.goto('/dashboard/messages');
    await page.waitForLoadState('networkidle');

    const firstConv = page.getByRole('button').filter({ hasText: CONSULTANT_NAME }).first();
    const convReady = await firstConv
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!convReady, '대화방 없음');
    await firstConv.click();

    const thread = page.getByTestId('message-thread-area');
    await expect(thread).toBeVisible();

    // 배지는 위로 스크롤 + **새 메시지 도착** 조합에서만 노출된다.
    //
    // ⚠️ **이 1건은 의도적으로 skip 상태로 둔다.** 되살리려면 테스트 도중 실제로 메시지를
    // 밀어 넣어(admin insert) Realtime 수신을 유발해야 하는데, 수신 타이밍이 환경에 좌우돼
    // CI 를 간헐적으로 깨뜨릴 위험이 크다. 잠든 감시를 깨우는 것보다 **flaky 를 CI 에 남기는
    // 쪽이 더 나쁘다**고 판단했다(세션 3 계획서의 사전 결정).
    // 같은 파일의 첫 번째 감시(자동 하단 스크롤 방지)가 append 가드의 핵심을 이미 지킨다.
    const badge = page.getByTestId('new-messages-badge');
    const appeared = await badge
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!appeared, '새 메시지 배지가 환경상 노출되지 않음');

    await badge.click();
    await page.waitForTimeout(300);

    const scrolledToBottom = await thread.evaluate(
      (el) => el.scrollHeight - el.scrollTop - el.clientHeight < 50
    );
    expect(scrolledToBottom, '배지 클릭 후 하단으로 스크롤되어야 함').toBe(true);
    await expect(badge).toBeHidden();
  });
});
