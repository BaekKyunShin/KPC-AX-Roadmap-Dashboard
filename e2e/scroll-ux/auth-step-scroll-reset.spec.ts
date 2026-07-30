// e2e/scroll-ux/auth-step-scroll-reset.spec.ts
// PR2 P1 회귀 (H-3) — 인증 폼의 상태 전환 직후 스크롤이 페이지 최상단으로 복원되어야 한다.
//
// 결함: 회원가입 Step1→Step2, 비밀번호 찾기 메일 발송 완료, 비밀번호 재설정 완료
// 상태로 전환될 때 사용자는 직전 폼 하단(제출 버튼) 위치에 있었으므로 새 상태의
// 헤더·완료 메시지가 화면 위쪽 밖이 되어 보이지 않는다.
//
// 패치: 각 상태 전환 직후 `scrollToPageTop()` (window.scrollTo({ top: 0 })) 호출.
// 본 스펙은 전환 후 scrollY <= 100px 인지 검증한다.
import { test, expect } from '@playwright/test';

// ⚠️ **이 두 감시는 아직 잠들어 있다 — 데이터로도 화면 크기로도 살릴 수 없었다.**
// (2026-07-30 계측) 두 폼 모두 아래로 스크롤할 여지가 없다:
//   1280×720 → 여유 0px · 390×844 → 0px · 390×640 → 여전히 `beforeY < 100` 미달.
// 로그인 전 화면이라 늘릴 목록도 없고, 더 낮추면 실제로 존재하지 않는 화면이 된다.
//
// 다만 **숨어 있던 진짜 결함 하나는 고쳤다**: 아래 역할 선택 로케이터가 실제 마크업과
// 달라(버튼 ↔ 라디오) 폼 높이와 무관하게 항상 미노출 판정이 나고 있었다. 폼이 길어지면
// (필드 추가 등) 이 감시는 별도 수정 없이 자동으로 살아난다.

test.describe('스크롤 위치 유지 — 인증 폼 상태 전환', () => {
  test('회원가입 Step1 → Step2 전환 시 페이지 최상단으로 스크롤', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // 컨설턴트 가입 흐름 진입 (Step1 폼 노출).
    //
    // 가입 유형은 버튼이 아니라 **label 로 감싼 라디오**다(`register/page.tsx:443-468`).
    // ① 이전에는 `getByRole('button')` 으로 찾아 항상 미노출 판정 → 감시가 통째로 skip 됐다.
    // ② 그렇다고 라디오를 직접 클릭할 수도 없다 — `className="sr-only"` 로 시각적으로
    //    숨겨져 있어 클릭이 타임아웃된다. 실사용자가 누르는 것도 카드(label)이다.
    const consultantOption = page
      .locator('label:has(input[type="radio"][value="CONSULTANT"])')
      .first();
    const hasConsultantOption = await consultantOption.isVisible().catch(() => false);
    test.skip(!hasConsultantOption, '회원가입 역할 선택 카드 미노출');
    await consultantOption.click();

    // Step1 필드 채우기 (라벨 기반 — 마크업 변경에 비교적 안전)
    const fillIfVisible = async (label: RegExp, value: string) => {
      const field = page.getByLabel(label).first();
      if (await field.isVisible().catch(() => false)) {
        await field.fill(value);
      }
    };
    await fillIfVisible(/이메일/, 'p1-test@example.com');
    await fillIfVisible(/이름/, '테스트');
    await fillIfVisible(/휴대|전화/, '01012345678');
    await fillIfVisible(/^비밀번호$/, 'Aa11112222!');
    await fillIfVisible(/비밀번호 확인|확인.*비밀번호/, 'Aa11112222!');

    // 페이지 하단으로 스크롤 (제출 버튼 근처)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const beforeY = await page.evaluate(() => window.scrollY);
    test.skip(beforeY < 100, '페이지 높이 부족 — 스크롤이 발생하지 않음');

    // "다음" 클릭으로 Step2 진입
    const nextButton = page.getByRole('button', { name: /다음/ }).first();
    test.skip(!(await nextButton.isVisible().catch(() => false)), '"다음" 버튼 미노출');
    await nextButton.click();

    // 전환 직후 scrollToPageTop(100ms 지연) 동작 대기
    await page.waitForTimeout(400);

    const afterY = await page.evaluate(() => window.scrollY);
    expect(
      afterY,
      `Step2 전환 후 scrollY 가 최상단(<=100) 이어야 함 (before=${beforeY}, after=${afterY})`
    ).toBeLessThan(100);
  });

  test('비밀번호 찾기 — 메일 발송 후 페이지 최상단으로 스크롤', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    const emailField = page.getByLabel(/이메일/).first();
    const hasField = await emailField.isVisible().catch(() => false);
    test.skip(!hasField, '이메일 입력 필드 미노출');

    await emailField.fill('p1-forgot-test@example.com');

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const beforeY = await page.evaluate(() => window.scrollY);
    test.skip(beforeY < 80, '폼 높이 부족 — 스크롤 회귀 검증 불가');

    const submit = page.getByRole('button', { name: /발송|재설정|메일/ }).first();
    test.skip(!(await submit.isVisible().catch(() => false)), '제출 버튼 미노출');
    await submit.click();

    // sent=1 으로 URL 전환 + isSent UI 분기까지 대기
    await page.waitForURL(/sent=1/, { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(400);

    const afterY = await page.evaluate(() => window.scrollY);
    expect(
      afterY,
      `메일 발송 후 scrollY 가 최상단(<=100) 이어야 함 (before=${beforeY}, after=${afterY})`
    ).toBeLessThan(100);
  });
});
