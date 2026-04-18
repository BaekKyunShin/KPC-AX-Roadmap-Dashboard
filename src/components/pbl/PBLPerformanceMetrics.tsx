'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Label } from '@/components/ui/label';
import { CARD_HEADER_CLASS } from '@/components/roadmap/shared';
import {
  PBL_TRAINING_GOAL_CATEGORIES,
  type PBLPerformanceAnalysis,
  type PBLTrainingGoalCategory,
} from '@/lib/services/pbl';

// ============================================================================
// Ⅴ. 성과분석 및 확산 전략 (양식 2번 18p)
//   Ⅴ-1 training_goal_categories (체크) + quantitative/qualitative metrics bullet
//   Ⅴ-2 internalization_plan + dissemination_plan bullet
// ============================================================================

interface PBLPerformanceMetricsProps {
  canEdit: boolean;
  value: PBLPerformanceAnalysis;
  onChange: (next: PBLPerformanceAnalysis) => void;
}

function BulletArea({
  label,
  htmlFor,
  hint,
  disabled,
  value,
  onChange,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  disabled?: boolean;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <FormField label={label} htmlFor={htmlFor} hint={hint}>
      <textarea
        id={htmlFor}
        rows={5}
        disabled={disabled}
        className="min-h-[120px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 whitespace-pre-wrap break-words"
        value={value.join('\n')}
        onChange={(e) =>
          onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))
        }
      />
    </FormField>
  );
}

export function PBLPerformanceMetrics({ canEdit, value, onChange }: PBLPerformanceMetricsProps) {
  const update = (patch: Partial<PBLPerformanceAnalysis>) => onChange({ ...value, ...patch });

  const toggleCategory = (category: PBLTrainingGoalCategory, checked: boolean) => {
    if (!canEdit) return;
    const next = checked
      ? Array.from(new Set([...value.training_goal_categories, category]))
      : value.training_goal_categories.filter((c) => c !== category);
    update({ training_goal_categories: next });
  };

  return (
    <Card>
      <CardHeader className={CARD_HEADER_CLASS}>
        <CardTitle className="text-base">Ⅴ. 성과분석 및 확산 전략</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Ⅴ-1. 성과분석 측정 지표</h3>
          <fieldset className="space-y-2">
            <legend className="sr-only">훈련 목표 분류 체크박스</legend>
            <div className="flex flex-wrap gap-4">
              {PBL_TRAINING_GOAL_CATEGORIES.map((category) => {
                const id = `pbl-goal-category-${category}`;
                const checked = value.training_goal_categories.includes(category);
                return (
                  <div key={category} className="flex items-center gap-2">
                    <Checkbox
                      id={id}
                      checked={checked}
                      disabled={!canEdit}
                      onCheckedChange={(v) => toggleCategory(category, v === true)}
                    />
                    <Label htmlFor={id} className="text-sm cursor-pointer">
                      {category}
                    </Label>
                  </div>
                );
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BulletArea
              label="정량"
              htmlFor="pbl-metrics-quant"
              hint="주요 지표(예시) — 각 줄에 하나씩. 예: 훈련 이후 불량발생률 15% 감소"
              disabled={!canEdit}
              value={value.quantitative_metrics}
              onChange={(next) => update({ quantitative_metrics: next })}
            />
            <BulletArea
              label="정성"
              htmlFor="pbl-metrics-qual"
              hint="주요 지표(예시) — 각 줄에 하나씩. 예: 문제해결 역량: 복잡한 현장 문제에 대한 자율적 해결 능력 향상"
              disabled={!canEdit}
              value={value.qualitative_metrics}
              onChange={(next) => update({ qualitative_metrics: next })}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Ⅴ-2. 성과 확산 전략</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BulletArea
              label="내재화 방안"
              htmlFor="pbl-internalize"
              hint="각 줄에 하나씩. 매뉴얼 제작·지식 공유·멘토링·후속 프로젝트·재훈련 체계 등"
              disabled={!canEdit}
              value={value.internalization_plan}
              onChange={(next) => update({ internalization_plan: next })}
            />
            <BulletArea
              label="전사 확산 방안"
              htmlFor="pbl-disseminate"
              hint="각 줄에 하나씩. 성과 발표회·타 부서 확대·경영진 보고 등"
              disabled={!canEdit}
              value={value.dissemination_plan}
              onChange={(next) => update({ dissemination_plan: next })}
            />
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
