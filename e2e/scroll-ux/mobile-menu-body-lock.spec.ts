// e2e/scroll-ux/mobile-menu-body-lock.spec.ts
// PR2 P1 회귀 (H-4) — 모바일 햄버거 메뉴가 열린 동안 body 스크롤이 잠겨야 한다.
//
// 결함: Navigation 의 mobile 메뉴는 plain <div> 라 Radix Sheet/Dialog 의 body lock
// 자동 처리가 없다. 메뉴 위에서 스와이프하면 배경 페이지가 함께 스크롤 → 메뉴를
// 닫으면 사용자가 의도하지 않은 위치에 도착.
//
// 패치: Navigation.tsx 에 `useEffect(() => { body.style.overflow = isOpen ? 'hidden' : prev }, [isOpen])`
// 추가. 본 스펙은 body.style.overflow 가 메뉴 열림/닫힘에 맞춰 토글되는지, 그리고
// 메뉴가 열린 상태에서 window scroll 이 차단되는지 검증한다.
import { test, expect } from '../fixtures/auth.fixture';

test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

test.describe('스크롤 위치 유지 — 모바일 햄버거 body lock', () => {
  test('햄버거 메뉴 열림 동안 body.overflow=hidden, 닫으면 원복', async ({
    opsPage: page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const trigger = page.getByTestId('mobile-menu-button');
    const triggerVisible = await trigger.isVisible().catch(() => false);
    test.skip(!triggerVisible, '모바일 햄버거 버튼 미노출 — viewport 또는 권한 문제');

    const beforeOverflow = await page.evaluate(() => document.body.style.overflow);

    await trigger.click();
    await expect(page.getByTestId('mobile-menu')).toBeVisible();

    const openOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(openOverflow, '메뉴 열린 동안 body.overflow=hidden 이 적용되어야 함').toBe(
      'hidden',
    );

    await trigger.click();
    await expect(page.getByTestId('mobile-menu')).toBeHidden();

    const afterOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(
      afterOverflow,
      `메뉴 닫은 후 body.overflow 가 이전 값('${beforeOverflow}')으로 원복되어야 함`,
    ).toBe(beforeOverflow);
  });

  test('햄버거 메뉴 열린 동안 window scroll 이 차단됨', async ({ opsPage: page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const trigger = page.getByTestId('mobile-menu-button');
    const triggerVisible = await trigger.isVisible().catch(() => false);
    test.skip(!triggerVisible, '모바일 햄버거 버튼 미노출');

    await page.evaluate(() => window.scrollTo(0, 0));
    const initialY = await page.evaluate(() => window.scrollY);

    await trigger.click();
    await expect(page.getByTestId('mobile-menu')).toBeVisible();

    // body overflow=hidden 이면 window.scrollTo 호출이 실제 스크롤로 이어지지 않음.
    await page.evaluate(() => window.scrollTo(0, 500));
    const lockedY = await page.evaluate(() => window.scrollY);

    expect(
      lockedY,
      `메뉴 열린 동안 window 스크롤이 차단되어야 함 (initial=${initialY}, after=${lockedY})`,
    ).toBeLessThan(50);
  });
});
