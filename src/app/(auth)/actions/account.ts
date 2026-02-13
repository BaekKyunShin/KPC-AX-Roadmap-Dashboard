'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { changePasswordSchema, deleteAccountSchema } from '@/lib/schemas/user';
import { createAuditLog } from '@/lib/services/audit';
import { redirect } from 'next/navigation';
import { translateAuthError } from './auth-utils';
type ActionResult = { success: boolean; error?: string; data?: Record<string, unknown> };

/**
 * 현재 세션 사용자를 확인하고 비밀번호를 검증하여 본인 확인
 * changePassword, deleteAccount 등 비밀번호 재확인이 필요한 액션에서 공통 사용
 */
async function getVerifiedUser(password: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
 * 4. 새 비밀번호 설정
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<ActionResult> {
  // 1. 입력 검증
  const validation = changePasswordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  // 2. 세션 확인 + 현재 비밀번호 검증
  const auth = await getVerifiedUser(currentPassword);
  if (!auth.verified) {
    return { success: false, error: auth.error };
  }

  // 3. 새 비밀번호 설정
  const { error: updateError } = await auth.supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { success: false, error: translateAuthError(updateError.message) };
  }

  return { success: true };
}

/**
 * 회원탈퇴 처리
 * 1. 세션 확인
 * 2. 비밀번호 검증 (본인 확인)
 * 3. 감사 로그 기록 (익명화 전)
 * 4. users 테이블 개인정보 익명화 + 상태 WITHDRAWN
 * 5. Auth 사용자 차단 (이메일 변경 + ban)
 * 6. 로그아웃 + 리다이렉트
 */
export async function deleteAccount(
  password: string,
  confirmText: string
): Promise<ActionResult> {
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

  // 3. 감사 로그 기록 (익명화 전에 기록해야 사용자 정보 유지)
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
    console.error('[Delete Account - Users Update Error]', updateError);
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
    console.error('[Delete Account - Auth Ban Error]', banError);
    // users 테이블은 이미 익명화됨 — 치명적이지 않으므로 계속 진행
  }

  // 6. 로그아웃 + 리다이렉트
  await supabase.auth.signOut();
  redirect('/login');
}
