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
    .from('self_assessment_templates')
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

/** 테스트 대화 생성 (ops ↔ consultant 사이) — 대화 + 참가자 + 메시지 */
export async function ensureTestConversation(
  opsEmail: string,
  consultantEmail: string,
): Promise<string | null> {
  // 사용자 ID 조회
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .in('email', [opsEmail, consultantEmail]);
  if (!users || users.length < 2) return null;

  const opsId = users.find(u => u.email === opsEmail)!.id;
  const consultantId = users.find(u => u.email === consultantEmail)!.id;

  // 기존 대화가 있는지 확인 (두 사용자가 모두 참여하는 대화)
  const { data: existing } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', opsId);

  if (existing && existing.length > 0) {
    for (const row of existing) {
      const { data: partner } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', row.conversation_id)
        .eq('user_id', consultantId)
        .single();
      if (partner) return row.conversation_id; // 이미 대화 존재
    }
  }

  // 대화 생성
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({ last_message_at: new Date().toISOString() })
    .select('id')
    .single();
  if (convErr || !conv) {
    console.warn('ensureTestConversation: 대화 생성 실패', convErr?.message);
    return null;
  }

  // 참가자 추가
  await supabase.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: opsId },
    { conversation_id: conv.id, user_id: consultantId },
  ]);

  // 초기 메시지 삽입
  await supabase.from('messages').insert({
    conversation_id: conv.id,
    sender_id: opsId,
    content: 'E2E 테스트를 위한 초기 메시지입니다.',
  });

  return conv.id;
}

/** 테스트 대화 삭제 */
export async function deleteConversation(conversationId: string) {
  // messages → conversation_participants → conversations 순서로 삭제
  await supabase.from('messages').delete().eq('conversation_id', conversationId);
  await supabase.from('conversation_participants').delete().eq('conversation_id', conversationId);
  const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
  if (error) console.warn(`deleteConversation(${conversationId}) 실패:`, error.message);
}

/** 유효한 assessment 토큰 보장 — NEW 상태 프로젝트에 미사용+미만료 토큰이 없으면 생성 */
export async function ensureAssessmentToken(): Promise<string | null> {
  // 미사용 + 미만료 토큰이 이미 있는지 확인
  const { data: existing } = await supabase
    .from('assessment_tokens')
    .select('token')
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (existing) return existing.token;

  // NEW 상태 프로젝트 찾기 (토큰 생성 조건)
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('status', 'NEW')
    .limit(1)
    .maybeSingle();
  if (!project) return null;

  // ops admin 사용자 ID
  const { data: opsUser } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'OPS_ADMIN')
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle();
  if (!opsUser) return null;

  // 토큰 생성 (14일 유효)
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('assessment_tokens').insert({
    token,
    project_id: project.id,
    expires_at: expiresAt,
    created_by: opsUser.id,
  });
  if (error) {
    console.warn('ensureAssessmentToken: 생성 실패', error.message);
    return null;
  }

  return token;
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
