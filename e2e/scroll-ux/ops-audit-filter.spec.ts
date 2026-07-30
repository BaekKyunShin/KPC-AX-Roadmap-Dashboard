// e2e/scroll-ux/ops-audit-filter.spec.ts
// PR1 P0 회귀 — AuditLogClient 필터·리셋 시 스크롤 위치 보존
import { test, expect } from '../fixtures/auth.fixture';
import { isScrollable, scrollToRevealing, expectScrollPreserved } from '../helpers/scroll.helper';
import { AUDIT_TARGET_TYPE, registerAuditLogSeed } from '../helpers/bulk-seed.helper';

// 감사 로그 시드가 없어 스크롤이 생기지 않아 아래 감시가 skip 됐다.
// 이 파일 전용으로 로그를 만들고 끝나면 지운다.
registerAuditLogSeed();

test.describe('스크롤 위치 유지 — 운영 감사 로그 필터', () => {
  test('검색어 입력(디바운스) 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    await page.goto('/ops/audit');
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '감사 로그 시드 데이터 부족');
    const searchInput = page.getByPlaceholder(/검색/i).first();
    const beforeScroll = await scrollToRevealing(page, searchInput, 400);
    const beforeHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    // 감사 로그 검색은 클라이언트 필터(actor.name/email/target_id)다
    // (`AuditLogClient.tsx:228-233`). 시드 로그의 작성자 이메일로 검색해야 목록이
    // 남는다 — 0건이 되면 문서가 짧아져 아래 높이 가드에 걸려 다시 skip 된다.
    //
    // ⚠️ **이 케이스의 감지력은 약하다** (2026-07-30 결함 주입으로 확인).
    // `updateParams` 의 `{ scroll: false }` 를 지워도 스크롤이 튀지 않아 테스트가 통과한다
    // — 쿼리를 **추가**하는 `router.replace` 는 Next.js 가 스크롤을 건드리지 않기 때문이다
    // (쿼리를 **제거**하는 초기화 경로는 정상적으로 잡힌다 → 아래 두 번째 테스트).
    // 즉 이 테스트는 회귀 감시라기보다 "이 경로에선 점프가 안 난다"의 확인에 가깝다.
    await searchInput.fill(process.env.E2E_OPS_ADMIN_EMAIL ?? '');
    await page.waitForURL(/search=/, { timeout: 5_000 });
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

    const afterHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const afterScroll = await page.evaluate(() => window.scrollY);

    // 콘텐츠 높이가 크게 줄어든 경우(검색 결과 적음) 스크롤 클램프는 브라우저
    // 기본 동작이므로 본 회귀 검증의 관심사가 아님 → skip.
    test.skip(
      beforeHeight - afterHeight > 200,
      `검색으로 콘텐츠 높이가 크게 감소(${beforeHeight}→${afterHeight}) — scrollY 자동 클램프는 의도된 동작`
    );

    expect(
      Math.abs(afterScroll - beforeScroll),
      `스크롤 위치 변동이 50px 초과: ${beforeScroll} → ${afterScroll} (page height ${beforeHeight}→${afterHeight})`
    ).toBeLessThan(50);
  });

  test('필터 초기화 시 스크롤 위치 유지', async ({ opsPage: page }) => {
    // 두 조건을 동시에 만족해야 한다:
    //   ① 목록이 남아야 스크롤이 생긴다 (0건이 되는 `search=foo` 로는 안 된다)
    //   ② "필터 초기화" 버튼이 떠야 한다 — `hasFilters` 는
    //      `action||target||user||start||end` 만 보고 **`search` 는 세지 않는다**
    //      (`AuditLogClient.tsx:328`). 그래서 `search` 가 아니라 `target` 으로 진입한다.
    await page.goto(`/ops/audit?target=${encodeURIComponent(AUDIT_TARGET_TYPE)}`);
    await page.waitForLoadState('networkidle');

    test.skip(!(await isScrollable(page)), '감사 로그 시드 데이터 부족');

    const resetButton = page.getByRole('button', { name: /초기화|리셋/ }).first();
    const hasReset = await resetButton.isVisible().catch(() => false);
    test.skip(!hasReset, '초기화 버튼 미노출');

    await scrollToRevealing(page, resetButton, 400);

    await expectScrollPreserved(
      page,
      async () => {
        await resetButton.click();
      },
      async () => {
        await expect(page).toHaveURL('/ops/audit');
      }
    );
  });
});
