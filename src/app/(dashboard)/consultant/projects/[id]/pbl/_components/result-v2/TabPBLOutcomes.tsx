'use client';

import { Sparkles } from 'lucide-react';

import { SectionCard } from '@/components/result/SectionCard';

import type { TabPBLCommonProps } from './types';

/**
 * Ⅴ. 성과분석 및 확산 전략 탭 — PBL 결과 V2.
 *
 * 섹션:
 *  - P-25 Ⅴ-1 성과분석 측정 지표 — LLM placeholder (Task 2.10)
 *  - P-26 Ⅴ-2 성과 확산 전략     — LLM placeholder (Task 2.10)
 *
 * 제외 (양식·결과 화면 제외 항목):
 *  - [결과보고서] 섹션 (P-27~P-29) — 렌더 금지 (별첨 수행일지·참고자료)
 *
 * Task 2.10 에서 PBL 버전 스키마에 Ⅴ 필드가 추가되면 실제 렌더를 확장한다.
 * 본 Task 범위에서는 placeholder 만 노출한다.
 */
export function TabPBLOutcomes({ version: _version }: TabPBLCommonProps) {
  // Ⅴ 필드는 Task 2.10 에서 pbl_content 에 추가될 예정. 현재는 항상 placeholder.
  return (
    <div className="space-y-6">
      {/* Ⅴ-1 성과분석 측정 지표 */}
      <SectionCard
        title="Ⅴ-1. 성과분석 측정 지표"
        description="훈련 전·후 정량·정성 측정 지표 (LLM 생성, Task 2.10)"
      >
        <RegeneratePlaceholder section="Ⅴ-1 성과분석 측정 지표" />
      </SectionCard>

      {/* Ⅴ-2 성과 확산 전략 */}
      <SectionCard
        title="Ⅴ-2. 성과 확산 전략"
        description="조직 내 확산 · 유지 · 운영 전략 (LLM 생성, Task 2.10)"
      >
        <RegeneratePlaceholder section="Ⅴ-2 성과 확산 전략" />
      </SectionCard>
    </div>
  );
}

/** Ⅴ-* LLM 결과가 없을 때 재생성 안내. */
function RegeneratePlaceholder({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-dashed bg-muted/20 px-6 py-10 text-center">
      <Sparkles className="mb-2 size-8 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{section} 가 아직 생성되지 않았습니다</p>
      <p className="mt-1 text-xs text-muted-foreground">
        상단 &quot;새 버전 생성&quot; 버튼을 눌러 LLM 이 결과를 생성하도록 요청하세요.
      </p>
    </div>
  );
}
