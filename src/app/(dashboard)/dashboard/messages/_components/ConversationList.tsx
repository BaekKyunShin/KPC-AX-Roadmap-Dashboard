'use client';

import { SquarePen, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, ROLE_BADGE_STYLES, ROLE_AVATAR_COLORS, getInitials } from '@/lib/constants/message';
import { formatRelativeTime } from '@/lib/utils/consultant-home';
import type { ConversationWithPreview } from '@/types/database';

// =============================================================================
// Types
// =============================================================================

interface ConversationListProps {
  conversations: ConversationWithPreview[];
  selectedId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

function truncateMessage(content: string, maxLength = 40): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '…';
}

// =============================================================================
// Component
// =============================================================================

export default function ConversationList({
  conversations,
  selectedId,
  isLoading,
  onSelect,
  onNewConversation,
}: ConversationListProps) {
  return (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-base font-semibold text-gray-900">메시지</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={onNewConversation}
          className="h-8 w-8 p-0 border-gray-300 text-gray-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50"
          aria-label="새 메시지"
        >
          <SquarePen className="h-4 w-4" />
        </Button>
      </div>

      {/* 대화 목록 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ConversationListSkeleton />
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">메시지가 없습니다</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function ConversationItem({
  conversation,
  isSelected,
  onSelect,
}: {
  conversation: ConversationWithPreview;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const { other_user, last_message, has_unread } = conversation;
  const avatarColor = ROLE_AVATAR_COLORS[other_user.role] || 'bg-gradient-to-br from-gray-400 to-gray-500';
  const badgeStyle = ROLE_BADGE_STYLES[other_user.role] || '';
  const roleLabel = ROLE_LABELS[other_user.role] || other_user.role;

  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'flex items-start gap-3 w-full px-4 py-3 text-left transition-colors hover:bg-gray-50',
        isSelected && 'bg-blue-50 hover:bg-blue-50',
        has_unread && !isSelected && 'bg-blue-50/30',
      )}
    >
      {/* 아바타 */}
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className={cn('text-white text-xs font-medium', avatarColor)}>
          {getInitials(other_user.name)}
        </AvatarFallback>
      </Avatar>

      {/* 텍스트 영역 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn(
                'text-sm truncate',
                has_unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700',
              )}
            >
              {other_user.name}
            </span>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', badgeStyle)}>
              {roleLabel}
            </Badge>
          </div>
          {last_message && (
            <span className="text-[11px] text-gray-400 shrink-0">
              {formatRelativeTime(last_message.created_at)}
            </span>
          )}
        </div>

        {last_message && (
          <p
            className={cn(
              'text-xs mt-0.5 truncate',
              has_unread ? 'text-gray-700 font-medium' : 'text-gray-400',
            )}
          >
            {truncateMessage(last_message.content)}
          </p>
        )}
      </div>

      {/* 안읽음 도트 */}
      {has_unread && (
        <span className="mt-2 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
      )}
    </button>
  );
}

function ConversationListSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-10 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
