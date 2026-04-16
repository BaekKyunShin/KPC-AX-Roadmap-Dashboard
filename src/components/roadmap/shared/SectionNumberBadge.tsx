import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SectionNumberBadgeProps {
  /** 뱃지 라벨 ('명세서', 'PBL 프로젝트' 등). */
  label: string;
  /** 0-based 인덱스. 표시는 index+1로 된다. */
  index: number;
  className?: string;
}

/**
 * 로드맵 결과 화면 카드 헤더용 "섹션 번호 뱃지".
 * "명세서 #1", "PBL 프로젝트 #2" 형태.
 */
export function SectionNumberBadge({ label, index, className }: SectionNumberBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('bg-blue-50 text-blue-700 border-blue-200', className)}
    >
      {label} #{index + 1}
    </Badge>
  );
}
