import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateLLMMatchingRecommendations } from '@/lib/services/matching';
import { matchingGenerateSchema } from '@/lib/schemas/matching';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    // 역할 확인
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    // Zod 입력 검증
    const body = await request.json();
    const parsed = matchingGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: '입력 데이터가 올바르지 않습니다.' }, { status: 400 });
    }

    const { projectId, topN, preserveStatus } = parsed.data;

    // LLM 기반 매칭 추천 생성
    const recommendations = await generateLLMMatchingRecommendations(projectId, user.id, {
      topN,
      preserveStatus,
    });

    return NextResponse.json({
      success: true,
      data: { recommendations },
    });
  } catch (error) {
    console.error('[Matching API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '매칭 추천 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
