import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 시스템 자동 활동 로그 삽입 (서버 내부 전용)
 * - interview/roadmap actions에서 호출
 * - 실패해도 메인 로직을 블로킹하지 않음
 */
export async function insertSystemActivityLog(
  projectId: string,
  consultantId: string,
  content: string,
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from('consultant_activity_logs').insert({
      project_id: projectId,
      consultant_id: consultantId,
      type: 'system_auto',
      content,
    });

    if (error) {
      console.error('[ActivityLog] 시스템 로그 기록 실패:', error);
    }
  } catch (err) {
    console.error('[ActivityLog] 시스템 로그 예외:', err);
  }
}
