'use client';

import { Plus, Trash2 } from 'lucide-react';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { Button } from '@/components/ui/button';

import type { PBLStepProps } from './types';
import type {
  PBLProblemItem,
  PBLPriority,
  PBLPriorityItem,
} from '@/lib/schemas/interview-pbl';

/**
 * Ⅲ-2 문제 도출 + 우선순위 — [인터뷰 입력]
 *
 * 두 블록을 하나의 Step 으로 묶는다:
 *  - Ⅲ-2-가 문제 도출: `problems[]` (title/description/impact)
 *  - Ⅲ-2-나 문제 우선순위 결정: `priority { items[], method }`
 */

export interface StepProblemsValue {
  problems: PBLProblemItem[];
  priority: PBLPriority;
}

function emptyProblem(): PBLProblemItem {
  return { title: '', description: '', impact: '' };
}

function emptyPriorityItem(rank: number): PBLPriorityItem {
  return { problem: '', score: 3, rank };
}

export function StepProblems({
  value,
  onChange,
  readOnly = false,
}: PBLStepProps<StepProblemsValue>) {
  const problems: PBLProblemItem[] =
    value.problems && value.problems.length > 0
      ? value.problems
      : [emptyProblem()];

  const priorityItems: PBLPriorityItem[] =
    value.priority?.items && value.priority.items.length > 0
      ? value.priority.items
      : [emptyPriorityItem(1)];

  const priorityMethod = value.priority?.method ?? '';

  function emit(patch: Partial<StepProblemsValue>) {
    onChange({
      problems,
      priority: { items: priorityItems, method: priorityMethod },
      ...patch,
    });
  }

  function updateProblem(idx: number, patch: Partial<PBLProblemItem>) {
    const next = problems.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    emit({ problems: next });
  }

  function addProblem() {
    emit({ problems: [...problems, emptyProblem()] });
  }

  function removeProblem(idx: number) {
    if (problems.length <= 1) return;
    emit({ problems: problems.filter((_, i) => i !== idx) });
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
      description="Ⅲ-2-가 문제 도출과 Ⅲ-2-나 문제 우선순위 결정을 함께 입력합니다."
    >
      {/* 문제 도출 표 ----------------------------------------------------- */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Ⅲ-2-가 문제 도출</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <caption className="sr-only">문제 도출 표</caption>
            <thead>
              <tr>
                <th className="w-[160px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  문제명
                </th>
                <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                  문제 설명
                </th>
                <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                  영향 (임팩트)
                </th>
                <th className="w-[56px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                  <span className="sr-only">삭제</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {problems.map((row, idx) => (
                <tr key={idx}>
                  <td className="border border-border p-1 align-top">
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) =>
                        updateProblem(idx, { title: e.target.value })
                      }
                      placeholder="문제명"
                      disabled={readOnly}
                      aria-label={`문제 ${idx + 1} 문제명`}
                      className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                  <td className="border border-border p-1 align-top">
                    <LargeTextBox
                      value={row.description}
                      onChange={(e) =>
                        updateProblem(idx, { description: e.target.value })
                      }
                      placeholder="문제의 맥락·원인"
                      disabled={readOnly}
                      aria-label={`문제 ${idx + 1} 설명`}
                      minHeightClassName="min-h-[60px]"
                    />
                  </td>
                  <td className="border border-border p-1 align-top">
                    <LargeTextBox
                      value={row.impact}
                      onChange={(e) =>
                        updateProblem(idx, { impact: e.target.value })
                      }
                      placeholder="경영 · 운영에 미치는 영향"
                      disabled={readOnly}
                      aria-label={`문제 ${idx + 1} 영향`}
                      minHeightClassName="min-h-[60px]"
                    />
                  </td>
                  <td className="border border-border p-1 text-center align-top">
                    <button
                      type="button"
                      onClick={() => removeProblem(idx)}
                      disabled={readOnly || problems.length <= 1}
                      aria-label={`문제 ${idx + 1} 삭제`}
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
          onClick={addProblem}
          disabled={readOnly}
          aria-label="문제 행 추가"
        >
          <Plus className="mr-1 size-4" />
          문제 추가
        </Button>
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
                      placeholder="문제명 (문제 도출과 동일하게)"
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
            <li>문제 도출은 훈련과제의 근거가 되는 비즈니스·운영상 pain-point 를 구체적으로 기술합니다.</li>
            <li>우선순위 점수는 1 (낮음) ~ 5 (높음) 5점 척도. 순위는 1 부터 정수로 부여합니다.</li>
            <li>우선순위 결정 방법은 AHP · 전문가 협의 · 5점 척도 평균 등 실제 채택한 방법을 서술합니다.</li>
          </ul>
        }
      />
    </FormSection>
  );
}
