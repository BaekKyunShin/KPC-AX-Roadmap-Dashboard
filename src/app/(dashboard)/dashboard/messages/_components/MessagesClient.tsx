'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  CONVERSATION_READ_EVENT,
  MAX_REALTIME_RETRIES,
  MESSAGE_PAGE_SIZE,
  REALTIME_RETRY_BASE_MS,
  REALTIME_RETRY_MAX_MS,
} from '@/lib/constants/message';
import { showErrorToast } from '@/lib/utils/toast';
import type { ConversationWithPreview, Message } from '@/types/database';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import NewConversationDialog from './NewConversationDialog';
import { fetchConversations, fetchMessages, sendMessage, markConversationRead } from '../actions';

/** Polling 간격: Realtime 실패 시에만 활성화되는 fallback (10초) */
const THREAD_POLL_MS = 10_000;

/** markConversationRead 중복 호출 방지 쿨다운 (ms) */
const MARK_READ_COOLDOWN_MS = 500;

/** Realtime 채널 재시도 상태 */
interface RealtimeRetryState {
  isMounted: boolean;
  retryCount: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
}

/** subscribe status 콜백 생성: CHANNEL_ERROR/TIMED_OUT 시 지수 백오프 재시도 */
function createRetryHandler(resubscribe: () => void, state: RealtimeRetryState) {
  return (status: string) => {
    if (status === 'SUBSCRIBED') {
      state.retryCount = 0;
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      if (state.isMounted && state.retryCount < MAX_REALTIME_RETRIES) {
        state.retryCount++;
        const delay = Math.min(REALTIME_RETRY_BASE_MS * 2 ** state.retryCount, REALTIME_RETRY_MAX_MS);
        state.retryTimer = setTimeout(resubscribe, delay);
      }
    }
  };
}

export default function MessagesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialConvId = searchParams.get('conversation');

  const [conversations, setConversations] = useState<ConversationWithPreview[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const currentUserIdRef = useRef<string | null>(null);
  const selectedConvIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const isLoadingMoreRef = useRef(false);

  /** Realtime 구독 상태 — SUBSCRIBED 시 true, 에러 시 false */
  const realtimeActiveRef = useRef(false);
  /** markConversationRead 중복 호출 방지 */
  const markingReadRef = useRef(false);

  // ---------------------------------------------------------------------------
  // 공통 헬퍼
  // ---------------------------------------------------------------------------

  /** 메시지를 중복 없이 append (Realtime/polling 공통) */
  const appendMessageIfNew = (newMsg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });
  };

  /** 대화 목록에서 안읽음 플래그 해제 */
  const clearUnreadFlag = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, has_unread: false } : c)),
    );
  };

  /** 읽음 처리: 사용자 액션용 (대화 선택, 초기 로드) */
  const markReadDirect = async (convId: string) => {
    await markConversationRead(convId);
    clearUnreadFlag(convId);
    window.dispatchEvent(new CustomEvent(CONVERSATION_READ_EVENT));
  };

  /** 읽음 처리: 자동 감지용 (Realtime + polling 중복 호출 방지) */
  const markReadIfNeeded = async (convId: string) => {
    if (markingReadRef.current) return;
    markingReadRef.current = true;
    try {
      await markConversationRead(convId);
      window.dispatchEvent(new CustomEvent(CONVERSATION_READ_EVENT));
    } finally {
      setTimeout(() => { markingReadRef.current = false; }, MARK_READ_COOLDOWN_MS);
    }
  };

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) currentUserIdRef.current = data.user.id;
    });
  }, []);

  // 초기화: 메시지 목록 로드 + URL 파라미터 자동 선택
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    fetchConversations().then(async (result) => {
      if (!result.success) {
        setIsLoading(false);
        return;
      }

      setConversations(result.data);

      // URL ?conversation= 파라미터 자동 선택
      if (initialConvId && result.data.some((c) => c.id === initialConvId)) {
        setSelectedConvId(initialConvId);
        setShowMobileThread(true);

        const msgResult = await fetchMessages(initialConvId);
        if (msgResult.success) {
          setMessages(msgResult.data.messages);
          setHasMore(msgResult.data.hasMore);
        }

        await markReadDirect(initialConvId);
      }

      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler가 메모이제이션 처리
  }, [initialConvId]);

  // 목록 새로고침 (이벤트 핸들러에서 호출)
  const refreshConversations = async () => {
    const result = await fetchConversations();
    if (result.success) {
      setConversations(result.data);
    }
  };

  // ref 동기화 (콜백/이펙트에서 최신 값 접근용)
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  // 선택 시 메시지 로드 (이벤트 핸들러)
  const handleSelectConversation = async (convId: string) => {
    setSelectedConvId(convId);
    setShowMobileThread(true);
    setIsMessagesLoading(true);

    try {
      const result = await fetchMessages(convId);
      if (result.success) {
        setMessages(result.data.messages);
        setHasMore(result.data.hasMore);
      }

      await markReadDirect(convId);
    } catch {
      showErrorToast('메시지 로드 실패', '서버와 통신 중 오류가 발생했습니다.');
    }

    setIsMessagesLoading(false);
  };

  // 이전 메시지 로드 (cursor 기반 페이지네이션)
  // ref 기반 가드로 동시 호출 방지 (React state는 비동기라 빠른 스크롤 시 중복 호출 가능)
  const handleLoadMore = async () => {
    if (!selectedConvId || isLoadingMoreRef.current || !hasMore) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const oldestMsg = messagesRef.current[0];
    if (!oldestMsg) {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
      return;
    }

    const result = await fetchMessages(selectedConvId, oldestMsg.created_at);
    if (result.success) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = result.data.messages.filter((m) => !existingIds.has(m.id));
        return [...newMsgs, ...prev];
      });
      setHasMore(result.data.hasMore);
    }

    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
  };

  // 메시지 전송
  const handleSendMessage = async (content: string) => {
    if (!selectedConvId) return;

    try {
      const result = await sendMessage(selectedConvId, content);
      if (result.success) {
        appendMessageIfNew(result.data);
        refreshConversations();
      } else {
        showErrorToast('메시지 전송 실패', result.error);
      }
      return result;
    } catch {
      showErrorToast('메시지 전송 실패', '서버와 통신 중 오류가 발생했습니다.');
      return { success: false as const, error: '서버와 통신 중 오류가 발생했습니다.' };
    }
  };

  // 새 메시지 생성 후 처리
  const handleConversationCreated = (conversationId: string) => {
    setIsNewDialogOpen(false);
    handleSelectConversation(conversationId);
    refreshConversations();
  };

  // 모바일 뒤로가기
  const handleMobileBack = () => {
    setShowMobileThread(false);
    setSelectedConvId(null);
    refreshConversations();
  };

  // Realtime: 현재 대화의 새 메시지 실시간 수신
  useEffect(() => {
    if (!selectedConvId) return;
    const convId = selectedConvId;

    const supabase = createClient();
    const retryState: RealtimeRetryState = { isMounted: true, retryCount: 0, retryTimer: null };
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribeConv() {
      if (!retryState.isMounted) return;

      // 인증 세션 대기 — Realtime RLS 정책 통과에 필요
      const { data: { user } } = await supabase.auth.getUser();
      if (!retryState.isMounted || !user) return;
      currentUserIdRef.current = user.id;

      if (channel) {
        supabase.removeChannel(channel);
      }

      const retryHandler = createRetryHandler(subscribeConv, retryState);

      channel = supabase
        .channel(`messages:${convId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${convId}`,
          },
          async (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.sender_id === currentUserIdRef.current) return;

            appendMessageIfNew(newMsg);
            markReadIfNeeded(convId);
          },
        )
        .subscribe((status) => {
          realtimeActiveRef.current = status === 'SUBSCRIBED';
          retryHandler(status);
        });
    }

    subscribeConv();

    return () => {
      retryState.isMounted = false;
      realtimeActiveRef.current = false;
      if (retryState.retryTimer) clearTimeout(retryState.retryTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [selectedConvId]);

  // Realtime: 모든 대화의 새 메시지 (목록 갱신 + 비선택 대화 뱃지)
  useEffect(() => {
    const supabase = createClient();
    const retryState: RealtimeRetryState = { isMounted: true, retryCount: 0, retryTimer: null };
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribeAll() {
      if (!retryState.isMounted) return;

      // 인증 세션 대기 — Realtime RLS 정책 통과에 필요
      const { data: { user } } = await supabase.auth.getUser();
      if (!retryState.isMounted || !user) return;
      currentUserIdRef.current = user.id;

      if (channel) {
        supabase.removeChannel(channel);
      }

      channel = supabase
        .channel('messages:all')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.sender_id === currentUserIdRef.current) return;

            // 목록 프리뷰 갱신 (모든 대화 공통)
            refreshConversations();

            // 선택된 대화의 메시지는 개별 채널(messages:${convId})에서 처리하므로 스킵
            // 개별 채널 구독 실패 시에는 polling fallback(realtimeActiveRef 기반)이 커버
            if (newMsg.conversation_id !== selectedConvIdRef.current) {
              router.refresh();
            }
          },
        )
        .subscribe(createRetryHandler(subscribeAll, retryState));
    }

    subscribeAll();

    return () => {
      retryState.isMounted = false;
      if (retryState.retryTimer) clearTimeout(retryState.retryTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  // Polling: Realtime 실패 시에만 활성화되는 fallback
  // Realtime이 SUBSCRIBED 상태이면 polling을 스킵하여 불필요한 DB 쿼리 방지.
  // Realtime이 SECURITY DEFINER RLS로 이벤트를 전달하지 못할 때 이 polling이 보장.
  useEffect(() => {
    if (!selectedConvId) return;

    const supabase = createClient();

    const poll = async () => {
      // Realtime이 정상 작동 중이면 polling 스킵
      if (realtimeActiveRef.current) return;

      // 현재 state의 마지막(최신) 메시지 이후의 새 메시지만 조회
      const newestCreatedAt = messagesRef.current[messagesRef.current.length - 1]?.created_at;

      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConvId)
        .order('created_at', { ascending: true })
        .limit(MESSAGE_PAGE_SIZE);

      if (newestCreatedAt) {
        query = query.gt('created_at', newestCreatedAt);
      }

      const { data } = await query;

      if (!data || data.length === 0) return;

      // 새 메시지만 append (중복 제거)
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = (data as Message[]).filter((m) => !existingIds.has(m.id));
        if (newMsgs.length === 0) return prev;
        return [...prev, ...newMsgs];
      });

      markReadIfNeeded(selectedConvId);
      refreshConversations();
    };

    const intervalId = setInterval(poll, THREAD_POLL_MS);
    return () => clearInterval(intervalId);
  }, [selectedConvId]);

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  // 빈 상태
  if (!isLoading && conversations.length === 0 && !isNewDialogOpen) {
    return (
      <div>
        <EmptyState
          icon={<MessageSquare className="mx-auto h-12 w-12 text-gray-400" />}
          title="아직 메시지가 없습니다"
          description="멤버에게 새 메시지를 보내보세요."
          action={
            <Button onClick={() => setIsNewDialogOpen(true)}>
              새 메시지 보내기
            </Button>
          }
        />
        <NewConversationDialog
          open={isNewDialogOpen}
          onOpenChange={setIsNewDialogOpen}
          onCreated={handleConversationCreated}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white rounded-lg shadow overflow-hidden">
      {/* 좌측: 목록 (모바일에서는 thread 표시 시 숨김) */}
      <div
        className={cn(
          'w-full md:w-80 lg:w-96 border-r flex flex-col',
          showMobileThread ? 'hidden md:flex' : 'flex',
        )}
      >
        <ConversationList
          conversations={conversations}
          selectedId={selectedConvId}
          isLoading={isLoading}
          onSelect={handleSelectConversation}
          onNewConversation={() => setIsNewDialogOpen(true)}
        />
      </div>

      {/* 우측: 메시지 영역 (모바일에서는 thread 표시 시 전체 화면) */}
      <div
        className={cn(
          'flex-1 flex flex-col',
          showMobileThread ? 'flex' : 'hidden md:flex',
        )}
      >
        {selectedConv ? (
          <MessageThread
            conversation={selectedConv}
            messages={messages}
            isLoading={isMessagesLoading}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onSendMessage={handleSendMessage}
            onLoadMore={handleLoadMore}
            onMobileBack={handleMobileBack}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 mb-3" />
              <p className="text-sm">메시지를 선택하세요</p>
            </div>
          </div>
        )}
      </div>

      {/* 새 메시지 다이얼로그 */}
      <NewConversationDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        onCreated={handleConversationCreated}
      />
    </div>
  );
}
