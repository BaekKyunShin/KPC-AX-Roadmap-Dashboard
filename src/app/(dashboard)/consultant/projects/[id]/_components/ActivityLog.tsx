'use client';

import {
  FileText,
  Plus,
  ChevronDown,
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
import { cn } from '@/lib/utils';
import {
  ACTIVITY_LOG_TYPE_CONFIG,
  MANUAL_ACTIVITY_LOG_TYPES,
  ACTIVITY_LOG_MAX_LENGTH,
  type ManualActivityLogType,
} from '@/lib/constants/activity-log';
import { LogItem, useActivityLogs, FILTER_OPTIONS } from './activity-log';
import { groupLogsByDate, formatDateLabel } from './activity-log/helpers';

// ============================================================================
// 타입
// ============================================================================

interface ActivityLogProps {
  projectId: string;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ActivityLog({ projectId }: ActivityLogProps) {
  const {
    logs,
    isLoading,
    isLoadingMore,
    isFormOpen,
    setIsFormOpen,
    isSubmitting,
    filterType,
    setFilterType,
    newType,
    setNewType,
    newContent,
    setNewContent,
    loadInitial,
    loadMore,
    handleSubmit,
    hasMore,
  } = useActivityLogs(projectId);

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
