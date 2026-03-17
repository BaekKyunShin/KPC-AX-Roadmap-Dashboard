'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consultantProfileSchema } from '@/lib/schemas/user';
import { PG_UNIQUE_VIOLATION, SUPABASE_NO_ROWS } from '@/lib/constants/database';
import { revalidateTag } from 'next/cache';
import { CACHE_TAG_CONSULTANT_FILTERS, FILTER_CACHE_TTL_SECONDS } from '@/lib/constants/cache';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';

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
 * 컨설턴트 프로필 저장
 * 회원가입 2단계: 프로필 정보 입력
 */
export async function saveConsultantProfile(formData: FormData): Promise<SimpleActionResult> {
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
      if (insertError.code === PG_UNIQUE_VIOLATION) {
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

    revalidateTag(CACHE_TAG_CONSULTANT_FILTERS, { expire: FILTER_CACHE_TTL_SECONDS });

    return {
      success: true,
    };
  } catch (error: unknown) {
    console.error('[saveConsultantProfile Error]', error);
    return {
      success: false,
      error: '프로필 저장에 실패했습니다. 다시 시도해주세요.',
    };
  }
}

/**
 * 컨설턴트 프로필 조회
 * 현재 로그인한 사용자의 프로필 조회
 */
export async function fetchConsultantProfile(): Promise<ActionResult<{ profile: unknown }>> {
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
      if (profileError.code === SUPABASE_NO_ROWS) {
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
    console.error('[fetchConsultantProfile Error]', error);
    return {
      success: false,
      error: '프로필 조회에 실패했습니다. 다시 시도해주세요.',
    };
  }
}

/**
 * 컨설턴트 프로필 수정
 * 승인 대기 상태에서도 본인 프로필 수정 가능
 */
export async function updateConsultantProfile(formData: FormData): Promise<SimpleActionResult> {
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

    revalidateTag(CACHE_TAG_CONSULTANT_FILTERS, { expire: FILTER_CACHE_TTL_SECONDS });

    return {
      success: true,
    };
  } catch (error: unknown) {
    console.error('[updateConsultantProfile Error]', error);
    return {
      success: false,
      error: '프로필 수정에 실패했습니다. 다시 시도해주세요.',
    };
  }
}
