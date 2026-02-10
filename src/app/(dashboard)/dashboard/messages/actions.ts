'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/services/notification';
import { sendMessageSchema, createConversationSchema } from '@/lib/schemas/message';
import { CONVERSATION_PAGE_SIZE, MESSAGE_PAGE_SIZE, MESSAGING_ROLES, ROLE_LABELS, ALLOWED_RECIPIENTS } from '@/lib/constants/message';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';
import type { ConversationWithPreview, Message, RecipientGroup } from '@/types/database';

// =============================================================================
// 조회 함수
// =============================================================================

/**
 * 내 대화 목록 조회
 * - 상대방 정보, 마지막 메시지 미리보기, 안읽음 여부 포함
 * - last_message_at 기준 최신순 정렬
 */
export async function fetchConversations(): Promise<
  ActionResult<ConversationWithPreview[]>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    // 1. 내가 참여한 대화 목록 (last_read_at 포함)
    const { data: myParticipations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id);

    if (partError) {
      console.error('[fetchConversations] 참여 조회:', partError);
      return { success: false, error: '메시지 목록을 불러올 수 없습니다.' };
    }

    if (!myParticipations || myParticipations.length === 0) {
      return { success: true, data: [] };
    }

    const conversationIds = myParticipations.map((p) => p.conversation_id);
    const readMap = new Map(
      myParticipations.map((p) => [p.conversation_id, p.last_read_at]),
    );

    // 2. 대화 정보 조회 (최신순 정렬)
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, last_message_at')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false })
      .limit(CONVERSATION_PAGE_SIZE);

    if (convError) {
      console.error('[fetchConversations] 대화 조회:', convError);
      return { success: false, error: '메시지 목록을 불러올 수 없습니다.' };
    }

    if (!conversations || conversations.length === 0) {
      return { success: true, data: [] };
    }

    const activeIds = conversations.map((c) => c.id);

    // 3. 상대방 참여자 조회 (나 제외)
    const { data: otherParticipants, error: otherError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', activeIds)
      .neq('user_id', user.id);

    if (otherError) {
      console.error('[fetchConversations] 상대방 조회:', otherError);
      return { success: false, error: '메시지 목록을 불러올 수 없습니다.' };
    }

    // 4. 상대방 사용자 정보 조회
    const otherUserIds = [...new Set((otherParticipants || []).map((p) => p.user_id))];

    const adminSupabase = createAdminClient();
    const { data: otherUsers } = await adminSupabase
      .from('users')
      .select('id, name, role')
      .in('id', otherUserIds);

    const userMap = new Map(
      (otherUsers || []).map((u) => [u.id, { id: u.id, name: u.name, role: u.role }]),
    );

    const otherByConv = new Map(
      (otherParticipants || []).map((p) => [p.conversation_id, p.user_id]),
    );

    // 5. 각 대화의 마지막 메시지 조회 (대화별 1건씩)
    const lastMsgMap = new Map<string, { content: string; sender_id: string; created_at: string }>();
    const lastMsgPromises = activeIds.map(async (convId) => {
      const { data } = await supabase
        .from('messages')
        .select('conversation_id, content, sender_id, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        lastMsgMap.set(data.conversation_id, {
          content: data.content,
          sender_id: data.sender_id,
          created_at: data.created_at,
        });
      }
    });
    await Promise.all(lastMsgPromises);

    // 6. 조합
    const result: ConversationWithPreview[] = conversations.map((conv) => {
      const otherUserId = otherByConv.get(conv.id);
      const otherUser = otherUserId ? userMap.get(otherUserId) : undefined;
      const lastMsg = lastMsgMap.get(conv.id);
      const myReadAt = readMap.get(conv.id);
      const hasUnread = myReadAt
        ? new Date(conv.last_message_at) > new Date(myReadAt)
        : false;

      return {
        id: conv.id,
        last_message_at: conv.last_message_at,
        other_user: otherUser || { id: '', name: '(알 수 없음)', role: '' },
        last_message: lastMsg,
        has_unread: hasUnread,
      };
    });

    return { success: true, data: result };
  } catch (err) {
    console.error('[fetchConversations] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

/**
 * 특정 대화의 메시지 목록 조회 (시간순)
 * - RLS가 참여한 대화만 허용
 */
export async function fetchMessages(
  conversationId: string,
): Promise<ActionResult<Message[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(MESSAGE_PAGE_SIZE);

    if (error) {
      console.error('[fetchMessages]', error);
      return { success: false, error: '메시지를 불러올 수 없습니다.' };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('[fetchMessages] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

/**
 * 메시지 보낼 수 있는 사용자 목록 (역할별 그룹화)
 * - SYSTEM_ADMIN, OPS_ADMIN, CONSULTANT_APPROVED만 포함
 * - 본인은 제외
 */
export async function fetchAvailableRecipients(): Promise<
  ActionResult<RecipientGroup[]>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const adminSupabase = createAdminClient();

    // 현재 사용자 역할 조회
    const { data: currentUser } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    // 역할별 수신 가능 대상 필터
    const allowedRoles = ALLOWED_RECIPIENTS[currentUser.role];
    if (!allowedRoles || allowedRoles.length === 0) {
      return { success: true, data: [] };
    }

    const { data: users, error } = await adminSupabase
      .from('users')
      .select('id, name, role')
      .in('role', [...allowedRoles])
      .eq('status', 'ACTIVE')
      .neq('id', user.id)
      .order('name');

    if (error) {
      console.error('[fetchAvailableRecipients]', error);
      return { success: false, error: '사용자 목록을 불러올 수 없습니다.' };
    }

    // 역할별 그룹화 (허용된 역할만)
    const groups = new Map<string, RecipientGroup>();
    for (const role of allowedRoles) {
      groups.set(role, {
        role,
        role_label: ROLE_LABELS[role] || role,
        users: [],
      });
    }

    for (const u of users || []) {
      const group = groups.get(u.role);
      if (group) {
        group.users.push({ id: u.id, name: u.name });
      }
    }

    // 빈 그룹 제거
    const result = [...groups.values()].filter((g) => g.users.length > 0);

    return { success: true, data: result };
  } catch (err) {
    console.error('[fetchAvailableRecipients] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

/**
 * 안읽음 대화 수 조회 (네비게이션 뱃지용)
 * - 에러 시 0 반환 (UI 영향 최소화)
 */
export async function fetchUnreadConversationCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    // 내 참여 대화 조회
    const { data: participations, error } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id);

    if (error || !participations) return 0;

    if (participations.length === 0) return 0;

    const conversationIds = participations.map((p) => p.conversation_id);

    // 대화의 last_message_at 조회
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, last_message_at')
      .in('id', conversationIds);

    if (!conversations) return 0;

    // 안읽음 대화 수 계산 (Map으로 O(n) 조회)
    const readMap = new Map(
      participations.map((p) => [p.conversation_id, p.last_read_at]),
    );
    let count = 0;
    for (const conv of conversations) {
      const lastReadAt = readMap.get(conv.id);
      if (lastReadAt && new Date(conv.last_message_at) > new Date(lastReadAt)) {
        count++;
      }
    }

    return count;
  } catch {
    return 0;
  }
}

// =============================================================================
// 변경 함수
// =============================================================================

/**
 * 새 1:1 대화 생성 (기존 대화가 있으면 재사용)
 * - admin 클라이언트로 생성 (RLS INSERT 정책 우회)
 */
export async function createConversation(
  recipientId: string,
): Promise<ActionResult<{ conversationId: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    // Zod 검증
    const validation = createConversationSchema.safeParse({ recipient_id: recipientId });
    if (!validation.success) {
      return { success: false, error: '유효하지 않은 사용자입니다.' };
    }

    // 본인에게 보내기 방지
    if (recipientId === user.id) {
      return { success: false, error: '본인에게는 메시지를 보낼 수 없습니다.' };
    }

    const adminSupabase = createAdminClient();

    // 수신자 존재 확인
    const { data: recipient } = await adminSupabase
      .from('users')
      .select('id, role, status')
      .eq('id', recipientId)
      .single();

    if (!recipient || recipient.status !== 'ACTIVE') {
      return { success: false, error: '존재하지 않는 사용자입니다.' };
    }

    if (!MESSAGING_ROLES.includes(recipient.role as typeof MESSAGING_ROLES[number])) {
      return { success: false, error: '메시지를 보낼 수 없는 사용자입니다.' };
    }

    // 역할별 수신 권한 검증
    const { data: sender } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const senderAllowed = sender ? ALLOWED_RECIPIENTS[sender.role] : undefined;
    if (!senderAllowed || !senderAllowed.includes(recipient.role)) {
      return { success: false, error: '해당 사용자에게 메시지를 보낼 권한이 없습니다.' };
    }

    // 기존 1:1 대화 검색
    // 내가 참여한 대화 중 recipientId도 참여한 대화 찾기
    const { data: myConversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (myConversations && myConversations.length > 0) {
      const myConvIds = myConversations.map((c) => c.conversation_id);

      const { data: sharedConvs } = await adminSupabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', recipientId)
        .in('conversation_id', myConvIds);

      if (sharedConvs && sharedConvs.length > 0) {
        // 기존 대화 반환
        return { success: true, data: { conversationId: sharedConvs[0].conversation_id } };
      }
    }

    // 새 대화 생성
    const { data: newConv, error: convError } = await adminSupabase
      .from('conversations')
      .insert({})
      .select('id')
      .single();

    if (convError || !newConv) {
      console.error('[createConversation] 대화 생성:', convError);
      return { success: false, error: '메시지를 시작할 수 없습니다.' };
    }

    // 참여자 2명 추가
    const { error: partError } = await adminSupabase
      .from('conversation_participants')
      .insert([
        { conversation_id: newConv.id, user_id: user.id },
        { conversation_id: newConv.id, user_id: recipientId },
      ]);

    if (partError) {
      console.error('[createConversation] 참여자 추가:', partError);
      return { success: false, error: '메시지를 시작할 수 없습니다.' };
    }

    revalidatePath('/dashboard/messages');
    return { success: true, data: { conversationId: newConv.id } };
  } catch (err) {
    console.error('[createConversation] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

/**
 * 메시지 전송
 * - 참여 검증 → 메시지 INSERT → last_message_at 갱신 → 알림 생성
 */
export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<ActionResult<Message>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    // Zod 검증
    const validation = sendMessageSchema.safeParse({
      conversation_id: conversationId,
      content,
    });
    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || '입력이 올바르지 않습니다.';
      return { success: false, error: firstError };
    }

    // 메시지 INSERT (RLS가 참여 여부 검증)
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: validation.data.content,
      })
      .select('*')
      .single();

    if (msgError) {
      console.error('[sendMessage] INSERT:', msgError);
      return { success: false, error: '메시지를 전송할 수 없습니다.' };
    }

    // conversations.last_message_at 갱신 (DB 생성 타임스탬프 사용으로 시계 불일치 방지)
    const adminSupabase = createAdminClient();
    await adminSupabase
      .from('conversations')
      .update({ last_message_at: message.created_at })
      .eq('id', conversationId);

    // 내 last_read_at도 갱신 (내가 보낸 메시지니까 읽은 것)
    // message.created_at 사용: last_read_at >= last_message_at 보장
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: message.created_at })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    // 상대방에게 알림 생성
    const { data: otherParticipant } = await adminSupabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', user.id)
      .single();

    if (otherParticipant) {
      // 보낸 사람 이름 조회
      const { data: sender } = await adminSupabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      const senderName = sender?.name || '사용자';

      await createNotification({
        userId: otherParticipant.user_id,
        type: 'message',
        title: '새 메시지',
        message: `${senderName} 님이 메시지를 보냈습니다.`,
        link: `/dashboard/messages?conversation=${conversationId}`,
      });
    }

    revalidatePath('/dashboard/messages');
    return { success: true, data: message };
  } catch (err) {
    console.error('[sendMessage] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}

/**
 * 대화 읽음 처리 (last_read_at 갱신)
 * - RLS가 본인 참여자 레코드만 업데이트하도록 보장
 */
export async function markConversationRead(
  conversationId: string,
): Promise<SimpleActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: '로그인이 필요합니다.' };

    const { error } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[markConversationRead]', error);
      return { success: false, error: '읽음 처리에 실패했습니다.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[markConversationRead] 예외:', err);
    return { success: false, error: '알 수 없는 오류가 발생했습니다.' };
  }
}
