// e2e/helpers/cleanup.helper.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin Client (RLS 우회)
 * E2E 테스트의 파괴적 액션을 복원하기 위해 사용
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** 프로젝트 삭제 (생성 테스트 후 정리) */
export async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) console.warn(`deleteProject(${id}) 실패:`, error.message);
}

/** 회사명으로 프로젝트 삭제 (retry 시 잔여 테스트 프로젝트 정리) */
export async function deleteProjectsByName(companyName: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('company_name', companyName);
  if (error) console.warn(`deleteProjectsByName(${companyName}) 실패:`, error.message);
}

/** 사용자 상태 복원 (승인/정지 테스트 후) */
export async function restoreUserStatus(
  userId: string,
  originalStatus: string,
) {
  const { error } = await supabase
    .from('profiles')
    .update({ status: originalStatus })
    .eq('id', userId);
  if (error)
    console.warn(`restoreUserStatus(${userId}) 실패:`, error.message);
}

/** 템플릿 삭제 (복제 테스트 후 정리) */
export async function deleteTemplate(id: string) {
  const { error } = await supabase
    .from('assessment_templates')
    .delete()
    .eq('id', id);
  if (error) console.warn(`deleteTemplate(${id}) 실패:`, error.message);
}

/** 활동일지 삭제 */
export async function deleteActivityLog(id: string) {
  const { error } = await supabase
    .from('consultant_activity_logs')
    .delete()
    .eq('id', id);
  if (error) console.warn(`deleteActivityLog(${id}) 실패:`, error.message);
}

/** 컨설턴트 프로필 복원 */
export async function restoreProfile(
  userId: string,
  originalData: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('consultant_profiles')
    .update(originalData)
    .eq('user_id', userId);
  if (error) console.warn(`restoreProfile(${userId}) 실패:`, error.message);
}

/** 이메일 알림 설정 복원 */
export async function restoreEmailNotify(
  userId: string,
  originalValue: boolean,
) {
  const { error } = await supabase
    .from('profiles')
    .update({ email_notify: originalValue })
    .eq('id', userId);
  if (error)
    console.warn(`restoreEmailNotify(${userId}) 실패:`, error.message);
}

/** 로드맵 공유 상태 복원 */
export async function restoreShareStatus(
  roadmapId: string,
  originalValue: boolean,
) {
  const { error } = await supabase
    .from('roadmap_versions')
    .update({ is_shared: originalValue })
    .eq('id', roadmapId);
  if (error)
    console.warn(`restoreShareStatus(${roadmapId}) 실패:`, error.message);
}
