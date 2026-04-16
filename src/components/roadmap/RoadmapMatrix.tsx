'use client';

import { useState } from 'react';
import { Pencil, LayoutGrid } from 'lucide-react';
import type {
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
  TrainingLevel,
} from '@/lib/services/roadmap/roadmap-types';
import {
  buildTrainingStructureMatrix,
  type TrainingStructureMatrixRow,
} from '@/lib/services/roadmap/roadmap-matrix-builder';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/EmptyState';

// ============================================================================
// 타입 & 상수
// ============================================================================

interface RoadmapMatrixProps {
  competencies: RoadmapCompetency[];
  trainingStructure: RoadmapTrainingStructureItem[];
  /** Ⅲ-2 훈련체계 수립 방법 (텍스트 박스) */
  trainingStructureMethod?: string;
  canEdit?: boolean;
  onEditItem?: (item: RoadmapTrainingStructureItem, index: number) => void;
  onTrainingStructureMethodChange?: (next: string) => void;
}

type LevelKey = 'beginner' | 'intermediate' | 'advanced';

const LEVEL_CONFIG: Record<
  LevelKey,
  {
    label: string;
    headerBg: string;
    headerText: string;
    cellBg: string;
    borderColor: string;
    mapsTo: TrainingLevel;
  }
> = {
  beginner: {
    label: '초급',
    headerBg: 'bg-green-50',
    headerText: 'text-green-700',
    cellBg: 'bg-green-50/40',
    borderColor: 'border-green-500',
    mapsTo: 'BEGINNER',
  },
  intermediate: {
    label: '중급',
    headerBg: 'bg-yellow-50',
    headerText: 'text-yellow-700',
    cellBg: 'bg-yellow-50/40',
    borderColor: 'border-yellow-500',
    mapsTo: 'INTERMEDIATE',
  },
  advanced: {
    label: '고급',
    headerBg: 'bg-red-50',
    headerText: 'text-red-700',
    cellBg: 'bg-red-50/40',
    borderColor: 'border-red-500',
    mapsTo: 'ADVANCED',
  },
};

const LEVEL_KEYS: LevelKey[] = ['beginner', 'intermediate', 'advanced'];

// ============================================================================
// 헬퍼: 항목 → matrix 항목 인덱스 계산
// ============================================================================

/** 훈련체계도 원본 배열에서 해당 항목의 인덱스를 찾는다. */
function findItemIndex(
  all: RoadmapTrainingStructureItem[],
  target: RoadmapTrainingStructureItem,
): number {
  return all.indexOf(target);
}

// ============================================================================
// 하위: 훈련 항목 카드
// ============================================================================

interface TrainingItemCardProps {
  item: RoadmapTrainingStructureItem;
  originalIndex: number;
  canEdit: boolean;
  onEdit?: (item: RoadmapTrainingStructureItem, index: number) => void;
}

function TrainingItemCard({ item, originalIndex, canEdit, onEdit }: TrainingItemCardProps) {
  return (
    <div className="group relative rounded-md border border-border bg-background p-3 text-xs shadow-xs hover:shadow-sm transition-shadow">
      <div className="space-y-1">
        <div className="font-semibold text-foreground break-keep">{item.content}</div>
        {item.target_audience && (
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground/70">대상:</span> {item.target_audience}
          </div>
        )}
        {item.method && (
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground/70">방법:</span> {item.method}
          </div>
        )}
        {item.goal && (
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground/70">목표:</span> {item.goal}
          </div>
        )}
      </div>

      {canEdit && onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          onClick={() => onEdit(item, originalIndex)}
          aria-label={`${item.content} 편집`}
          title="편집"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// 하위: 셀 (여러 항목)
// ============================================================================

interface CellProps {
  items: RoadmapTrainingStructureItem[];
  allStructure: RoadmapTrainingStructureItem[];
  canEdit: boolean;
  onEdit?: (item: RoadmapTrainingStructureItem, index: number) => void;
  bgClass: string;
}

function Cell({ items, allStructure, canEdit, onEdit, bgClass }: CellProps) {
  if (!items || items.length === 0) {
    return (
      <td className={`px-3 py-3 ${bgClass} align-top`}>
        <span className="text-xs text-muted-foreground">-</span>
      </td>
    );
  }

  return (
    <td className={`px-3 py-3 ${bgClass} align-top`}>
      <div className="space-y-2">
        {items.map((item, i) => {
          const originalIndex = findItemIndex(allStructure, item);
          return (
            <TrainingItemCard
              key={`${item.competency_name}-${item.level}-${i}`}
              item={item}
              originalIndex={originalIndex}
              canEdit={canEdit}
              onEdit={onEdit}
            />
          );
        })}
      </div>
    </td>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function RoadmapMatrix({
  competencies,
  trainingStructure,
  trainingStructureMethod,
  canEdit = false,
  onEditItem,
  onTrainingStructureMethodChange,
}: RoadmapMatrixProps) {
  const [mobileTab, setMobileTab] = useState<LevelKey>('beginner');

  const matrix: TrainingStructureMatrixRow[] = buildTrainingStructureMatrix(
    competencies ?? [],
    trainingStructure ?? [],
  );

  // 훈련체계 수립 방법 섹션 (양식 Ⅲ-2)
  const renderStructureMethod = () => {
    const hasValue = (trainingStructureMethod ?? '').trim() !== '';
    if (!canEdit && !hasValue) return null;

    return (
      <section className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
        <div className="space-y-1">
          <Label htmlFor="training-structure-method" className="text-sm font-semibold text-foreground">
            훈련체계 수립 방법
          </Label>
          <p className="text-xs text-muted-foreground break-keep">
            역량 수준 구분 · 단계별 선수요건 · 운영 방식 등 훈련체계를 어떻게 수립했는지 기술합니다 (양식 Ⅲ-2).
          </p>
        </div>
        {canEdit ? (
          <Textarea
            id="training-structure-method"
            value={trainingStructureMethod ?? ''}
            onChange={(e) => onTrainingStructureMethodChange?.(e.target.value)}
            rows={4}
            placeholder="예) 역량 기준 3수준 체계(초급·중급·고급). 초급은 전 직원 공통, 중급은 실무자, 고급은 리더 대상. 수준 간 선수요건을 명확히 설정."
            aria-label="훈련체계 수립 방법"
            className="break-keep"
          />
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap break-keep">
            {trainingStructureMethod || '-'}
          </p>
        )}
      </section>
    );
  };

  // 빈 상태
  if (matrix.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={<LayoutGrid className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />}
          title="훈련체계도 데이터가 없습니다."
          description="역량 및 훈련 항목이 정의되면 매트릭스가 표시됩니다."
        />
        {renderStructureMethod()}
      </div>
    );
  }

  // 미참조 역량 식별 (competencies에 없지만 trainingStructure에만 있는 것)
  const competencyNameSet = new Set((competencies ?? []).map((c) => c.name));

  return (
    <div className="break-keep space-y-4">
      {/* 데스크톱 테이블 */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50 w-[180px]"
              >
                역량
              </th>
              {LEVEL_KEYS.map((level) => {
                const cfg = LEVEL_CONFIG[level];
                return (
                  <th
                    key={level}
                    scope="col"
                    className={`px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide ${cfg.headerText} ${cfg.headerBg}`}
                  >
                    {cfg.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {matrix.map((row, rowIdx) => {
              const isUnreferenced = !competencyNameSet.has(row.competency_name);
              return (
                <tr key={`${row.competency_name}-${rowIdx}`}>
                  <td className="px-3 py-3 text-sm font-medium text-foreground align-top">
                    <div className="flex items-center gap-2">
                      <span className="break-keep">{row.competency_name}</span>
                      {isUnreferenced && (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                          title="역량 모델링에 정의되지 않은 역량입니다."
                        >
                          미참조
                        </Badge>
                      )}
                    </div>
                  </td>
                  <Cell
                    items={row.beginner}
                    allStructure={trainingStructure ?? []}
                    canEdit={canEdit}
                    onEdit={onEditItem}
                    bgClass={LEVEL_CONFIG.beginner.cellBg}
                  />
                  <Cell
                    items={row.intermediate}
                    allStructure={trainingStructure ?? []}
                    canEdit={canEdit}
                    onEdit={onEditItem}
                    bgClass={LEVEL_CONFIG.intermediate.cellBg}
                  />
                  <Cell
                    items={row.advanced}
                    allStructure={trainingStructure ?? []}
                    canEdit={canEdit}
                    onEdit={onEditItem}
                    bgClass={LEVEL_CONFIG.advanced.cellBg}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 훈련체계 수립 방법 (양식 Ⅲ-2, 데스크톱에서 매트릭스 아래) */}
      <div className="hidden md:block">{renderStructureMethod()}</div>

      {/* 모바일: 레벨 탭 + 역량별 카드 */}
      <div className="md:hidden">
        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as LevelKey)}>
          <TabsList className="w-full">
            {LEVEL_KEYS.map((level) => (
              <TabsTrigger key={level} value={level} className="flex-1">
                {LEVEL_CONFIG[level].label}
              </TabsTrigger>
            ))}
          </TabsList>

          {LEVEL_KEYS.map((level) => {
            const cfg = LEVEL_CONFIG[level];
            return (
              <TabsContent key={level} value={level} className="space-y-3 mt-3">
                {matrix.map((row, rowIdx) => {
                  const items = row[level];
                  const isUnreferenced = !competencyNameSet.has(row.competency_name);
                  return (
                    <div
                      key={`${row.competency_name}-${rowIdx}`}
                      className={`rounded-lg border border-border p-3 ${cfg.cellBg}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground break-keep">
                            {row.competency_name}
                          </span>
                          {isUnreferenced && (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                            >
                              미참조
                            </Badge>
                          )}
                        </div>
                      </div>
                      {items.length === 0 ? (
                        <div className="text-xs text-muted-foreground">해당 레벨 항목 없음</div>
                      ) : (
                        <div className="space-y-2">
                          {items.map((item, i) => {
                            const originalIndex = findItemIndex(trainingStructure ?? [], item);
                            return (
                              <TrainingItemCard
                                key={`${item.competency_name}-${item.level}-${i}`}
                                item={item}
                                originalIndex={originalIndex}
                                canEdit={canEdit}
                                onEdit={onEditItem}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* 훈련체계 수립 방법 (양식 Ⅲ-2, 모바일에서 탭 아래) */}
      <div className="md:hidden">{renderStructureMethod()}</div>
    </div>
  );
}
