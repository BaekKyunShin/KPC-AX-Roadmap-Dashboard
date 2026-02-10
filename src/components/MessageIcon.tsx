'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { MESSAGE_BADGE_MAX } from '@/lib/constants/message';
import { createClient } from '@/lib/supabase/client';
import { fetchUnreadConversationCount } from '@/app/(dashboard)/dashboard/messages/actions';

// =============================================================================
// Types
// =============================================================================

interface MessageIconProps {
  initialUnreadCount: number;
}

// =============================================================================
// Component
// =============================================================================

export default function MessageIcon({ initialUnreadCount }: MessageIconProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const currentUserIdRef = useRef<string | null>(null);

  // 서버에서 전달된 initialUnreadCount가 변경되면 동기화
  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  // 서버에서 실제 안읽음 대화 수 조회
  const refreshCount = useCallback(async () => {
    const count = await fetchUnreadConversationCount();
    setUnreadCount(count);
  }, []);

  // Realtime: 새 메시지 수신 시 실제 카운트 조회 (debounce 적용)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) currentUserIdRef.current = data.user.id;
    });

    const channel = supabase
      .channel('message-icon:badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as { sender_id: string };
          if (newMsg.sender_id === currentUserIdRef.current) return;

          // 연속 메시지 수신 시 서버 부하 방지를 위한 debounce (500ms)
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            refreshCount();
          }, 500);
        },
      )
      .subscribe();

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [refreshCount]);

  const badgeText =
    unreadCount > MESSAGE_BADGE_MAX
      ? `${MESSAGE_BADGE_MAX}+`
      : `${unreadCount}`;

  return (
    <button
      onClick={() => router.push('/dashboard/messages')}
      className="relative flex items-center justify-center h-9 w-9 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
      aria-label={`메시지 ${unreadCount > 0 ? `${unreadCount}개 안읽음` : ''}`}
    >
      <MessageSquare className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none">
          {badgeText}
        </span>
      )}
    </button>
  );
}
