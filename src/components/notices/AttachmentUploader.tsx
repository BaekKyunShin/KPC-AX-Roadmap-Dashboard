'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import {
  ALLOWED_ATTACHMENT_EXT,
  MAX_ATTACHMENT_BYTES,
} from '@/lib/schemas/notice';
import { uploadAttachmentAction } from '@/app/(dashboard)/ops/notices/actions';
import type { NoticeAttachment } from '@/types/database';

interface AttachmentUploaderProps {
  noticeId: string;
  /** 업로드 성공 시 부모에게 알림 (옵티미스틱 업데이트용) */
  onUploaded?: (attachment: NoticeAttachment) => void;
}

const ACCEPT_ATTR = ALLOWED_ATTACHMENT_EXT.join(',');

/**
 * 공지 첨부 파일 업로더.
 * 네이티브 input type="file"을 shadcn Button으로 래핑한다 (3-4-2 원칙).
 * 클라이언트 단에서 크기/확장자 Zod 검증 후 Server Action 호출.
 */
export function AttachmentUploader({
  noticeId,
  onUploaded,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    // 클라이언트 1차 검증
    const lowerName = file.name.toLowerCase();
    const extOk = ALLOWED_ATTACHMENT_EXT.some((ext) => lowerName.endsWith(ext));
    if (!extOk) {
      setError('허용되지 않는 파일 형식입니다.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError('파일은 20MB 이하여야 합니다.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await uploadAttachmentAction(noticeId, formData);
      if (result.success) {
        showSuccessToast('첨부 파일이 업로드되었습니다.');
        onUploaded?.(result.data.attachment);
      } else {
        showErrorToast('업로드 실패', result.error);
        setError(result.error);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '알 수 없는 오류';
      showErrorToast('업로드 실패', message);
      setError(message);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={handleFileChange}
        disabled={isUploading}
        className="sr-only"
        aria-label="첨부 파일 선택"
        data-testid="attachment-input"
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className={cn('gap-2', isUploading && 'opacity-75')}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {isUploading ? '업로드 중…' : '파일 선택'}
      </Button>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        허용 형식: {ALLOWED_ATTACHMENT_EXT.join(', ')} · 최대 20MB
      </p>
      <FieldError message={error ?? undefined} />
    </div>
  );
}
