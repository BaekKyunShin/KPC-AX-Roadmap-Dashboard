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
  MAX_ATTACHMENT_LABEL,
  ATTACHMENT_TOO_LARGE_MESSAGE,
} from '@/lib/schemas/notice';
import { uploadNoticeAttachmentDirect } from './upload-notice-attachment';
import { UploadProgress } from './UploadProgress';
import type { NoticeAttachment } from '@/types/database';

interface ProgressState {
  fileName: string;
  loaded: number;
  total: number;
}

interface AttachmentUploaderProps {
  /**
   * 업로드 대상 공지 ID.
   * - string: 즉시 업로드 모드 (수정 페이지)
   * - undefined: 지연 업로드 모드 — onFileSelected로 부모에게 파일만 전달하고
   *   실제 업로드는 부모가 공지 생성 후 수행한다.
   */
  noticeId?: string;
  /** 즉시 업로드 성공 시 부모 알림 */
  onUploaded?: (attachment: NoticeAttachment) => void;
  /** 지연 업로드 모드에서 파일 선택 시 부모 알림 */
  onFileSelected?: (file: File) => void;
}

const ACCEPT_ATTR = ALLOWED_ATTACHMENT_EXT.join(',');

/**
 * 공지 첨부 파일 업로더.
 * 네이티브 input type="file"을 shadcn Button으로 래핑한다 (3-4-2 원칙).
 * 클라이언트 단에서 크기/확장자 Zod 검증 후, noticeId 유무에 따라
 * 즉시 업로드 or 부모에게 파일 전달(지연 업로드)을 수행한다.
 */
export function AttachmentUploader({
  noticeId,
  onUploaded,
  onFileSelected,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const extOk = ALLOWED_ATTACHMENT_EXT.some((ext) => lowerName.endsWith(ext));
    if (!extOk) {
      setError('허용되지 않는 파일 형식입니다.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(ATTACHMENT_TOO_LARGE_MESSAGE);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setError(null);

    // 지연 업로드 모드: 부모에게 파일만 전달
    if (!noticeId) {
      onFileSelected?.(file);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // 즉시 업로드 모드 (수정 페이지) — Storage 직접 업로드 패턴
    setIsUploading(true);
    setProgress({ fileName: file.name, loaded: 0, total: file.size });

    try {
      const result = await uploadNoticeAttachmentDirect(noticeId, file, (loaded, total) =>
        setProgress({ fileName: file.name, loaded, total })
      );
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
      setProgress(null);
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
      {progress && (
        <UploadProgress
          fileName={progress.fileName}
          loaded={progress.loaded}
          total={progress.total}
        />
      )}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        허용 형식: {ALLOWED_ATTACHMENT_EXT.join(', ')} · 최대 {MAX_ATTACHMENT_LABEL}
      </p>
      <FieldError message={error ?? undefined} />
    </div>
  );
}
