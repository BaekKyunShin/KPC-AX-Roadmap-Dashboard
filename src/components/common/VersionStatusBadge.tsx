import { cn } from '@/lib/utils';
import type { RoadmapVersionStatus } from '@/types/database';

/**
 * VersionStatusBadge — 로드맵·PBL 공용 버전 상태 배지.
 *
 * 3가지 상태 (`RoadmapVersionStatus`) 를 일관된 시각·라벨로 표시한다.
 *
 * | status   | 라벨         | 색상                                                |
 * | -------- | ------------ | --------------------------------------------------- |
 * | DRAFT    | `초안 v{n}`  | `bg-slate-100 text-slate-700 border-slate-200`      |
 * | FINAL    | `최종 v{n}`  | `bg-green-100 text-green-700 border-green-200`      |
 * | ARCHIVED | `이전 v{n}`  | `bg-gray-100 text-gray-600 border-gray-200`         |
 *
 * 기존 `RoadmapStatusBadge` · `PBLStatusBadge` 의 복제를 대체할 단일 컴포넌트.
 * 호출부 이전은 PR #2 Task 2.11 에서 수행한다.
 *
 * 접근성: 색상만으로 의미를 전달하지 않는다 — 라벨 텍스트가 상태를 명시.
 */
export type VersionStatus = RoadmapVersionStatus;

interface VersionStatusBadgeProps {
  status: VersionStatus;
  versionNumber: number;
  className?: string;
}

const STATUS_STYLES: Record<
  VersionStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: '초안',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  FINAL: {
    label: '최종',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  ARCHIVED: {
    label: '이전',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
};

export function VersionStatusBadge({
  status,
  versionNumber,
  className,
}: VersionStatusBadgeProps) {
  const { label, className: statusClassName } = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium',
        statusClassName,
        className,
      )}
    >
      {label} v{versionNumber}
    </span>
  );
}
