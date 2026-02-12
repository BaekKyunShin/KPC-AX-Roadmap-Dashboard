'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, ROLE_BADGE_STYLES, ROLE_AVATAR_COLORS, MESSAGE_MAX_LENGTH, getInitials } from '@/lib/constants/message';
import type { ConversationWithPreview, Message } from '@/types/database';

// =============================================================================
// Types
// =============================================================================

interface MessageThreadProps {
  conversation: ConversationWithPreview;
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onSendMessage: (content: string) => Promise<{ success: boolean; error?: string } | undefined>;
  onLoadMore: () => void;
  onMobileBack: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

/** 같은 날짜인지 확인 */
function isSameDay(dateStr1: string, dateStr2: string): boolean {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/** 날짜 구분선 텍스트 */
function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (todayStart.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** 메시지 시간만 표시 */
function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// Component
// =============================================================================

export default function MessageThread({
  conversation,
  messages,
  isLoading,
  hasMore,
  isLoadingMore,
  onSendMessage,
  onLoadMore,
  onMobileBack,
}: MessageThreadProps) {
  const { other_user } = conversation;
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const avatarColor = ROLE_AVATAR_COLORS[other_user.role] || 'bg-gradient-to-br from-gray-400 to-gray-500';
  const badgeStyle = ROLE_BADGE_STYLES[other_user.role] || '';
  const roleLabel = ROLE_LABELS[other_user.role] || other_user.role;

  // 스크롤 관리용 refs
  const prevFirstMsgIdRef = useRef<string | null>(null);
  const prevLastMsgIdRef = useRef<string | null>(null);
  const prevLoadingRef = useRef(true);

  // 초기 로드 + prepend (useLayoutEffect: paint 전 동기 실행 → 깜빡임 방지)
  useLayoutEffect(() => {
    if (isLoading || messages.length === 0) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const currentFirstId = messages[0]?.id ?? null;
    const prevFirstId = prevFirstMsgIdRef.current;

    if (prevLoadingRef.current) {
      // 초기 로드 / 대화 전환 → 즉시 하단 스크롤 (paint 전 실행하여 깜빡임 방지)
      container.scrollTop = container.scrollHeight;
    } else if (prevFirstId && currentFirstId !== prevFirstId) {
      // prepend 감지 → 이전 위치 유지
      const anchor = container.querySelector(`[data-msg-id="${prevFirstId}"]`);
      if (anchor) {
        (anchor as HTMLElement).scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
      }
    }
  }, [messages, isLoading]);

  // 새 메시지 append + ref 관리 (useEffect: paint 후 실행)
  useEffect(() => {
    if (isLoading) {
      prevLoadingRef.current = true;
      return;
    }

    if (messages.length === 0) return;

    const currentFirstId = messages[0]?.id ?? null;
    const currentLastId = messages[messages.length - 1]?.id ?? null;

    // append (새 메시지) → 부드러운 하단 스크롤
    if (!prevLoadingRef.current
        && currentFirstId === prevFirstMsgIdRef.current
        && currentLastId !== prevLastMsgIdRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    prevLoadingRef.current = false;
    prevFirstMsgIdRef.current = currentFirstId;
    prevLastMsgIdRef.current = currentLastId;
  }, [messages, isLoading]);

  // 스크롤 이벤트: 상단 근처(100px 이내)에서 이전 메시지 로드
  // isLoading 가드: 초기 로드 중에는 scrollTop=0이므로 onLoadMore 잘못 호출 방지
  useEffect(() => {
    if (isLoading) return;
    const container = scrollContainerRef.current;
    if (!container || !hasMore || isLoadingMore) return;

    const handleScroll = () => {
      if (container.scrollTop < 100) onLoadMore();
    };

    // 콘텐츠가 뷰포트를 채우지 못하는 경우 즉시 체크
    if (container.scrollTop < 100) onLoadMore();

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, onLoadMore, isLoading]);

  // textarea 높이 자동 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setInputValue('');
    await onSendMessage(trimmed);
    setIsSending(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 한국어/일본어/중국어 IME 조합 중에는 Enter를 가로채지 않음
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
        {/* 모바일 뒤로가기 */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 shrink-0"
          onClick={onMobileBack}
          aria-label="뒤로가기"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className={cn('text-white text-xs font-medium', avatarColor)}>
            {getInitials(other_user.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-900 truncate">{other_user.name}</span>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', badgeStyle)}>
            {roleLabel}
          </Badge>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50">
        {isLoading ? (
          <MessagesSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-sm">첫 메시지를 보내보세요</p>
          </div>
        ) : (
          <>
            {isLoadingMore && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="ml-2 text-xs text-gray-400">이전 메시지 로딩 중...</span>
              </div>
            )}
            {messages.map((msg, idx) => {
              const isMe = msg.sender_id !== other_user.id;
              const showDateSep =
                idx === 0 || !isSameDay(messages[idx - 1].created_at, msg.created_at);

              return (
                <div key={msg.id} data-msg-id={msg.id}>
                  {showDateSep && <DateSeparator date={msg.created_at} />}
                  <MessageBubble
                    message={msg}
                    isMe={isMe}
                    otherUserName={other_user.name}
                    avatarColor={avatarColor}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 입력 영역 */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 px-4 py-3 border-t bg-white">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          maxLength={MESSAGE_MAX_LENGTH}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!inputValue.trim() || isSending}
          className="h-9 w-9 shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center py-3">
      <span className="text-[11px] text-gray-400 bg-gray-50 px-3">
        {formatDateSeparator(date)}
      </span>
    </div>
  );
}

function MessageBubble({
  message,
  isMe,
  otherUserName,
  avatarColor,
}: {
  message: Message;
  isMe: boolean;
  otherUserName: string;
  avatarColor: string;
}) {
  return (
    <div className={cn('flex items-end gap-2 mb-2', isMe ? 'justify-end' : 'justify-start')}>
      {/* 상대방 아바타 */}
      {!isMe && (
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className={cn('text-white text-[10px] font-medium', avatarColor)}>
            {getInitials(otherUserName)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'max-w-[280px] sm:max-w-[360px] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words',
            isMe
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md',
          )}
        >
          {message.content}
        </div>
        <span className="text-[10px] text-gray-400 mt-0.5 px-1">
          {formatMessageTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-4">
      {/* 상대방 메시지 */}
      <div className="flex items-end gap-2">
        <div className="h-7 w-7 rounded-full bg-gray-200 animate-pulse shrink-0" />
        <div className="space-y-1">
          <div className="h-10 w-48 bg-white border border-gray-200 rounded-2xl rounded-bl-md animate-pulse" />
          <div className="h-2 w-10 bg-gray-200 rounded animate-pulse ml-1" />
        </div>
      </div>
      {/* 내 메시지 */}
      <div className="flex items-end gap-2 justify-end">
        <div className="space-y-1 flex flex-col items-end">
          <div className="h-10 w-40 bg-blue-100 rounded-2xl rounded-br-md animate-pulse" />
          <div className="h-2 w-10 bg-gray-200 rounded animate-pulse mr-1" />
        </div>
      </div>
      {/* 상대방 메시지 */}
      <div className="flex items-end gap-2">
        <div className="h-7 w-7 rounded-full bg-gray-200 animate-pulse shrink-0" />
        <div className="space-y-1">
          <div className="h-16 w-56 bg-white border border-gray-200 rounded-2xl rounded-bl-md animate-pulse" />
          <div className="h-2 w-10 bg-gray-200 rounded animate-pulse ml-1" />
        </div>
      </div>
    </div>
  );
}
