'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { registerSchema, loginSchema } from '@/lib/schemas/user';
import { redirect } from 'next/navigation';

/**
 * Supabase Auth 에러 메시지를 한글로 변환
 */
export function translateAuthError(message: string): string {
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
