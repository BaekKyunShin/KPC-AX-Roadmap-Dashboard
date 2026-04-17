'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import {
  CARD_HEADER_CLASS,
  SyncedTableRow,
  TableInlineCell,
  TableTextCell,
} from '@/components/roadmap/shared';
import {
  PBL_MIN_AI_TOOL_USAGE_STAGES,
  type PBLAIToolUsagePlanItem,
} from '@/lib/services/pbl';

// ============================================================================
// Ⅳ-2. AI 도구 활용 계획 (양식 2번 12p)
//   단계별 표: stage · main_activity · ai_tools · utilized_data · purpose · specific_method
//   제약: 최소 3단계 이상 (미만 시 인라인 경고)
// ============================================================================

interface PBLToolUsagePlanProps {
  canEdit: boolean;
  value: PBLAIToolUsagePlanItem[];
  onChange: (next: PBLAIToolUsagePlanItem[]) => void;
}

function createEmptyItem(stageNumber: number): PBLAIToolUsagePlanItem {
  return {
    stage: `${stageNumber}단계`,
    main_activity: '',
    ai_tools: [],
    utilized_data: '',
    purpose: '',
    specific_method: '',
  };
}

export function PBLToolUsagePlan({ canEdit, value, onChange }: PBLToolUsagePlanProps) {
  const warnBelowMin = useMemo(
    () => value.length < PBL_MIN_AI_TOOL_USAGE_STAGES,
    [value.length],
  );

  const updateItem = (index: number, patch: Partial<PBLAIToolUsagePlanItem>) => {
    const next = value.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const addItem = () => {
    onChange([...value, createEmptyItem(value.length + 1)]);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader className={CARD_HEADER_CLASS}>
        <CardTitle className="text-base">Ⅳ-2. AI 도구 활용 계획</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {warnBelowMin && (
          <div className="flex items-start gap-2 p-3 rounded border border-amber-200 bg-amber-50 text-amber-800 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              산인공 양식은 최소 {PBL_MIN_AI_TOOL_USAGE_STAGES}단계 이상을 권장합니다. 현재 {value.length}단계.
            </span>
          </div>
        )}
        <div className="overflow-x-auto rounded border border-border">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[8%] text-center">단계</TableHead>
                <TableHead className="w-[14%] text-center">주요 활동</TableHead>
                <TableHead className="w-[16%] text-center">AI 도구</TableHead>
                <TableHead className="w-[14%] text-center">활용 데이터</TableHead>
                <TableHead className="w-[16%] text-center">활용 목적</TableHead>
                <TableHead className="w-[24%] text-center">구체적 활용 방법</TableHead>
                {canEdit && <TableHead className="w-[8%] text-center">작업</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {value.length === 0 ? (
                <TableRow>
                  <td
                    colSpan={canEdit ? 7 : 6}
                    className="px-3 py-6 text-center text-sm text-muted-foreground"
                  >
                    단계를 추가하세요.
                  </td>
                </TableRow>
              ) : (
                value.map((item, idx) => (
                  <SyncedTableRow
                    key={idx}
                    deps={[
                      item.main_activity,
                      item.ai_tools.join(','),
                      item.utilized_data,
                      item.purpose,
                      item.specific_method,
                    ]}
                  >
                    <TableInlineCell
                      canEdit={canEdit}
                      value={item.stage}
                      onChange={(v) => updateItem(idx, { stage: v })}
                      ariaLabel="단계"
                    />
                    <TableTextCell
                      canEdit={canEdit}
                      value={item.main_activity}
                      onChange={(v) => updateItem(idx, { main_activity: v })}
                      ariaLabel="주요 활동"
                    />
                    <TableTextCell
                      canEdit={canEdit}
                      value={item.ai_tools.join(', ')}
                      onChange={(v) =>
                        updateItem(idx, {
                          ai_tools: v.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      ariaLabel="AI 도구 (쉼표 구분)"
                      placeholder="예: ChatGPT, Cursor"
                    />
                    <TableTextCell
                      canEdit={canEdit}
                      value={item.utilized_data}
                      onChange={(v) => updateItem(idx, { utilized_data: v })}
                      ariaLabel="활용 데이터"
                    />
                    <TableTextCell
                      canEdit={canEdit}
                      value={item.purpose}
                      onChange={(v) => updateItem(idx, { purpose: v })}
                      ariaLabel="활용 목적"
                    />
                    <TableTextCell
                      canEdit={canEdit}
                      value={item.specific_method}
                      onChange={(v) => updateItem(idx, { specific_method: v })}
                      ariaLabel="구체적 활용 방법"
                    />
                    {canEdit && (
                      <td className="px-2 py-3 align-top text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`${item.stage || idx + 1} 삭제`}
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </SyncedTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {canEdit && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> 단계 추가
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
