// e2e/helpers/cleanup.helper.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin Client (RLS 우회)
 * E2E 테스트의 파괴적 액션을 복원하기 위해 사용
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** 프로젝트 삭제 (생성 테스트 후 정리) */
export async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) console.warn(`deleteProject(${id}) 실패:`, error.message);
}

/** 회사명으로 프로젝트 삭제 (retry 시 잔여 테스트 프로젝트 정리) */
export async function deleteProjectsByName(companyName: string) {
  const { error } = await supabase.from('projects').delete().eq('company_name', companyName);
  if (error) console.warn(`deleteProjectsByName(${companyName}) 실패:`, error.message);
}

/** 템플릿 삭제 (복제 테스트 후 정리) */
export async function deleteTemplate(id: string) {
  const { error } = await supabase.from('self_assessment_templates').delete().eq('id', id);
  if (error) console.warn(`deleteTemplate(${id}) 실패:`, error.message);
}

/** 테스트 대화 생성 (ops ↔ consultant 사이) — 대화 + 참가자 + 메시지 */
export async function ensureTestConversation(
  opsEmail: string,
  consultantEmail: string
): Promise<string | null> {
  // 사용자 ID 조회
  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .in('email', [opsEmail, consultantEmail]);
  if (!users || users.length < 2) return null;

  const opsId = users.find((u) => u.email === opsEmail)!.id;
  const consultantId = users.find((u) => u.email === consultantEmail)!.id;

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

/** 공지 삭제 (E2E 생성 테스트 후 정리) — 첨부는 CASCADE로 자동 제거되나 Storage는 별도 제거 */
export async function deleteNotice(id: string) {
  // Storage 정리: prefix로 파일 목록 조회 후 일괄 삭제
  const { data: list } = await supabase.storage.from('notice-attachments').list(id);
  if (list && list.length > 0) {
    const paths = list.map((f) => `${id}/${f.name}`);
    await supabase.storage.from('notice-attachments').remove(paths);
  }
  const { error } = await supabase.from('notices').delete().eq('id', id);
  if (error) console.warn(`deleteNotice(${id}) 실패:`, error.message);
}

/** 제목으로 공지 삭제 (잔여 테스트 데이터 정리) */
export async function deleteNoticesByTitle(titlePattern: string) {
  const { data: matches } = await supabase
    .from('notices')
    .select('id')
    .ilike('title', titlePattern);
  if (matches) {
    for (const row of matches) {
      await deleteNotice(row.id as string);
    }
  }
}
