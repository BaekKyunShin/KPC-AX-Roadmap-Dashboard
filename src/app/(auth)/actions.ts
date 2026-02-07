'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { registerSchema, loginSchema, consultantProfileSchema, changePasswordSchema, deleteAccountSchema } from '@/lib/schemas/user';
import { createAuditLog } from '@/lib/services/audit';
import { redirect } from 'next/navigation';

/**
 * Supabase Auth 에러 메시지를 한글로 변환
 */
function translateAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    // 이메일 관련
    'Email rate limit exceeded': '이메일 전송 한도를 초과했습니다. 5분 후 다시 시도해주세요.',
    'User already registered': '이미 등록된 이메일입니다. 로그인 페이지에서 로그인해주세요.',
    'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.',
    'Unable to validate email address: invalid format': '유효하지 않은 이메일 형식입니다.',
    'invalid email': '유효하지 않은 이메일 형식입니다.',

    // 비밀번호 관련
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
    'Password should be at least 8 characters': '비밀번호는 최소 8자 이상이어야 합니다.',
    'Signup requires a valid password': '유효한 비밀번호를 입력하세요.',
    'New password should be different from the old password': '새 비밀번호는 기존 비밀번호와 달라야 합니다.',

    // 로그인 관련
    'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'invalid claim: missing sub claim': '인증 정보가 올바르지 않습니다. 다시 로그인해주세요.',

    // Rate Limit 관련
    'For security purposes, you can only request this once every 60 seconds': '보안을 위해 60초에 한 번만 요청할 수 있습니다.',
    'rate limit': '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',

    // 토큰/링크 관련
    'Email link is invalid or has expired': '이메일 링크가 유효하지 않거나 만료되었습니다.',
    'Token has expired or is invalid': '토큰이 만료되었거나 유효하지 않습니다.',

    // 기타
    'Anonymous sign-ins are disabled': '익명 로그인이 비활성화되어 있습니다.',
    'Signups not allowed for this instance': '회원가입이 비활성화되어 있습니다. 관리자에게 문의하세요.',
    'Database error': '데이터베이스 오류가 발생했습니다. 관리자에게 문의하세요.',
  };

  // 정확히 일치하는 에러 메시지가 있으면 한글로 반환
  if (errorMap[message]) {
    return errorMap[message];
  }

  // 부분 일치 검색 (소문자로 비교)
  const lowerMessage = message.toLowerCase();
  for (const [key, value] of Object.entries(errorMap)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value;
    }
  }

  // 일치하는 것이 없으면 사용자 친화적 메시지 반환
  // 원본 에러는 서버 로그에만 기록
  console.error('[Auth Error - 미번역]', message);
  return '일시적인 오류가 발생했습니다. 잠시 후 다시 시도하거나, 문제가 지속되면 관리자에게 문의해주세요.';
}

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

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
 * JSON 문자열을 안전하게 파싱하여 배열로 반환
 */
function parseJsonArray(jsonStr: string | null): string[] {
  if (!jsonStr) return [];
  try {
    return JSON.parse(jsonStr);
  } catch {
    return [];
  }
}

/**
 * 컨설턴트 프로필 폼 데이터 파싱
 */
function parseConsultantProfileFormData(formData: FormData) {
  return {
    expertise_domains: parseJsonArray(formData.get('expertise_domains') as string | null),
    available_industries: parseJsonArray(formData.get('available_industries') as string | null),
    sub_industries: parseJsonArray(formData.get('sub_industries') as string | null),
    teaching_levels: parseJsonArray(formData.get('teaching_levels') as string | null),
    coaching_methods: parseJsonArray(formData.get('coaching_methods') as string | null),
    skill_tags: parseJsonArray(formData.get('skill_tags') as string | null),
    years_of_experience: parseInt(formData.get('years_of_experience') as string || '0', 10),
    affiliation: ((formData.get('affiliation') as string) || '').trim(),
    representative_experience: (formData.get('representative_experience') as string) || '',
    portfolio: (formData.get('portfolio') as string) || '',
    strengths_constraints: (formData.get('strengths_constraints') as string) || '',
  };
}

/**
 * 회원가입 처리
 * 1. Supabase Auth로 사용자 생성
 * 2. users 테이블에 프로필 생성 (역할에 따라 USER_PENDING 또는 OPS_ADMIN_PENDING)
 * 3. 컨설턴트인 경우 consultant_profiles 테이블에 프로필 생성
 */
export async function registerUser(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  // 폼 데이터 파싱
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    name: formData.get('name') as string,
    phone: formData.get('phone') as string,
    registerType: (formData.get('registerType') as string) || 'CONSULTANT',
    agreeToTerms: formData.get('agreeToTerms') === 'true',
  };

  // 서버 검증
  const validation = registerSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0].message,
    };
  }

  const { email, password, name, phone, registerType } = validation.data;

  // 역할 결정: 컨설턴트는 USER_PENDING, 운영관리자는 OPS_ADMIN_PENDING
  const role = registerType === 'OPS_ADMIN' ? 'OPS_ADMIN_PENDING' : 'USER_PENDING';

  // Admin API로 직접 사용자 생성 (rate limit 우회)
  let adminSupabase;
  try {
    adminSupabase = createAdminClient();
  } catch {
    return {
      success: false,
      error: '서버 설정 오류입니다. 관리자에게 문의해주세요.',
    };
  }

  // Admin API로 사용자 생성
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // 이메일 인증 건너뛰기
  });

  if (authError) {
    // 이미 등록된 이메일인 경우
    if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
      return {
        success: false,
        error: '이미 등록된 이메일입니다. 로그인 페이지에서 로그인해주세요.',
      };
    }
    return {
      success: false,
      error: translateAuthError(authError.message),
    };
  }

  if (!authData.user) {
    return {
      success: false,
      error: '사용자 생성에 실패했습니다. 다시 시도해주세요.',
    };
  }

  const { error: profileError } = await adminSupabase.from('users').insert({
    id: authData.user.id,
    email,
    name,
    phone: phone || null,
    role,
    status: 'ACTIVE',
  });

  if (profileError) {
    console.error('[Profile Insert Error]', profileError);
    // 롤백: Auth 사용자 삭제
    await adminSupabase.auth.admin.deleteUser(authData.user.id);

    // 구체적인 에러 메시지 처리
    if (profileError.code === '23505') {
      return {
        success: false,
        error: '이미 등록된 이메일입니다. 로그인 페이지에서 로그인해주세요.',
      };
    }
    if (profileError.code === '42P01') {
      return {
        success: false,
        error: '데이터베이스 테이블이 생성되지 않았습니다. 관리자에게 문의해주세요.',
      };
    }
    if (profileError.message?.includes('violates foreign key constraint')) {
      return {
        success: false,
        error: '회원 인증 정보 연결에 실패했습니다. 다시 시도해주세요.',
      };
    }

    return {
      success: false,
      error: '회원 정보 저장에 실패했습니다. 다시 시도해주세요.',
    };
  }

  // 회원가입 후 자동 로그인
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    // 로그인 실패해도 회원가입은 성공한 상태이므로 로그인 페이지로 유도
    return {
      success: true,
      data: { userId: authData.user.id, registerType, needsLogin: true },
    };
  }

  return {
    success: true,
    data: { userId: authData.user.id, registerType },
  };
}

/**
 * 컨설턴트 프로필 저장
 * 회원가입 2단계: 프로필 정보 입력
 */
export async function saveConsultantProfile(formData: FormData): Promise<ActionResult> {
  try {
    // 1. 현재 사용자 확인
    const supabase = await createClient();
    const { data: authData, error: userError } = await supabase.auth.getUser();

    if (userError || !authData?.user) {
      return {
        success: false,
        error: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
      };
    }

    const userId = authData.user.id;

    // 2. 폼 데이터 파싱 및 검증
    const rawData = parseConsultantProfileFormData(formData);
    const validation = consultantProfileSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0].message,
      };
    }

    // 3. Admin 클라이언트로 프로필 삽입
    const adminSupabase = createAdminClient();
    const { error: insertError } = await adminSupabase
      .from('consultant_profiles')
      .insert({
        user_id: userId,
        ...validation.data,
        sub_industries: validation.data.sub_industries || [],
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return {
          success: false,
          error: '이미 프로필이 등록되어 있습니다.',
        };
      }
      return {
        success: false,
        error: '프로필 저장에 실패했습니다. 다시 시도해주세요.',
      };
    }

    return {
      success: true,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return {
      success: false,
      error: `프로필 저장 중 오류: ${errorMessage}`,
    };
  }
}

/**
 * 컨설턴트 프로필 조회
 * 현재 로그인한 사용자의 프로필 조회
 */
export async function getConsultantProfile(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: authData, error: userError } = await supabase.auth.getUser();

    if (userError || !authData?.user) {
      return {
        success: false,
        error: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
      };
    }

    const userId = authData.user.id;
    const adminSupabase = createAdminClient();

    const { data: profile, error: profileError } = await adminSupabase
      .from('consultant_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // 프로필이 없는 경우
        return {
          success: true,
          data: { profile: null },
        };
      }
      return {
        success: false,
        error: '프로필 조회에 실패했습니다.',
      };
    }

    return {
      success: true,
      data: { profile },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return {
      success: false,
      error: `프로필 조회 중 오류: ${errorMessage}`,
    };
  }
}

/**
 * 컨설턴트 프로필 수정
 * 승인 대기 상태에서도 본인 프로필 수정 가능
 */
export async function updateConsultantProfile(formData: FormData): Promise<ActionResult> {
  try {
    // 1. 현재 사용자 확인
    const supabase = await createClient();
    const { data: authData, error: userError } = await supabase.auth.getUser();

    if (userError || !authData?.user) {
      return {
        success: false,
        error: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
      };
    }

    const userId = authData.user.id;

    // 2. 폼 데이터 파싱 및 검증
    const rawData = parseConsultantProfileFormData(formData);
    const validation = consultantProfileSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0].message,
      };
    }

    // 3. Admin 클라이언트로 프로필 업데이트
    const adminSupabase = createAdminClient();
    const { error: updateError } = await adminSupabase
      .from('consultant_profiles')
      .update({
        ...validation.data,
        sub_industries: validation.data.sub_industries || [],
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      return {
        success: false,
        error: '프로필 수정에 실패했습니다. 다시 시도해주세요.',
      };
    }

    return {
      success: true,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return {
      success: false,
      error: `프로필 수정 중 오류: ${errorMessage}`,
    };
  }
}

/**
 * 로그인 처리
 */
export async function loginUser(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  // 서버 검증
  const validation = loginSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0].message,
    };
  }

  const { email, password } = validation.data;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      error: '이메일 또는 비밀번호가 올바르지 않습니다.',
    };
  }

  return {
    success: true,
  };
}

/**
 * 로그아웃 처리
 */
export async function logoutUser(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * 현재 사용자 정보 조회 (역할 포함)
 */
export async function getCurrentUser() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

/**
 * 사용자 승인/정지 (OPS_ADMIN/SYSTEM_ADMIN 전용)
 * - USER_PENDING → CONSULTANT_APPROVED (컨설턴트 승인, OPS_ADMIN/SYSTEM_ADMIN 가능)
 * - OPS_ADMIN_PENDING → OPS_ADMIN (운영관리자 승인, SYSTEM_ADMIN만 가능)
 */
export async function updateUserStatus(
  targetUserId: string,
  action: 'approve' | 'suspend' | 'reactivate',
  reason?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      error: '인증되지 않은 사용자입니다.',
    };
  }

  // 현재 사용자 역할 확인
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    return {
      success: false,
      error: '권한이 없습니다.',
    };
  }

  // admin 클라이언트로 상태 변경
  const adminSupabase = createAdminClient();

  // 대상 사용자 정보 조회
  const { data: targetUser } = await adminSupabase
    .from('users')
    .select('role')
    .eq('id', targetUserId)
    .single();

  if (!targetUser) {
    return {
      success: false,
      error: '대상 사용자를 찾을 수 없습니다.',
    };
  }

  let updateData: { role?: string; status?: string } = {};
  let auditAction: 'USER_APPROVE' | 'USER_SUSPEND' | 'USER_REACTIVATE';

  switch (action) {
    case 'approve':
      // 운영관리자 승인은 SYSTEM_ADMIN만 가능
      if (targetUser.role === 'OPS_ADMIN_PENDING') {
        if (currentUser.role !== 'SYSTEM_ADMIN') {
          return {
            success: false,
            error: '운영관리자 승인은 시스템 관리자만 가능합니다.',
          };
        }
        updateData = { role: 'OPS_ADMIN' };
      } else if (targetUser.role === 'USER_PENDING') {
        updateData = { role: 'CONSULTANT_APPROVED' };
      } else {
        return {
          success: false,
          error: '승인할 수 없는 사용자입니다.',
        };
      }
      auditAction = 'USER_APPROVE';
      break;
    case 'suspend':
      updateData = { status: 'SUSPENDED' };
      auditAction = 'USER_SUSPEND';
      break;
    case 'reactivate':
      updateData = { status: 'ACTIVE' };
      auditAction = 'USER_REACTIVATE';
      break;
  }

  const { error } = await adminSupabase
    .from('users')
    .update(updateData)
    .eq('id', targetUserId);

  if (error) {
    await createAuditLog({
      actorUserId: user.id,
      action: auditAction,
      targetType: 'user',
      targetId: targetUserId,
      meta: { reason },
      success: false,
      errorMessage: error.message,
    });

    return {
      success: false,
      error: `상태 변경 실패: ${error.message}`,
    };
  }

  // 감사 로그 기록
  await createAuditLog({
    actorUserId: user.id,
    action: auditAction,
    targetType: 'user',
    targetId: targetUserId,
    meta: { reason },
  });

  return {
    success: true,
  };
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
