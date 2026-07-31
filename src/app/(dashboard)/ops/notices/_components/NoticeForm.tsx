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
import { AttachmentUploader } from './AttachmentUploader';
import { AttachmentList } from '@/components/notices/AttachmentList';
import { UploadProgress } from './UploadProgress';
import { formatBytes } from '@/lib/utils/format-bytes';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';
import {
  createNoticeAction,
  updateNoticeAction,
  deleteNoticeAction,
} from '@/app/(dashboard)/ops/notices/actions';
import { uploadNoticeAttachmentDirect } from './upload-notice-attachment';
import { getAttachmentDownloadUrl } from '@/app/(dashboard)/notices/actions';
import type { NoticeAttachment } from '@/types/database';

type SubmitPhase = 'idle' | 'creating' | 'uploading';

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

/** 업로드 중인 pendingFiles 항목의 진행률 (index = pendingFiles 내 위치) */
interface UploadProgressState {
  index: number;
  loaded: number;
  total: number;
}

export function NoticeForm({ mode, initial }: NoticeFormProps) {
  const router = useRouter();
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [uploadIndex, setUploadIndex] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<NoticeAttachment[]>(initial?.attachments ?? []);
  /** 지연 업로드 모드(create)에서 선택된 파일들 */
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const isSubmitting = submitPhase !== 'idle';

  async function handleDownload(path: string): Promise<string | null> {
    const result = await getAttachmentDownloadUrl(path);
    return result.success ? result.data.url : null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const title = String(formData.get('title') ?? '').trim();
    const body = String(formData.get('body') ?? '');
    const nextErrors: Record<string, string> = {};
    if (title.length === 0) nextErrors.title = '제목을 입력하세요.';
    if (title.length > 200) nextErrors.title = '제목은 200자 이하로 입력하세요.';
    if (body.length > 50000) nextErrors.body = '본문은 50,000자 이하로 입력하세요.';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      if (mode === 'create') {
        setSubmitPhase('creating');
        const result = await createNoticeAction(formData);
        if (!result.success) {
          showErrorToast('작성 실패', result.error);
          return;
        }

        const { noticeId } = result.data;

        // 첨부 업로드 — Storage 직접 업로드 패턴(uploadNoticeAttachmentDirect).
        // 원자성 보장: 1건이라도 실패 시 공지 row 자동 삭제(보상 트랜잭션).
        let uploadedCount = 0;
        let firstError: string | null = null;
        setUploadTotal(pendingFiles.length);
        if (pendingFiles.length > 0) {
          setSubmitPhase('uploading');
        }
        for (let i = 0; i < pendingFiles.length; i += 1) {
          const file = pendingFiles[i];
          setUploadIndex(i + 1);
          setUploadProgress({ index: i, loaded: 0, total: file.size });
          try {
            const uploadRes = await uploadNoticeAttachmentDirect(noticeId, file, (loaded, total) =>
              setUploadProgress({ index: i, loaded, total })
            );
            if (uploadRes.success) {
              uploadedCount += 1;
            } else if (firstError === null) {
              firstError = `${file.name}: ${uploadRes.error}`;
            }
          } catch (err) {
            if (firstError === null) {
              const msg = err instanceof Error ? err.message : '알 수 없는 오류';
              firstError = `${file.name}: ${msg}`;
            }
          }
        }

        if (firstError !== null) {
          // 보상 트랜잭션 — 공지 row + 이미 업로드된 첨부(Storage prefix `${noticeId}/`)
          // 모두 자동 정리. deleteNoticeAction 자체 실패는 console.error 만 남기고
          // 사용자 토스트는 정상 표시.
          try {
            const rollbackRes = await deleteNoticeAction(noticeId);
            if (!rollbackRes.success) {
              console.error('[NoticeForm] 보상 트랜잭션 실패:', rollbackRes.error);
            }
          } catch (rollbackErr) {
            console.error('[NoticeForm] 보상 트랜잭션 예외:', rollbackErr);
          }
          showErrorToast('공지 등록 실패', `첨부 업로드 오류: ${firstError}. 다시 시도해 주세요.`);
          // 작성 페이지에 머무름 — 폼 state(title/body/pendingFiles) 자동 보존
          return;
        }

        showSuccessToast(
          pendingFiles.length > 0
            ? `공지가 작성되었습니다. 첨부 ${uploadedCount}건 업로드 완료.`
            : '공지가 작성되었습니다.'
        );
        // router.push 만 호출한다(router.refresh 미사용). push 직후 refresh 를 부르면
        // 아직 커밋되지 않은 push 네비게이션을 refresh 가 취소해 작성 페이지에 머무는
        // 레이스가 생긴다(E2E notices.spec.ts:42). 공지 목록은 동적 렌더링이라 push 만으로
        // 새로 fetch 되므로 refresh 는 불필요하다.
        router.push('/ops/notices');
      } else if (initial) {
        setSubmitPhase('creating');
        const result = await updateNoticeAction(initial.id, formData);
        if (result.success) {
          showSuccessToast('공지가 수정되었습니다.');
          // 수정 후 상세 페이지로 이동. 작성 경로와 동일하게 router.refresh 는 호출하지
          // 않는다(push 네비게이션을 취소하는 레이스 방지). 상세도 동적 렌더링이라
          // push 만으로 변경 내용이 반영된다.
          router.push(`/notices/${initial.id}`);
        } else {
          showErrorToast('수정 실패', result.error);
        }
      }
    } catch (err) {
      // 진단 강화 — Server Action throw 시 원본 에러를 콘솔에 남기고
      // 토스트에는 메시지를 그대로 노출해 다음 시도 시 원인 파악을 돕는다.
      console.error('[NoticeForm] submit 예외:', err);
      const message = err instanceof Error ? err.message || err.toString() : '알 수 없는 오류';
      showErrorToast('저장 실패', message);
    } finally {
      setSubmitPhase('idle');
      setUploadIndex(0);
      setUploadTotal(0);
      setUploadProgress(null);
    }
  }

  // 작성/수정 버튼 라벨 — 단계별로 동적 변경
  function getSubmitLabel(): string {
    if (mode === 'edit') {
      return submitPhase === 'creating' ? '수정 저장 중...' : '수정 저장';
    }
    if (submitPhase === 'creating') return '공지 작성 중...';
    if (submitPhase === 'uploading') {
      return `첨부 업로드 중 (${uploadIndex}/${uploadTotal})...`;
    }
    return '작성';
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="notice-form">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="title">
            제목 <span className="text-destructive">*</span>
          </Label>
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_pinned"
              name="is_pinned"
              defaultChecked={initial?.is_pinned ?? false}
            />
            <Label
              htmlFor="is_pinned"
              className="cursor-pointer text-sm font-normal text-muted-foreground"
            >
              상단 고정
            </Label>
          </div>
        </div>
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

      {mode === 'create' && (
        <div className="space-y-3">
          <div>
            <Label>첨부 파일</Label>
            <p className="text-xs text-muted-foreground mt-1">
              파일을 선택하면 공지 저장 시 함께 업로드됩니다.
            </p>
          </div>
          <AttachmentUploader
            onFileSelected={(file) => setPendingFiles((prev) => [...prev, file])}
          />
          {pendingFiles.length > 0 && (
            <ul
              className="rounded-md border bg-muted/30 divide-y"
              data-testid="pending-attachments"
            >
              {pendingFiles.map((file, idx) => (
                <li key={`${file.name}-${idx}`} className="px-3 py-2 text-sm">
                  {uploadProgress && uploadProgress.index === idx ? (
                    // 업로드 중인 파일은 진행률로 대체한다 (파일명·전송량이 포함되므로
                    // 기본 행과 중복되지 않는다)
                    <UploadProgress
                      fileName={file.name}
                      loaded={uploadProgress.loaded}
                      total={uploadProgress.total}
                    />
                  ) : (
                    <div className="flex items-center justify-between gap-2">
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
                        onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={`${file.name} 제거`}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
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
            <p className="text-xs text-muted-foreground mt-1">파일을 선택하면 즉시 업로드됩니다.</p>
          </div>
          <AttachmentUploader
            noticeId={initial.id}
            onUploaded={(att) => setAttachments((prev) => [...prev, att])}
          />
          <AttachmentList
            attachments={attachments}
            editable
            onDownload={handleDownload}
            onDeleted={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
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
          {getSubmitLabel()}
        </Button>
      </div>
    </form>
  );
}
