'use client';

import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/utils/format-bytes';

interface UploadProgressProps {
  /** 업로드 중인 파일명 */
  fileName: string;
  /** 지금까지 전송한 바이트 */
  loaded: number;
  /** 전체 바이트 */
  total: number;
}

/**
 * 첨부 업로드 진행률 표시.
 * 100MB 첨부는 회선에 따라 수 분이 걸리므로, 파일명·전송량·퍼센트를 함께 보여
 * 사용자가 "멈춘 것"으로 오해하지 않도록 한다.
 */
export function UploadProgress({ fileName, loaded, total }: UploadProgressProps) {
  // 완료 전 100% 오표시를 막기 위해 내림 처리 (99.9% → 99%)
  const percent = total > 0 ? Math.floor((loaded / total) * 100) : 0;

  return (
    <div className="space-y-1.5" data-testid="upload-progress">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium">{fileName}</span>
        <span className="shrink-0 text-muted-foreground">
          {formatBytes(loaded)} / {formatBytes(total)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={percent} aria-label={`${fileName} 업로드 진행률`} className="h-1.5" />
        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {percent}%
        </span>
      </div>
    </div>
  );
}
