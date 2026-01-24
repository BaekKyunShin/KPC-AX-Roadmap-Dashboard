'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { SelfAssessmentQuestion } from '@/types/database';

// 스키마 정의
const questionSchema = z.object({
  id: z.string(),
  order: z.number().min(1),
  dimension: z.string().min(1, '차원을 입력하세요.'),
  question_text: z.string().min(5, '질문을 5자 이상 입력하세요.'),
  question_type: z.enum(['SCALE_5', 'SCALE_10', 'MULTIPLE_CHOICE', 'TEXT']),
  options: z.array(z.string()).optional(),
  weight: z.number().min(0.1).max(10),
});

const createTemplateSchema = z.object({
  name: z.string().min(2, '템플릿 이름을 2자 이상 입력하세요.').max(100),
  description: z.string().max(500).optional(),
  questions: z.array(questionSchema).min(1, '최소 1개 이상의 질문이 필요합니다.'),
});

const updateTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, '템플릿 이름을 2자 이상 입력하세요.').max(100),
  description: z.string().max(500).optional(),
  questions: z.array(questionSchema).min(1, '최소 1개 이상의 질문이 필요합니다.'),
});

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

// 템플릿 목록 조회
export async function getTemplates(): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return { success: false, error: '권한이 없습니다.' };
    }

    // 템플릿 목록 조회 (사용 현황 포함)
    const { data: templates, error } = await supabase
      .from('self_assessment_templates')
      .select('*')
      .order('version', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // 각 템플릿의 사용 현황 조회
    const templatesWithUsage = await Promise.all(
      (templates || []).map(async (template) => {
        const { count } = await supabase
          .from('self_assessments')
          .select('*', { count: 'exact', head: true })
          .eq('template_id', template.id);
        return { ...template, usage_count: count || 0 };
      })
    );

    return { success: true, data: templatesWithUsage };
  } catch {
    return { success: false, error: '템플릿 목록 조회에 실패했습니다.' };
  }
}

// 단일 템플릿 조회
export async function getTemplate(templateId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return { success: false, error: '권한이 없습니다.' };
    }

    const { data: template, error } = await supabase
      .from('self_assessment_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 사용 현황 조회
    const { count } = await supabase
      .from('self_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', templateId);

    return { success: true, data: { ...template, usage_count: count || 0 } };
  } catch {
    return { success: false, error: '템플릿 조회에 실패했습니다.' };
  }
}

// 새 템플릿 생성
export async function createTemplate(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return { success: false, error: '권한이 없습니다.' };
    }

    // 폼 데이터 파싱
    const rawData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      questions: JSON.parse(formData.get('questions') as string) as SelfAssessmentQuestion[],
    };

    // 검증
    const validation = createTemplateSchema.safeParse(rawData);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    // 최신 버전 조회
    const { data: latestTemplate } = await supabase
      .from('self_assessment_templates')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const newVersion = (latestTemplate?.version || 0) + 1;

    // 템플릿 생성
    const { data: newTemplate, error } = await adminSupabase
      .from('self_assessment_templates')
      .insert({
        version: newVersion,
        name: validation.data.name,
        description: validation.data.description || null,
        questions: validation.data.questions,
        is_active: false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 감사 로그
    await createAuditLog({
      actorUserId: user.id,
      action: 'TEMPLATE_CREATE',
      targetType: 'template',
      targetId: newTemplate.id,
      meta: { version: newVersion, name: validation.data.name },
    });

    revalidatePath('/ops/templates');
    return { success: true, data: newTemplate };
  } catch {
    return { success: false, error: '템플릿 생성에 실패했습니다.' };
  }
}

// 템플릿 수정 (새 버전 생성)
export async function updateTemplate(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return { success: false, error: '권한이 없습니다.' };
    }

    // 폼 데이터 파싱
    const rawData = {
      id: formData.get('id') as string,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      questions: JSON.parse(formData.get('questions') as string) as SelfAssessmentQuestion[],
    };

    // 검증
    const validation = updateTemplateSchema.safeParse(rawData);
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message };
    }

    // 기존 템플릿 조회
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('self_assessment_templates')
      .select('*')
      .eq('id', validation.data.id)
      .single();

    if (fetchError || !existingTemplate) {
      return { success: false, error: '템플릿을 찾을 수 없습니다.' };
    }

    // 사용 중인 템플릿은 수정 대신 새 버전 생성
    const { count: usageCount } = await supabase
      .from('self_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', existingTemplate.id);

    if (usageCount && usageCount > 0) {
      // 새 버전으로 생성
      const { data: latestTemplate } = await supabase
        .from('self_assessment_templates')
        .select('version')
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const newVersion = (latestTemplate?.version || 0) + 1;

      const { data: newTemplate, error } = await adminSupabase
        .from('self_assessment_templates')
        .insert({
          version: newVersion,
          name: validation.data.name,
          description: validation.data.description || null,
          questions: validation.data.questions,
          is_active: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // 감사 로그
      await createAuditLog({
        actorUserId: user.id,
        action: 'TEMPLATE_CREATE',
        targetType: 'template',
        targetId: newTemplate.id,
        meta: {
          version: newVersion,
          name: validation.data.name,
          based_on_version: existingTemplate.version,
        },
      });

      revalidatePath('/ops/templates');
      return {
        success: true,
        data: {
          ...newTemplate,
          message: `기존 템플릿이 사용 중이므로 새 버전(v${newVersion})으로 생성되었습니다.`,
        },
      };
    }

    // 사용 중이지 않으면 직접 수정
    const { data: updatedTemplate, error } = await adminSupabase
      .from('self_assessment_templates')
      .update({
        name: validation.data.name,
        description: validation.data.description || null,
        questions: validation.data.questions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validation.data.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 감사 로그
    await createAuditLog({
      actorUserId: user.id,
      action: 'TEMPLATE_UPDATE',
      targetType: 'template',
      targetId: updatedTemplate.id,
      meta: { version: updatedTemplate.version, name: validation.data.name },
    });

    revalidatePath('/ops/templates');
    revalidatePath(`/ops/templates/${validation.data.id}`);
    return { success: true, data: updatedTemplate };
  } catch {
    return { success: false, error: '템플릿 수정에 실패했습니다.' };
  }
}

// 활성 템플릿 변경
export async function setActiveTemplate(templateId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return { success: false, error: '권한이 없습니다.' };
    }

    // 템플릿 존재 확인
    const { data: template, error: fetchError } = await supabase
      .from('self_assessment_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !template) {
      return { success: false, error: '템플릿을 찾을 수 없습니다.' };
    }

    // 모든 템플릿 비활성화
    await adminSupabase
      .from('self_assessment_templates')
      .update({ is_active: false })
      .neq('id', 'placeholder');

    // 선택한 템플릿 활성화
    const { error } = await adminSupabase
      .from('self_assessment_templates')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', templateId);

    if (error) {
      return { success: false, error: error.message };
    }

    // 감사 로그
    await createAuditLog({
      actorUserId: user.id,
      action: 'TEMPLATE_ACTIVATE',
      targetType: 'template',
      targetId: templateId,
      meta: { version: template.version, name: template.name },
    });

    revalidatePath('/ops/templates');
    return { success: true };
  } catch {
    return { success: false, error: '활성 템플릿 변경에 실패했습니다.' };
  }
}

// 템플릿 복제
export async function duplicateTemplate(templateId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: '로그인이 필요합니다.' };
    }

    // 권한 확인
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
      return { success: false, error: '권한이 없습니다.' };
    }

    // 원본 템플릿 조회
    const { data: sourceTemplate, error: fetchError } = await supabase
      .from('self_assessment_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !sourceTemplate) {
      return { success: false, error: '템플릿을 찾을 수 없습니다.' };
    }

    // 최신 버전 조회
    const { data: latestTemplate } = await supabase
      .from('self_assessment_templates')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const newVersion = (latestTemplate?.version || 0) + 1;

    // 복제 생성
    const { data: newTemplate, error } = await adminSupabase
      .from('self_assessment_templates')
      .insert({
        version: newVersion,
        name: `${sourceTemplate.name} (복사본)`,
        description: sourceTemplate.description,
        questions: sourceTemplate.questions,
        is_active: false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 감사 로그
    await createAuditLog({
      actorUserId: user.id,
      action: 'TEMPLATE_CREATE',
      targetType: 'template',
      targetId: newTemplate.id,
      meta: {
        version: newVersion,
        name: newTemplate.name,
        duplicated_from: sourceTemplate.id,
        source_version: sourceTemplate.version,
      },
    });

    revalidatePath('/ops/templates');
    return { success: true, data: newTemplate };
  } catch {
    return { success: false, error: '템플릿 복제에 실패했습니다.' };
  }
}
