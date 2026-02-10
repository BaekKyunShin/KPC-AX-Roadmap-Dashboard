'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import NewConversationDialog from './NewConversationDialog';
import { fetchConversations, fetchMessages, sendMessage, markConversationRead } from '../actions';
import type { ConversationWithPreview, Message } from '@/types/database';

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
  // 모바일: 메시지 뷰 표시 여부
  const [showMobileThread, setShowMobileThread] = useState(false);

  // 현재 사용자 ID (Realtime 필터링용)
  const currentUserIdRef = useRef<string | null>(null);
  // 현재 선택된 대화 ID (Realtime 콜백에서 참조용)
  const selectedConvIdRef = useRef<string | null>(null);

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
        if (msgResult.success) setMessages(msgResult.data);

        await markConversationRead(initialConvId);

        setConversations((prev) =>
          prev.map((c) => (c.id === initialConvId ? { ...c, has_unread: false } : c)),
        );

        window.dispatchEvent(new CustomEvent('conversation-read'));
      }

      setIsLoading(false);
    });
  }, [initialConvId]);

  // 목록 새로고침 (이벤트 핸들러에서만 호출)
  const refreshConversations = async () => {
    const result = await fetchConversations();
    if (result.success) {
      setConversations(result.data);
    }
  };

  // selectedConvId ref 동기화
  selectedConvIdRef.current = selectedConvId;

  // 선택 시 메시지 로드 (이벤트 핸들러)
  const handleSelectConversation = async (convId: string) => {
    setSelectedConvId(convId);
    setShowMobileThread(true);
    setIsMessagesLoading(true);

    const result = await fetchMessages(convId);
    if (result.success) {
      setMessages(result.data);
    }

    // 읽음 처리
    await markConversationRead(convId);

    // 목록에서 안읽음 상태 해제
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, has_unread: false } : c)),
    );

    // MessageIcon 뱃지 즉시 갱신 (router.refresh() 대신 직접 알림)
    window.dispatchEvent(new CustomEvent('conversation-read'));

    setIsMessagesLoading(false);
  };

  // 메시지 전송
  const handleSendMessage = async (content: string) => {
    if (!selectedConvId) return;

    const result = await sendMessage(selectedConvId, content);
    if (result.success) {
      setMessages((prev) => [...prev, result.data]);
      // 목록 새로고침 (마지막 메시지 업데이트)
      refreshConversations();
    }
    return result;
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

    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${selectedConvId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConvId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // 내가 보낸 메시지는 이미 추가됨 (optimistic)
          if (newMsg.sender_id === currentUserIdRef.current) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // 현재 보고 있으므로 바로 읽음 처리
          await markConversationRead(selectedConvId);
          window.dispatchEvent(new CustomEvent('conversation-read'));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConvId]);

  // Realtime: 모든 대화의 새 메시지 (목록 갱신 + 네비게이션 뱃지)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('messages:all')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === currentUserIdRef.current) return;

          refreshConversations();

          // 현재 보고 있는 대화의 메시지는 이미 읽음 처리(markConversationRead)가
          // 실행되므로, router.refresh()로 레이아웃을 재렌더링하면
          // 메시지 뱃지가 0으로 리셋되는 race condition이 발생함.
          // → 다른 대화의 메시지일 때만 레이아웃 갱신
          const msgConvId = (payload.new as { conversation_id?: string }).conversation_id;
          if (msgConvId !== selectedConvIdRef.current) {
            router.refresh();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  // 빈 상태
  if (!isLoading && conversations.length === 0 && !isNewDialogOpen) {
    return (
      <div>
        <EmptyState
          icon={<MessageSquare className="mx-auto h-12 w-12 text-gray-400" />}
          title="아직 메시지가 없습니다"
          description="팀원에게 새 메시지를 보내보세요."
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
    <div className="flex h-[calc(100vh-10rem)] bg-white rounded-lg shadow overflow-hidden">
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
            onSendMessage={handleSendMessage}
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
