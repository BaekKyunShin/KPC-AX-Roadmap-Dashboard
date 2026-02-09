'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  FileText,
  CheckSquare,
  MessageSquare,
  Settings,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';
import {
  ACTIVITY_LOG_TYPE_CONFIG,
  MANUAL_ACTIVITY_LOG_TYPES,
  ACTIVITY_LOG_PAGE_SIZE,
  ACTIVITY_LOG_PREVIEW_LENGTH,
  ACTIVITY_LOG_MAX_LENGTH,
  type ActivityLogType,
  type ManualActivityLogType,
} from '@/lib/constants/activity-log';
import {
  fetchActivityLogs,
  createActivityLog,
  updateActivityLog,
  deleteActivityLog,
  type ActivityLogItem,
} from '../actions';

// ============================================================================
// 타입 및 상수
// ============================================================================

interface ActivityLogProps {
  projectId: string;
}

const ICON_MAP: Record<ActivityLogType, typeof Search> = {
  pre_research: Search,
  field_note: FileText,
  follow_up: CheckSquare,
  client_feedback: MessageSquare,
  system_auto: Settings,
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: '전체' },
  ...MANUAL_ACTIVITY_LOG_TYPES.map((type) => ({
    value: type,
    label: ACTIVITY_LOG_TYPE_CONFIG[type].label,
  })),
];

// ============================================================================
// 헬퍼 함수
// ============================================================================

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return '오늘';
  if (date.toDateString() === yesterday.toDateString()) return '어제';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function groupLogsByDate(logs: ActivityLogItem[]): Map<string, ActivityLogItem[]> {
  const groups = new Map<string, ActivityLogItem[]>();
  for (const log of logs) {
    const dateKey = new Date(log.created_at).toDateString();
    const existing = groups.get(dateKey) ?? [];
    existing.push(log);
    groups.set(dateKey, existing);
  }
  return groups;
}

// ============================================================================
// 서브 컴포넌트: 로그 아이템
// ============================================================================

function LogItem({
  log,
  projectId,
  onUpdated,
}: {
  log: ActivityLogItem;
  projectId: string;
  onUpdated: () => void;
}) {
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
    const result = await updateActivityLog(log.id, projectId, editContent.trim());
    setIsSubmitting(false);

    if (result.success) {
      showSuccessToast('기록이 수정되었습니다.');
      setIsEditing(false);
      onUpdated();
    } else {
      showErrorToast('수정 실패', result.error);
    }
  }

  async function handleDelete() {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    const result = await deleteActivityLog(log.id, projectId);

    if (result.success) {
      showSuccessToast('기록이 삭제되었습니다.');
      onUpdated();
    } else {
      showErrorToast('삭제 실패', result.error);
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

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ActivityLog({ projectId }: ActivityLogProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [newType, setNewType] = useState<ManualActivityLogType>('field_note');
  const [newContent, setNewContent] = useState('');

  const loadInitial = useCallback(async () => {
    setIsLoading(true);
    const typeFilter = filterType === 'all' ? undefined : (filterType as ActivityLogType);
    const result = await fetchActivityLogs(projectId, {
      type: typeFilter,
      limit: ACTIVITY_LOG_PAGE_SIZE,
      offset: 0,
    });
    setLogs(result.logs);
    setTotal(result.total);
    setIsLoading(false);
  }, [projectId, filterType]);

  // 초기 로드 + 필터 변경 시
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial data loading is intentional
    loadInitial();
  }, [loadInitial]);

  async function loadMore() {
    setIsLoadingMore(true);
    const typeFilter = filterType === 'all' ? undefined : (filterType as ActivityLogType);
    const result = await fetchActivityLogs(projectId, {
      type: typeFilter,
      limit: ACTIVITY_LOG_PAGE_SIZE,
      offset: logs.length,
    });
    setLogs((prev) => [...prev, ...result.logs]);
    setTotal(result.total);
    setIsLoadingMore(false);
  }

  async function handleSubmit() {
    if (!newContent.trim()) return;
    setIsSubmitting(true);

    const result = await createActivityLog(projectId, newType, newContent.trim());
    setIsSubmitting(false);

    if (result.success) {
      showSuccessToast('기록이 저장되었습니다.');
      setNewContent('');
      setIsFormOpen(false);
      loadInitial();
    } else {
      showErrorToast('저장 실패', result.error);
    }
  }

  const hasMore = logs.length < total;
  const dateGroups = groupLogsByDate(logs);

  return (
    <div className="bg-white shadow rounded-lg">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">활동 일지</h2>
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filterType === opt.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-4">
        {/* 입력 폼 토글 */}
        {!isFormOpen ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center border-dashed text-gray-500 hover:text-gray-700"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            기록 추가
          </Button>
        ) : (
          <div className="rounded-lg border bg-gray-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as ManualActivityLogType)}
              >
                <SelectTrigger className="w-[140px] h-8 text-sm bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_ACTIVITY_LOG_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ACTIVITY_LOG_TYPE_CONFIG[type].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400"
                onClick={() => {
                  setIsFormOpen(false);
                  setNewContent('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="활동 내용을 입력하세요..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[80px] text-sm bg-white"
              maxLength={ACTIVITY_LOG_MAX_LENGTH}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {newContent.length}/{ACTIVITY_LOG_MAX_LENGTH}
              </span>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || !newContent.trim()}
              >
                {isSubmitting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                저장
              </Button>
            </div>
          </div>
        )}

        {/* 타임라인 */}
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                아직 활동 기록이 없습니다.
              </p>
              <p className="text-xs text-gray-400">
                사전 조사 메모나 현장 관찰 내용을 기록해 보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {Array.from(dateGroups.entries()).map(([dateKey, dateLogs]) => (
                <div key={dateKey}>
                  {/* 날짜 구분선 */}
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs font-medium text-gray-400">
                      {formatDateLabel(dateLogs[0].created_at)}
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  {/* 해당 날짜의 로그들 */}
                  {dateLogs.map((log) => (
                    <LogItem
                      key={log.id}
                      log={log}
                      projectId={projectId}
                      onUpdated={loadInitial}
                    />
                  ))}
                </div>
              ))}

              {/* 더 보기 */}
              {hasMore && (
                <div className="pt-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    이전 기록 더 보기
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
