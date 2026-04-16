'use client';

import { useRef } from 'react';
import { Trash2, Plus, CalendarDays } from 'lucide-react';
import type {
  RoadmapAnnualPlan,
  RoadmapAnnualPlanItem,
  RoadmapCompetency,
} from '@/lib/services/roadmap/roadmap-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRowHeightSync } from '@/hooks/useRowHeightSync';

// ============================================================================
// 타입
// ============================================================================

interface AnnualTrainingPlanTableProps {
  plan: RoadmapAnnualPlan;
  competencies?: RoadmapCompetency[];
  canEdit?: boolean;
  onChange?: (next: RoadmapAnnualPlan) => void;
}

const EMPTY_ITEM: RoadmapAnnualPlanItem = {
  competency_name: '',
  course_name: '',
  format: '',
  hours: 0,
  notes: '',
};

const COLUMN_HEADERS = [
  { key: 'competency_name', label: '역량명', width: 'w-[18%]', align: 'text-left' },
  { key: 'course_name', label: '훈련과정명', width: '', align: 'text-left' },
  { key: 'format', label: '훈련형태', width: 'w-[10%]', align: 'text-center' },
  { key: 'hours', label: '훈련시간', width: 'w-[10%]', align: 'text-right' },
  { key: 'notes', label: '비고', width: 'w-[20%]', align: 'text-left' },
] as const;

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function AnnualTrainingPlanTable({
  plan,
  competencies,
  canEdit = false,
  onChange,
}: AnnualTrainingPlanTableProps) {
  const items = plan?.items ?? [];
  const usagePlan = plan?.usage_plan ?? '';
  const isEmptyItems = items.length === 0;

  // ----- 편집 헬퍼 -----
  const updateItem = (index: number, patch: Partial<RoadmapAnnualPlanItem>) => {
    if (!onChange) return;
    const nextItems = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    onChange({ ...plan, items: nextItems, usage_plan: usagePlan });
  };

  const addItem = () => {
    if (!onChange) return;
    onChange({ ...plan, items: [...items, { ...EMPTY_ITEM }], usage_plan: usagePlan });
  };

  const removeItem = (index: number) => {
    if (!onChange) return;
    const nextItems = items.filter((_, i) => i !== index);
    onChange({ ...plan, items: nextItems, usage_plan: usagePlan });
  };

  const updateUsagePlan = (value: string) => {
    if (!onChange) return;
    onChange({ ...plan, items, usage_plan: value });
  };

  return (
    <div className="space-y-6 break-keep">
      {/* 훈련과정 표 */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">훈련과정</h3>

        {/* 데스크톱: 테이블 뷰 */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                {COLUMN_HEADERS.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`${col.width} text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide`}
                  >
                    {col.label}
                  </th>
                ))}
                {canEdit && (
                  <th
                    scope="col"
                    className="w-[60px] px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase"
                  >
                    액션
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {isEmptyItems ? (
                <tr>
                  <td
                    colSpan={canEdit ? COLUMN_HEADERS.length + 1 : COLUMN_HEADERS.length}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    {canEdit
                      ? '훈련과정을 추가하려면 아래 "+ 훈련과정 추가" 버튼을 클릭하세요.'
                      : '연간 훈련계획 항목이 없습니다.'}
                  </td>
                </tr>
              ) : (
                items.map((item, i) => (
                  <DesktopRow
                    key={i}
                    index={i}
                    item={item}
                    competencies={competencies}
                    canEdit={canEdit}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 모바일: 카드 뷰 */}
        <div className="md:hidden space-y-3">
          {isEmptyItems ? (
            <EmptyState
              icon={<CalendarDays className="mx-auto h-10 w-10 text-gray-400" />}
              title="연간 훈련계획 항목이 없습니다."
              description={canEdit ? '아래에서 추가할 수 있습니다.' : undefined}
            />
          ) : (
            items.map((item, i) => (
              <MobileCard
                key={i}
                index={i}
                item={item}
                competencies={competencies}
                canEdit={canEdit}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))
          )}
        </div>

        {/* 행 추가 버튼 */}
        {canEdit && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              aria-label="훈련과정 추가"
            >
              <Plus className="h-4 w-4" />
              훈련과정 추가
            </Button>
          </div>
        )}
      </section>

      {/* 활용방안 */}
      <section className="space-y-2">
        <Label htmlFor="annual-plan-usage-plan" className="text-sm font-semibold text-foreground">
          활용방안
        </Label>
        {canEdit ? (
          <AutoResizeTextarea
            id="annual-plan-usage-plan"
            value={usagePlan}
            onChange={(e) => updateUsagePlan(e.target.value)}
            placeholder="본 훈련계획의 활용방안을 입력하세요"
            aria-label="활용방안"
          />
        ) : (
          <p
            id="annual-plan-usage-plan"
            className="whitespace-pre-wrap rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-foreground"
          >
            {usagePlan || '(미작성)'}
          </p>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// 데스크톱 행
// ============================================================================

interface RowProps {
  index: number;
  item: RoadmapAnnualPlanItem;
  competencies?: RoadmapCompetency[];
  canEdit: boolean;
  onUpdate: (index: number, patch: Partial<RoadmapAnnualPlanItem>) => void;
  onRemove: (index: number) => void;
}

function DesktopRow({ index, item, canEdit, onUpdate, onRemove }: RowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  useRowHeightSync(rowRef, [item.competency_name, item.course_name, item.notes, canEdit]);

  return (
    <tr ref={rowRef} className="align-top">
      {/* 역량명 */}
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {canEdit ? (
          <AutoResizeTextarea
            value={item.competency_name}
            onChange={(e) => onUpdate(index, { competency_name: e.target.value })}
            placeholder="역량명"
            aria-label={`연간계획 ${index + 1} 역량명`}
            className="font-medium"
          />
        ) : (
          <span className="font-medium text-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{item.competency_name || '-'}</span>
        )}
      </td>

      {/* 훈련과정명 */}
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {canEdit ? (
          <AutoResizeTextarea
            value={item.course_name}
            onChange={(e) => onUpdate(index, { course_name: e.target.value })}
            placeholder="훈련과정명"
            aria-label={`연간계획 ${index + 1} 훈련과정명`}
          />
        ) : (
          <span className="text-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{item.course_name || '-'}</span>
        )}
      </td>

      {/* 훈련형태 */}
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-center">
        {canEdit ? (
          <Input
            value={item.format}
            onChange={(e) => onUpdate(index, { format: e.target.value })}
            placeholder="집체/원격/혼합"
            className="text-center"
            aria-label={`연간계획 ${index + 1} 훈련형태`}
          />
        ) : (
          <span className="text-foreground">{item.format || '-'}</span>
        )}
      </td>

      {/* 훈련시간 */}
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-right">
        {canEdit ? (
          <Input
            type="number"
            min={1}
            value={item.hours || ''}
            onChange={(e) => onUpdate(index, { hours: Number(e.target.value) || 0 })}
            placeholder="시간"
            className="text-right"
            aria-label={`연간계획 ${index + 1} 훈련시간`}
          />
        ) : (
          <span className="text-foreground">{item.hours > 0 ? `${item.hours}H` : '-'}</span>
        )}
      </td>

      {/* 비고 */}
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {canEdit ? (
          <AutoResizeTextarea
            value={item.notes}
            onChange={(e) => onUpdate(index, { notes: e.target.value })}
            placeholder="비고"
            aria-label={`연간계획 ${index + 1} 비고`}
          />
        ) : (
          <span className="text-muted-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{item.notes || '-'}</span>
        )}
      </td>

      {/* 액션 */}
      {canEdit && (
        <td className="px-3 py-3 text-center align-top">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            aria-label={`연간계획 ${index + 1} 삭제`}
            title="삭제"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </td>
      )}
    </tr>
  );
}

// ============================================================================
// 모바일 카드
// ============================================================================

function MobileCard({ index, item, canEdit, onUpdate, onRemove }: RowProps) {
  return (
    <Card className="py-4">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs text-muted-foreground">훈련과정 #{index + 1}</div>
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              aria-label={`연간계획 ${index + 1} 삭제`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>

        <MobileField label="역량명" htmlFor={`m-annual-comp-${index}`}>
          {canEdit ? (
            <Input
              id={`m-annual-comp-${index}`}
              value={item.competency_name}
              onChange={(e) => onUpdate(index, { competency_name: e.target.value })}
              placeholder="역량명"
            />
          ) : (
            <span className="font-medium">{item.competency_name || '-'}</span>
          )}
        </MobileField>

        <MobileField label="훈련과정명" htmlFor={`m-annual-course-${index}`}>
          {canEdit ? (
            <Input
              id={`m-annual-course-${index}`}
              value={item.course_name}
              onChange={(e) => onUpdate(index, { course_name: e.target.value })}
              placeholder="훈련과정명"
            />
          ) : (
            <span>{item.course_name || '-'}</span>
          )}
        </MobileField>

        <MobileField label="훈련형태" htmlFor={`m-annual-format-${index}`}>
          {canEdit ? (
            <Input
              id={`m-annual-format-${index}`}
              value={item.format}
              onChange={(e) => onUpdate(index, { format: e.target.value })}
              placeholder="집체/원격/혼합"
            />
          ) : (
            <span>{item.format || '-'}</span>
          )}
        </MobileField>

        <MobileField label="훈련시간" htmlFor={`m-annual-hours-${index}`}>
          {canEdit ? (
            <Input
              id={`m-annual-hours-${index}`}
              type="number"
              min={1}
              value={item.hours || ''}
              onChange={(e) => onUpdate(index, { hours: Number(e.target.value) || 0 })}
              placeholder="시간"
            />
          ) : (
            <span>{item.hours > 0 ? `${item.hours}H` : '-'}</span>
          )}
        </MobileField>

        <MobileField label="비고" htmlFor={`m-annual-notes-${index}`}>
          {canEdit ? (
            <Input
              id={`m-annual-notes-${index}`}
              value={item.notes}
              onChange={(e) => onUpdate(index, { notes: e.target.value })}
              placeholder="비고"
            />
          ) : (
            <span className="text-muted-foreground">{item.notes || '-'}</span>
          )}
        </MobileField>
      </CardContent>
    </Card>
  );
}

function MobileField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div>{children}</div>
    </div>
  );
}
