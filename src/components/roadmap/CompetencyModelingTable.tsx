'use client';

import { useRef } from 'react';
import { Trash2, Plus, ListChecks } from 'lucide-react';
import type { RoadmapCompetency } from '@/lib/services/roadmap/roadmap-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useRowHeightSync } from '@/hooks/useRowHeightSync';

// ============================================================================
// 타입 & 상수
// ============================================================================

interface CompetencyModelingTableProps {
  competencies: RoadmapCompetency[];
  canEdit?: boolean;
  onChange?: (next: RoadmapCompetency[]) => void;
}

const EMPTY_COMPETENCY: RoadmapCompetency = {
  name: '',
  definition: '',
  knowledge: [],
  skills: [],
  attitudes: [],
};

// ============================================================================
// 유틸: KSA 문자열 변환 (줄바꿈 구분)
// ============================================================================

function joinKsa(values: string[]): string {
  return values.join('\n');
}

function splitKsa(text: string): string[] {
  return text
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
}

// ============================================================================
// 헤더 구성 — 산인공 양식 Ⅲ-1: 2단 헤더 구조
// ============================================================================

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export function CompetencyModelingTable({
  competencies,
  canEdit = false,
  onChange,
}: CompetencyModelingTableProps) {
  const isEmpty = !competencies || competencies.length === 0;

  // ----- 편집 헬퍼 -----
  const updateCompetency = (index: number, patch: Partial<RoadmapCompetency>) => {
    if (!onChange) return;
    const next = competencies.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange(next);
  };

  const addCompetency = () => {
    if (!onChange) return;
    onChange([...(competencies ?? []), { ...EMPTY_COMPETENCY }]);
  };

  const removeCompetency = (index: number) => {
    if (!onChange) return;
    onChange(competencies.filter((_, i) => i !== index));
  };

  // ----- 빈 상태 -----
  if (isEmpty && !canEdit) {
    return (
      <EmptyState
        icon={<ListChecks className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />}
        title="역량 모델링 정보가 없습니다."
        description="역량 정의가 아직 생성되지 않았습니다."
      />
    );
  }

  return (
    <div className="space-y-4 break-keep">
      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th
                rowSpan={2}
                className="w-[12%] px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide align-middle"
                scope="col"
              >
                역량명
              </th>
              <th
                rowSpan={2}
                className="w-[26%] px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide align-middle"
                scope="col"
              >
                <span>역량 정의</span>
                <span className="ml-1 font-normal normal-case text-[11px] text-muted-foreground/80">
                  (수행준거)
                </span>
              </th>
              <th
                colSpan={3}
                className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border"
                scope="colgroup"
              >
                필요 지식·기술·태도
              </th>
              {canEdit && (
                <th
                  rowSpan={2}
                  className="w-[60px] px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase align-middle"
                  scope="col"
                >
                  액션
                </th>
              )}
            </tr>
            <tr>
              <th
                className="w-[20%] px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                scope="col"
              >
                <span>지식</span>
                <span className="ml-1 font-normal normal-case text-[11px] text-muted-foreground/80">
                  (학술, 업무지식)
                </span>
              </th>
              <th
                className="w-[20%] px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                scope="col"
              >
                <span>기술</span>
                <span className="ml-1 font-normal normal-case text-[11px] text-muted-foreground/80">
                  (기능)
                </span>
              </th>
              <th
                className="w-[22%] px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                scope="col"
              >
                태도
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {isEmpty ? (
              <tr>
                <td
                  colSpan={canEdit ? 6 : 5}
                  className="px-3 py-8 text-center text-sm text-muted-foreground"
                >
                  역량을 추가하려면 아래 &quot;+ 역량 추가&quot; 버튼을 클릭하세요.
                </td>
              </tr>
            ) : (
              competencies.map((competency, i) => (
                <DesktopRow
                  key={i}
                  index={i}
                  competency={competency}
                  canEdit={canEdit}
                  onUpdate={updateCompetency}
                  onRemove={removeCompetency}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드 뷰 */}
      <div className="md:hidden space-y-3">
        {isEmpty ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            역량이 없습니다. {canEdit && '아래에서 추가할 수 있습니다.'}
          </p>
        ) : (
          competencies.map((competency, i) => (
            <MobileCard
              key={i}
              index={i}
              competency={competency}
              canEdit={canEdit}
              onUpdate={updateCompetency}
              onRemove={removeCompetency}
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
            onClick={addCompetency}
            aria-label="역량 추가"
          >
            <Plus className="h-4 w-4" />
            역량 추가
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 데스크톱 테이블 행
// ============================================================================

interface RowProps {
  index: number;
  competency: RoadmapCompetency;
  canEdit: boolean;
  onUpdate: (index: number, patch: Partial<RoadmapCompetency>) => void;
  onRemove: (index: number) => void;
}

function DesktopRow({ index, competency, canEdit, onUpdate, onRemove }: RowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const knowledgeStr = competency.knowledge.join('\n');
  const skillsStr = competency.skills.join('\n');
  const attitudesStr = competency.attitudes.join('\n');
  useRowHeightSync(rowRef, [
    competency.name,
    competency.definition,
    knowledgeStr,
    skillsStr,
    attitudesStr,
    canEdit,
  ]);

  return (
    <tr ref={rowRef} className="align-top">
      {/* 역량명 */}
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {canEdit ? (
          <AutoResizeTextarea
            value={competency.name}
            onChange={(e) => onUpdate(index, { name: e.target.value })}
            placeholder="역량명"
            aria-label={`역량 ${index + 1} 역량명`}
            className="font-medium"
          />
        ) : (
          <span className="font-medium text-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{competency.name || '-'}</span>
        )}
      </td>

      {/* 정의(수행준거) */}
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {canEdit ? (
          <AutoResizeTextarea
            value={competency.definition}
            onChange={(e) => onUpdate(index, { definition: e.target.value })}
            placeholder="역량 정의 (수행준거)"
            aria-label={`역량 ${index + 1} 정의 (수행준거)`}
          />
        ) : (
          <span className="text-muted-foreground">{competency.definition || '-'}</span>
        )}
      </td>

      {/* 지식 (학술, 업무지식) */}
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        <KsaCell
          index={index}
          field="knowledge"
          label="지식 (학술, 업무지식)"
          values={competency.knowledge}
          canEdit={canEdit}
          onUpdate={onUpdate}
        />
      </td>

      {/* 기술 (기능) */}
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        <KsaCell
          index={index}
          field="skills"
          label="기술 (기능)"
          values={competency.skills}
          canEdit={canEdit}
          onUpdate={onUpdate}
        />
      </td>

      {/* 태도 */}
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        <KsaCell
          index={index}
          field="attitudes"
          label="태도"
          values={competency.attitudes}
          canEdit={canEdit}
          onUpdate={onUpdate}
        />
      </td>

      {/* 액션 */}
      {canEdit && (
        <td className="px-3 py-3 text-center align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            aria-label={`역량 ${index + 1} 삭제`}
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
// KSA (지식/기술/태도) 셀
// ============================================================================

interface KsaCellProps {
  index: number;
  field: 'knowledge' | 'skills' | 'attitudes';
  label: string;
  values: string[];
  canEdit: boolean;
  onUpdate: (index: number, patch: Partial<RoadmapCompetency>) => void;
}

function KsaCell({ index, field, label, values, canEdit, onUpdate }: KsaCellProps) {
  if (canEdit) {
    return (
      <AutoResizeTextarea
        value={joinKsa(values ?? [])}
        onChange={(e) => onUpdate(index, { [field]: splitKsa(e.target.value) })}
        placeholder={`${label} 항목을 줄바꿈으로 구분`}
        aria-label={`역량 ${index + 1} ${label}`}
      />
    );
  }

  if (!values || values.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <ul className="list-disc pl-4 space-y-0.5 text-sm text-foreground">
      {values.map((v, i) => (
        <li key={i} className="break-keep">
          {v}
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// 모바일 카드
// ============================================================================

function MobileCard({ index, competency, canEdit, onUpdate, onRemove }: RowProps) {
  return (
    <Card className="py-4">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs text-muted-foreground">역량 #{index + 1}</div>
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              aria-label={`역량 ${index + 1} 삭제`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>

        <Field label="역량명" htmlFor={`m-name-${index}`}>
          {canEdit ? (
            <Input
              id={`m-name-${index}`}
              value={competency.name}
              onChange={(e) => onUpdate(index, { name: e.target.value })}
              placeholder="역량명"
            />
          ) : (
            <span className="font-medium">{competency.name || '-'}</span>
          )}
        </Field>

        <Field label="정의 (수행준거)" htmlFor={`m-def-${index}`}>
          {canEdit ? (
            <Textarea
              id={`m-def-${index}`}
              value={competency.definition}
              onChange={(e) => onUpdate(index, { definition: e.target.value })}
              rows={2}
            />
          ) : (
            <span className="text-muted-foreground">{competency.definition || '-'}</span>
          )}
        </Field>

        <Field label="지식 (학술, 업무지식)" htmlFor={`m-k-${index}`}>
          <KsaCell
            index={index}
            field="knowledge"
            label="지식 (학술, 업무지식)"
            values={competency.knowledge}
            canEdit={canEdit}
            onUpdate={onUpdate}
          />
        </Field>

        <Field label="기술 (기능)" htmlFor={`m-s-${index}`}>
          <KsaCell
            index={index}
            field="skills"
            label="기술 (기능)"
            values={competency.skills}
            canEdit={canEdit}
            onUpdate={onUpdate}
          />
        </Field>

        <Field label="태도" htmlFor={`m-a-${index}`}>
          <KsaCell
            index={index}
            field="attitudes"
            label="태도"
            values={competency.attitudes}
            canEdit={canEdit}
            onUpdate={onUpdate}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({
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
