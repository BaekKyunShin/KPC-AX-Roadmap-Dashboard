'use client';

import { useState } from 'react';
import { Trash2, Eye, Clock, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TestHistoryItem {
  id: string;
  company_name: string;
  industry: string;
  company_size: string;
  created_at: string;
  roadmap_count: number;
}

interface TestHistoryListProps {
  items: TestHistoryItem[];
  onView: (projectId: string) => void | Promise<void>;
  onDelete: (projectId: string) => Promise<void>;
}

export default function TestHistoryList({ items, onView, onDelete }: TestHistoryListProps) {
  // 삭제 관련 상태
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 보기 로딩 상태 (현재 로드 중인 항목 ID)
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // 로딩 중일 때 모든 버튼 비활성화
  const isAnyLoading = loadingId !== null;

  const handleView = async (projectId: string) => {
    setLoadingId(projectId);
    try {
      await onView(projectId);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteId);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>아직 테스트 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{item.company_name}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {item.industry}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">{formatDate(item.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleView(item.id)}
                disabled={isAnyLoading}
              >
                {loadingId === item.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    불러오는 중...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    보기
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setDeleteId(item.id)}
                disabled={isAnyLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>테스트 기록 삭제</DialogTitle>
            <DialogDescription>
              이 테스트 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
