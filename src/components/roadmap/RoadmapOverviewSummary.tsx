import { Badge } from '@/components/ui/badge';
import type { RoadmapOutcomeSummary } from '@/lib/services/roadmap';

// ============================================================================
// 양식 1번 Ⅰ장 요약 블록 (로드맵 결과 헤더 영역)
// - 수립 필요성 (Ⅰ-1)
// - 기업 AI 역량 수준 뱃지 (Ⅰ-3)
// - 선정 과업 / 수립 주요내용 (Ⅰ-3)
// ============================================================================

const LEVEL_LABEL: Record<RoadmapOutcomeSummary['ai_competency_level'], string> = {
  BEGINNER: '초급 (AI기초형)',
  INTERMEDIATE: '중급 (AI탐구형)',
  ADVANCED: '고급 (AI활용형·선도형)',
};

const LEVEL_BADGE_CLASS: Record<RoadmapOutcomeSummary['ai_competency_level'], string> = {
  BEGINNER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INTERMEDIATE: 'bg-amber-50 text-amber-700 border-amber-200',
  ADVANCED: 'bg-rose-50 text-rose-700 border-rose-200',
};

interface RoadmapOverviewSummaryProps {
  setupNecessity: string;
  outcomeSummary: RoadmapOutcomeSummary;
}

export function RoadmapOverviewSummary({
  setupNecessity,
  outcomeSummary,
}: RoadmapOverviewSummaryProps) {
  const hasAny =
    (setupNecessity && setupNecessity.trim() !== '') ||
    (outcomeSummary.selected_tasks && outcomeSummary.selected_tasks.trim() !== '') ||
    (outcomeSummary.main_content && outcomeSummary.main_content.trim() !== '');

  if (!hasAny) return null;

  return (
    <section
      aria-label="로드맵 개요 (Ⅰ장)"
      className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 break-keep"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-foreground">개요 (Ⅰ장)</h3>
        <Badge
          variant="outline"
          className={LEVEL_BADGE_CLASS[outcomeSummary.ai_competency_level]}
        >
          AI 역량 {LEVEL_LABEL[outcomeSummary.ai_competency_level]}
        </Badge>
      </div>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="md:col-span-2">
          <dt className="text-xs text-muted-foreground mb-0.5">수립 필요성</dt>
          <dd className="text-foreground whitespace-pre-wrap">{setupNecessity || '-'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground mb-0.5">선정 과업</dt>
          <dd className="text-foreground whitespace-pre-wrap">
            {outcomeSummary.selected_tasks || '-'}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground mb-0.5">수립 주요내용 요약</dt>
          <dd className="text-foreground whitespace-pre-wrap">
            {outcomeSummary.main_content || '-'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
