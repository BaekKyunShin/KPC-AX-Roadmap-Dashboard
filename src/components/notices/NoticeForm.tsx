'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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

export function NoticeForm({ mode, initial }: NoticeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<NoticeAttachment[]>(
    initial?.attachments ?? [],
  );

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
    // 클라이언트 기본 검증
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
        if (result.success) {
          showSuccessToast('공지가 작성되었습니다.');
          router.push(`/ops/notices/${result.data.noticeId}/edit`);
          router.refresh();
        } else {
          showErrorToast('작성 실패', result.error);
        }
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
          rows={10}
          placeholder="공지 내용"
          defaultValue={initial?.body ?? ''}
          maxLength={50000}
          aria-invalid={!!errors.body}
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

      {mode === 'edit' && initial && (
        <div className="space-y-3">
          <div>
            <Label>첨부 파일</Label>
            <p className="text-xs text-muted-foreground mt-1">
              공지 수정 후 파일을 추가할 수 있습니다.
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

      {mode === 'create' && (
        <p className="text-sm text-muted-foreground">
          첨부 파일은 공지 저장 후 추가할 수 있습니다.
        </p>
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
