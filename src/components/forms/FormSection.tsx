import * as React from 'react';

import { cn } from '@/lib/utils';

export interface FormSectionProps {
  /** 양식 번호 (예: "Ⅰ-1", "Ⅱ-3-가", "Ⅲ-4 □") */
  number: string;
  /** 섹션 제목 */
  title: string;
  /** 섹션 라벨 (예: "[인터뷰 입력]", "[인터뷰 입력 → 결과 페이지]") */
  label?: string;
  /** 섹션 설명 */
  description?: string;
  /** 섹션 내용 */
  children: React.ReactNode;
  /** className 합성 */
  className?: string;
}

/**
 * FormSection
 *
 * 양식 번호 계층(Ⅰ·Ⅱ·Ⅲ → 1·2·3 → 가·나·다 → □)을 가진 섹션 제목을 렌더한다.
 * 인터뷰·결과 페이지에서 양식 절·항·목 단위 섹션 머리글로 사용한다.
 */
export function FormSection({
  number,
  title,
  label,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-xl font-semibold text-muted-foreground">
            {number}
          </span>
          <h2 className="text-xl font-semibold">{title}</h2>
          {label && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {label}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
