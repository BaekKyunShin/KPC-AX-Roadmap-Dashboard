'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createAuditLog } from '@/lib/services/audit';
import { requireAuthWithRole } from '@/lib/actions/auth-helpers';
import type { SelfAssessmentQuestion } from '@/types/database';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import { hasQuestionsChanged } from './utils';

// 스키마 정의
const questionSchema = z.object({
  id: z.string(),
  order: z.number().min(1),
  dimension: z.string().min(1, '차원을 입력하세요.'),
  question_text: z.string().min(5, '질문을 5자 이상 입력하세요.'),
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

// 내부 헬퍼: 단일 템플릿 조회
async function getTemplateById(supabase: SupabaseClient, templateId: string) {
  return supabase
    .from('self_assessment_templates')
    .select('*')
    .eq('id', templateId)
    .single();
}

// 내부 헬퍼: 템플릿 사용 횟수 조회
async function getTemplateUsageCount(supabase: SupabaseClient, templateId: string) {
  const { count } = await supabase
    .from('self_assessments')
    .select('*', { count: 'exact', head: true })
    .eq('template_id', templateId);
  return count || 0;
}

// 내부 헬퍼: 다음 템플릿 버전 번호 조회
async function getNextTemplateVersion(supabase: SupabaseClient) {
  const { data: latestTemplate } = await supabase
    .from('self_assessment_templates')
    .select('version')
    .order('version', { ascending: false })
    .limit(1)
    .single();
  return (latestTemplate?.version || 0) + 1;
}

// 템플릿 목록 조회
export async function fetchTemplates(): Promise<ActionResult<unknown>> {
  try {
    const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
    if ('error' in auth) return { success: false, error: auth.error };
    const { supabase } = auth;

    // 템플릿 목록 조회 (사용 현황 포함)
    const { data: templates, error } = await supabase
      .from('self_assessment_templates')
      .select('*')
      .order('version', { ascending: false });

    if (error) {
      console.error('[fetchTemplates] Supabase error:', error.message);
      return { success: false, error: '템플릿 목록 조회에 실패했습니다.' };
    }

    // 전체 템플릿의 사용 현황을 한 번에 조회 (N+1 방지)
    const templateIds = (templates || []).map(t => t.id);
    const { data: usageCounts } = await supabase
      .from('self_assessments')
      .select('template_id')
      .in('template_id', templateIds);

    const usageMap = new Map<string, number>();
    usageCounts?.forEach(row => {
      usageMap.set(row.template_id, (usageMap.get(row.template_id) || 0) + 1);
    });

    const templatesWithUsage = (templates || []).map(template => ({
      ...template,
      usage_count: usageMap.get(template.id) || 0,
    }));

    return { success: true, data: templatesWithUsage };
  } catch (error) {
    console.error('[fetchTemplates Error]', error);
    return { success: false, error: '템플릿 목록 조회에 실패했습니다.' };
  }
}

// 단일 템플릿 조회
export async function fetchTemplate(templateId: string): Promise<ActionResult<unknown>> {
  try {
    const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
    if ('error' in auth) return { success: false, error: auth.error };
    const { supabase } = auth;

    const { data: template, error } = await getTemplateById(supabase, templateId);

    if (error) {
      console.error('[fetchTemplate] Supabase error:', error.message);
      return { success: false, error: '템플릿 조회에 실패했습니다.' };
    }

    // 사용 현황 조회
    const usageCount = await getTemplateUsageCount(supabase, templateId);

    return { success: true, data: { ...template, usage_count: usageCount } };
  } catch (error) {
    console.error('[fetchTemplate Error]', error);
    return { success: false, error: '템플릿 조회에 실패했습니다.' };
  }
}

// 새 템플릿 생성
export async function createTemplate(formData: FormData): Promise<ActionResult<unknown>> {
  try {
    const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;
    const adminSupabase = createAdminClient();

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
    const newVersion = await getNextTemplateVersion(supabase);

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
      console.error('[createTemplate] Supabase error:', error.message);
      return { success: false, error: '템플릿 생성에 실패했습니다.' };
    }

    // 감사로그 (응답 차단 방지를 위해 after()로 지연)
    after(async () => {
      await createAuditLog({
        actorUserId: user.id,
        action: 'TEMPLATE_CREATE',
        targetType: 'template',
        targetId: newTemplate.id,
        meta: { version: newVersion, name: validation.data.name },
      });
    });

    revalidatePath('/ops/templates');
    return { success: true, data: newTemplate };
  } catch (error) {
    console.error('[createTemplate Error]', error);
    return { success: false, error: '템플릿 생성에 실패했습니다.' };
  }
}

// 템플릿 수정 (새 버전 생성)
export async function updateTemplate(formData: FormData): Promise<ActionResult<unknown>> {
  try {
    const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;
    const adminSupabase = createAdminClient();

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
    const { data: existingTemplate, error: fetchError } = await getTemplateById(supabase, validation.data.id);

    if (fetchError || !existingTemplate) {
      return { success: false, error: '템플릿을 찾을 수 없습니다.' };
    }

    // 사용 현황 확인
    const usageCount = await getTemplateUsageCount(supabase, existingTemplate.id);
    const isInUse = usageCount > 0;

    // 사용 중 + 질문 변경 → 새 버전으로 생성
    if (isInUse) {
      const questionsChanged = hasQuestionsChanged(
        existingTemplate.questions as SelfAssessmentQuestion[],
        validation.data.questions,
      );

      if (questionsChanged) {
        const newVersion = await getNextTemplateVersion(supabase);

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
          console.error('[updateTemplate] Supabase error (new version):', error.message);
          return { success: false, error: '템플릿 새 버전 생성에 실패했습니다.' };
        }

        // 감사로그 (응답 차단 방지를 위해 after()로 지연)
        after(async () => {
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
    }

    // 직접 수정 (사용 중이면 메타데이터만, 미사용이면 질문 포함)
    const { data: updatedTemplate, error } = await adminSupabase
      .from('self_assessment_templates')
      .update({
        name: validation.data.name,
        description: validation.data.description || null,
        updated_at: new Date().toISOString(),
        ...(isInUse ? {} : { questions: validation.data.questions }),
      })
      .eq('id', validation.data.id)
      .select()
      .single();

    if (error) {
      console.error('[updateTemplate] Supabase error:', error.message);
      return { success: false, error: '템플릿 수정에 실패했습니다.' };
    }

    // 감사로그 (응답 차단 방지를 위해 after()로 지연)
    after(async () => {
      await createAuditLog({
        actorUserId: user.id,
        action: 'TEMPLATE_UPDATE',
        targetType: 'template',
        targetId: updatedTemplate.id,
        meta: { version: updatedTemplate.version, name: validation.data.name },
      });
    });

    revalidatePath('/ops/templates');
    revalidatePath(`/ops/templates/${validation.data.id}`);
    return { success: true, data: updatedTemplate };
  } catch (error) {
    console.error('[updateTemplate Error]', error);
    return { success: false, error: '템플릿 수정에 실패했습니다.' };
  }
}

// 활성 템플릿 변경
export async function setActiveTemplate(templateId: string): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;
    const adminSupabase = createAdminClient();

    // 템플릿 존재 확인
    const { data: template, error: fetchError } = await getTemplateById(supabase, templateId);

    if (fetchError || !template) {
      return { success: false, error: '템플릿을 찾을 수 없습니다.' };
    }

    // 모든 활성 템플릿 비활성화
    const { error: deactivateError } = await adminSupabase
      .from('self_assessment_templates')
      .update({ is_active: false })
      .eq('is_active', true);

    if (deactivateError) {
      console.error('[setActiveTemplate] Supabase error (deactivate):', deactivateError.message);
      return { success: false, error: '활성 템플릿 변경에 실패했습니다.' };
    }

    // 선택한 템플릿 활성화
    const { error } = await adminSupabase
      .from('self_assessment_templates')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', templateId);

    if (error) {
      console.error('[setActiveTemplate] Supabase error (activate):', error.message);
      return { success: false, error: '활성 템플릿 변경에 실패했습니다.' };
    }

    // 감사로그 (응답 차단 방지를 위해 after()로 지연)
    after(async () => {
      await createAuditLog({
        actorUserId: user.id,
        action: 'TEMPLATE_ACTIVATE',
        targetType: 'template',
        targetId: templateId,
        meta: { version: template.version, name: template.name },
      });
    });

    revalidatePath('/ops/templates');
    return { success: true };
  } catch (error) {
    console.error('[setActiveTemplate Error]', error);
    return { success: false, error: '활성 템플릿 변경에 실패했습니다.' };
  }
}

// 템플릿 복제
export async function duplicateTemplate(templateId: string): Promise<ActionResult<unknown>> {
  try {
    const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;
    const adminSupabase = createAdminClient();

    // 원본 템플릿 조회
    const { data: sourceTemplate, error: fetchError } = await getTemplateById(supabase, templateId);

    if (fetchError || !sourceTemplate) {
      return { success: false, error: '템플릿을 찾을 수 없습니다.' };
    }

    // 최신 버전 조회
    const newVersion = await getNextTemplateVersion(supabase);

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
      console.error('[duplicateTemplate] Supabase error:', error.message);
      return { success: false, error: '템플릿 복제에 실패했습니다.' };
    }

    // 감사로그 (응답 차단 방지를 위해 after()로 지연)
    after(async () => {
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
    });

    revalidatePath('/ops/templates');
    return { success: true, data: newTemplate };
  } catch (error) {
    console.error('[duplicateTemplate Error]', error);
    return { success: false, error: '템플릿 복제에 실패했습니다.' };
  }
}

// 템플릿 삭제 (미사용 + 비활성 템플릿만)
export async function deleteTemplate(templateId: string): Promise<SimpleActionResult> {
  try {
    const auth = await requireAuthWithRole(['OPS_ADMIN', 'SYSTEM_ADMIN']);
    if ('error' in auth) return { success: false, error: auth.error };
    const { user, supabase } = auth;
    const adminSupabase = createAdminClient();

    // 템플릿 존재 확인
    const { data: template, error: fetchError } = await getTemplateById(supabase, templateId);

    if (fetchError || !template) {
      return { success: false, error: '템플릿을 찾을 수 없습니다.' };
    }

    // 활성 템플릿은 삭제 불가
    if (template.is_active) {
      return { success: false, error: '활성 템플릿은 삭제할 수 없습니다. 먼저 비활성화해주세요.' };
    }

    // 사용 현황 확인
    const usageCount = await getTemplateUsageCount(supabase, templateId);

    if (usageCount > 0) {
      return { success: false, error: `이 템플릿으로 진행된 자가진단이 ${usageCount}건 있어 삭제할 수 없습니다.` };
    }

    // 물리적 삭제
    const { error: deleteError } = await adminSupabase
      .from('self_assessment_templates')
      .delete()
      .eq('id', templateId);

    if (deleteError) {
      console.error('[deleteTemplate] Supabase error:', deleteError.message);
      return { success: false, error: '템플릿 삭제에 실패했습니다.' };
    }

    // 감사로그 (응답 차단 방지를 위해 after()로 지연)
    after(async () => {
      await createAuditLog({
        actorUserId: user.id,
        action: 'TEMPLATE_DELETE',
        targetType: 'template',
        targetId: templateId,
        meta: { version: template.version, name: template.name },
      });
    });

    revalidatePath('/ops/templates');
    return { success: true };
  } catch (error) {
    console.error('[deleteTemplate Error]', error);
    return { success: false, error: '템플릿 삭제에 실패했습니다.' };
  }
}
