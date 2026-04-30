'use client';

import { Sparkles } from 'lucide-react';

import { FormTable } from '@/components/forms/FormTable';
import { SectionCard } from '@/components/result/SectionCard';

import type { PBLContent } from '@/lib/services/pbl/pbl-types';
import type { TabPBLCommonProps } from './types';

/**
 * Ⅴ. 성과분석 및 확산 전략 탭 — PBL 결과 V2 (R8 PBL-자체-05).
 *
 * 섹션:
 *  - P-25 Ⅴ-1 성과분석 측정 지표 — LLM 결과 (정량/정성 + 선택 훈련목표)
 *  - P-26 Ⅴ-2 성과 확산 전략     — LLM 결과 (내재화 / 전사 확산)
 *
 * 제외 (양식·결과 화면 제외 항목):
 *  - [결과보고서] 섹션 (P-27~P-29) — 렌더 금지 (별첨 수행일지·참고자료)
 */
export function TabPBLOutcomes({ version }: TabPBLCommonProps) {
  const content = version?.pbl_content as PBLContent | null | undefined;
  const outcome = content?.outcome_analysis;
  const metrics = outcome?.outcome_metrics;
  const diffusion = outcome?.diffusion_strategy;

  return (
    <div className="space-y-6">
      {/* Ⅴ-1 성과분석 측정 지표 */}
      <SectionCard
        title="Ⅴ-1. 성과분석 측정 지표"
        description="훈련 전·후 정량·정성 측정 지표 (LLM 자동 생성)"
      >
        {metrics ? (
          <div className="space-y-3">
            {metrics.selected_goals && metrics.selected_goals.length > 0 && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <span className="font-medium">선택된 훈련 목표 카테고리:</span>{' '}
                {metrics.selected_goals.join(' · ')}
              </div>
            )}
            <FormTable
              caption="성과분석 측정 지표"
              bodyRows={[
                {
                  cells: [
                    { content: '정량 지표', header: true, className: 'w-[160px]', align: 'center' },
                    {
                      content: (
                        <span className="whitespace-pre-wrap text-sm">
                          {metrics.quantitative || '—'}
                        </span>
                      ),
                      align: 'left',
                    },
                  ],
                },
                {
                  cells: [
                    { content: '정성 지표', header: true, align: 'center' },
                    {
                      content: (
                        <span className="whitespace-pre-wrap text-sm">
                          {metrics.qualitative || '—'}
                        </span>
                      ),
                      align: 'left',
                    },
                  ],
                },
              ]}
            />
          </div>
        ) : (
          <RegeneratePlaceholder section="Ⅴ-1 성과분석 측정 지표" />
        )}
      </SectionCard>

      {/* Ⅴ-2 성과 확산 전략 */}
      <SectionCard
        title="Ⅴ-2. 성과 확산 전략"
        description="조직 내 내재화 · 전사 확산 전략 (LLM 자동 생성)"
      >
        {diffusion ? (
          <FormTable
            caption="성과 확산 전략"
            bodyRows={[
              {
                cells: [
                  { content: '내재화 방안', header: true, className: 'w-[160px]', align: 'center' },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {diffusion.internalization || '—'}
                      </span>
                    ),
                    align: 'left',
                  },
                ],
              },
              {
                cells: [
                  { content: '전사 확산 방안', header: true, align: 'center' },
                  {
                    content: (
                      <span className="whitespace-pre-wrap text-sm">
                        {diffusion.company_wide_diffusion || '—'}
                      </span>
                    ),
                    align: 'left',
                  },
                ],
              },
            ]}
          />
        ) : (
          <RegeneratePlaceholder section="Ⅴ-2 성과 확산 전략" />
        )}
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
