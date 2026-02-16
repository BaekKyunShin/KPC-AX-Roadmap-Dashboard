'use client';

import { useState, useEffect } from 'react';
import {
  ACTIVITY_LOG_PAGE_SIZE,
  type ActivityLogType,
  type ManualActivityLogType,
} from '@/lib/constants/activity-log';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';
import {
  fetchActivityLogs,
  createActivityLog,
  type ActivityLogItem,
} from '../../actions';

export function useActivityLogs(projectId: string) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [newType, setNewType] = useState<ManualActivityLogType>('field_note');
  const [newContent, setNewContent] = useState('');

  const loadInitial = async () => {
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
  };

  // 초기 로드 + 필터 변경 시
  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler가 메모이제이션 처리
  }, [filterType, projectId]);

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

  return {
    logs,
    total,
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
  };
}
