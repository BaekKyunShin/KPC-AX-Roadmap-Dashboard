import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TRACK_BADGE_COLORS, type ProjectTrack } from '@/lib/constants/tracks';
import { trackShortLabel } from '@/lib/utils/project-track';

interface TrackBadgeProps {
  track: ProjectTrack;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * 트랙 뱃지 (갤러리 카드·프로젝트 목록 테이블 공통).
 * - 색상: `tracks.ts` TRACK_BADGE_COLORS
 * - 라벨: `project-track.ts` trackShortLabel (축약 "로드맵" / "PBL")
 */
export function TrackBadge({ track, size = 'md', className }: TrackBadgeProps) {
  const color = TRACK_BADGE_COLORS[track];
  // 'md'는 프로젝트 목록·OPS 테이블의 상태 뱃지(px-2 py-1 text-xs font-medium)와 동일 사이즈.
  // 'sm'은 갤러리 카드·모바일 카드 등 보조 위치에서 여백 절약용.
  const sizeClass =
    size === 'sm'
      ? 'text-[10px] px-2 py-0 leading-4'
      : 'text-xs px-2 py-1 font-medium';

  return (
    <Badge
      variant="outline"
      className={cn(color, 'border-transparent', sizeClass, className)}
      data-testid="track-badge"
      data-track={track}
    >
      {trackShortLabel(track)}
    </Badge>
  );
}
