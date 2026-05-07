import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DataSourceBadge, type DataSourceKind } from '@/components/common/DataSourceBadge';

/**
 * 결과 페이지(로드맵/PBL) 탭 내부에서 각 섹션(Ⅰ-1, Ⅰ-2 등)의 시각적 래퍼 카드.
 *
 * - 디자인 토큰 기반: `rounded-lg border bg-card p-6` (Task 1.1 `--card-pad` 반영).
 * - 단일 책임: "섹션 시각 래퍼". 접기/펼치기 등 상태 기능 없음.
 *   필요 시 외부 컴포넌트/훅으로 래핑할 것.
 * - 우측 상단 `actions` 슬롯으로 재생성 버튼 등 액션 배치.
 */
export interface SectionCardProps {
  /** 섹션 제목. heading(h3)으로 렌더. */
  title: string;
  /** 부제(선택). 예: "양식 섹션 Ⅰ-1". */
  description?: string;
  /** 우측 상단 액션 슬롯(선택). 예: 재생성 버튼. */
  actions?: ReactNode;
  /** 섹션 본문. */
  children: ReactNode;
  /** 추가 className. root 에 cn() 으로 합성. */
  className?: string;
  /** 데이터 출처 배지. 'user' / 'ai' / 'mixed'. */
  dataSource?: DataSourceKind;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  dataSource,
}: SectionCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            {dataSource && <DataSourceBadge kind={dataSource} />}
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
