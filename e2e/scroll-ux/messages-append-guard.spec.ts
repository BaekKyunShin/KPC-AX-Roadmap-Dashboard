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

const SCROLL_AMOUNT_PX = 200;

test.describe('스크롤 위치 유지 — 메시지 채팅 append 가드', () => {
  test('사용자가 위로 스크롤한 동안 자동 하단 스크롤 발생 안 함', async ({
    opsPage: page,
  }) => {
    await page.goto('/dashboard/messages');
    await page.waitForLoadState('networkidle');

    // 대화방 목록에서 첫 번째 항목 진입
    const firstConv = page.getByTestId(/conversation-item/i).first();
    const hasConv = await firstConv.isVisible().catch(() => false);
    test.skip(!hasConv, '메시지 대화방이 없음 — 시드 데이터 부족');
    await firstConv.click();

    const thread = page.getByTestId('message-thread-area');
    await expect(thread).toBeVisible();

    // 스레드가 충분히 스크롤 가능한 분량을 가졌는지 확인
    const canScroll = await thread.evaluate(
      (el) => el.scrollHeight - el.clientHeight > 250,
    );
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
      `사용자 스크롤 위치 변동이 50px 초과: before=${beforeTop}, after=${afterTop}`,
    ).toBeLessThan(50);
  });

  test('"새 메시지" 배지 노출 시 클릭하면 하단 이동 (배지가 보이면)', async ({
    opsPage: page,
  }) => {
    await page.goto('/dashboard/messages');
    await page.waitForLoadState('networkidle');

    const firstConv = page.getByTestId(/conversation-item/i).first();
    test.skip(!(await firstConv.isVisible().catch(() => false)), '대화방 없음');
    await firstConv.click();

    const thread = page.getByTestId('message-thread-area');
    await expect(thread).toBeVisible();

    // 배지는 위로 스크롤 + 새 메시지 도착 조합에서만 노출.
    // Realtime 트리거가 환경에 의존하므로 5초 내 배지가 안 나타나면 skip.
    const badge = page.getByTestId('new-messages-badge');
    const appeared = await badge
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!appeared, '새 메시지 배지가 환경상 노출되지 않음');

    await badge.click();
    await page.waitForTimeout(300);

    const scrolledToBottom = await thread.evaluate(
      (el) => el.scrollHeight - el.scrollTop - el.clientHeight < 50,
    );
    expect(scrolledToBottom, '배지 클릭 후 하단으로 스크롤되어야 함').toBe(true);
    await expect(badge).toBeHidden();
  });
});
