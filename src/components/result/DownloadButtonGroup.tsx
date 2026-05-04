'use client';

import { AlertCircle, FileText, FileSpreadsheet, FileType, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type DownloadType = 'PDF' | 'XLSX' | 'HWPX';

interface DownloadButtonGroupProps {
  onDownload: (type: DownloadType) => void;
  loading?: DownloadType | null;
  /**
   * 마지막으로 실패한 다운로드 형식 — 해당 버튼 옆에 ⚠ 아이콘으로 잠시 표시한다.
   * 사용자가 같은 버튼을 다시 누르거나 다른 형식을 시도하면 자연스럽게 해제된다.
   */
  errorType?: DownloadType | null;
  disabled?: boolean;
  className?: string;
}

const BUTTON_CONFIG: Record<
  DownloadType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PDF: { label: 'PDF', icon: FileText },
  XLSX: { label: 'Excel', icon: FileSpreadsheet },
  HWPX: { label: 'HWPX', icon: FileType },
};

const TYPES: readonly DownloadType[] = ['PDF', 'XLSX', 'HWPX'] as const;

/**
 * 로드맵·PBL 공용 다운로드 버튼 그룹 (PDF/XLSX/HWPX 3종).
 *
 * - 내부 키 `'PDF' | 'XLSX' | 'HWPX'` 는 `useRoadmapDownload` 의 `DownloadFormat` 과 일치.
 * - 표시 라벨은 `PDF / Excel / HWPX` (UX 친근성).
 * - `loading` 상태의 버튼은 spinner 를 표시하며, 동시 다운로드 방지를 위해
 *   나머지 버튼도 함께 disabled 된다.
 */
export function DownloadButtonGroup({
  onDownload,
  loading = null,
  errorType = null,
  disabled = false,
  className,
}: DownloadButtonGroupProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {TYPES.map((type) => {
        const { label, icon: Icon } = BUTTON_CONFIG[type];
        const isLoading = loading === type;
        const isErrored = errorType === type && !isLoading;
        const isDisabled = disabled || loading !== null;
        return (
          <Button
            key={type}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDownload(type)}
            disabled={isDisabled}
            aria-label={`${label} 다운로드`}
          >
            {isLoading ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : isErrored ? (
              <AlertCircle className="mr-1.5 size-4 text-amber-500" aria-hidden />
            ) : (
              <Icon className="mr-1.5 size-4" />
            )}
            {label}
          </Button>
        );
      })}
    </div>
  );
}
