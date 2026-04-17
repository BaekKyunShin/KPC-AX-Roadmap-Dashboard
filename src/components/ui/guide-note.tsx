import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideNoteProps {
  /** 안내 타이틀 (기본: "작성 가이드") */
  title?: string;
  /** 가이드 항목 리스트 — 각 항목은 번호(1, 2, ...)로 렌더 */
  items: ReadonlyArray<string | ReactNode>;
  /** 추가 커스텀 클래스 */
  className?: string;
}

/**
 * 인터뷰·폼 화면에서 항목별 "작성 가이드" 문구를 일관된 디자인으로 표시하는 공용 컴포넌트.
 * 산인공 공식 양식(HWPX)의 "작성 가이드" 박스 패턴을 UI로 이식.
 *
 * 디자인:
 * - 좌측 테두리 강조 (primary 컬러)
 * - 연한 배경 + 아이콘 뱃지
 * - 번호 매긴 리스트
 */
export function GuideNote({ title = '작성 가이드', items, className }: GuideNoteProps) {
  if (items.length === 0) return null;
  return (
    <div
      className={cn(
        'rounded-md border border-primary/20 bg-primary/5 border-l-4 border-l-primary p-3.5 text-sm',
        className
      )}
      role="note"
      aria-label={title}
    >
      <div className="flex items-center gap-1.5 mb-2 text-primary">
        <Info className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <ol className="space-y-1.5 text-foreground/90 text-[13px] leading-relaxed break-keep list-decimal list-outside pl-5">
        {items.map((item, idx) => (
          <li key={idx} className="pl-1">
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}
