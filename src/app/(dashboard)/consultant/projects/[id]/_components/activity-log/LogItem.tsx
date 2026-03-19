'use client';

import { useState } from 'react';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';
import { TOAST_ERROR } from '@/lib/constants/toast-messages';
import {
  ACTIVITY_LOG_TYPE_CONFIG,
  ACTIVITY_LOG_PREVIEW_LENGTH,
  ACTIVITY_LOG_MAX_LENGTH,
} from '@/lib/constants/activity-log';
import { updateActivityLog, deleteActivityLog, type ActivityLogItem } from '../../actions';
import { ICON_MAP } from './constants';
import { formatRelativeTime } from './helpers';

interface LogItemProps {
  log: ActivityLogItem;
  projectId: string;
  onUpdated: () => void;
}

export function LogItem({ log, projectId, onUpdated }: LogItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(log.content);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = ACTIVITY_LOG_TYPE_CONFIG[log.type];
  const IconComponent = ICON_MAP[log.type];
  const isSystem = log.type === 'system_auto';
  const isLong = log.content.length > ACTIVITY_LOG_PREVIEW_LENGTH;
  const isEdited = log.updated_at !== log.created_at;

  async function handleUpdate() {
    if (!editContent.trim()) return;
    setIsSubmitting(true);

    try {
      const result = await updateActivityLog(log.id, projectId, editContent.trim());

      if (result.success) {
        showSuccessToast('기록 수정 완료', '변경 사항이 저장되었습니다.');
        setIsEditing(false);
        onUpdated();
      } else {
        showErrorToast('수정 실패', result.error);
      }
    } catch {
      showErrorToast('기록 수정 실패', TOAST_ERROR.NETWORK);
    }
    setIsSubmitting(false);
  }

  async function handleDelete() {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    try {
      const result = await deleteActivityLog(log.id, projectId);

      if (result.success) {
        showSuccessToast('기록 삭제 완료', '활동 기록이 삭제되었습니다.');
        onUpdated();
      } else {
        showErrorToast('삭제 실패', result.error);
      }
    } catch {
      showErrorToast('기록 삭제 실패', TOAST_ERROR.NETWORK);
    }
  }

  function handleCancelEdit() {
    setEditContent(log.content);
    setIsEditing(false);
  }

  // 시스템 자동 기록: 간결한 스타일
  if (isSystem) {
    return (
      <div className="flex items-center gap-3 py-2 px-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
          <IconComponent className="h-3.5 w-3.5 text-gray-400" />
        </div>
        <span className="text-sm text-gray-500">{log.content}</span>
        <span className="ml-auto text-xs text-gray-400 shrink-0">
          {formatRelativeTime(log.created_at)}
        </span>
      </div>
    );
  }

  // 수동 기록: 전체 스타일
  return (
    <div className="flex gap-3 py-3 px-3 rounded-lg hover:bg-gray-100 transition-colors">
      {/* 아이콘 */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          config.bgColor,
        )}
      >
        <IconComponent className={cn('h-4 w-4', config.color)} />
      </div>

      {/* 내용 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
              config.bgColor,
              config.textColor,
            )}
          >
            {config.label}
          </span>
          <span className="text-xs text-gray-400">
            {formatRelativeTime(log.created_at)}
          </span>
          {isEdited && (
            <span className="text-xs text-gray-400">(수정됨)</span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px] text-sm"
              maxLength={ACTIVITY_LOG_MAX_LENGTH}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={isSubmitting || !editContent.trim()}
              >
                {isSubmitting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                저장
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
              {isLong && !isExpanded
                ? `${log.content.slice(0, ACTIVITY_LOG_PREVIEW_LENGTH)}...`
                : log.content}
            </p>
            {isLong && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1 flex items-center gap-0.5 text-xs text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? (
                  <>
                    접기 <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    더 보기 <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 더보기 메뉴 */}
      {!isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 shrink-0 p-0 text-gray-400 hover:text-gray-600"
              data-testid="more-actions-button"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              수정
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
