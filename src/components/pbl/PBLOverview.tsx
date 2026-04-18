'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CARD_HEADER_CLASS } from '@/components/roadmap/shared';
import { AI_LEVEL_OPTIONS, TRAINING_GOAL_OPTIONS } from '@/lib/schemas/interview-pbl';
import type { AILevel, TrainingGoal } from '@/lib/schemas/interview-pbl';

// ============================================================================
// PBL 상단 개요 (양식 2번 Ⅰ장 + 인터뷰 입력값 요약)
//  - 기업명 / 훈련과정명 / 훈련시간 / AI 역량 수준 / 훈련 목표 체크
//  - 이 섹션은 인터뷰 데이터에서 복사되는 읽기 전용 요약 (LLM 재창작 금지)
// ============================================================================

const LEVEL_BADGE_CLASS: Record<'기초' | '초급' | '중급' | '고급', string> = {
  기초: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  초급: 'bg-sky-50 text-sky-700 border-sky-200',
  중급: 'bg-amber-50 text-amber-700 border-amber-200',
  고급: 'bg-rose-50 text-rose-700 border-rose-200',
};

export interface PBLOverviewInput {
  companyName: string;
  courseName: string;
  trainingHours: number;
  traineeCount: number;
  trainingJob: string;
  aiLevel: AILevel;
  trainingGoals: TrainingGoal[];
}

interface PBLOverviewProps {
  value: PBLOverviewInput;
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 pb-1 border-b border-border/40">
        {label}
      </dt>
      <dd className="text-sm text-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {value || '-'}
      </dd>
    </div>
  );
}

export function PBLOverview({ value }: PBLOverviewProps) {
  const aiLevelMeta = AI_LEVEL_OPTIONS.find((o) => o.value === value.aiLevel);
  const levelBadgeClass = aiLevelMeta ? LEVEL_BADGE_CLASS[aiLevelMeta.grade] : '';

  return (
    <Card>
      <CardHeader className={CARD_HEADER_CLASS}>
        <CardTitle className="text-base">개요 (Ⅰ장 · 인터뷰 요약)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <header className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm text-muted-foreground">
            아래 값은 PBL 인터뷰에서 입력한 데이터를 그대로 인용합니다.
          </div>
          {aiLevelMeta && (
            <Badge variant="outline" className={levelBadgeClass}>
              AI 역량 {aiLevelMeta.grade} ({aiLevelMeta.value})
            </Badge>
          )}
        </header>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Row label="기업명" value={value.companyName} />
          <Row label="훈련과정명" value={value.courseName} />
          <Row label="훈련 직무" value={value.trainingJob} />
          <Row label="훈련 시간" value={value.trainingHours ? `${value.trainingHours}시간` : '-'} />
          <Row label="훈련생 수" value={value.traineeCount ? `${value.traineeCount}명` : '-'} />
        </dl>
        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 pb-1 border-b border-border/40">
            훈련 목표 (체크)
          </dt>
          <dd className="flex flex-wrap gap-2 mt-2">
            {TRAINING_GOAL_OPTIONS.map((goal) => {
              const checked = value.trainingGoals.includes(goal);
              return (
                <span
                  key={goal}
                  className={
                    checked
                      ? 'inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-primary/20 bg-primary/5 text-primary'
                      : 'inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-border text-muted-foreground'
                  }
                >
                  {checked ? '☑' : '☐'} {goal}
                </span>
              );
            })}
          </dd>
        </div>
        {aiLevelMeta && (
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">{aiLevelMeta.value}</strong> — {aiLevelMeta.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
