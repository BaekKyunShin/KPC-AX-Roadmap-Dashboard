'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import {
  CONVERSATION_READ_EVENT,
  MAX_REALTIME_RETRIES,
  MESSAGE_BADGE_MAX,
  REALTIME_RETRY_BASE_MS,
  REALTIME_RETRY_MAX_MS,
} from '@/lib/constants/message';
import { createClient } from '@/lib/supabase/client';
import { fetchUnreadConversationCount } from '@/app/(dashboard)/dashboard/messages/actions';

// =============================================================================
// Constants
// =============================================================================

/** Polling 간격 (30초) — Realtime 실패 시에만 활성화되는 fallback */
const POLL_INTERVAL_MS = 30_000;

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
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const currentUserIdRef = useRef<string | null>(null);

  // 서버에서 전달된 initialUnreadCount가 변경되면 동기화
  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  // 서버에서 실제 안읽음 대화 수 조회
  const refreshCount = async () => {
    const count = await fetchUnreadConversationCount();
    setUnreadCount(count);
  };

  // Realtime: 인증 세션 로드 후 구독 (CHANNEL_ERROR 방지)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Realtime 실패 시에만 활성화되는 polling
  const startFallbackPolling = () => {
    if (pollIntervalRef.current) return; // 이미 실행 중
    pollIntervalRef.current = setInterval(refreshCount, POLL_INTERVAL_MS);
  };

  const stopFallbackPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function subscribe() {
      if (!isMounted) return;

      // 인증 세션이 로드될 때까지 대기 — 이것이 핵심
      // Realtime 구독 전에 auth.uid()가 유효해야 RLS 정책 통과
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMounted) return;
      if (!user) return;

      currentUserIdRef.current = user.id;

      // 이전 채널이 있으면 정리
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      channelRef.current = supabase
        .channel('message-icon:badge')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new as { sender_id: string };
            // 내가 보낸 메시지는 무시
            if (newMsg.sender_id === currentUserIdRef.current) return;

            // 연속 메시지 수신 시 서버 부하 방지를 위한 debounce (500ms)
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

            debounceTimerRef.current = setTimeout(async () => {
              const count = await fetchUnreadConversationCount();
              if (!isMounted) return;
              setUnreadCount(count);
            }, 500);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryCount = 0;
            stopFallbackPolling();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (retryCount < MAX_REALTIME_RETRIES) {
              retryCount++;
              const delay = Math.min(
                REALTIME_RETRY_BASE_MS * 2 ** retryCount,
                REALTIME_RETRY_MAX_MS
              );
              retryTimer = setTimeout(() => subscribe(), delay);
            } else {
              // 재시도 소진 → polling fallback 활성화
              startFallbackPolling();
            }
          }
        });
    }

    subscribe();

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (retryTimer) clearTimeout(retryTimer);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      stopFallbackPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler가 메모이제이션 처리
  }, []);

  // 대화 읽음 처리 시 즉시 뱃지 갱신 (MessagesClient에서 dispatch)
  // + 탭 복귀 시 즉시 갱신
  useEffect(() => {
    function handleMessageRead() {
      refreshCount();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        refreshCount();
      }
    }

    window.addEventListener(CONVERSATION_READ_EVENT, handleMessageRead);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener(CONVERSATION_READ_EVENT, handleMessageRead);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const badgeText = unreadCount > MESSAGE_BADGE_MAX ? `${MESSAGE_BADGE_MAX}+` : `${unreadCount}`;

  return (
    <Link
      href="/dashboard/messages"
      prefetch={true}
      className="relative flex items-center justify-center h-9 w-9 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
      aria-label={`메시지 ${unreadCount > 0 ? `${unreadCount}개 안읽음` : ''}`}
    >
      <MessageSquare className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none">
          {badgeText}
        </span>
      )}
    </Link>
  );
}
