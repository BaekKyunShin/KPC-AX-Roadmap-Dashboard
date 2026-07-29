import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ClosedBadge — 행정 종결 프로젝트 공용 배지.
 *
 * 운영관리자가 미완료 프로젝트를 임의 종결(status=FINALIZED + closed_at 기록)한
 * 경우에만 표시해, 정식 확정(emerald/green 계열)과 시각적으로 구분한다.
 *
 * 접근성: 색상만으로 의미를 전달하지 않는다 — "종결" 라벨 텍스트가 상태를 명시,
 * 아이콘은 장식(aria-hidden).
 */
export function ClosedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700',
        className
      )}
    >
      <Lock className="h-3 w-3" aria-hidden="true" />
      종결
    </span>
  );
}
