'use client';

import * as React from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export interface ExampleAccordionProps {
  /** 예시 블록 (양식 원문). 없으면 생략. */
  example?: React.ReactNode;
  /** 작성 안내 블록. 없으면 생략. */
  guide?: React.ReactNode;
  /** 안내 블록 헤더 라벨 (기본 '작성 안내'). 정본 구분: 로드맵='작성 안내', PBL='작성 가이드'. */
  guideLabel?: string;
  /** 기본 펼침 여부 (기본 false) */
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * ExampleAccordion
 *
 * 양식의 `(예시)` 원문 + `√ 작성 안내` 블록을 접기·펼치기한다.
 * 기본 접힘 상태이며, 필요 시 defaultExpanded 로 기본 펼침 가능.
 */
export function ExampleAccordion({
  example,
  guide,
  guideLabel = '작성 안내',
  defaultExpanded = false,
  className,
}: ExampleAccordionProps) {
  if (!example && !guide) return null;

  const defaultValue = defaultExpanded
    ? (['example', 'guide'] as const).filter(
        (v) => (v === 'example' && example) || (v === 'guide' && guide)
      )
    : [];

  return (
    <Accordion
      type="multiple"
      defaultValue={[...defaultValue]}
      className={cn('rounded-md border bg-muted/30', className)}
    >
      {example && (
        <AccordionItem value="example" className="border-b-0 px-4">
          <AccordionTrigger>(예시) 양식 원문</AccordionTrigger>
          <AccordionContent className="text-sm">{example}</AccordionContent>
        </AccordionItem>
      )}
      {guide && (
        <AccordionItem value="guide" className="border-b-0 px-4">
          <AccordionTrigger>{guideLabel}</AccordionTrigger>
          <AccordionContent className="text-sm">{guide}</AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
