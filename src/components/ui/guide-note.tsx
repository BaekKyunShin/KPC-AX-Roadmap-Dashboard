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
 * - 머릿기호(•) 리스트
 * - `※` 로 시작하는 string 항목은 부가설명으로 간주하여 작은 글자/회색/들여쓰기 + bullet 제거
 *   (※ 자체가 시각적 marker 이므로 disc 중복 표시 회피)
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
      <ul className="space-y-1.5 text-foreground/90 text-[13px] leading-relaxed break-keep list-disc list-outside pl-5">
        {items.map((item, idx) => {
          // string 이고 `※` 로 시작하면 부가설명 분기 — bullet 제거 + 작은 글자 + 회색 + 들여쓰기
          const isAside = typeof item === 'string' && item.trimStart().startsWith('※');
          return (
            <li
              key={idx}
              className={
                isAside ? 'text-xs text-muted-foreground pl-3 list-none -ml-2' : 'pl-1'
              }
            >
              {item}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
