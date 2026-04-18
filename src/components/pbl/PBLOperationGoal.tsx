'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import { CARD_HEADER_CLASS, READ_ONLY_TEXT_CLASS } from '@/components/roadmap/shared';

// ============================================================================
// Ⅳ-1. 훈련 목표 (양식 2번 12p)
//   LLM이 인터뷰 데이터(훈련대상 업무·문제정의·AI수준 진단)를 종합하여
//   1~2문장으로 작성한 훈련 목표 텍스트를 노출/편집한다.
// ============================================================================

interface PBLOperationGoalProps {
  canEdit: boolean;
  value: string;
  onChange: (next: string) => void;
}

export function PBLOperationGoal({ canEdit, value, onChange }: PBLOperationGoalProps) {
  return (
    <Card>
      <CardHeader className={CARD_HEADER_CLASS}>
        <CardTitle className="text-base">Ⅳ-1. 훈련 목표</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        {canEdit ? (
          <AutoResizeTextarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="훈련 목표"
            placeholder="훈련을 통해 달성하고자 하는 목표를 1~2문장으로 작성하세요."
            className="min-h-[80px]"
          />
        ) : (
          <p className={`text-sm text-foreground ${READ_ONLY_TEXT_CLASS}`}>
            {value || '-'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
