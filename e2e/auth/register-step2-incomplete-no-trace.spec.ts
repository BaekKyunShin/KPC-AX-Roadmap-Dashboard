// e2e/auth/register-step2-incomplete-no-trace.spec.ts
//
// 결함 #004 옵션 C 회귀 방지:
// 컨설턴트 회원가입에서 Step 1 만 통과하고 Step 2 화면을 떠난 경우,
// auth.users 와 public.users 에 어떤 흔적도 남지 않아야 한다.
//
// 옵션 C 적용 전(=결함): Step 1 의 "다음" 클릭 시 즉시 auth.users + users INSERT.
// 옵션 C 적용 후: Step 1 은 클라이언트 state 에만 보관, Step 2 까지 완료해야 비로소 가입.

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

test.describe('#004 옵션 C: Step2 이탈 시 DB 잔재 없음', () => {
  // timestamp 로 매 실행마다 unique email — 병렬·재시도에서도 충돌 없음
  const testEmail = `audit-004-${Date.now()}@e2e.local`;

  test.afterAll(async () => {
    // 테스트 후 정리 — 정상 동작 시 no-op (잔재가 없을 것)
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', testEmail)
      .maybeSingle();
    if (data?.id) {
      await supabase.auth.admin.deleteUser(data.id);
    }
    // auth.users 에 동일 이메일이 잔재한다면 정리
    const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authMatch = authList?.users.find((u) => u.email === testEmail);
    if (authMatch?.id) {
      await supabase.auth.admin.deleteUser(authMatch.id);
    }
  });

  test('Step1 통과 후 Step2 미완료 → users / auth.users 모두 비어있음', async ({ page }) => {
    // beforeunload 경고가 페이지 닫기를 차단하지 않도록 자동 dismiss
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/register');
    await expect(page.getByText('기본 정보 입력')).toBeVisible({ timeout: 10_000 });

    // Step 1 입력 (CONSULTANT 기본 선택 상태)
    await page.locator('[name="email"]').fill(testEmail);
    await page.locator('[name="name"]').fill('이탈 테스터');
    await page.locator('[name="phone"]').fill('010-0000-0000');
    await page.locator('[name="password"]').fill('Test1234');
    await page.locator('[name="confirmPassword"]').fill('Test1234');
    await page.locator('#agreeToTerms').click();
    await page.getByRole('button', { name: /다음/ }).click();

    // Step 2 화면 진입 확인 (ProfileForm 의 카드 제목)
    await expect(page.getByText(/AI 훈련 가능 산업|프로필 등록/)).toBeVisible({
      timeout: 10_000,
    });

    // 핵심 검증: 이 시점에 public.users 에 잔재 없어야 함
    const { data: userRow } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', testEmail)
      .maybeSingle();
    expect(userRow).toBeNull();

    // auth.users 에도 잔재 없어야 함
    const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const authUser = authList?.users.find((u) => u.email === testEmail);
    expect(authUser).toBeUndefined();
  });
});
