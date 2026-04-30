'use client';

import { Plus, Trash2 } from 'lucide-react';

import { FormSection } from '@/components/forms/FormSection';
import { LargeTextBox } from '@/components/forms/LargeTextBox';
import { ExampleAccordion } from '@/components/forms/ExampleAccordion';
import { Button } from '@/components/ui/button';

import type { PBLStepProps } from './types';
import {
  type PBLActivityRow,
  type PBLActivityRole,
  PBL_ACTIVITY_ROLES_ORDERED,
  PBL_ACTIVITY_ROLE_LABEL,
} from '@/lib/schemas/interview-pbl';

/**
 * Ⅲ-1 훈련과제 도출 수행활동 — [인터뷰 입력] (R8 PBL-자체-03, 옵션 B)
 *
 * 양식 13×6 = 차수당 4행 (PM/외부전문가/기업내부전문가/능력개발전담주치의)
 * × 일자/내용/방법 정형. 각 행이 하나의 (차수, 역할) 조합.
 *
 * 데이터 슬라이스: `PBLTasks.activities` — `PBLActivityRow[]` (평면 배열).
 *   - 차수 추가 시 자동으로 4 역할 행을 한 번에 생성 (양식 정형 강제).
 *   - 차수 삭제 시 4 행 동시 제거.
 *   - 사용자는 행 단위 추가/삭제 못 함 (양식 4 역할 정형 유지).
 */

const MAX_ROUNDS = 5;
const DEFAULT_ROUNDS = 3; // 양식 prefill 1·2·3차

function emptyRow(round: number, role: PBLActivityRole): PBLActivityRow {
  return { round, role, personName: '', date: '', content: '', method: '' };
}

function roundToRows(round: number): PBLActivityRow[] {
  return PBL_ACTIVITY_ROLES_ORDERED.map((role) => emptyRow(round, role));
}

function defaultRows(): PBLActivityRow[] {
  // 양식 √ 안내: 1·2·3차 prefill (DEFAULT_ROUNDS)
  return Array.from({ length: DEFAULT_ROUNDS }, (_, i) =>
    roundToRows(i + 1),
  ).flat();
}

/** rows 에서 round 별 4 행을 묶어 정렬·반환 (역할 순서 고정). */
function groupByRound(rows: PBLActivityRow[]): Map<number, PBLActivityRow[]> {
  const map = new Map<number, PBLActivityRow[]>();
  // 역할 순서 인덱스 맵
  const roleOrder = new Map<PBLActivityRole, number>(
    PBL_ACTIVITY_ROLES_ORDERED.map((r, i) => [r, i]),
  );
  rows.forEach((r) => {
    const list = map.get(r.round) ?? [];
    list.push(r);
    map.set(r.round, list);
  });
  // 각 round 내에서 역할 순서로 정렬
  map.forEach((list) => {
    list.sort(
      (a, b) =>
        (roleOrder.get(a.role) ?? 99) - (roleOrder.get(b.role) ?? 99),
    );
  });
  return map;
}

export function StepActivities({
  value,
  onChange,
  readOnly = false,
}: PBLStepProps<PBLActivityRow[]>) {
  const rows: PBLActivityRow[] = value && value.length > 0 ? value : defaultRows();
  const grouped = groupByRound(rows);
  const rounds = Array.from(grouped.keys()).sort((a, b) => a - b);
  const maxRound = rounds.length > 0 ? Math.max(...rounds) : 0;

  function updateRow(target: PBLActivityRow, patch: Partial<PBLActivityRow>) {
    onChange(
      rows.map((r) =>
        r.round === target.round && r.role === target.role ? { ...r, ...patch } : r,
      ),
    );
  }

  function addRound() {
    if (rounds.length >= MAX_ROUNDS) return;
    const nextRound = maxRound + 1;
    onChange([...rows, ...roundToRows(nextRound)]);
  }

  function removeRound(round: number) {
    if (rounds.length <= 1) return;
    onChange(rows.filter((r) => r.round !== round));
  }

  return (
    <FormSection
      number="Ⅲ-1"
      title="훈련과제 도출 수행활동"
      label="[인터뷰 입력]"
      description="양식 13×6 정형 — 차수당 4역할(PM·외부전문가·기업내부전문가·능력개발전담주치의)별 일자/내용/방법을 분리 입력."
    >
      <div className="space-y-4">
        {rounds.map((round) => {
          const roundRows = grouped.get(round) ?? [];
          return (
            <div
              key={round}
              className="rounded-md border border-border bg-card p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{round}차</h3>
                <button
                  type="button"
                  onClick={() => removeRound(round)}
                  disabled={readOnly || rounds.length <= 1}
                  aria-label={`${round}차 삭제`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-border text-sm">
                  <caption className="sr-only">{round}차 수행활동 4 역할 표</caption>
                  <thead>
                    <tr>
                      <th className="w-[140px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                        역할
                      </th>
                      <th className="w-[120px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                        성명
                      </th>
                      <th className="w-[120px] border border-border bg-muted px-2 py-2 text-center font-semibold">
                        수행 일자
                      </th>
                      <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                        수행 내용
                      </th>
                      <th className="border border-border bg-muted px-2 py-2 text-center font-semibold">
                        수행 방법
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundRows.map((row) => (
                      <tr key={row.role}>
                        <td className="border border-border bg-muted/40 px-2 py-2 text-center font-medium">
                          {PBL_ACTIVITY_ROLE_LABEL[row.role]}
                        </td>
                        <td className="border border-border p-1 align-top">
                          <input
                            type="text"
                            value={row.personName}
                            onChange={(e) =>
                              updateRow(row, { personName: e.target.value })
                            }
                            placeholder="성명"
                            disabled={readOnly}
                            aria-label={`${round}차 ${PBL_ACTIVITY_ROLE_LABEL[row.role]} 성명`}
                            className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <input
                            type="text"
                            value={row.date}
                            onChange={(e) =>
                              updateRow(row, { date: e.target.value })
                            }
                            placeholder="YYYY.MM.DD"
                            disabled={readOnly}
                            aria-label={`${round}차 ${PBL_ACTIVITY_ROLE_LABEL[row.role]} 수행 일자`}
                            className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <LargeTextBox
                            value={row.content}
                            onChange={(e) =>
                              updateRow(row, { content: e.target.value })
                            }
                            placeholder="수행 내용"
                            disabled={readOnly}
                            aria-label={`${round}차 ${PBL_ACTIVITY_ROLE_LABEL[row.role]} 수행 내용`}
                            minHeightClassName="min-h-[60px]"
                          />
                        </td>
                        <td className="border border-border p-1 align-top">
                          <LargeTextBox
                            value={row.method}
                            onChange={(e) =>
                              updateRow(row, { method: e.target.value })
                            }
                            placeholder="수행 방법 (대면/비대면 등)"
                            disabled={readOnly}
                            aria-label={`${round}차 ${PBL_ACTIVITY_ROLE_LABEL[row.role]} 수행 방법`}
                            minHeightClassName="min-h-[60px]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRound}
          disabled={readOnly || rounds.length >= MAX_ROUNDS}
          aria-label="차수 추가"
        >
          <Plus className="mr-1 size-4" />차수 추가 ({rounds.length}/{MAX_ROUNDS})
        </Button>
      </div>

      <ExampleAccordion
        guide={
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <strong>양식 √ 작성안내:</strong> 문제도출 및 훈련대상 업무 선정을 위한 중요한 활동으로, 기업이 지닌 본질적인 핵심문제 파악 및 문제정의에 경영진과 기업 핵심 인력이 함께 참여합니다.
            </li>
            <li>1차 (기업 현황·문제 도출), 2차 (해결 방향 설정), 3차 (훈련과제 확정) 순으로 통상 3차수 진행합니다.</li>
            <li>차수당 4 역할 (PM·외부전문가·기업내부전문가·능력개발전담주치의) 각각의 일자·내용·방법을 분리해 양식 13×6 표에 1:1 정합으로 작성합니다.</li>
            <li>"차수 추가" 시 4 역할 행이 자동 생성됩니다. 행 단위 추가/삭제는 불가 (양식 정형).</li>
          </ul>
        }
      />
    </FormSection>
  );
}
