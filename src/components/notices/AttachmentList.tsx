'use client';

import { useState, useTransition } from 'react';
import { Trash2, Download, Paperclip, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';
import { deleteAttachmentAction } from '@/app/(dashboard)/ops/notices/actions';
import type { NoticeAttachment } from '@/types/database';

interface AttachmentListProps {
  attachments: NoticeAttachment[];
  /** 관리자 편집 화면이면 true — 삭제 버튼 표시 */
  editable?: boolean;
  /** 다운로드 URL을 조회하는 Server Action (서명 URL 생성) */
  onDownload: (storagePath: string) => Promise<string | null>;
  /** 삭제 성공 시 부모 상태 업데이트 */
  onDeleted?: (attachmentId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({
  attachments,
  editable = false,
  onDownload,
  onDeleted,
}: AttachmentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!attachments || attachments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">첨부 파일이 없습니다.</p>
    );
  }

  async function handleDownload(att: NoticeAttachment): Promise<void> {
    setDownloadingId(att.id);
    try {
      const url = await onDownload(att.storage_path);
      if (!url) {
        showErrorToast('다운로드 링크 생성 실패');
        return;
      }
      // 다운로드 트리거
      const link = document.createElement('a');
      link.href = url;
      link.download = att.file_name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      const message = e instanceof Error ? e.message : '알 수 없는 오류';
      showErrorToast('다운로드 실패', message);
    } finally {
      setDownloadingId(null);
    }
  }

  function handleDelete(att: NoticeAttachment) {
    if (!confirm(`"${att.file_name}" 파일을 삭제하시겠습니까?`)) return;
    setDeletingId(att.id);
    startTransition(async () => {
      const result = await deleteAttachmentAction(att.id);
      if (result.success) {
        showSuccessToast('첨부가 삭제되었습니다.');
        onDeleted?.(att.id);
      } else {
        showErrorToast('삭제 실패', result.error);
      }
      setDeletingId(null);
    });
  }

  return (
    <ul className="divide-y divide-border rounded-md border" data-testid="attachment-list">
      {attachments.map((att) => {
        const deleting = deletingId === att.id && isPending;
        const downloading = downloadingId === att.id;
        return (
          <li
            key={att.id}
            className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{att.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(att.file_size)}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleDownload(att)}
                disabled={downloading}
                className="gap-1.5"
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                다운로드
              </Button>
              {editable && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(att)}
                  disabled={deleting}
                  className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`${att.file_name} 삭제`}
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
