'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fetchAvailableRecipients, createConversation } from '../actions';
import { showErrorToast } from '@/lib/utils/toast';
import { TOAST_ERROR } from '@/lib/constants/toast-messages';
import { ROLE_BADGE_STYLES } from '@/lib/constants/message';
import type { RecipientGroup } from '@/types/database';

// =============================================================================
// Types
// =============================================================================

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export default function NewConversationDialog({
  open,
  onOpenChange,
  onCreated,
}: NewConversationDialogProps) {
  const [groups, setGroups] = useState<RecipientGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 다이얼로그 열릴 때 수신자 목록 로드 (open prop 변경 감지)
  useEffect(() => {
    if (!open) return;

    async function loadRecipients() {
      setIsLoading(true);
      const result = await fetchAvailableRecipients();
      if (result.success) setGroups(result.data);
      setIsLoading(false);
    }

    loadRecipients();
  }, [open]);

  // 닫힐 때 검색어 초기화 (이벤트 핸들러)
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setSearchQuery('');
    onOpenChange(newOpen);
  };

  const handleSelectUser = async (userId: string) => {
    if (isCreating) return;

    setIsCreating(true);
    try {
      const result = await createConversation(userId);

      if (result.success) {
        onCreated(result.data.conversationId);
      } else {
        showErrorToast('메시지 생성 실패', result.error);
      }
    } catch (err) {
      console.error('[handleSelectUser]', err);
      showErrorToast('메시지 전송 실패', TOAST_ERROR.NETWORK);
    } finally {
      setIsCreating(false);
    }
  };

  // 검색 필터링
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      users: group.users.filter((u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((group) => group.users.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 메시지</DialogTitle>
        </DialogHeader>

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 사용자 목록 */}
        <div className="max-h-[360px] overflow-y-auto">
          {isLoading ? (
            <RecipientsSkeleton />
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Users className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">
                {searchQuery ? '검색 결과가 없습니다' : '메시지를 보낼 수 있는 사용자가 없습니다'}
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.role} className="mb-2">
                {/* 역할 그룹 헤더 */}
                <div className="px-2 py-1.5">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {group.role_label}
                  </span>
                </div>

                {/* 사용자 목록 */}
                {group.users.map((user) => (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => handleSelectUser(user.id)}
                    disabled={isCreating}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-medium">
                        {user.name.slice(0, 1)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                      {user.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] px-1.5 py-0 shrink-0', ROLE_BADGE_STYLES[group.role] || '')}
                    >
                      {group.role_label}
                    </Badge>
                  </button>
                ))}
              </div>
            ))
          )}

          {/* 생성 중 표시 */}
          {isCreating && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-gray-500">메시지 준비 중...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function RecipientsSkeleton() {
  return (
    <div className="space-y-2 px-2">
      <div className="px-2 py-1.5">
        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2.5">
          <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
          <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
