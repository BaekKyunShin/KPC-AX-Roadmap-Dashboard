import { cn } from '@/lib/utils';
import { ROADMAP_VERSION_STATUS_CONFIG } from '@/lib/constants/status';
import type { VersionStatus } from '@/types/database';

/**
 * VersionStatusBadge — 로드맵·PBL 공용 버전 상태 배지.
 *
 * 두 가지 variant 를 지원한다:
 *
 * ### `variant="compact"` (기본)
 *
 * 신규 Result V2 화면 (Roadmap/PBL Result V2) 에서 사용하는 간결한 표기.
 *
 * | status   | 라벨         | 색상                                                |
 * | -------- | ------------ | --------------------------------------------------- |
 * | DRAFT    | `초안 v{n}`  | `bg-slate-100 text-slate-700 border-slate-200`      |
 * | FINAL    | `최종 v{n}`  | `bg-green-100 text-green-700 border-green-200`      |
 * | ARCHIVED | `이전 v{n}`  | `bg-gray-100 text-gray-600 border-gray-200`         |
 *
 * ### `variant="legacy"`
 *
 * 기존 `RoadmapStatusBadge` · `PBLStatusBadge` 동작을 그대로 보존한다.
 * `VersionHistoryList` 처럼 이미 "버전 N" 을 별도로 표시하는 호출부에서 사용.
 *
 * | status   | versionNumber | 라벨          |
 * | -------- | ------------- | ------------- |
 * | DRAFT    | 1             | `초안`        |
 * | DRAFT    | ≥ 2           | `수정본`      |
 * | FINAL    | —             | `확정본`      |
 * | ARCHIVED | —             | `이전 확정본` |
 *
 * 색상은 `ROADMAP_VERSION_STATUS_CONFIG` 를 그대로 사용 (yellow/green/gray).
 *
 * 접근성: 색상만으로 의미를 전달하지 않는다 — 라벨 텍스트가 상태를 명시.
 */

/** 수정본으로 표시되는 최소 버전 번호 (버전 2부터 "수정본") */
const MIN_REVISION_VERSION = 2;

export type VersionStatusBadgeVariant = 'compact' | 'legacy';

interface VersionStatusBadgeProps {
  status: VersionStatus;
  versionNumber: number;
  className?: string;
  /**
   * 표시 variant.
   * - `'compact'` (기본): `{label} v{n}` — 신규 Result V2 화면용
   * - `'legacy'`: 기존 `RoadmapStatusBadge`/`PBLStatusBadge` 호환 — `VersionHistoryList` 등 기존 화면용
   */
  variant?: VersionStatusBadgeVariant;
}

const COMPACT_STATUS_STYLES: Record<
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
  variant = 'compact',
}: VersionStatusBadgeProps) {
  if (variant === 'legacy') {
    const config = ROADMAP_VERSION_STATUS_CONFIG[status];
    const label =
      status === 'DRAFT' && versionNumber >= MIN_REVISION_VERSION
        ? '수정본'
        : config.label;
    return (
      <span
        className={cn(
          'px-2 py-1 text-xs rounded',
          config.color,
          className,
        )}
      >
        {label}
      </span>
    );
  }

  const { label, className: statusClassName } = COMPACT_STATUS_STYLES[status];
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
