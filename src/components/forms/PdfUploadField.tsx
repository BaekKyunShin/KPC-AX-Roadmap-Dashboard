'use client';

import * as React from 'react';
import { File, Upload, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface PdfUploadFieldFile {
  name: string;
  size: number;
  url?: string;
}

export interface PdfUploadFieldProps {
  /** 현재 첨부된 파일 정보 (없으면 null) */
  file: PdfUploadFieldFile | null;
  /** 파일 선택 시 (File 객체 전달) */
  onFileSelect: (file: File) => void;
  /** 파일 제거 시 */
  onRemove: () => void;
  /** 비활성 */
  disabled?: boolean;
  /** 허용 확장자 (기본 ".pdf") */
  accept?: string;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * PdfUploadField
 *
 * HRD이음 PDF 첨부용 필드 (로드맵 Ⅱ-1, PBL Ⅱ-3-가).
 * 드래그앤드롭 + 파일명·크기 표시 + 미리보기 링크 + 제거 버튼.
 */
export function PdfUploadField({
  file,
  onFileSelect,
  onRemove,
  disabled = false,
  accept = '.pdf',
  className,
}: PdfUploadFieldProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    // accept 값을 확장자 배열로 파싱 (예: ".pdf,.hwp" → [".pdf", ".hwp"])
    const acceptList = accept
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const isAllowed =
      acceptList.includes('*') ||
      acceptList.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!isAllowed) {
      return;
    }
    onFileSelect(f);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {file ? (
        <div className="flex items-center justify-between rounded-md border border-input bg-muted/30 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <File className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium">{file.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {file.url && (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                미리보기
              </a>
            )}
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              aria-label="첨부 제거"
              className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          disabled={disabled}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/10 px-4 py-8 text-sm',
            'hover:border-primary hover:bg-muted/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isDragging && 'border-primary bg-muted/40',
          )}
        >
          <Upload className="size-6 text-muted-foreground" />
          <span className="font-medium">
            PDF 파일을 드래그하거나 클릭하여 선택
          </span>
          <span className="text-xs text-muted-foreground">
            허용: {accept}
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
    </div>
  );
}
