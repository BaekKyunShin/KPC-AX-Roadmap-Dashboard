import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateLLMMatchingRecommendations } from '@/lib/services/matching';
import { matchingGenerateSchema } from '@/lib/schemas/matching';
import { isOpsManager } from '@/lib/constants/status';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 역할 확인
    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || !isOpsManager(currentUser.role)) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    // Zod 입력 검증
    const body = await request.json();
    const parsed = matchingGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: '입력 데이터가 올바르지 않습니다.' },
        { status: 400 }
      );
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
    const message = error instanceof Error ? error.message : '';
    const errorName = error instanceof Error ? error.name : '';

    // 일별/월별 LLM 호출 한도 초과 — 한국 시간 자정 리셋
    if (
      message.includes('사용량 한도') ||
      message.includes('일별') ||
      message.includes('월별') ||
      message.includes('사용 한도')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '오늘 사용 한도를 초과했습니다. 한국 시간 자정에 초기화됩니다.',
          code: 'QUOTA_EXCEEDED',
        },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

    // 업스트림(LLM) 타임아웃 또는 사용자/시스템 abort
    if (message.includes('타임아웃') || message.includes('abort') || errorName === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          error: 'AI 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
          code: 'LLM_TIMEOUT',
        },
        { status: 504 }
      );
    }

    // LLM context window 초과
    if (
      message.includes('context length') ||
      message.includes('token') ||
      message.includes('너무 깁니다')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '분석할 내용이 너무 깁니다. 텍스트 길이를 줄여주세요.',
          code: 'INPUT_TOO_LARGE',
        },
        { status: 413 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '매칭 추천 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
