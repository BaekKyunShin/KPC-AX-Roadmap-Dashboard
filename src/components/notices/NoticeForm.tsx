'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldError } from '@/components/ui/field-error';
import { AttachmentUploader } from '@/components/notices/AttachmentUploader';
import { AttachmentList } from '@/components/notices/AttachmentList';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';
import {
  createNoticeAction,
  updateNoticeAction,
  uploadAttachmentAction,
} from '@/app/(dashboard)/ops/notices/actions';
import { getAttachmentDownloadUrl } from '@/app/(dashboard)/notices/actions';
import type { NoticeAttachment } from '@/types/database';

interface NoticeFormProps {
  mode: 'create' | 'edit';
  initial?: {
    id: string;
    title: string;
    body: string;
    is_pinned: boolean;
    attachments: NoticeAttachment[];
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NoticeForm({ mode, initial }: NoticeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<NoticeAttachment[]>(
    initial?.attachments ?? [],
  );
  /** 지연 업로드 모드(create)에서 선택된 파일들 */
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  async function handleDownload(path: string): Promise<string | null> {
    const result = await getAttachmentDownloadUrl(path);
    return result.success ? result.data.url : null;
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const title = String(formData.get('title') ?? '').trim();
    const body = String(formData.get('body') ?? '');
    const nextErrors: Record<string, string> = {};
    if (title.length === 0) nextErrors.title = '제목을 입력하세요.';
    if (title.length > 200) nextErrors.title = '제목은 200자 이하로 입력하세요.';
    if (body.length > 50000)
      nextErrors.body = '본문은 50,000자 이하로 입력하세요.';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      if (mode === 'create') {
        const result = await createNoticeAction(formData);
        if (!result.success) {
          showErrorToast('작성 실패', result.error);
          return;
        }

        const { noticeId } = result.data;

        // 선택된 파일을 순차 업로드 (실패해도 공지 본문은 이미 저장된 상태)
        let uploadedCount = 0;
        let failedCount = 0;
        for (const file of pendingFiles) {
          const fd = new FormData();
          fd.append('file', file);
          const uploadRes = await uploadAttachmentAction(noticeId, fd);
          if (uploadRes.success) {
            uploadedCount += 1;
          } else {
            failedCount += 1;
            showErrorToast(`첨부 업로드 실패: ${file.name}`, uploadRes.error);
          }
        }

        if (failedCount > 0) {
          showSuccessToast(
            `공지가 작성되었습니다. 첨부 ${uploadedCount}/${pendingFiles.length} 성공 · 실패한 파일은 수정 페이지에서 재시도하세요.`,
          );
          router.push(`/ops/notices/${noticeId}/edit`);
        } else {
          showSuccessToast(
            pendingFiles.length > 0
              ? `공지가 작성되었습니다. 첨부 ${uploadedCount}건 업로드 완료.`
              : '공지가 작성되었습니다.',
          );
          router.push('/ops/notices');
        }
        router.refresh();
      } else if (initial) {
        const result = await updateNoticeAction(initial.id, formData);
        if (result.success) {
          showSuccessToast('공지가 수정되었습니다.');
          router.refresh();
        } else {
          showErrorToast('수정 실패', result.error);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류';
      showErrorToast('저장 실패', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="notice-form">
      <div className="space-y-2">
        <Label htmlFor="title">
          제목 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          placeholder="공지 제목"
          defaultValue={initial?.title ?? ''}
          required
          maxLength={200}
          aria-invalid={!!errors.title}
        />
        <FieldError message={errors.title} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">본문</Label>
        <Textarea
          id="body"
          name="body"
          rows={20}
          placeholder="공지 내용"
          defaultValue={initial?.body ?? ''}
          maxLength={50000}
          aria-invalid={!!errors.body}
          className="min-h-[400px]"
        />
        <FieldError message={errors.body} />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="is_pinned"
          name="is_pinned"
          defaultChecked={initial?.is_pinned ?? false}
        />
        <Label htmlFor="is_pinned" className="cursor-pointer">
          상단 고정
        </Label>
      </div>

      {mode === 'create' && (
        <div className="space-y-3">
          <div>
            <Label>첨부 파일</Label>
            <p className="text-xs text-muted-foreground mt-1">
              파일을 선택하면 공지 저장 시 함께 업로드됩니다.
            </p>
          </div>
          <AttachmentUploader
            onFileSelected={(file) =>
              setPendingFiles((prev) => [...prev, file])
            }
          />
          {pendingFiles.length > 0 && (
            <ul
              className="rounded-md border bg-muted/30 divide-y"
              data-testid="pending-attachments"
            >
              {pendingFiles.map((file, idx) => (
                <li
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setPendingFiles((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
                    aria-label={`${file.name} 제거`}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === 'edit' && initial && (
        <div className="space-y-3">
          <div>
            <Label>첨부 파일</Label>
            <p className="text-xs text-muted-foreground mt-1">
              파일을 선택하면 즉시 업로드됩니다.
            </p>
          </div>
          <AttachmentUploader
            noticeId={initial.id}
            onUploaded={(att) => setAttachments((prev) => [...prev, att])}
          />
          <AttachmentList
            attachments={attachments}
            editable
            onDownload={handleDownload}
            onDeleted={(id) =>
              setAttachments((prev) => prev.filter((a) => a.id !== id))
            }
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/ops/notices')}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? '작성' : '수정 저장'}
        </Button>
      </div>
    </form>
  );
}
