'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { changePasswordSchema, deleteAccountSchema } from '@/lib/schemas/user';
import { createAuditLog } from '@/lib/services/audit';
import { redirect } from 'next/navigation';
import { translateAuthError } from './auth-utils';
import type { SimpleActionResult } from '@/lib/types/action-result';

/**
 * 현재 세션 사용자를 확인하고 비밀번호를 검증하여 본인 확인
 * changePassword, deleteAccount 등 비밀번호 재확인이 필요한 액션에서 공통 사용
 */
async function getVerifiedUser(password: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      verified: false as const,
      error: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  });

  if (error) {
    return {
      verified: false as const,
      error: '비밀번호가 올바르지 않습니다.',
    };
  }

  return { verified: true as const, user, supabase };
}

/**
 * 비밀번호 변경
 * 1. 세션 확인
 * 2. Zod 검증
 * 3. 현재 비밀번호 검증
 * 4. 새 비밀번호 설정 (admin client — 세션 토큰 의존성 제거)
 *
 * NOTE: 과거에는 sessionful client 의 auth.updateUser({password}) 를 호출했으나,
 *   getVerifiedUser 내부의 signInWithPassword 가 cookie 갱신에 실패하면 (server.ts 의
 *   setAll 이 try/catch 로 silent 통과) 후속 updateUser 가 stale 토큰으로 실패하며
 *   매핑되지 않은 generic 오류가 fallback 메시지로 노출되었다. 본인 검증은 이미
 *   signInWithPassword 로 통과했으므로 admin.updateUserById 를 사용해 토큰 의존성을
 *   제거한다 (admin client = RLS 우회·내부 작업 전용).
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<SimpleActionResult> {
  // 1. 입력 검증
  const validation = changePasswordSchema.safeParse({
    currentPassword,
    newPassword,
    confirmPassword,
  });
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  // 2. 세션 확인 + 현재 비밀번호 검증
  const auth = await getVerifiedUser(currentPassword);
  if (!auth.verified) {
    return { success: false, error: auth.error };
  }

  // 3. admin client 로 새 비밀번호 설정 (세션 토큰 의존성 없음)
  let adminSupabase;
  try {
    adminSupabase = createAdminClient();
  } catch {
    return {
      success: false,
      error: '서버 설정 오류입니다. 관리자에게 문의해주세요.',
    };
  }

  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(auth.user.id, {
    password: newPassword,
  });

  if (updateError) {
    return { success: false, error: translateAuthError(updateError.message) };
  }

  // 비번 변경 성공 직후 명시적 signOut.
  // Why: Supabase 가 비번 변경 시 기존 세션을 무효화하지만 클라이언트 쿠키는 stale 상태로 남아
  //   미들웨어 ↔ 로그인 페이지 무한 리다이렉트(ERR_TOO_MANY_REDIRECTS)를 유발한다.
  //   서버에서 쿠키를 즉시 정리하면 클라이언트의 router.replace('/login') 이 깔끔하게 동작한다.
  await auth.supabase.auth.signOut();

  return { success: true };
}

/**
 * 회원탈퇴 처리
 * 1. 세션 확인
 * 2. 비밀번호 검증 (본인 확인)
 * 3. 감사로그 기록 (익명화 전)
 * 4. users 테이블 개인정보 익명화 + 상태 WITHDRAWN
 * 5. Auth 사용자 차단 (이메일 변경 + ban)
 * 6. 로그아웃 + 리다이렉트
 */
export async function deleteAccount(
  password: string,
  confirmText: string
): Promise<SimpleActionResult> {
  // 1. 입력 검증
  const validation = deleteAccountSchema.safeParse({ password, confirmText });
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  // 2. 세션 확인 + 비밀번호 검증
  const auth = await getVerifiedUser(password);
  if (!auth.verified) {
    return { success: false, error: auth.error };
  }

  const { user, supabase } = auth;

  // 3. 감사로그 기록 (익명화 전에 기록해야 사용자 정보 유지)
  await createAuditLog({
    actorUserId: user.id,
    action: 'USER_WITHDRAW',
    targetType: 'user',
    targetId: user.id,
    meta: { email: user.email },
  });

  // 4. users 테이블 개인정보 익명화
  const adminSupabase = createAdminClient();
  const anonymizedEmail = `withdrawn_${user.id.slice(0, 8)}@deleted.local`;

  const { error: updateError } = await adminSupabase
    .from('users')
    .update({
      name: '탈퇴한 사용자',
      email: anonymizedEmail,
      phone: null,
      status: 'WITHDRAWN',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('[deleteAccount Error] 사용자 테이블 업데이트:', updateError);
    return {
      success: false,
      error: '계정 삭제 처리 중 오류가 발생했습니다. 관리자에게 문의해주세요.',
    };
  }

  // 5. Auth 사용자 차단 (이메일 변경 + ban)
  // 이메일 변경: 원래 이메일 해방 → 재가입 가능
  // ban: 기존 토큰으로 접근 차단
  const { error: banError } = await adminSupabase.auth.admin.updateUserById(user.id, {
    email: anonymizedEmail,
    email_confirm: true,
    ban_duration: '876600h', // ~100년
  });

  if (banError) {
    console.error('[deleteAccount Error] Auth 차단:', banError);
    // users 테이블은 이미 익명화됨 — 치명적이지 않으므로 계속 진행
  }

  // 6. 로그아웃 + 리다이렉트
  await supabase.auth.signOut();
  redirect('/login');
}
