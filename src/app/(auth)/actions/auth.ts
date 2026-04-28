'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { registerSchema, loginSchema, consultantProfileSchema } from '@/lib/schemas/user';
import { redirect } from 'next/navigation';
import { translateAuthError } from './auth-utils';
import { PG_UNIQUE_VIOLATION, PG_TABLE_NOT_FOUND } from '@/lib/constants/database';
import { getDefaultRouteForRole } from '@/lib/utils/role-routes';
import type { ActionResult } from '@/lib/types/action-result';

/**
 * 이메일 중복 사전 확인 (#004 옵션 C)
 * 회원가입 Step 1 → Step 2 전환 시 호출. DB 쓰기 없음.
 * public.users 에서 동일 이메일 존재 여부만 조회한다.
 */
const emailOnlySchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
});

export async function checkEmailAvailability(
  email: string,
): Promise<ActionResult<{ available: boolean }>> {
  const validation = emailOnlySchema.safeParse({ email });
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message };
  }

  let adminSupabase;
  try {
    adminSupabase = createAdminClient();
  } catch {
    return {
      success: false,
      error: '서버 설정 오류입니다. 관리자에게 문의해주세요.',
    };
  }

  const { data, error } = await adminSupabase
    .from('users')
    .select('id')
    .eq('email', validation.data.email)
    .maybeSingle();

  if (error) {
    console.error('[checkEmailAvailability Error]', error);
    return {
      success: false,
      error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    };
  }

  return { success: true, data: { available: data === null } };
}

/**
 * 회원가입 처리 (운영관리자 흐름 + 컨설턴트 fallback)
 * #004 옵션 C 적용 후: 컨설턴트 흐름은 registerConsultantWithProfile 로 분리.
 * 본 함수는 OPS_ADMIN 가입 (Step 2 없음, Step 1 만 atomic 처리) 에 주로 사용.
 *
 * 1. Supabase Auth로 사용자 생성
 * 2. users 테이블에 프로필 생성 (역할에 따라 USER_PENDING 또는 OPS_ADMIN_PENDING)
 * 3. consultant_profiles 는 별도 액션 (saveConsultantProfile / registerConsultantWithProfile) 으로 처리
 */
export async function registerUser(formData: FormData): Promise<ActionResult<{ userId: string; registerType: string; needsLogin?: boolean }>> {
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
    console.error('[registerUser Error] 프로필 생성:', profileError);
    // 롤백: Auth 사용자 삭제
    await adminSupabase.auth.admin.deleteUser(authData.user.id);

    // 구체적인 에러 메시지 처리
    if (profileError.code === PG_UNIQUE_VIOLATION) {
      return {
        success: false,
        error: '이미 등록된 이메일입니다. 로그인 페이지에서 로그인해주세요.',
      };
    }
    if (profileError.code === PG_TABLE_NOT_FOUND) {
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
 * 성공 시 역할 기반 기본 랜딩 경로를 반환하여 리다이렉트 체인을 제거합니다.
 */
export async function loginUser(
  formData: FormData,
): Promise<ActionResult<{ defaultRoute: string }>> {
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

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      error: '이메일 또는 비밀번호가 올바르지 않습니다.',
    };
  }

  // 역할 조회 → 기본 랜딩 경로 계산 (리다이렉트 체인 제거)
  let defaultRoute = '/dashboard';
  if (authData.user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .single();
    defaultRoute = getDefaultRouteForRole(profile?.role);
  }

  return {
    success: true,
    data: { defaultRoute },
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
export async function fetchCurrentUser() {
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

// =============================================================================
// 컨설턴트 회원가입 atomic 처리 (#004 옵션 C)
// =============================================================================

function parseConsultantProfileFromFormData(formData: FormData) {
  const safeJson = (key: string): string[] => {
    const raw = formData.get(key) as string | null;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return {
    expertise_domains: safeJson('expertise_domains'),
    available_industries: safeJson('available_industries'),
    sub_industries: safeJson('sub_industries'),
    teaching_levels: safeJson('teaching_levels'),
    coaching_methods: safeJson('coaching_methods'),
    skill_tags: safeJson('skill_tags'),
    years_of_experience: parseInt((formData.get('years_of_experience') as string) || '0', 10),
    affiliation: ((formData.get('affiliation') as string) || '').trim(),
    representative_experience: (formData.get('representative_experience') as string) || '',
    portfolio: (formData.get('portfolio') as string) || '',
    strengths_constraints: (formData.get('strengths_constraints') as string) || '',
  };
}

/**
 * 컨설턴트 회원가입 atomic 처리 (#004 옵션 C)
 *
 * Step 2 까지 완료한 시점에 다음을 한 번에 수행:
 *   1) Step1 + Step2 Zod 검증
 *   2) auth.users 생성
 *   3) public.users 생성 (role=USER_PENDING)
 *   4) consultant_profiles 생성
 *   5) 자동 로그인
 *
 * 어느 단계에서든 실패하면 Auth user 삭제 → ON DELETE CASCADE 로
 * users / consultant_profiles 도 자동 정리. 좀비 사용자 발생 차단.
 */
export async function registerConsultantWithProfile(
  step1FormData: FormData,
  profileFormData: FormData,
): Promise<ActionResult<{ userId: string; needsLogin?: boolean }>> {
  // 1. Step1 검증 (registerType 은 CONSULTANT 로 고정 — 본 함수는 컨설턴트 전용)
  const step1Raw = {
    email: step1FormData.get('email') as string,
    password: step1FormData.get('password') as string,
    confirmPassword: step1FormData.get('confirmPassword') as string,
    name: step1FormData.get('name') as string,
    phone: (step1FormData.get('phone') as string) || '',
    registerType: 'CONSULTANT' as const,
    agreeToTerms: step1FormData.get('agreeToTerms') === 'true',
  };
  const step1Validation = registerSchema.safeParse(step1Raw);
  if (!step1Validation.success) {
    return { success: false, error: step1Validation.error.errors[0].message };
  }

  // 2. Step2 검증
  const profileRaw = parseConsultantProfileFromFormData(profileFormData);
  const profileValidation = consultantProfileSchema.safeParse(profileRaw);
  if (!profileValidation.success) {
    return { success: false, error: profileValidation.error.errors[0].message };
  }

  const { email, password, name, phone } = step1Validation.data;

  // 3. Admin 클라이언트
  let adminSupabase;
  try {
    adminSupabase = createAdminClient();
  } catch {
    return {
      success: false,
      error: '서버 설정 오류입니다. 관리자에게 문의해주세요.',
    };
  }

  // 4. Auth user 생성
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) {
    if (
      authError.message?.includes('already been registered') ||
      authError.message?.includes('already exists')
    ) {
      return {
        success: false,
        error: '이미 등록된 이메일입니다. 1단계부터 다시 시도해주세요.',
      };
    }
    return { success: false, error: translateAuthError(authError.message) };
  }
  if (!authData.user) {
    return {
      success: false,
      error: '사용자 생성에 실패했습니다. 다시 시도해주세요.',
    };
  }

  const userId = authData.user.id;

  // 5. users INSERT — 실패 시 Auth user 삭제
  const { error: userInsertError } = await adminSupabase.from('users').insert({
    id: userId,
    email,
    name,
    phone: phone || null,
    role: 'USER_PENDING',
    status: 'ACTIVE',
  });
  if (userInsertError) {
    console.error('[registerConsultantWithProfile] users INSERT 실패:', userInsertError);
    await adminSupabase.auth.admin.deleteUser(userId);
    if (userInsertError.code === PG_UNIQUE_VIOLATION) {
      return {
        success: false,
        error: '이미 등록된 이메일입니다. 1단계부터 다시 시도해주세요.',
      };
    }
    return {
      success: false,
      error: '회원 정보 저장에 실패했습니다. 다시 시도해주세요.',
    };
  }

  // 6. consultant_profiles INSERT — 실패 시 Auth user 삭제 (users 는 CASCADE 정리)
  const { error: profileInsertError } = await adminSupabase
    .from('consultant_profiles')
    .insert({
      user_id: userId,
      ...profileValidation.data,
      sub_industries: profileValidation.data.sub_industries || [],
    });
  if (profileInsertError) {
    console.error(
      '[registerConsultantWithProfile] consultant_profiles INSERT 실패:',
      profileInsertError,
    );
    await adminSupabase.auth.admin.deleteUser(userId);
    return {
      success: false,
      error: '프로필 저장에 실패했습니다. 다시 시도해주세요.',
    };
  }

  // 7. 자동 로그인 — 실패해도 가입은 성공
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    return { success: true, data: { userId, needsLogin: true } };
  }

  return { success: true, data: { userId } };
}
