'use client';

import { Plus, Trash2 } from 'lucide-react';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { Button } from '@/components/ui/button';

import type { PBLStepProps } from './types';
import type {
  PBLProblemDefinitionSheet,
  PBLPriority,
  PBLPriorityItem,
} from '@/lib/schemas/interview-pbl';

/**
 * Ⅲ-2 문제 도출 + 우선순위 — [인터뷰 입력]
 *
 * 두 블록을 하나의 Step 으로 묶는다:
 *  - Ⅲ-2-가 문제 정의서 (R8 PBL-자체-04): 양식 5×2 표의 정형 4 항목 단일 세트
 *    (문제 배경 / 핵심 문제 / 문제 범위 / 제약 조건). 행 추가/삭제 불가.
 *  - Ⅲ-2-나 문제 우선순위 결정: `priority { items[], method }`
 */

export interface StepProblemsValue {
  problemDefinitionSheet: PBLProblemDefinitionSheet;
  priority: PBLPriority;
}

function emptyProblemDefinition(): PBLProblemDefinitionSheet {
  return { background: '', core: '', scope: '', constraints: '' };
}

function emptyPriorityItem(rank: number): PBLPriorityItem {
  return { problem: '', score: 3, rank };
}

export function StepProblems({
  value,
  onChange,
  readOnly = false,
}: PBLStepProps<StepProblemsValue>) {
  const problemDefinitionSheet: PBLProblemDefinitionSheet =
    value.problemDefinitionSheet ?? emptyProblemDefinition();

  const priorityItems: PBLPriorityItem[] =
    value.priority?.items && value.priority.items.length > 0
      ? value.priority.items
      : [emptyPriorityItem(1)];

  const priorityMethod = value.priority?.method ?? '';

  function emit(patch: Partial<StepProblemsValue>) {
    onChange({
      problemDefinitionSheet,
      priority: { items: priorityItems, method: priorityMethod },
      ...patch,
    });
  }

  function updateDefinition(patch: Partial<PBLProblemDefinitionSheet>) {
    emit({ problemDefinitionSheet: { ...problemDefinitionSheet, ...patch } });
  }

  function updatePriorityItem(idx: number, patch: Partial<PBLPriorityItem>) {
    const next = priorityItems.map((r, i) =>
      i === idx ? { ...r, ...patch } : r,
    );
    emit({ priority: { items: next, method: priorityMethod } });
  }

  function addPriorityItem() {
    const nextRank =
      priorityItems.length === 0
        ? 1
        : priorityItems[priorityItems.length - 1].rank + 1;
    emit({
      priority: {
        items: [...priorityItems, emptyPriorityItem(nextRank)],
        method: priorityMethod,
      },
    });
  }

  function removePriorityItem(idx: number) {
    if (priorityItems.length <= 1) return;
    emit({
      priority: {
        items: priorityItems.filter((_, i) => i !== idx),
        method: priorityMethod,
      },
    });
  }

  function updateMethod(next: string) {
    emit({ priority: { items: priorityItems, method: next } });
  }

  return (
    <FormSection
      number="Ⅲ-2"
      title="문제 도출 및 우선순위"
      label="[인터뷰 입력]"
      description="Ⅲ-2-가 문제 정의서(배경·핵심·범위·제약)와 Ⅲ-2-나 문제 우선순위 결정을 함께 입력합니다."
    >
      {/* 문제 정의서 (R8 PBL-자체-04 — 양식 5×2 표의 4 정형 항목 단일 세트) */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Ⅲ-2-가 문제 정의서</h3>
        <p className="text-xs text-muted-foreground">
          양식상 단일 세트 — 4 정형 항목(배경/핵심/범위/제약)을 모두 작성합니다.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <caption className="sr-only">문제 정의서</caption>
            <thead>
              <tr>
                <th className="w-[160px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  구분
                </th>
                <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                  내용
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border bg-muted/40 px-2 py-2 text-center font-medium">
                  문제 배경
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={problemDefinitionSheet.background}
                    onChange={(e) => updateDefinition({ background: e.target.value })}
                    placeholder="문제가 발생하게 된 외·내부 환경, 시점, 트리거 사건 등"
                    disabled={readOnly}
                    aria-label="문제 배경"
                    minHeightClassName="min-h-[80px]"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-border bg-muted/40 px-2 py-2 text-center font-medium">
                  핵심 문제
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={problemDefinitionSheet.core}
                    onChange={(e) => updateDefinition({ core: e.target.value })}
                    placeholder="핵심 문제를 한 문장으로 명확히 정의"
                    disabled={readOnly}
                    aria-label="핵심 문제"
                    minHeightClassName="min-h-[80px]"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-border bg-muted/40 px-2 py-2 text-center font-medium">
                  문제 범위
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={problemDefinitionSheet.scope}
                    onChange={(e) => updateDefinition({ scope: e.target.value })}
                    placeholder="문제가 발생하는 부서·공정·제품군 등 범위"
                    disabled={readOnly}
                    aria-label="문제 범위"
                    minHeightClassName="min-h-[80px]"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-border bg-muted/40 px-2 py-2 text-center font-medium">
                  제약 조건
                </td>
                <td className="border border-border p-1 align-top">
                  <LargeTextBox
                    value={problemDefinitionSheet.constraints}
                    onChange={(e) => updateDefinition({ constraints: e.target.value })}
                    placeholder="해결을 어렵게 하는 자원·기술·법적·시간적 제약"
                    disabled={readOnly}
                    aria-label="제약 조건"
                    minHeightClassName="min-h-[80px]"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 우선순위 표 + 결정 방법 ----------------------------------------- */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Ⅲ-2-나 문제 우선순위 결정</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <caption className="sr-only">문제 우선순위 표</caption>
            <thead>
              <tr>
                <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                  문제명
                </th>
                <th className="w-[90px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  점수 (1~5)
                </th>
                <th className="w-[70px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  순위
                </th>
                <th className="w-[56px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  <span className="sr-only">삭제</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {priorityItems.map((row, idx) => (
                <tr key={idx}>
                  <td className="border border-border p-1 align-top">
                    <input
                      type="text"
                      value={row.problem}
                      onChange={(e) =>
                        updatePriorityItem(idx, { problem: e.target.value })
                      }
                      placeholder="문제명"
                      disabled={readOnly}
                      aria-label={`우선순위 ${idx + 1} 문제명`}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                  <td className="border border-border p-1 align-top">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={row.score}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        updatePriorityItem(idx, {
                          score:
                            Number.isFinite(n) && n >= 1 && n <= 5
                              ? Math.trunc(n)
                              : row.score,
                        });
                      }}
                      disabled={readOnly}
                      aria-label={`우선순위 ${idx + 1} 점수`}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                  <td className="border border-border p-1 align-top">
                    <input
                      type="number"
                      min={1}
                      value={row.rank}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        updatePriorityItem(idx, {
                          rank:
                            Number.isFinite(n) && n >= 1
                              ? Math.trunc(n)
                              : row.rank,
                        });
                      }}
                      disabled={readOnly}
                      aria-label={`우선순위 ${idx + 1} 순위`}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                  <td className="border border-border p-1 text-center align-top">
                    <button
                      type="button"
                      onClick={() => removePriorityItem(idx)}
                      disabled={readOnly || priorityItems.length <= 1}
                      aria-label={`우선순위 ${idx + 1} 삭제`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPriorityItem}
          disabled={readOnly}
          aria-label="우선순위 행 추가"
        >
          <Plus className="mr-1 size-4" />
          우선순위 행 추가
        </Button>

        <div className="space-y-1">
          <label
            htmlFor="pbl-priority-method"
            className="text-xs font-medium text-muted-foreground"
          >
            우선순위 결정 방법 (AHP · 협의 등)
          </label>
          <LargeTextBox
            id="pbl-priority-method"
            value={priorityMethod}
            onChange={(e) => updateMethod(e.target.value)}
            placeholder="예: 현장 전문가 5명의 5점 척도 평가 후 평균 점수 기준 순위 결정..."
            disabled={readOnly}
            aria-label="우선순위 결정 방법"
            minHeightClassName="min-h-[80px]"
          />
        </div>
      </div>

      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <strong>양식 √ 작성안내:</strong> 실제로 직무에 해결해야 할 문제를 선정하기 위한 문제 범위 도출하고 핵심 개념, 문제를 명확히 정의합니다. 외부 전문가, 기업 내·외부 인력의 의견을 종합해 작성합니다.
            </li>
            <li>4 정형 항목 모두 작성: 배경(맥락) → 핵심 문제(한 문장 정의) → 범위(영향 부서·공정) → 제약(자원·기술·법적 한계).</li>
            <li>우선순위는 정의된 문제(또는 그 하위 케이스)를 1~5점 척도로 평가하고 순위를 정합니다.</li>
          </ul>
        }
      />
    </FormSection>
  );
}
