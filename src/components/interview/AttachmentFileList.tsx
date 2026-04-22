'use client';

/**
 * AttachmentFileList 공용 컴포넌트 (ISSUE-14, Step C-5)
 *
 * 인터뷰 분석 노트(`analysis_notes.attachment_files[]`) 등에서 재사용 가능한
 * 첨부 파일 업로드/삭제/표시 UI. 드래그앤드롭 + 파일 선택을 모두 지원하며,
 * 클라이언트 사전 검증(MIME 화이트리스트 + 10MB) 후 부모가 주입한
 * `onUpload`(Server Action 래퍼)로 한 파일씩 직렬 업로드한다.
 *
 * 본문 추출 결과(`extracted_text` 글자수) 또는 실패 사유(`parse_error`)를
 * 카드에 함께 표시해 컨설턴트가 파싱 결과를 즉시 확인할 수 있게 한다.
 *
 * `singleFile` prop 으로 HRD4U 단일 슬롯 시나리오에도 향후 통합 가능하도록
 * 설계해 두었다 (이번 Step 에서는 분석 노트에만 적용).
 */

import { useRef, useState, useTransition } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Paperclip, Upload, X, Loader2, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { showSuccessToast, showErrorToast } from '@/lib/utils';
import type { HrdReportAttachment } from '@/lib/schemas/interview-roadmap';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
] as const;
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPT_ATTR = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg';

export interface AttachmentFileListProps {
  files: HrdReportAttachment[];
  onChange: (files: HrdReportAttachment[]) => void;
  onUpload: (
    file: File,
  ) => Promise<{ success: true; data: HrdReportAttachment } | { success: false; error: string }>;
  /** 정의되어 있으면 삭제 시 Server Action 호출 후 onChange 갱신 */
  onRemove?: (
    storagePath: string,
  ) => Promise<{ success: true } | { success: false; error: string }>;
  /** 단일 파일만 허용 (HRD4U 처럼). 기본 false (다중 허용) */
  singleFile?: boolean;
  /** 파일 크기/MIME 안내 문구 표시 여부 */
  showHelp?: boolean;
  /** 컴포넌트 라벨 (예: "추가자료 업로드", "기업HRD이음 진단 보고서") */
  label?: string;
  /** 추가 안내 문구 */
  description?: string;
}

export function AttachmentFileList({
  files,
  onChange,
  onUpload,
  onRemove,
  singleFile = false,
  showHelp = true,
  label = '추가자료 업로드',
  description,
}: AttachmentFileListProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);

  function clientValidate(file: File): string | null {
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      return `지원하지 않는 파일 형식입니다 (${file.type || '알 수 없음'}). PDF/DOC(X)/PPT(X)/XLS(X)/PNG/JPG 만 가능합니다.`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB).`;
    }
    return null;
  }

  function handleFiles(newFiles: FileList | null) {
    if (!newFiles || newFiles.length === 0) return;
    const fileArray = Array.from(newFiles);
    if (singleFile && fileArray.length > 1) {
      showErrorToast('파일 1개만 업로드 가능', '한 번에 한 파일만 업로드할 수 있습니다.');
      return;
    }
    startTransition(async () => {
      // 직렬 업로드 — Server Action(file-parser 동기 추출 포함) 부담 분산
      const uploaded: HrdReportAttachment[] = [];
      for (const file of fileArray) {
        const err = clientValidate(file);
        if (err) {
          showErrorToast(`업로드 실패: ${file.name}`, err);
          continue;
        }
        const result = await onUpload(file);
        if (result.success) {
          uploaded.push(result.data);
        } else {
          showErrorToast(`업로드 실패: ${file.name}`, result.error);
        }
      }
      if (uploaded.length === 0) return;
      // singleFile=true 면 마지막 1건만 유지 (기존 파일 교체)
      onChange(singleFile ? [uploaded[0]] : [...files, ...uploaded]);
      showSuccessToast(
        `첨부 ${uploaded.length}건 업로드 완료`,
        '본문이 자동 추출되어 LLM 생성에 반영됩니다.',
      );
    });
    // input 값 리셋 — 같은 파일 재업로드 가능하도록
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleClick() {
    inputRef.current?.click();
  }

  function handleRemove(target: HrdReportAttachment) {
    if (onRemove) {
      startTransition(async () => {
        const result = await onRemove(target.storage_path);
        if (!result.success) {
          showErrorToast('삭제 실패', result.error);
          return;
        }
        onChange(files.filter((f) => f.storage_path !== target.storage_path));
        showSuccessToast('첨부 삭제됨');
      });
    } else {
      onChange(files.filter((f) => f.storage_path !== target.storage_path));
    }
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer?.files ?? null);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground break-keep">{description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> 업로드 중…
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5 mr-1" /> 파일 선택
            </>
          )}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple={!singleFile}
        onChange={onInputChange}
        className="sr-only"
        aria-label={`${label} 파일 선택`}
      />

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        data-testid="attachment-dropzone"
        className={`border-2 border-dashed rounded-md p-4 text-center text-xs transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        파일을 끌어다 놓거나 위 <strong>파일 선택</strong> 버튼을 누르세요.
        {showHelp ? (
          <p className="mt-1 text-muted-foreground">
            PDF/DOC(X)/PPT(X)/XLS(X)/PNG/JPG · 최대 10MB · 본문은 자동 추출되어 로드맵 생성에 반영
          </p>
        ) : null}
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground">첨부된 파일이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border">
          {files.map((f) => (
            <li
              key={f.storage_path}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{f.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.size != null ? `${(f.size / 1024).toFixed(1)} KB` : ''}
                    {f.extracted_text
                      ? ` · 본문 ${f.extracted_text.length}자 추출`
                      : ''}
                    {f.parse_error ? (
                      <span className="text-amber-600 ml-1">
                        <FileWarning className="inline w-3 h-3 mr-0.5" />
                        본문 추출 실패
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleRemove(f)}
                disabled={isPending}
                aria-label={`${f.file_name} 삭제`}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
